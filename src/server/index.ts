import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';
import { WebSocketServer } from 'ws';
import { getConfig } from '../shared/config.js';
import { RoomManager } from './room-manager.js';
import { ConnectionManager } from './connection-manager.js';
import { logger } from './utils/logger.js';

const config = getConfig();

const httpServer = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      status: 'ok',
      message: 'Servidor de chat em execução',
      uptime: process.uptime()
    })
  );
});
const roomManager = new RoomManager();
const connectionManager = new ConnectionManager(config, roomManager);

const wss = new WebSocketServer({ server: httpServer });
wss.on('connection', (socket) => connectionManager.handleConnection(socket));
wss.on('error', (error) => {
  logger.error('WebSocket server error', { error });
});

httpServer.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    logger.error('Porta já está em uso', {
      host: config.server.host,
      port: config.server.port
    });
    process.exit(1);
  }
  logger.error('HTTP server error', { error });
});

const onShutdown = (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully`);
  wss.clients.forEach((client) => client.close(1001, 'Server shutting down'));
  connectionManager.stop();
  wss.close(() => {
    httpServer.close(() => {
      logger.info('Shutdown complete');
      process.exit(0);
    });
  });
};

process.once('SIGTERM', () => onShutdown('SIGTERM'));
process.once('SIGINT', () => onShutdown('SIGINT'));

httpServer.listen(config.server.port, config.server.host, () => {
  const address = httpServer.address() as AddressInfo;
  logger.info(`Servidor de chat escutando em ws://${address.address}:${address.port}`);
});
