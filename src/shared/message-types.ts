export enum MessageType {
  MESSAGE = 'MESSAGE',
  JOIN = 'JOIN',
  LEAVE = 'LEAVE',
  FILE = 'FILE',
  HEARTBEAT = 'HEARTBEAT',
  SYSTEM = 'SYSTEM',
  ERROR = 'ERROR',
  PRESENCE = 'PRESENCE'
}

export type PresenceStatus = 'online' | 'away' | 'offline';

export interface BaseMessage<TType extends MessageType = MessageType> {
  type: TType;
  sender: string;
  room: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ChatMessage extends BaseMessage<MessageType.MESSAGE> {
  content: string;
}

export interface JoinMessage extends BaseMessage<MessageType.JOIN> {
  content?: string;
}

export interface LeaveMessage extends BaseMessage<MessageType.LEAVE> {
  content?: string;
}

export interface HeartbeatMessage extends BaseMessage<MessageType.HEARTBEAT> {
  metadata: {
    sequence: number;
  };
}

export interface FileMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  checksum: string;
  totalChunks: number;
  chunkIndex?: number;
  chunkSize?: number;
}

export interface FileMessage extends BaseMessage<MessageType.FILE> {
  metadata: FileMetadata;
  content: string; // base64 chunk
}

export interface PresenceMessage extends BaseMessage<MessageType.PRESENCE> {
  metadata: {
    users: Array<{ nickname: string; status: PresenceStatus }>;
  };
}

export interface SystemMessage extends BaseMessage<MessageType.SYSTEM> {
  content: string;
}

export interface ErrorMessage extends BaseMessage<MessageType.ERROR> {
  content: string;
}

export type OutgoingMessage =
  | ChatMessage
  | JoinMessage
  | LeaveMessage
  | HeartbeatMessage
  | FileMessage
  | PresenceMessage
  | SystemMessage
  | ErrorMessage;

export type IncomingMessage = OutgoingMessage;

export const GENERAL_ROOM = 'general';

export const DEFAULT_ROOMS = [GENERAL_ROOM];
