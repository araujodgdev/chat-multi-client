import { EventEmitter } from 'node:events';
import type { OutgoingMessage } from '../shared/message-types.js';
import type { RoomManager } from './room-manager.js';

export interface BroadcastJob {
  room: string;
  message: OutgoingMessage;
  excludeClientId?: string;
}

export class MessageBroker extends EventEmitter {
  private readonly queue: BroadcastJob[] = [];
  private processing = false;

  constructor(
    private readonly roomManager: RoomManager,
    private readonly sendToClient: (clientId: string, message: OutgoingMessage) => Promise<void>
  ) {
    super();
  }

  public enqueue(job: BroadcastJob): void {
    this.queue.push(job);
    if (!this.processing) {
      void this.process();
    }
  }

  private async process(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      while (this.queue.length > 0) {
        const job = this.queue.shift();
        if (!job) continue;
        const members = Array.from(this.roomManager.getMembers(job.room));
        await Promise.all(
          members.map(async (clientId) => {
            if (job.excludeClientId && job.excludeClientId === clientId) {
              return;
            }
            try {
              await this.sendToClient(clientId, job.message);
            } catch (error) {
              this.emit('delivery-error', { clientId, error });
            }
          })
        );
      }
    } finally {
      this.processing = false;
    }
  }
}
