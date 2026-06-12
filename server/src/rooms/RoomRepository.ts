import { GameEngine, Room, RoomFactory, type RoomCreateArgs } from '@secret-hitler/shared';

/**
 * Repository pattern — the single owner of the `roomId → { room, engine }`
 * map. Nothing else reads or writes the map directly. Also maintains a
 * `code → roomId` index for quick join-by-code lookups.
 */
export class RoomRepository {
  private readonly rooms = new Map<string, RoomEntry>();
  private readonly byCode = new Map<string, string>();

  /** @param defaultMinPlayers server-wide start minimum (env override in dev). */
  constructor(private readonly defaultMinPlayers?: number) {}

  create(args: RoomCreateArgs): RoomEntry {
    const room = RoomFactory.create({
      minPlayers: this.defaultMinPlayers,
      ...args,
    });
    const entry: RoomEntry = { room, engine: new GameEngine(room) };
    this.rooms.set(room.id, entry);
    this.byCode.set(room.code, room.id);
    return entry;
  }

  get(roomId: string): RoomEntry | undefined {
    return this.rooms.get(roomId);
  }

  getByCode(code: string): RoomEntry | undefined {
    const id = this.byCode.get(code.toUpperCase());
    return id ? this.rooms.get(id) : undefined;
  }

  /** Resolve by room id first, then fall back to a room code. */
  resolve(idOrCode: string): RoomEntry | undefined {
    return this.get(idOrCode) ?? this.getByCode(idOrCode);
  }

  remove(roomId: string): void {
    const entry = this.rooms.get(roomId);
    if (!entry) return;
    this.byCode.delete(entry.room.code);
    this.rooms.delete(roomId);
  }

  /** Public, joinable rooms (still in lobby) for the room-list endpoint. */
  listPublic() {
    return [...this.rooms.values()]
      .map((e) => e.room.summary())
      .filter((s) => s.phase === 'lobby');
  }
}

export interface RoomEntry {
  room: Room;
  engine: GameEngine;
}
