import { GameEngine, Phase, PUBLIC_TABLE_NAME, Room, RoomFactory, type RoomCreateArgs } from '@secret-hitler/shared';

/**
 * Repository pattern — the single owner of the `roomId → { room, engine }`
 * map. Nothing else reads or writes the map directly. Also maintains a
 * `code → roomId` index for quick join-by-code lookups.
 */
export class RoomRepository {
  private readonly rooms = new Map<string, RoomEntry>();
  private readonly byCode = new Map<string, string>();

  /** @param defaultMinPlayers tests may pass 3; production omits this (rules = 5). */
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

  /** Rehydrate a room that was snapshotted before a process restart. */
  restore(room: Room): RoomEntry {
    const entry: RoomEntry = { room, engine: new GameEngine(room) };
    this.rooms.set(room.id, entry);
    this.byCode.set(room.code, room.id);
    return entry;
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
      .filter((s) => s.phase === 'lobby')
      .sort(pinPublicFirst);
  }

  /** Every live room, including games already in progress. */
  listAll() {
    return [...this.rooms.values()].map((e) => e.room.summary()).sort(pinPublicFirst);
  }

  /**
   * Create the evergreen Join lobby if none is waiting. Returns the new
   * entry, or null when a lobby-phase public table already exists.
   */
  ensurePublicLobby(): RoomEntry | null {
    const existing = [...this.rooms.values()].find(
      (entry) => entry.room.options.kind === 'public' && entry.room.phase === Phase.Lobby,
    );
    if (existing) return null;
    return this.create({ name: PUBLIC_TABLE_NAME, kind: 'public' });
  }
}

export interface RoomEntry {
  room: Room;
  engine: GameEngine;
}

function pinPublicFirst(
  a: { kind?: 'public' },
  b: { kind?: 'public' },
): number {
  return Number(b.kind === 'public') - Number(a.kind === 'public');
}
