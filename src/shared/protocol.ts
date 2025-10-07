import { randomUUID } from 'crypto';
import {
  MessageType,
  type OutgoingMessage,
  type BaseMessage,
  type IncomingMessage,
  type PresenceStatus
} from './message-types.js';

export interface Envelope<T extends OutgoingMessage = OutgoingMessage> {
  id: string;
  payload: T;
}

const ISO_REGEX = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/;

export const timestamp = (): string => new Date().toISOString();

export const createEnvelope = <T extends OutgoingMessage>(payload: T): Envelope<T> => ({
  id: randomUUID(),
  payload
});

const hasValidTimestamp = (value: string): boolean => ISO_REGEX.test(value);

const ensureBaseFields = (message: Partial<BaseMessage>): message is BaseMessage => {
  if (typeof message.type !== 'string') return false;
  if (typeof message.sender !== 'string') return false;
  if (typeof message.room !== 'string') return false;
  if (typeof message.timestamp !== 'string' || !hasValidTimestamp(message.timestamp)) {
    return false;
  }
  return true;
};

const isPresenceStatus = (value: unknown): value is PresenceStatus =>
  value === 'online' || value === 'away' || value === 'offline';

export const isValidMessage = (message: unknown): message is IncomingMessage => {
  if (!message || typeof message !== 'object') return false;
  const base = message as Partial<BaseMessage>;
  if (!ensureBaseFields(base)) return false;

  switch (base.type) {
    case MessageType.MESSAGE:
    case MessageType.SYSTEM:
    case MessageType.ERROR:
      return typeof (message as { content?: unknown }).content === 'string';
    case MessageType.JOIN:
    case MessageType.LEAVE:
      return true;
    case MessageType.HEARTBEAT: {
      const metadata = (message as { metadata?: { sequence?: unknown } }).metadata;
      return Boolean(metadata && Number.isInteger(metadata.sequence));
    }
    case MessageType.FILE: {
      const metadata = (message as { metadata?: Record<string, unknown> }).metadata;
      if (!metadata) return false;
      const required = ['fileName', 'fileSize', 'mimeType', 'checksum', 'totalChunks'];
      return required.every((key) => key in metadata) && typeof (message as { content?: unknown }).content === 'string';
    }
    case MessageType.PRESENCE: {
      const metadata = (message as {
        metadata?: {
          users?: Array<{ nickname?: unknown; status?: unknown }>;
        };
      }).metadata;
      if (!metadata || !Array.isArray(metadata.users)) return false;
      return metadata.users.every(
        (user) =>
          typeof user.nickname === 'string' && user.nickname.length > 0 && isPresenceStatus(user.status)
      );
    }
    default:
      return false;
  }
};

export const parseMessage = (raw: string): IncomingMessage => {
  const maybeParsed = JSON.parse(raw) as IncomingMessage;
  if (!isValidMessage(maybeParsed)) {
    throw new Error('Invalid message payload');
  }
  return maybeParsed;
};

export const serialiseMessage = (message: OutgoingMessage): string => JSON.stringify(message);
