import { EventEmitter } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import WebSocket from 'ws';
import {
  type IncomingMessage,
  type OutgoingMessage,
  MessageType,
  GENERAL_ROOM,
  type PresenceMessage
} from '../shared/message-types.js';
import { serialiseMessage, parseMessage, timestamp } from '../shared/protocol.js';
import { getConfig } from '../shared/config.js';

const MAX_BACKOFF = 30_000;

export interface ChatClientOptions {
  nickname: string;
  room?: string;
}

export interface ChatClientEvents {
  connected: () => void;
  disconnected: () => void;
  message: (message: IncomingMessage) => void;
  presence: (message: PresenceMessage) => void;
  error: (error: Error) => void;
  status: (status: string) => void;
}

export class ChatClient extends EventEmitter {
  private socket?: WebSocket;
  private heartbeatTimer?: NodeJS.Timeout;
  private reconnecting = false;
  private reconnectAttempt = 0;
  private readonly rooms = new Set<string>();
  private activeRoom: string;
  private readonly config = getConfig();

  constructor(private readonly options: ChatClientOptions) {
    super();
    this.activeRoom = options.room ?? GENERAL_ROOM;
  }

  public connect(): void {
    this.reconnecting = false;
    this.establishSocket();
  }

  private establishSocket(): void {
    const url = `ws://${this.config.server.host}:${this.config.server.port}`;
    this.socket = new WebSocket(url);

    this.socket.on('open', () => this.onOpen());
    this.socket.on('message', (raw) => this.onMessage(raw.toString()));
    this.socket.on('close', () => this.onClose());
    this.socket.on('error', (error) => this.onError(error as Error));
  }

  private onOpen(): void {
    this.reconnectAttempt = 0;
    this.reconnecting = false;
    this.rooms.add(this.activeRoom);
    this.rooms.forEach((room) => {
      this.sendPayload({
        type: MessageType.JOIN,
        sender: this.options.nickname,
        room,
        timestamp: timestamp()
      });
    });
    this.startHeartbeat();
    this.emit('connected');
    this.emit('status', 'Conectado ao servidor');
  }

  private onMessage(raw: string): void {
    let message: IncomingMessage;
    try {
      message = parseMessage(raw);
    } catch (error) {
      this.emit('error', error as Error);
      return;
    }

    if (message.type === MessageType.PRESENCE) {
      this.emit('presence', message);
      return;
    }

    this.emit('message', message);
  }

  private onClose(): void {
    this.emit('status', 'Conexão encerrada');
    this.stopHeartbeat();
    this.emit('disconnected');
    this.socket = undefined;
    if (!this.reconnecting) {
      void this.scheduleReconnect();
    }
  }

  private onError(error: Error): void {
    this.emit('error', error);
  }

  private async scheduleReconnect(): Promise<void> {
    this.reconnecting = true;
    this.reconnectAttempt += 1;
    const backoff = Math.min(MAX_BACKOFF, 2 ** this.reconnectAttempt * 1000);
    this.emit('status', `Tentando reconectar em ${(backoff / 1000).toFixed(1)}s`);
    await delay(backoff);
    this.establishSocket();
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    let sequence = 0;
    this.heartbeatTimer = setInterval(() => {
      sequence += 1;
      this.sendPayload({
        type: MessageType.HEARTBEAT,
        sender: this.options.nickname,
        room: this.activeRoom,
        timestamp: timestamp(),
        metadata: { sequence }
      });
    }, this.config.server.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  public sendPayload(message: OutgoingMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    this.socket.send(serialiseMessage(message));
  }

  public sendChatMessage(content: string): void {
    this.sendPayload({
      type: MessageType.MESSAGE,
      sender: this.options.nickname,
      room: this.activeRoom,
      content,
      timestamp: timestamp()
    });
  }

  public joinRoom(room: string): void {
    this.rooms.add(room);
    this.activeRoom = room;
    this.sendPayload({
      type: MessageType.JOIN,
      sender: this.options.nickname,
      room,
      timestamp: timestamp()
    });
  }

  public leaveRoom(room: string): void {
    this.rooms.delete(room);
    if (this.activeRoom === room) {
      this.activeRoom = GENERAL_ROOM;
    }
    this.sendPayload({
      type: MessageType.LEAVE,
      sender: this.options.nickname,
      room,
      timestamp: timestamp()
    });
  }

  public getActiveRoom(): string {
    return this.activeRoom;
  }

  public listRooms(): string[] {
    return Array.from(this.rooms.values());
  }

  public getNickname(): string {
    return this.options.nickname;
  }

  public disconnect(): void {
    this.stopHeartbeat();
    this.socket?.close(1000, 'client shutdown');
    this.socket?.removeAllListeners();
    this.socket = undefined;
  }
}
