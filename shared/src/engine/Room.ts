import {
  Phase,
  type BoardState,
  type GameStateView,
  type Player,
  type PublicPlayer,
  type Role,
  type RoomOptions,
  type RoomSummary,
} from '../types/GameState';
import { PolicyDeck } from './PolicyDeck';

/**
 * Authoritative in-memory room: players, options, policy board and current
 * phase. Pure data + serialization — all mutation flows through GameEngine so
 * this stays a single-responsibility state container.
 */
export class Room {
  readonly id: string;
  readonly code: string;
  readonly options: RoomOptions;
  readonly passwordHash: string | null;
  readonly deck = new PolicyDeck();

  players: Player[] = [];
  phase: Phase = Phase.Lobby;
  hostId = '';

  // Board / government state
  liberalPolicies = 0;
  fascistPolicies = 0;
  electionTracker = 0;
  presidentId: string | null = null;
  chancellorId: string | null = null;
  lastEnacted: BoardState['lastEnacted'] = [];

  constructor(args: {
    id: string;
    code: string;
    options: RoomOptions;
    passwordHash: string | null;
  }) {
    this.id = args.id;
    this.code = args.code;
    this.options = args.options;
    this.passwordHash = args.passwordHash;
  }

  get isFull(): boolean {
    return this.players.length >= this.options.maxPlayers;
  }

  get isEmpty(): boolean {
    return this.players.every((p) => !p.connected);
  }

  findPlayer(id: string): Player | undefined {
    return this.players.find((p) => p.id === id);
  }

  hasName(name: string): boolean {
    const normalized = name.trim().toLowerCase();
    return this.players.some((p) => p.name.toLowerCase() === normalized);
  }

  private board(): BoardState {
    return {
      liberalPolicies: this.liberalPolicies,
      fascistPolicies: this.fascistPolicies,
      electionTracker: this.electionTracker,
      drawPile: this.deck.drawCount,
      discardPile: this.deck.discardCount,
      president: this.presidentId,
      chancellor: this.chancellorId,
      lastEnacted: this.lastEnacted,
    };
  }

  /** Roles are visible to a viewer if they're the player, the game is over,
   *  or the room has "show roles" enabled. Fascists also see each other. */
  private roleVisibleTo(viewer: Player, target: Player): Role | null {
    if (target.role == null) return null;
    if (viewer.id === target.id) return target.role;
    if (this.phase === Phase.GameOver || this.options.showRoles) {
      return target.role;
    }
    const fascistView =
      viewer.role === 'fascist' &&
      (target.role === 'fascist' || target.role === 'hitler');
    return fascistView ? target.role : null;
  }

  private toPublicPlayer(viewer: Player, p: Player): PublicPlayer {
    return {
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      seat: p.seat,
      isHost: p.isHost,
      connected: p.connected,
      ready: p.ready,
      isAlive: p.isAlive,
      isPresident: p.id === this.presidentId,
      isChancellor: p.id === this.chancellorId,
      role: this.roleVisibleTo(viewer, p),
    };
  }

  /** Per-viewer state snapshot for broadcasting. */
  viewFor(viewerId: string): GameStateView {
    const viewer = this.findPlayer(viewerId);
    const players = viewer
      ? this.players.map((p) => this.toPublicPlayer(viewer, p))
      : [];
    return {
      roomId: this.id,
      code: this.code,
      name: this.options.name,
      phase: this.phase,
      hostId: this.hostId,
      maxPlayers: this.options.maxPlayers,
      players,
      board: this.board(),
      you: { id: viewerId, role: viewer?.role ?? null },
    };
  }

  summary(): RoomSummary {
    return {
      id: this.id,
      code: this.code,
      name: this.options.name,
      playerCount: this.players.filter((p) => p.connected).length,
      maxPlayers: this.options.maxPlayers,
      hasPassword: this.passwordHash != null,
      phase: this.phase,
    };
  }
}
