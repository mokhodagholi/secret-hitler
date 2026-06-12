import {
  Phase,
  type BoardState,
  type ExecutivePower,
  type Faction,
  type GameStateView,
  type Player,
  type Policy,
  type PublicPlayer,
  type Role,
  type RoomOptions,
  type RoomSummary,
  type Vote,
} from '../types/GameState';
import { PolicyDeck } from './PolicyDeck';
import { VETO_UNLOCK_FASCIST_POLICIES } from '../rules/boardPowers';

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
  readonly deck: PolicyDeck;

  players: Player[] = [];
  phase: Phase = Phase.Lobby;
  hostId = '';

  // Board / government state
  liberalPolicies = 0;
  fascistPolicies = 0;
  electionTracker = 0;
  presidentId: string | null = null;
  chancellorId: string | null = null;
  /** Previous elected government — term-limited from the next nomination. */
  lastElectedPresidentId: string | null = null;
  lastElectedChancellorId: string | null = null;
  lastEnacted: BoardState['lastEnacted'] = [];
  /** Winning faction once the game has ended, else null. */
  winner: Faction | null = null;
  votes = new Map<string, Vote>();
  /** Policies in the active legislator's hand (3 President, then 2 Chancellor). */
  drawnPolicies: Policy[] = [];
  speakerId: string | null = null;
  speakerStartedAt = 0;
  speakerEndsAt = 0;
  voteStartedAt = 0;
  voteEndsAt = 0;
  /** Executive power awaiting the President's use, else null. */
  activePower: ExecutivePower | null = null;
  /** Players already investigated this game (each may be investigated once). */
  investigatedIds: string[] = [];
  /** Top three policies held for the President during Policy Peek. */
  peekedPolicies: Policy[] = [];
  /** Last investigation result, private to the President until acknowledged. */
  investigation: { targetId: string; party: Faction } | null = null;
  /** After a special election, the round rotation resumes after this player. */
  specialElectionResumeAfterId: string | null = null;
  /** The Chancellor has proposed a veto this legislative session. */
  vetoRequested = false;

  constructor(args: {
    id: string;
    code: string;
    options: RoomOptions;
    passwordHash: string | null;
    /** Injectable for tests that need a known tile order. */
    deck?: PolicyDeck;
  }) {
    this.id = args.id;
    this.code = args.code;
    this.options = args.options;
    this.passwordHash = args.passwordHash;
    this.deck = args.deck ?? new PolicyDeck();
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
   *  or the room has "show roles" enabled. Fascists see each other and Hitler;
   *  in 5–6 player games Hitler also sees the Fascists. */
  private roleVisibleTo(viewer: Player, target: Player): Role | null {
    if (target.role == null) return null;
    if (viewer.id === target.id) return target.role;
    if (this.phase === Phase.GameOver || this.options.showRoles) {
      return target.role;
    }
    const fascistView =
      viewer.role === 'fascist' &&
      (target.role === 'fascist' || target.role === 'hitler');
    const hitlerView =
      viewer.role === 'hitler' &&
      this.players.length <= 6 &&
      target.role === 'fascist';
    return fascistView || hitlerView ? target.role : null;
  }

  /** Chancellor candidates barred by term limits this nomination. */
  ineligibleChancellorIds(): string[] {
    const livingCount = this.players.filter((p) => p.isAlive).length;
    const ids: string[] = [];
    if (this.lastElectedChancellorId) ids.push(this.lastElectedChancellorId);
    // The last President is only term-limited while more than 5 players live.
    if (livingCount > 5 && this.lastElectedPresidentId) {
      ids.push(this.lastElectedPresidentId);
    }
    return ids;
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
      hasVoted: this.votes.has(p.id),
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
      minPlayers: this.options.minPlayers,
      maxPlayers: this.options.maxPlayers,
      players,
      board: this.board(),
      winner: this.winner,
      speaker: this.speakerId
        ? {
            playerId: this.speakerId,
            startedAt: this.speakerStartedAt,
            endsAt: this.speakerEndsAt,
          }
        : null,
      voteDeadline:
        this.phase === Phase.Voting && this.voteEndsAt > 0
          ? { startedAt: this.voteStartedAt, endsAt: this.voteEndsAt }
          : null,
      ineligibleChancellors:
        this.phase === Phase.Nomination ? this.ineligibleChancellorIds() : [],
      activePower: this.activePower,
      vetoUnlocked: this.fascistPolicies >= VETO_UNLOCK_FASCIST_POLICIES,
      vetoRequested: this.vetoRequested,
      you: {
        id: viewerId,
        role: viewer?.role ?? null,
        vote: this.votes.get(viewerId) ?? null,
        policies: this.policiesFor(viewerId),
        peek: viewerId === this.presidentId ? [...this.peekedPolicies] : [],
        investigation: this.investigationFor(viewerId),
      },
    };
  }

  /** Investigation result, shown only to the President who ran it. */
  private investigationFor(
    viewerId: string,
  ): { name: string; party: Faction } | null {
    if (!this.investigation || viewerId !== this.presidentId) return null;
    const target = this.findPlayer(this.investigation.targetId);
    return target ? { name: target.name, party: this.investigation.party } : null;
  }

  /** The legislative hand a viewer may currently see (President or Chancellor). */
  private policiesFor(viewerId: string): Policy[] {
    const isPresidentTurn =
      this.phase === Phase.PresidentLegislative && viewerId === this.presidentId;
    const isChancellorTurn =
      this.phase === Phase.ChancellorLegislative && viewerId === this.chancellorId;
    return isPresidentTurn || isChancellorTurn ? [...this.drawnPolicies] : [];
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
