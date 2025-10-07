export interface RoomDescriptor {
  name: string;
  isPrivate: boolean;
  owner?: string;
  createdAt: string;
  topic?: string;
}

export interface RoomSummary extends RoomDescriptor {
  participants: number;
}
