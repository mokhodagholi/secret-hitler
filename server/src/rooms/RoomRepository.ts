import {
  GameEngine,
  Phase,
  PUBLIC_TABLE_MAX_PLAYERS,
  Room,
  RoomFactory,
  type RoomCreateArgs,
} from '@secret-hitler/shared';

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
      .filter((entry) => entry.room.options.adminPlayUserId == null)
      .filter((entry) => entry.room.options.kind !== 'public')
      .map((e) => e.room.summary())
      .filter((s) => s.phase === 'lobby')
      .sort(pinPublicFirst);
  }

  /** Live `/play-game` table for this admin, if it is still in play. */
  findAdminPlay(userId: number): RoomEntry | undefined {
    return [...this.rooms.values()].find((entry) => {
      if (entry.room.options.adminPlayUserId !== userId) return false;
      return entry.room.phase !== Phase.GameOver;
    });
  }

  findByPlayerId(playerId: string): RoomEntry | undefined {
    return [...this.rooms.values()].find((entry) => entry.room.findPlayer(playerId) != null);
  }

  findSeatByJoinKey(joinKey: string): { entry: RoomEntry; playerId: string } | undefined {
    for (const entry of this.rooms.values()) {
      const player = entry.room.players.find((seat) => seat.joinKey === joinKey);
      if (player) return { entry, playerId: player.id };
    }
    return undefined;
  }

  findHostedLobbyByJoinKey(joinKey: string): RoomEntry | undefined {
    return [...this.rooms.values()].find((entry) => {
      if (entry.room.phase !== Phase.Lobby) return false;
      if (entry.room.options.kind === 'public') return false;
      if (entry.room.options.adminPlayUserId != null) return false;
      return entry.room.players.some((player) => player.joinKey === joinKey);
    });
  }

  /** Every live room entry (including public lobbies and in-progress games). */
  listEntries(): RoomEntry[] {
    return [...this.rooms.values()];
  }

  /**
   * Unlocked lobbies that can still take strangers via a startapp deep link.
   * Skips password rooms, admin `/play-game`, and full tables.
   */
  listFillableLobbies(): RoomEntry[] {
    return [...this.rooms.values()].filter((entry) => {
      if (entry.room.phase !== Phase.Lobby) return false;
      if (entry.room.options.adminPlayUserId != null) return false;
      if (entry.room.passwordHash != null) return false;
      if (entry.room.players.length >= entry.room.options.maxPlayers) return false;
      return true;
    });
  }

  /** Every live room, including games already in progress. Hidden admin `/play-game` tables stay out. */
  listAll() {
    return [...this.rooms.values()]
      .filter((entry) => entry.room.options.adminPlayUserId == null)
      .filter(
        (entry) =>
          !(entry.room.options.kind === 'public' && entry.room.phase === Phase.Lobby),
      )
      .map((e) => e.room.summary())
      .sort(pinPublicFirst);
  }

  /**
   * Cap restored public lobbies to six. Find Match is a queue, so this no
   * longer creates an empty sit-and-wait table.
   */
  ensurePublicLobby(): RoomEntry | null {
    for (const entry of this.waitingPublicLobbies()) {
      entry.engine.applyPublicSeatCap(PUBLIC_TABLE_MAX_PLAYERS);
    }
    return null;
  }

  /** Public lobbies with no seats left. Disconnected sitters still count. */
  emptyPublicLobbies(): RoomEntry[] {
    return this.waitingPublicLobbies().filter((entry) => entry.room.players.length === 0);
  }

  private waitingPublicLobbies(): RoomEntry[] {
    return [...this.rooms.values()]
      .filter(
        (entry) =>
          entry.room.options.kind === 'public' &&
          entry.room.phase === Phase.Lobby &&
          entry.room.options.adminPlayUserId == null,
      )
      .sort((left, right) => right.room.players.length - left.room.players.length);
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
