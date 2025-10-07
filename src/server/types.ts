import type { WebSocket } from 'ws';
import type { PresenceStatus } from '../shared/message-types.js';

export interface ClientSession {
  id: string;
  nickname: string;
  socket: WebSocket;
  rooms: Set<string>;
  status: PresenceStatus;
  lastHeartbeat: number;
  sequence: number;
}

export interface BroadcastPayload {
  room: string;
  exclude?: string;
}

export interface HeartbeatEvent {
  clientId: string;
  timestamp: number;
  sequence: number;
}

export interface FileTransferContext {
  clientId: string;
  room: string;
  buffer: Buffer[];
  expectedChunks: number;
  receivedChunks: number;
}
