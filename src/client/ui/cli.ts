import { createInterface } from 'node:readline/promises';
import process from 'node:process';
import chalk from 'chalk';
import { ChatClient } from '../connection.js';
import { FileTransferManager } from '../file-transfer.js';
import { MessageType, type IncomingMessage, type PresenceMessage } from '../../shared/message-types.js';

interface CliOptions {
  nickname?: string;
}

const formatTimestamp = (iso: string): string => {
  const date = new Date(iso);
  return date.toLocaleTimeString();
};

const renderMessage = (message: IncomingMessage): string => {
  switch (message.type) {
    case MessageType.MESSAGE:
      return `${chalk.dim(`[${formatTimestamp(message.timestamp)}]`)} ${chalk.cyan(message.room)} ${chalk.yellow(message.sender)}: ${message.content}`;
    case MessageType.SYSTEM:
      return chalk.green(`[${formatTimestamp(message.timestamp)}] [${message.room}] ${message.content}`);
    case MessageType.ERROR:
      return chalk.red(`[${formatTimestamp(message.timestamp)}] ${message.content}`);
    case MessageType.FILE:
      return chalk.magenta(
        `[${formatTimestamp(message.timestamp)}] ${message.sender} enviou um arquivo (${message.metadata?.fileName ?? 'desconhecido'})`
      );
    default:
      return chalk.gray(`[${formatTimestamp(message.timestamp)}] ${message.type}`);
  }
};

const renderPresence = (message: PresenceMessage): string => {
  const users = message.metadata.users
    .map((user) => `${chalk.yellow(user.nickname)} (${chalk.blue(user.status)})`)
    .join(', ');
  return `${chalk.magenta('Usuários online')}: ${users}`;
};

export const startCli = async (options: CliOptions = {}) => {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
  });

  const nickname =
    options.nickname?.trim() || (await rl.question('Escolha um nickname: ')).trim();
  if (!nickname) {
    console.error('Nickname inválido. Abortando.');
    process.exit(1);
  }

  const client = new ChatClient({ nickname });
  const fileTransfer = new FileTransferManager(client);

  const refreshPrompt = () => {
    rl.setPrompt(`${chalk.cyan(client.getActiveRoom())}> `);
    rl.prompt(true);
  };

  client.on('connected', () => {
    console.log(chalk.green('Conectado ao servidor.')); 
    refreshPrompt();
  });

  client.on('message', (message) => {
    console.log(`\n${renderMessage(message)}`);
    refreshPrompt();
  });

  client.on('presence', (presence) => {
    console.log(`\n${renderPresence(presence)}`);
    refreshPrompt();
  });

  client.on('status', (status) => {
    console.log(`\n${chalk.blue(status)}`);
    refreshPrompt();
  });

  fileTransfer.on('progress', (progress) => {
    console.log(
      `\n${chalk.green('Upload')}: ${progress.percentage}% (${progress.transferred}/${progress.total} bytes)`
    );
    refreshPrompt();
  });

  fileTransfer.on('completed', (metadata) => {
    console.log(`\n${chalk.green('Arquivo enviado')}: ${metadata.fileName}`);
    refreshPrompt();
  });

  fileTransfer.on('error', (error) => {
    console.log(`\n${chalk.red('Falha no envio de arquivo')}: ${error.message}`);
    refreshPrompt();
  });

  client.on('disconnected', () => {
    console.log(`\n${chalk.red('Desconectado do servidor')}`);
    refreshPrompt();
  });

  client.on('error', (error) => {
    console.log(`\n${chalk.red('Erro:')} ${error.message}`);
    refreshPrompt();
  });

  const handleCommand = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    if (trimmed === '/quit') {
      client.disconnect();
      rl.close();
      return;
    }

    if (trimmed.startsWith('/join ')) {
      const [, room] = trimmed.split(/\s+/, 2);
      if (room) {
        client.joinRoom(room);
        console.log(chalk.green(`Ingresso solicitado para sala ${room}`));
      }
      return;
    }

    if (trimmed.startsWith('/leave ')) {
      const [, room] = trimmed.split(/\s+/, 2);
      if (room) {
        client.leaveRoom(room);
        console.log(chalk.yellow(`Saindo da sala ${room}`));
      }
      return;
    }

    if (trimmed === '/rooms') {
      const rooms = client.listRooms();
      console.log(chalk.magenta(`Salas ativas: ${rooms.join(', ')}`));
      return;
    }

    if (trimmed.startsWith('/sendfile ')) {
      const parts = trimmed.split(/\s+/);
      const path = parts[1];
      const room = parts[2];
      if (!path) {
        console.log(chalk.red('Informe o caminho do arquivo. Ex: /sendfile ./arquivo.txt sala')); 
        return;
      }
      const targetRoom = room ?? client.getActiveRoom();
      fileTransfer
        .sendFile(path, targetRoom)
        .catch((error) => {
          console.log(`\n${chalk.red('Falha no envio de arquivo')}: ${(error as Error).message}`);
          refreshPrompt();
        });
      return;
    }

    client.sendChatMessage(trimmed);
  };

  rl.on('line', (line) => {
    handleCommand(line);
    refreshPrompt();
  });

  rl.on('close', () => {
    client.disconnect();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    rl.close();
  });

  client.connect();
  refreshPrompt();
};
