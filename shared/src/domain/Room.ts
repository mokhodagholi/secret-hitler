import {
  Phase,
  WANT_START_COOLDOWN_MS,
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
  discussionStartedAt = 0;
  discussionEndsAt = 0;
  voteStartedAt = 0;
  voteEndsAt = 0;
  legislativeStartedAt = 0;
  legislativeEndsAt = 0;
  nominationStartedAt = 0;
  nominationEndsAt = 0;
  /** Executive power awaiting the President's use, else null. */
  activePower: ExecutivePower | null = null;
  /** Players already investigated this game (each may be investigated once). */
  investigatedIds: string[] = [];
  /** Top three policies held for the President during Policy Peek. */
  peekedPolicies: Policy[] = [];
  /** Last investigation result, private to the President until acknowledged. */
  investigation: { targetId: string; party: Faction } | null = null;
  /** Loyalty checks this game — each investigator keeps the party they saw. */
  investigations: {
    investigatorId: string;
    targetId: string;
    party: Faction;
  }[] = [];
  /** After a special election, the round rotation resumes after this player. */
  specialElectionResumeAfterId: string | null = null;
  /** The Chancellor has proposed a veto this legislative session. */
  vetoRequested = false;
  /** Open table vote to remove a player, else null. Game clocks freeze while set. */
  kickVote: KickVoteState | null = null;
  /** Viewers who already used their one kick request; refunded if that kick passes. */
  spentKickRequestIds = new Set<string>();
  /** Public-table must-choose window while half have tapped Start. */
  startChoice: StartChoiceState | null = null;
  /** Join keys voted off this room — they cannot sit here again. */
  bannedJoinKeys = new Set<string>();

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

  /** Remember the group post so it can be rewritten if the host leaves. */
  bindOriginMessage(messageId: number): void {
    this.options.originMessageId = messageId;
  }

  findPlayer(id: string): Player | undefined {
    return this.players.find((p) => p.id === id);
  }

  /** Living in-game, or connected in lobby — the people who count on a kick vote. */
  kickVoteElectorate(): Player[] {
    if (this.phase === Phase.Lobby) {
      return this.players.filter((player) => player.connected);
    }
    return this.players.filter((player) => player.isAlive);
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

  /** Roles are visible to a viewer if they're the player or the game is over.
   *  Fascists see each other and Hitler; in 5–6 player games Hitler also sees
   *  the Fascists. Liberals never see anyone. */
  private roleVisibleTo(viewer: Player, target: Player): Role | null {
    if (target.role == null) return null;
    if (viewer.id === target.id) return target.role;
    if (this.phase === Phase.GameOver) {
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
      wantsStart: p.wantsStart,
      isAlive: p.isAlive,
      isPresident: p.id === this.presidentId,
      isChancellor: p.id === this.chancellorId,
      hasVoted: this.votes.has(p.id),
      vote: this.phase === Phase.Voting ? null : (this.votes.get(p.id) ?? null),
      wantsContinue: p.wantsContinue,
      role: this.roleVisibleTo(viewer, p),
      party: this.partyVisibleTo(viewer.id, p.id),
      selfMuted: false,
    };
  }

  /** Party the viewer learned by investigating this player. Hidden from others. */
  private partyVisibleTo(viewerId: string, targetId: string): Faction | null {
    return (
      this.investigations.find(
        (entry) =>
          entry.investigatorId === viewerId && entry.targetId === targetId,
      )?.party ?? null
    );
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
      kind: this.options.kind === 'public' ? 'public' : 'hosted',
      startChoice: this.startChoice
        ? { startedAt: this.startChoice.startedAt, endsAt: this.startChoice.endsAt }
        : null,
      players,
      board: this.board(),
      winner: this.winner,
      discussionDeadline:
        this.discussionEndsAt > 0
          ? { startedAt: this.discussionStartedAt, endsAt: this.discussionEndsAt }
          : null,
      voteDeadline:
        this.phase === Phase.Voting && this.voteEndsAt > 0
          ? { startedAt: this.voteStartedAt, endsAt: this.voteEndsAt }
          : null,
      legislativeDeadline:
        this.legislativeEndsAt > 0
          ? { startedAt: this.legislativeStartedAt, endsAt: this.legislativeEndsAt }
          : null,
      nominationDeadline:
        this.nominationEndsAt > 0
          ? { startedAt: this.nominationStartedAt, endsAt: this.nominationEndsAt }
          : null,
      kickVote: this.kickVoteViewFor(viewerId),
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
        canRequestKick: !this.spentKickRequestIds.has(viewerId),
        wantStartCooldownUntil:
          viewer?.wantStartAt != null
            ? viewer.wantStartAt + WANT_START_COOLDOWN_MS
            : null,
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
      ...(this.options.kind === 'public' ? { kind: 'public' as const } : {}),
    };
  }

  /** Full authoritative dump so a process restart can resume the same table. */
  toSnapshot(): RoomSnapshot {
    return {
      id: this.id,
      code: this.code,
      options: { ...this.options },
      passwordHash: this.passwordHash,
      deck: this.deck.toSnapshot(),
      players: this.players.map((player) => ({ ...player })),
      phase: this.phase,
      hostId: this.hostId,
      liberalPolicies: this.liberalPolicies,
      fascistPolicies: this.fascistPolicies,
      electionTracker: this.electionTracker,
      presidentId: this.presidentId,
      chancellorId: this.chancellorId,
      lastElectedPresidentId: this.lastElectedPresidentId,
      lastElectedChancellorId: this.lastElectedChancellorId,
      lastEnacted: [...this.lastEnacted],
      winner: this.winner,
      votes: [...this.votes.entries()],
      drawnPolicies: [...this.drawnPolicies],
      discussionStartedAt: this.discussionStartedAt,
      discussionEndsAt: this.discussionEndsAt,
      voteStartedAt: this.voteStartedAt,
      voteEndsAt: this.voteEndsAt,
      legislativeStartedAt: this.legislativeStartedAt,
      legislativeEndsAt: this.legislativeEndsAt,
      nominationStartedAt: this.nominationStartedAt,
      nominationEndsAt: this.nominationEndsAt,
      activePower: this.activePower,
      investigatedIds: [...this.investigatedIds],
      peekedPolicies: [...this.peekedPolicies],
      investigation: this.investigation ? { ...this.investigation } : null,
      investigations: this.investigations.map((entry) => ({ ...entry })),
      specialElectionResumeAfterId: this.specialElectionResumeAfterId,
      vetoRequested: this.vetoRequested,
      kickVote: this.kickVote
        ? {
            requesterId: this.kickVote.requesterId,
            targetId: this.kickVote.targetId,
            votes: [...this.kickVote.votes.entries()],
            startedAt: this.kickVote.startedAt,
            endsAt: this.kickVote.endsAt,
            needed: this.kickVote.needed,
          }
        : null,
      spentKickRequestIds: [...this.spentKickRequestIds],
      startChoice: this.startChoice
        ? { startedAt: this.startChoice.startedAt, endsAt: this.startChoice.endsAt }
        : null,
      bannedJoinKeys: [...this.bannedJoinKeys],
    };
  }

  static fromSnapshot(snapshot: RoomSnapshot): Room {
    const deck = new PolicyDeck();
    deck.restore(snapshot.deck.draw, snapshot.deck.discard);
    const room = new Room({
      id: snapshot.id,
      code: snapshot.code,
      options: { ...snapshot.options },
      passwordHash: snapshot.passwordHash,
      deck,
    });
    room.players = snapshot.players.map((player) => ({
      ...player,
      wantsStart: player.wantsStart ?? false,
      wantStartAt: player.wantStartAt ?? null,
      unreadySince: player.unreadySince ?? null,
      joinKey: player.joinKey ?? null,
      wantsContinue: player.wantsContinue ?? false,
    }));
    room.phase = snapshot.phase;
    room.hostId = snapshot.hostId;
    room.liberalPolicies = snapshot.liberalPolicies;
    room.fascistPolicies = snapshot.fascistPolicies;
    room.electionTracker = snapshot.electionTracker;
    room.presidentId = snapshot.presidentId;
    room.chancellorId = snapshot.chancellorId;
    room.lastElectedPresidentId = snapshot.lastElectedPresidentId;
    room.lastElectedChancellorId = snapshot.lastElectedChancellorId;
    room.lastEnacted = [...snapshot.lastEnacted];
    room.winner = snapshot.winner;
    room.votes = new Map(snapshot.votes);
    room.drawnPolicies = [...snapshot.drawnPolicies];
    room.discussionStartedAt = snapshot.discussionStartedAt;
    room.discussionEndsAt = snapshot.discussionEndsAt;
    room.voteStartedAt = snapshot.voteStartedAt;
    room.voteEndsAt = snapshot.voteEndsAt;
    room.legislativeStartedAt = snapshot.legislativeStartedAt;
    room.legislativeEndsAt = snapshot.legislativeEndsAt;
    room.nominationStartedAt = snapshot.nominationStartedAt;
    room.nominationEndsAt = snapshot.nominationEndsAt;
    room.activePower = snapshot.activePower;
    room.investigatedIds = [...snapshot.investigatedIds];
    room.peekedPolicies = [...snapshot.peekedPolicies];
    room.investigation = snapshot.investigation
      ? { ...snapshot.investigation }
      : null;
    room.investigations = snapshot.investigations.map((entry) => ({ ...entry }));
    room.specialElectionResumeAfterId = snapshot.specialElectionResumeAfterId;
    room.vetoRequested = snapshot.vetoRequested;
    room.kickVote = snapshot.kickVote
      ? {
          requesterId: snapshot.kickVote.requesterId,
          targetId: snapshot.kickVote.targetId,
          votes: new Map(snapshot.kickVote.votes),
          startedAt: snapshot.kickVote.startedAt,
          endsAt: snapshot.kickVote.endsAt,
          needed: snapshot.kickVote.needed,
        }
      : null;
    room.spentKickRequestIds = new Set(snapshot.spentKickRequestIds ?? []);
    room.startChoice = snapshot.startChoice
      ? { startedAt: snapshot.startChoice.startedAt, endsAt: snapshot.startChoice.endsAt }
      : null;
    room.bannedJoinKeys = new Set(snapshot.bannedJoinKeys ?? []);
    return room;
  }

  private kickVoteViewFor(viewerId: string): GameStateView['kickVote'] {
    const vote = this.kickVote;
    if (!vote) return null;
    const votedIds = [...vote.votes.keys()];
    return {
      requesterId: vote.requesterId,
      targetId: vote.targetId,
      startedAt: vote.startedAt,
      endsAt: vote.endsAt,
      votedCount: votedIds.length,
      voterCount: this.kickVoteElectorate().filter(
        (player) => player.id !== vote.targetId,
      ).length,
      needed: vote.needed,
      yourVote: vote.votes.has(viewerId) ? vote.votes.get(viewerId)! : null,
      votedIds,
    };
  }
}

/** JSON-safe room dump. Maps become entries so Postgres jsonb can store them. */
export interface RoomSnapshot {
  id: string;
  code: string;
  options: RoomOptions;
  passwordHash: string | null;
  deck: { draw: Policy[]; discard: Policy[] };
  players: Player[];
  phase: Phase;
  hostId: string;
  liberalPolicies: number;
  fascistPolicies: number;
  electionTracker: number;
  presidentId: string | null;
  chancellorId: string | null;
  lastElectedPresidentId: string | null;
  lastElectedChancellorId: string | null;
  lastEnacted: Policy[];
  winner: Faction | null;
  votes: [string, Vote][];
  drawnPolicies: Policy[];
  discussionStartedAt: number;
  discussionEndsAt: number;
  voteStartedAt: number;
  voteEndsAt: number;
  legislativeStartedAt: number;
  legislativeEndsAt: number;
  nominationStartedAt: number;
  nominationEndsAt: number;
  activePower: ExecutivePower | null;
  investigatedIds: string[];
  peekedPolicies: Policy[];
  investigation: { targetId: string; party: Faction } | null;
  investigations: { investigatorId: string; targetId: string; party: Faction }[];
  specialElectionResumeAfterId: string | null;
  vetoRequested: boolean;
  /** Absent on rooms snapshotted before table kick votes existed. */
  kickVote?: {
    requesterId: string;
    targetId: string;
    votes: [string, boolean][];
    startedAt: number;
    endsAt: number;
    needed: number;
  } | null;
  /** Absent on rooms snapshotted before the one-request kick limit. */
  spentKickRequestIds?: string[];
  /** Absent on rooms snapshotted before public-table start choice. */
  startChoice?: { startedAt: number; endsAt: number } | null;
  /** Absent on rooms snapshotted before table bans. */
  bannedJoinKeys?: string[];
}

/** Authoritative kick-vote record kept on the room. */
export interface KickVoteState {
  requesterId: string;
  targetId: string;
  votes: Map<string, boolean>;
  startedAt: number;
  endsAt: number;
  needed: number;
}

export interface StartChoiceState {
  startedAt: number;
  endsAt: number;
}
