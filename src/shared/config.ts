import { config as loadEnv } from 'dotenv';

if (!process.env.NO_DOTENV) {
  loadEnv();
}

const DEFAULT_SERVER_PORT = 9090;
const DEFAULT_HEARTBEAT_INTERVAL = 30_000;
const DEFAULT_HEARTBEAT_TIMEOUT = 45_000;
const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024;

export interface ServerConfig {
  host: string;
  port: number;
  maxConnections: number;
  heartbeatInterval: number;
  heartbeatTimeout: number;
  logLevel: string;
  logFile: string;
  logMaxSize: number;
}

export interface ClusterConfig {
  workers: 'auto' | number;
}

export interface FileConfig {
  maxFileSize: number;
  allowedFileTypes: string[];
  compressionWorkers: number;
}

export interface AppConfig {
  server: ServerConfig;
  cluster: ClusterConfig;
  files: FileConfig;
}

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseAllowedTypes = (value: string | undefined): string[] => {
  if (!value) return ['.txt', '.pdf', '.jpg', '.png', '.zip'];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const parseClusterWorkers = (value: string | undefined): 'auto' | number => {
  if (!value || value === 'auto') return 'auto';
  const intValue = Number.parseInt(value, 10);
  return Number.isFinite(intValue) && intValue > 0 ? intValue : 'auto';
};

export const getConfig = (): AppConfig => ({
  server: {
    host: process.env.SERVER_HOST ?? '0.0.0.0',
    port: parseNumber(process.env.SERVER_PORT, DEFAULT_SERVER_PORT),
    maxConnections: parseNumber(process.env.MAX_CONNECTIONS, 100),
    heartbeatInterval: parseNumber(
      process.env.HEARTBEAT_INTERVAL,
      DEFAULT_HEARTBEAT_INTERVAL
    ),
    heartbeatTimeout: parseNumber(
      process.env.HEARTBEAT_TIMEOUT,
      DEFAULT_HEARTBEAT_TIMEOUT
    ),
    logLevel: process.env.LOG_LEVEL ?? 'info',
    logFile: process.env.LOG_FILE ?? './logs/chat.log',
    logMaxSize: parseNumber(process.env.LOG_MAX_SIZE, 10 * 1024 * 1024)
  },
  cluster: {
    workers: parseClusterWorkers(process.env.CLUSTER_WORKERS)
  },
  files: {
    maxFileSize: parseNumber(process.env.MAX_FILE_SIZE, DEFAULT_MAX_FILE_SIZE),
    allowedFileTypes: parseAllowedTypes(process.env.ALLOWED_FILE_TYPES),
    compressionWorkers: parseNumber(process.env.COMPRESSION_WORKERS, 2)
  }
});
