import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { basename } from 'node:path';
import { EventEmitter } from 'node:events';
import { createHash } from 'node:crypto';
import type { ChatClient } from './connection.js';
import { MessageType, type FileMetadata } from '../shared/message-types.js';
import { FILE_TRANSFER } from '../shared/constants.js';
import { timestamp } from '../shared/protocol.js';
import { getConfig } from '../shared/config.js';

export interface FileTransferProgress {
  percentage: number;
  transferred: number;
  total: number;
}

export declare interface FileTransferManager {
  on(event: 'progress', listener: (progress: FileTransferProgress) => void): this;
  on(event: 'completed', listener: (metadata: FileMetadata) => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
}

export class FileTransferManager extends EventEmitter {
  private readonly config = getConfig();

  constructor(private readonly client: ChatClient) {
    super();
  }

  public async sendFile(filePath: string, room: string): Promise<void> {
    try {
      const stats = await stat(filePath);
      if (stats.size > this.config.files.maxFileSize) {
        throw new Error(`Arquivo excede o tamanho máximo (${this.config.files.maxFileSize} bytes).`);
      }

      const totalChunks = Math.ceil(stats.size / FILE_TRANSFER.CHUNK_SIZE);
      const fileName = basename(filePath);
      const stream = createReadStream(filePath, {
        highWaterMark: FILE_TRANSFER.CHUNK_SIZE
      });

      let transferred = 0;
      let chunkIndex = 0;

      for await (const data of stream) {
        const chunk = Buffer.from(data);
        chunkIndex += 1;
        transferred += chunk.length;
        const chunkChecksum = createHash('sha256').update(chunk).digest('hex');

        this.client.sendPayload({
          type: MessageType.FILE,
          sender: this.client.getNickname(),
          room,
          timestamp: timestamp(),
          content: chunk.toString('base64'),
          metadata: {
            fileName,
            fileSize: stats.size,
            mimeType: 'application/octet-stream',
            checksum: chunkChecksum,
            totalChunks,
            chunkIndex,
            chunkSize: chunk.length
          }
        });

        this.emit('progress', {
          percentage: Math.round((transferred / stats.size) * 100),
          transferred,
          total: stats.size
        });
      }

      this.emit('completed', {
        fileName,
        fileSize: stats.size,
        mimeType: 'application/octet-stream',
        checksum: '',
        totalChunks
      });
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }
}
