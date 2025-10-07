import { Worker } from 'node:worker_threads';
import { join, dirname } from 'node:path';
import { EventEmitter } from 'node:events';
import { fileURLToPath } from 'node:url';
import { getConfig } from '../shared/config.js';
import { logger } from './utils/logger.js';

interface CompressionJob {
  id: string;
  fileName: string;
  buffer: ArrayBuffer;
}

interface CompressionResult {
  id: string;
  fileName: string;
  compressed: Buffer;
  checksum: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export declare interface FileProcessor {
  on(event: 'result', listener: (result: CompressionResult) => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
}

export class FileProcessor extends EventEmitter {
  private readonly workers: Worker[] = [];
  private readonly queue: CompressionJob[] = [];
  private busy = 0;
  private nextWorkerIndex = 0;

  constructor(private readonly config = getConfig()) {
    super();
    this.spawnWorkers();
  }

  private spawnWorkers(): void {
    const total = Math.max(1, this.config.files.compressionWorkers);
    for (let i = 0; i < total; i += 1) {
      const worker = new Worker(join(__dirname, 'workers', 'compression-worker.js'));
      worker.on('message', (message: CompressionResult | { error: string; id: string }) => {
        this.busy -= 1;
        if ('error' in message) {
          this.emit('error', new Error(message.error));
        } else {
          this.emit('result', message);
        }
        this.processQueue();
      });
      worker.on('error', (error) => {
        this.busy = Math.max(0, this.busy - 1);
        logger.error('Worker thread error', { error });
        this.emit('error', error);
        this.replaceWorker(worker);
      });
      this.workers.push(worker);
    }
  }

  private replaceWorker(oldWorker: Worker): void {
    this.workers.splice(this.workers.indexOf(oldWorker), 1);
    const worker = new Worker(join(__dirname, 'workers', 'compression-worker.js'));
    worker.on('message', (message: CompressionResult | { error: string; id: string }) => {
      this.busy -= 1;
      if ('error' in message) {
        this.emit('error', new Error(message.error));
      } else {
        this.emit('result', message);
      }
      this.processQueue();
    });
    worker.on('error', (error) => {
      this.busy = Math.max(0, this.busy - 1);
      logger.error('Worker thread error', { error });
      this.emit('error', error);
      this.replaceWorker(worker);
    });
    this.workers.push(worker);
    if (this.nextWorkerIndex >= this.workers.length) {
      this.nextWorkerIndex = 0;
    }
    this.processQueue();
  }

  public compressFile(job: CompressionJob): void {
    this.queue.push(job);
    this.processQueue();
  }

  private processQueue(): void {
    while (this.queue.length > 0 && this.busy < this.workers.length) {
      const job = this.queue.shift();
      if (!job) return;
      const worker = this.workers[this.nextWorkerIndex];
      this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.workers.length;
      this.busy += 1;
      worker.postMessage(job);
    }
  }
}
