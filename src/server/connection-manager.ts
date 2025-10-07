import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import { serializationQueue } from './utils/serialization-queue.js';
import {
  MessageType,
  type OutgoingMessage,
  type ChatMessage,
  type JoinMessage,
  type LeaveMessage,
  type HeartbeatMessage,
  type PresenceMessage,
  type SystemMessage,
  GENERAL_ROOM
} from '../shared/message-types.js';
import { serialiseMessage, parseMessage, timestamp } from '../shared/protocol.js';
import type { AppConfig } from '../shared/config.js';
import { MessageBroker } from './message-broker.js';
import { RoomManager } from './room-manager.js';
import { logger } from './utils/logger.js';
import type { ClientSession } from './types.js';

interface ConnectionManagerEvents {
  authenticated: (client: ClientSession) => void;
  disconnected: (clientId: string) => void;
  presenceUpdate: (message: PresenceMessage) => void;
}

export class ConnectionManager extends EventEmitter {
  private readonly clients = new Map<string, ClientSession>();
  private readonly nicknames = new Map<string, string>();
  private readonly heartbeatTimer: NodeJS.Timer;
  private readonly messageBroker: MessageBroker;

  constructor(private readonly config: AppConfig, private readonly roomManager: RoomManager) {
    super();
    this.messageBroker = new MessageBroker(this.roomManager, (clientId, message) =>
      this.sendToClient(clientId, message)
    );

    this.heartbeatTimer = setInterval(
      () => this.checkHeartbeats(),
      this.config.server.heartbeatInterval
    );
    this.heartbeatTimer.unref();
  }

  public stop(): void {
    clearInterval(this.heartbeatTimer);
  }

  public handleConnection(socket: WebSocket): void {
    if (this.clients.size >= this.config.server.maxConnections) {
      socket.close(1013, 'server at capacity');
      return;
    }

    const clientId = randomUUID();
    logger.info('Incoming connection', { clientId });

    socket.on('message', (raw) => this.handleIncoming(clientId, socket, raw.toString()));
    socket.on('close', () => this.disconnect(clientId));
    socket.on('error', (error) => {
      logger.warn('Socket error', { clientId, error });
      this.disconnect(clientId);
    });
  }

  private async handleIncoming(clientId: string, socket: WebSocket, raw: string): Promise<void> {
    let parsed;
    try {
      parsed = parseMessage(raw);
    } catch (error) {
      logger.warn('Failed to parse incoming message', { clientId, error });
      socket.send(
        serialiseMessage({
          type: MessageType.ERROR,
          sender: 'system',
          room: GENERAL_ROOM,
          content: 'Invalid message payload',
          timestamp: timestamp()
        })
      );
      return;
    }

    const session = this.clients.get(clientId);
    if (!session && parsed.type !== MessageType.JOIN) {
      socket.send(
        serialiseMessage({
          type: MessageType.ERROR,
          sender: 'system',
          room: GENERAL_ROOM,
          content: 'Authenticate first with JOIN',
          timestamp: timestamp()
        })
      );
      return;
    }

    switch (parsed.type) {
      case MessageType.JOIN:
        if (!session) {
          this.authenticate(clientId, socket, parsed);
        } else {
          this.joinRoom(session, parsed);
        }
        break;
      case MessageType.MESSAGE:
        if (!session) return;
        this.broadcastMessage(session, parsed);
        break;
      case MessageType.LEAVE:
        if (!session) return;
        this.leaveRoom(session, parsed);
        break;
      case MessageType.HEARTBEAT:
        if (!session) return;
        this.registerHeartbeat(session, parsed);
        break;
      case MessageType.FILE:
        logger.info('File transfer message received (placeholder stream handling)', {
          clientId
        });
        break;
      default:
        logger.warn('Unhandled message type', { type: parsed.type });
    }
  }

  private authenticate(clientId: string, socket: WebSocket, message: JoinMessage): void {
    const { sender } = message;
    if (this.nicknames.has(sender)) {
      socket.send(
        serialiseMessage({
          type: MessageType.ERROR,
          sender: 'system',
          room: GENERAL_ROOM,
          content: 'Nickname already in use',
          timestamp: timestamp()
        })
      );
      socket.close(1008, 'nickname in use');
      return;
    }

    const session: ClientSession = {
      id: clientId,
      nickname: sender,
      socket,
      rooms: new Set([message.room ?? GENERAL_ROOM]),
      status: 'online',
      lastHeartbeat: Date.now(),
      sequence: 0
    };

    this.clients.set(clientId, session);
    this.nicknames.set(sender, clientId);
    this.roomManager.join(message.room ?? GENERAL_ROOM, session);

    this.sendSystemMessage(session, `Bem-vindo, ${sender}!`);
    this.emit('authenticated', session);
    this.publishPresence();
    logger.info('Client authenticated', { clientId, nickname: sender });

    this.messageBroker.enqueue({
      room: message.room ?? GENERAL_ROOM,
      excludeClientId: clientId,
      message: {
        type: MessageType.SYSTEM,
        sender: 'system',
        room: message.room ?? GENERAL_ROOM,
        content: `${sender} entrou na sala`,
        timestamp: timestamp()
      }
    });
  }

  private broadcastMessage(session: ClientSession, message: ChatMessage): void {
    if (!session.rooms.has(message.room)) {
      this.sendError(session, `Entre na sala ${message.room} antes de enviar mensagens.`);
      return;
    }

    const payload: ChatMessage = {
      ...message,
      sender: session.nickname,
      timestamp: timestamp()
    };

    this.messageBroker.enqueue({
      room: message.room,
      message: payload
    });
  }

  private joinRoom(session: ClientSession, message: JoinMessage): void {
    if (session.rooms.has(message.room)) {
      this.sendError(session, `Você já está na sala ${message.room}.`);
      return;
    }
    this.roomManager.join(message.room, session);
    this.messageBroker.enqueue({
      room: message.room,
      message: {
        type: MessageType.SYSTEM,
        sender: 'system',
        room: message.room,
        content: `${session.nickname} entrou na sala`,
        timestamp: timestamp()
      }
    });
  }

  private leaveRoom(session: ClientSession, message: LeaveMessage): void {
    if (!session.rooms.has(message.room)) {
      this.sendError(session, `Você não está na sala ${message.room}.`);
      return;
    }
    this.roomManager.leave(message.room, session);
    this.messageBroker.enqueue({
      room: message.room,
      message: {
        type: MessageType.SYSTEM,
        sender: 'system',
        room: message.room,
        content: `${session.nickname} saiu da sala`,
        timestamp: timestamp()
      }
    });
  }

  private registerHeartbeat(session: ClientSession, message: HeartbeatMessage): void {
    session.lastHeartbeat = Date.now();
    session.sequence = message.metadata.sequence;
  }

  private sendSystemMessage(session: ClientSession, content: string, room: string = GENERAL_ROOM): void {
    this.sendToClient(session.id, {
      type: MessageType.SYSTEM,
      sender: 'system',
      room,
      content,
      timestamp: timestamp()
    });
  }

  private sendError(session: ClientSession, content: string): void {
    this.sendToClient(session.id, {
      type: MessageType.ERROR,
      sender: 'system',
      room: GENERAL_ROOM,
      content,
      timestamp: timestamp()
    });
  }

  public async sendToClient(clientId: string, message: OutgoingMessage): Promise<void> {
    const session = this.clients.get(clientId);
    if (!session) return;
    return serializationQueue.enqueue(session.socket, message);
  }

  private publishPresence(): void {
    const presenceMessage: PresenceMessage = {
      type: MessageType.PRESENCE,
      sender: 'system',
      room: GENERAL_ROOM,
      timestamp: timestamp(),
      metadata: {
        users: Array.from(this.clients.values()).map((client) => ({
          nickname: client.nickname,
          status: client.status
        }))
      }
    };
    this.clients.forEach((client) => {
      this.sendToClient(client.id, presenceMessage);
    });
    this.emit('presenceUpdate', presenceMessage);
  }

  private checkHeartbeats(): void {
    const now = Date.now();
    this.clients.forEach((session, clientId) => {
      if (now - session.lastHeartbeat > this.config.server.heartbeatTimeout) {
        logger.warn('Heartbeat timeout, disconnecting client', {
          clientId,
          nickname: session.nickname
        });
        session.socket.terminate();
        this.disconnect(clientId);
      }
    });
  }

  private disconnect(clientId: string): void {
    const session = this.clients.get(clientId);
    if (!session) return;

    logger.info('Client disconnected', { clientId, nickname: session.nickname });

    const rooms = Array.from(session.rooms);
    rooms.forEach((room) => {
      this.roomManager.leave(room, session);
      this.messageBroker.enqueue({
        room,
        message: {
          type: MessageType.SYSTEM,
          sender: 'system',
          room,
          content: `${session.nickname} desconectou-se`,
          timestamp: timestamp()
        }
      });
    });
    session.socket.removeAllListeners();
    this.clients.delete(clientId);
    this.nicknames.delete(session.nickname);

    this.messageBroker.enqueue({
      room: GENERAL_ROOM,
      message: {
        type: MessageType.SYSTEM,
        sender: 'system',
        room: GENERAL_ROOM,
        content: `${session.nickname} desconectou-se`,
        timestamp: timestamp()
      }
    });

    this.publishPresence();
    this.emit('disconnected', clientId);
  }
}
