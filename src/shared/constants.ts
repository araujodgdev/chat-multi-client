export const SERVER_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  MESSAGE: 'message',
  ERROR: 'error',
  HEARTBEAT_TIMEOUT: 'heartbeat-timeout'
} as const;

export const CLIENT_EVENTS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  MESSAGE: 'message',
  ERROR: 'error',
  HEARTBEAT: 'heartbeat',
  PRESENCE_UPDATE: 'presence-update'
} as const;

export const ROOMS = {
  DEFAULT: 'general'
} as const;

export const HEARTBEAT = {
  INITIAL_SEQUENCE: 1
} as const;

export const FILE_TRANSFER = {
  CHUNK_SIZE: 64 * 1024
} as const;
