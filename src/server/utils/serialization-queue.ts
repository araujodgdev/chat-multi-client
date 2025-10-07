import type { WebSocket } from 'ws';
import { serialiseMessage } from '../../shared/protocol.js';
import type { OutgoingMessage } from '../../shared/message-types.js';

class SerializationQueue {
  private readonly queue = new WeakMap<WebSocket, Promise<void>>();

  public enqueue(socket: WebSocket, message: OutgoingMessage): Promise<void> {
    const previous = this.queue.get(socket) ?? Promise.resolve();
    const task = previous
      .catch(() => void 0)
      .then(
        () =>
          new Promise<void>((resolve, reject) => {
            socket.send(serialiseMessage(message), (error) => {
              if (error) {
                reject(error);
              } else {
                resolve();
              }
            });
          })
      );
    this.queue.set(socket, task);
    return task;
  }
}

export const serializationQueue = new SerializationQueue();
