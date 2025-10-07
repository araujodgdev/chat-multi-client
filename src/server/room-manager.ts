import { EventEmitter } from 'node:events';
import { timestamp } from '../shared/protocol.js';
import { DEFAULT_ROOMS } from '../shared/message-types.js';
import type { RoomDescriptor, RoomSummary } from '../shared/rooms.js';
import type { ClientSession } from './types.js';

interface RoomData extends RoomDescriptor {
  members: Set<string>;
}

export interface RoomManagerEvents {
  created: (room: RoomDescriptor) => void;
  removed: (roomName: string) => void;
  joined: (roomName: string, client: ClientSession) => void;
  left: (roomName: string, client: ClientSession) => void;
}

export class RoomManager extends EventEmitter {
  private readonly rooms = new Map<string, RoomData>();

  constructor() {
    super();
    DEFAULT_ROOMS.forEach((roomName) => {
      this.rooms.set(roomName, {
        name: roomName,
        isPrivate: false,
        createdAt: timestamp(),
        members: new Set<string>()
      });
    });
  }

  public list(): RoomSummary[] {
    return Array.from(this.rooms.values()).map((room) => ({
      name: room.name,
      isPrivate: room.isPrivate,
      createdAt: room.createdAt,
      owner: room.owner,
      topic: room.topic,
      participants: room.members.size
    }));
  }

  public create(room: RoomDescriptor): RoomDescriptor {
    if (this.rooms.has(room.name)) {
      return this.rooms.get(room.name)!;
    }
    const descriptor: RoomData = {
      ...room,
      members: new Set<string>()
    };
    this.rooms.set(room.name, descriptor);
    this.emit('created', descriptor);
    return room;
  }

  public remove(roomName: string): void {
    if (!this.rooms.has(roomName)) return;
    this.rooms.delete(roomName);
    this.emit('removed', roomName);
  }

  public join(roomName: string, client: ClientSession): void {
    const room = this.rooms.get(roomName) ??
      this.create({ name: roomName, isPrivate: false, createdAt: timestamp() });
    room.members.add(client.id);
    client.rooms.add(roomName);
    this.emit('joined', roomName, client);
  }

  public leave(roomName: string, client: ClientSession): void {
    const room = this.rooms.get(roomName);
    if (!room) return;
    room.members.delete(client.id);
    client.rooms.delete(roomName);
    this.emit('left', roomName, client);
    if (!DEFAULT_ROOMS.includes(roomName) && room.members.size === 0) {
      this.remove(roomName);
    }
  }

  public getMembers(roomName: string): Set<string> {
    return this.rooms.get(roomName)?.members ?? new Set();
  }
}
