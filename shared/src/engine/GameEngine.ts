import {
  DISCUSSION_DURATION_MS,
  KICK_VOTE_DURATION_MS,
  LEGISLATIVE_DURATION_MS,
  NOMINATION_DURATION_MS,
  Phase,
  VOTE_DURATION_MS,
  isOpeningNight,
  kickVoteYesNeeded,
  type ChatMessage,
  type ExecutivePower,
  type Faction,
  type LogCode,
  type LogEntry,
  type Player,
  type Policy,
} from '../types/GameState';
import type { GameCommand } from '../types/events';
import { TypedEmitter } from '../util/TypedEmitter';
import { type EngineError, err } from './errors';
import { makeId } from '../util/ids';
import { PlayerFactory } from '../factories/PlayerFactory';
import { Room } from '../domain/Room';
import { buildRoleBag } from '../rules/roleDistribution';
import type { GamePhase, PhaseHost } from './phases/GamePhase';
import { ChancellorLegislativePhase } from './phases/ChancellorLegislativePhase';
import { GameOverPhase } from './phases/GameOverPhase';
import { LobbyPhase } from './phases/LobbyPhase';
import { NominationPhase } from './phases/NominationPhase';
import { PresidentLegislativePhase } from './phases/PresidentLegislativePhase';
import { SpecialPowerPhase } from './phases/SpecialPowerPhase';
import { VotingPhase } from './phases/VotingPhase';

/** Events the engine emits; the server subscribes and fans them out over WS. */
export interface EngineEvents extends Record<string, unknown> {
  /** Room state changed — server should re-broadcast per-viewer snapshots. */
  stateChanged: { room: Room };
  /** A player's secret role was assigned — deliver privately to that player. */
  roleAssigned: { playerId: string };
  chat: { message: ChatMessage };
  log: { entry: LogEntry };
  gameStarted: { room: Room };
  gameOver: { room: Room };
  /** Discussion window opened (endsAt set) or closed (null); server (un)schedules. */
  discussionTimerChanged: { endsAt: number | null };
  /** Vote window opened (endsAt set) or closed (null); server (un)schedules. */
  voteTimerChanged: { endsAt: number | null };
  /** Legislative window opened (endsAt set) or closed (null); server (un)schedules. */
  legislativeTimerChanged: { endsAt: number | null };
  /** Nomination window opened (endsAt set) or closed (null); server (un)schedules. */
  nominationTimerChanged: { endsAt: number | null };
  /** Table kick-vote window opened or closed; server (un)schedules. */
  kickVoteTimerChanged: { endsAt: number | null };
  /** The table finished a kick vote — server may eject and notify Bale. */
  kickVoteResolved: {
    requesterId: string;
    targetId: string;
    yesCount: number;
    needed: number;
    kicked: boolean;
  };
}

/**
 * State-machine host. Owns a single {@link Room} and is the only place its
 * state mutates. Lobby flow (join → ready → start) lives here; every in-game
 * command is delegated to the current {@link GamePhase}.
 */
export class GameEngine extends TypedEmitter<EngineEvents> implements PhaseHost {
  private readonly phases: Partial<Record<Phase, GamePhase>>;
  private currentPhase: GamePhase;
  /** True while applying a successful table kick so vacate does not cancel it. */
  private settlingKickVote = false;

  constructor(readonly room: Room) {
    super();
    this.phases = {
      [Phase.Lobby]: new LobbyPhase(),
      [Phase.Nomination]: new NominationPhase(this),
      [Phase.Voting]: new VotingPhase(this),
      [Phase.PresidentLegislative]: new PresidentLegislativePhase(this),
      [Phase.ChancellorLegislative]: new ChancellorLegislativePhase(this),
      [Phase.SpecialPower]: new SpecialPowerPhase(this),
      [Phase.GameOver]: new GameOverPhase(this),
    };
    this.currentPhase = this.phaseFor(room.phase);
  }

  // --- State machine -------------------------------------------------------

  /** Move the room to a new phase, running exit/enter hooks. */
  transitionTo(name: Phase): void {
    this.currentPhase.exit?.();
    this.currentPhase = this.phaseFor(name);
    this.room.phase = name;
    this.currentPhase.enter?.();
  }

  private phaseFor(name: Phase): GamePhase {
    const phase = this.phases[name];
    if (!phase) throw new Error(`Phase not implemented: ${name}`);
    return phase;
  }

  // --- Lobby ---------------------------------------------------------------

  addPlayer(name: string, asHost = false, avatar?: number): Player | EngineError {
    const room = this.room;
    if (room.phase !== Phase.Lobby) {
      return err('ALREADY_STARTED', 'The game has already started.');
    }
    if (room.isFull) {
      return err('ROOM_FULL', 'This room is full.');
    }

    const isHost = asHost || room.players.length === 0;
    const player = PlayerFactory.create(name, room.players.length, isHost, avatar);
    room.players.push(player);
    if (isHost) room.hostId = player.id;

    this.log('joined', { name: player.name });
    this.changed();
    return player;
  }

  /**
   * Permanently vacate a seat (explicit leave, not a network drop). In the
   * lobby the seat is removed. In-game the player is marked dead so they
   * cannot be President or Chancellor; the socket layer then closes them.
   */
  removePlayer(playerId: string): void {
    const room = this.room;
    const index = room.players.findIndex((player) => player.id === playerId);
    if (index === -1) return;

    if (room.phase !== Phase.Lobby) {
      this.vacateInGame(room.players[index], 'left');
      return;
    }

    const [removed] = room.players.splice(index, 1);
    room.players.forEach((player, seat) => (player.seat = seat));
    if (room.hostId === removed.id) this.maybeMigrateHost();

    this.log('left', { name: removed.name });
    this.changed();
  }

  /**
   * Host-only kick. Lobby: the seat is removed. In-game: marked dead, same as
   * an explicit leave. The socket layer then closes the target's connection.
   */
  kickPlayer(hostId: string, targetId: string): EngineError | null {
    const room = this.room;
    if (hostId !== room.hostId) {
      return err('NOT_HOST', 'Only the host can remove a player.');
    }
    if (targetId === hostId) {
      return err('INVALID_ACTION', 'You cannot kick yourself.');
    }
    const target = room.findPlayer(targetId);
    if (!target) {
      return err('INVALID_ACTION', 'That player is not in the room.');
    }
    if (room.phase === Phase.Lobby) {
      this.removePlayer(targetId);
      return null;
    }
    this.vacateInGame(target, 'kicked');
    return null;
  }

  setConnected(playerId: string, connected: boolean): void {
    const player = this.room.findPlayer(playerId);
    if (!player || player.connected === connected) return;
    player.connected = connected;
    this.log(connected ? 'reconnected' : 'disconnected', { name: player.name });
    if (!this.room.kickVote) this.currentPhase.presenceChanged?.();
    this.changed();
  }

  setReady(playerId: string, ready: boolean): void {
    const player = this.room.findPlayer(playerId);
    if (!player || this.room.phase !== Phase.Lobby) return;
    player.ready = ready;
    this.changed();
  }

  /** True when the host may start: minimum players present and all ready. */
  canStart(): boolean {
    const connected = this.room.players.filter((p) => p.connected);
    return (
      this.room.phase === Phase.Lobby &&
      connected.length >= this.room.options.minPlayers &&
      connected.every((p) => p.ready)
    );
  }

  startGame(requesterId: string): EngineError | null {
    const room = this.room;
    if (room.phase !== Phase.Lobby) {
      return err('ALREADY_STARTED', 'The game has already started.');
    }
    if (requesterId !== room.hostId) {
      return err('NOT_HOST', 'Only the host can start the game.');
    }
    const connected = room.players.filter((p) => p.connected);
    if (connected.length < room.options.minPlayers) {
      return err(
        'NOT_ENOUGH_PLAYERS',
        `Need at least ${room.options.minPlayers} players.`,
      );
    }
    if (!connected.every((p) => p.ready)) {
      return err('PLAYERS_NOT_READY', 'Everyone must be ready to start.');
    }

    // Disconnected lobby players never received a role — drop their seats.
    room.players = connected;
    room.players.forEach((player, seat) => (player.seat = seat));

    this.dealRoles(room.players);
    room.deck.reset();
    room.liberalPolicies = 0;
    room.fascistPolicies = 0;
    room.electionTracker = 0;
    room.lastEnacted = [];
    room.drawnPolicies = [];
    room.winner = null;
    room.lastElectedPresidentId = null;
    room.lastElectedChancellorId = null;
    room.activePower = null;
    room.investigatedIds = [];
    room.investigations = [];
    room.peekedPolicies = [];
    room.investigation = null;
    room.specialElectionResumeAfterId = null;
    room.vetoRequested = false;
    room.kickVote = null;
    room.spentKickRequestIds.clear();
    room.presidentId = this.livingInSeatOrder()[0]?.id ?? null;
    this.transitionTo(Phase.Nomination);

    this.log('gameStarted');
    this.emit('gameStarted', { room });
    this.changed();
    return null;
  }

  // --- Chat / log ------------------------------------------------------------

  postChat(playerId: string, text: string): void {
    if (this.inOpeningNight()) return;
    const player = this.room.findPlayer(playerId);
    const body = text.trim();
    if (!player || !body) return;
    const message: ChatMessage = {
      id: makeId(),
      playerId: player.id,
      name: player.name,
      text: body.slice(0, 500),
      at: Date.now(),
    };
    this.emit('chat', { message });
  }

  // --- In-game commands ------------------------------------------------------

  /** Delegate an in-game {@link GameCommand} to the current phase. */
  handleCommand(playerId: string, command: GameCommand): EngineError | null {
    if (this.room.kickVote) {
      return err('INVALID_ACTION', 'A kick vote is in progress.');
    }
    return this.currentPhase.handle(playerId, command);
  }

  // --- Board / round progression (PhaseHost) ----------------------------------

  enactPolicy(policy: Policy): void {
    const room = this.room;
    if (policy === 'liberal') room.liberalPolicies += 1;
    else room.fascistPolicies += 1;
    room.lastEnacted = [...room.lastEnacted, policy].slice(-5);

    if (room.liberalPolicies >= 5) {
      this.log('liberalsWin');
      this.endGame('liberal');
    } else if (room.fascistPolicies >= 6) {
      this.log('fascistsWin');
      this.endGame('fascist');
    }
  }

  /** A failed government: advance the tracker, chaos-enact on the third, next round. */
  failElection(): void {
    const room = this.room;
    room.electionTracker += 1;
    if (room.electionTracker >= 3) {
      const [policy] = room.deck.drawTiles(1);
      if (policy) {
        this.log('chaos');
        this.enactPolicy(policy);
      }
      room.electionTracker = 0;
      // Chaos clears term limits — every player is eligible again.
      room.lastElectedPresidentId = null;
      room.lastElectedChancellorId = null;
    }
    this.advanceRound();
  }

  advanceRound(): void {
    const room = this.room;
    if (room.phase === Phase.GameOver) return;
    if (this.fascistsHoldTheTable()) {
      this.log('fascistsWinNumbers');
      this.endGame('fascist');
      return;
    }
    // A special election runs one round out of turn; afterwards the normal
    // rotation resumes from the player who invoked it.
    const resumeAfter = room.specialElectionResumeAfterId;
    room.specialElectionResumeAfterId = null;
    room.presidentId = resumeAfter
      ? this.nextLivingAfter(resumeAfter)
      : this.nextPresidentId();
    this.transitionTo(Phase.Nomination);
  }

  grantPower(power: ExecutivePower): void {
    const room = this.room;
    room.activePower = power;
    room.investigation = null;
    room.peekedPolicies = power === 'policyPeek' ? room.deck.peekTop(3) : [];
    this.transitionTo(Phase.SpecialPower);
    this.changed();
  }

  startSpecialElection(playerId: string): void {
    const room = this.room;
    room.specialElectionResumeAfterId = room.presidentId;
    room.presidentId = playerId;
    this.transitionTo(Phase.Nomination);
  }

  endGame(winner: Faction): void {
    this.room.winner = winner;
    this.transitionTo(Phase.GameOver);
    this.emit('gameOver', { room: this.room });
    this.changed();
  }

  /** Living players ordered by seat. */
  private livingInSeatOrder(): Player[] {
    return this.room.players
      .filter((p) => p.isAlive)
      .sort((a, b) => a.seat - b.seat);
  }

  /**
   * A leaver can shrink the table until Fascists equal or outnumber Liberals.
   * Official rules don't cover mid-game absences; we check at the start of
   * the next round so the current election/legislation can finish.
   */
  private fascistsHoldTheTable(): boolean {
    const living = this.room.players.filter((player) => player.isAlive);
    const present = living.filter((player) => player.connected);
    if (present.length === 0 || present.length === living.length) return false;
    const liberals = present.filter((player) => player.role === 'liberal').length;
    return present.length - liberals >= liberals;
  }

  private nextPresidentId(): string | null {
    return this.nextLivingAfter(this.room.presidentId);
  }

  /**
   * Next living, connected player by seat after `playerId`, wrapping around.
   * Dead and disconnected seats stay in the circle but are skipped so they
   * cannot take the presidency.
   */
  private nextLivingAfter(playerId: string | null): string | null {
    const seated = [...this.room.players].sort((a, b) => a.seat - b.seat);
    if (seated.length === 0) return null;
    const start = seated.findIndex((player) => player.id === playerId);
    const from = start === -1 ? 0 : start;
    for (let step = 1; step <= seated.length; step++) {
      const candidate = seated[(from + step) % seated.length];
      if (candidate.isAlive && candidate.connected) return candidate.id;
    }
    return null;
  }

  /**
   * Explicit leave or kick during a running game: the seat stays (spectators
   * and the board need it) but the player is out. If they held office, the
   * current round is voided and the presidency moves on.
   */
  private vacateInGame(player: Player, reason: 'left' | 'kicked'): void {
    const heldPresident = this.room.presidentId === player.id;
    const heldChancellor = this.room.chancellorId === player.id;
    const alreadyDead = !player.isAlive;
    player.isAlive = false;
    player.connected = false;
    if (alreadyDead) {
      this.changed();
      return;
    }

    this.log(reason, { name: player.name });
    if (this.room.hostId === player.id) this.maybeMigrateHost();
    if (this.room.phase === Phase.GameOver) {
      this.changed();
      return;
    }
    if (this.room.kickVote && !this.settlingKickVote) {
      this.onVacatedDuringKickVote(player.id);
    }
    if (heldPresident || heldChancellor) {
      this.log(heldPresident ? 'presidentVacated' : 'chancellorVacated', {
        name: player.name,
      });
      this.abortCurrentRound();
      return;
    }
    if (!this.room.kickVote) this.currentPhase.presenceChanged?.();
    this.changed();
  }

  /** A seat emptied while a kick vote is open: cancel if it was the target. */
  private onVacatedDuringKickVote(playerId: string): void {
    const vote = this.room.kickVote;
    if (!vote) return;
    if (vote.targetId === playerId) {
      this.finishKickVote(false);
      return;
    }
    vote.votes.delete(playerId);
    this.maybeResolveKickVote();
  }

  /** Drop an unfinished government and pass the presidency on. */
  private abortCurrentRound(): void {
    const room = this.room;
    if (room.drawnPolicies.length) {
      room.deck.discardTiles(room.drawnPolicies);
      room.drawnPolicies = [];
    }
    room.chancellorId = null;
    room.vetoRequested = false;
    if (room.phase === Phase.SpecialPower) {
      this.advanceRound();
      return;
    }
    this.failElection();
  }

  /** First-round deal / night / glance — no talk, no skipping to nomination. */
  inOpeningNight(): boolean {
    const room = this.room;
    return isOpeningNight({
      phase: room.phase,
      discussionStartedAt: room.discussionStartedAt,
      liberalPolicies: room.liberalPolicies,
      fascistPolicies: room.fascistPolicies,
      electionTracker: room.electionTracker,
    });
  }

  // --- Discussion window (PhaseHost) -----------------------------------------

  /** Open the shared discussion window; everyone may chat until it elapses. */
  openDiscussion(): void {
    const room = this.room;
    room.discussionStartedAt = Date.now();
    room.discussionEndsAt = room.discussionStartedAt + DISCUSSION_DURATION_MS;
    this.emit('discussionTimerChanged', { endsAt: room.discussionEndsAt });
    this.changed();
  }

  closeDiscussion(): void {
    this.room.discussionStartedAt = 0;
    this.room.discussionEndsAt = 0;
    this.emit('discussionTimerChanged', { endsAt: null });
  }

  /** Discussion ended (window elapsed or the President skipped it): open the
   *  nomination window. No-op once discussion has already closed. */
  endDiscussion(): void {
    if (this.room.discussionEndsAt === 0) return;
    this.closeDiscussion();
    this.openNominationTimer();
    this.changed();
  }

  /** Server calls this when the discussion window elapses. */
  resolveDiscussionTimeout(): void {
    if (this.room.kickVote) return;
    this.endDiscussion();
  }

  // --- Vote timer (PhaseHost) ------------------------------------------------

  openVote(): void {
    const room = this.room;
    room.voteStartedAt = Date.now();
    room.voteEndsAt = room.voteStartedAt + VOTE_DURATION_MS;
    this.emit('voteTimerChanged', { endsAt: room.voteEndsAt });
  }

  closeVote(): void {
    this.room.voteStartedAt = 0;
    this.room.voteEndsAt = 0;
    this.emit('voteTimerChanged', { endsAt: null });
  }

  /** Server calls this when the vote window elapses. */
  resolveVoteTimeout(): void {
    if (this.room.kickVote) return;
    this.currentPhase.timeout?.();
  }

  // --- Legislative timer (PhaseHost) -----------------------------------------

  openLegislativeTimer(delayMs = 0): void {
    const room = this.room;
    const openAt = Date.now() + Math.max(0, delayMs);
    room.legislativeStartedAt = openAt;
    room.legislativeEndsAt = openAt + LEGISLATIVE_DURATION_MS;
    this.emit('legislativeTimerChanged', { endsAt: room.legislativeEndsAt });
  }

  closeLegislativeTimer(): void {
    this.room.legislativeStartedAt = 0;
    this.room.legislativeEndsAt = 0;
    this.emit('legislativeTimerChanged', { endsAt: null });
  }

  /** Server calls this when a legislator's choice window elapses. */
  resolveLegislativeTimeout(): void {
    if (this.room.kickVote) return;
    this.currentPhase.timeout?.();
  }

  // --- Nomination timer (PhaseHost) ------------------------------------------

  openNominationTimer(): void {
    const room = this.room;
    room.nominationStartedAt = Date.now();
    room.nominationEndsAt = room.nominationStartedAt + NOMINATION_DURATION_MS;
    this.emit('nominationTimerChanged', { endsAt: room.nominationEndsAt });
  }

  closeNominationTimer(): void {
    this.room.nominationStartedAt = 0;
    this.room.nominationEndsAt = 0;
    this.emit('nominationTimerChanged', { endsAt: null });
  }

  /** Server calls this when the President's nomination window elapses. */
  resolveNominationTimeout(): void {
    if (this.room.kickVote) return;
    this.currentPhase.timeout?.();
  }

  // --- Table kick vote ----------------------------------------------------------

  /**
   * A living player asks the table to remove another living player. Game
   * clocks freeze until the vote is settled.
   */
  requestKick(requesterId: string, targetId: string): EngineError | null {
    const room = this.room;
    if (room.phase === Phase.Lobby || room.phase === Phase.GameOver) {
      return err('INVALID_ACTION', 'There is no game in progress.');
    }
    if (this.inOpeningNight()) {
      return err('INVALID_ACTION', 'Wait until night is over.');
    }
    if (room.kickVote) {
      return err('INVALID_ACTION', 'A kick vote is already in progress.');
    }
    if (requesterId === targetId) {
      return err('INVALID_ACTION', 'You cannot kick yourself.');
    }
    const requester = room.findPlayer(requesterId);
    const target = room.findPlayer(targetId);
    if (!requester?.isAlive) {
      return err('INVALID_ACTION', 'You cannot request a kick.');
    }
    if (!target?.isAlive) {
      return err('INVALID_ACTION', 'That player is not in the game.');
    }
    if (room.spentKickRequestIds.has(requesterId)) {
      return err('INVALID_ACTION', 'You have already requested a kick.');
    }
    const living = room.players.filter((player) => player.isAlive);
    if (living.length < 3) {
      return err('INVALID_ACTION', 'Not enough players to vote a kick.');
    }

    const startedAt = Date.now();
    room.spentKickRequestIds.add(requesterId);
    room.kickVote = {
      requesterId,
      targetId,
      votes: new Map([[requesterId, true]]),
      startedAt,
      endsAt: startedAt + KICK_VOTE_DURATION_MS,
      needed: kickVoteYesNeeded(living.length),
    };
    this.pauseDeadlineTimers();
    this.emit('kickVoteTimerChanged', { endsAt: room.kickVote.endsAt });
    this.log('kickVoteStarted', {
      name: requester.name,
      target: target.name,
      requesterId,
      targetId,
    });
    if (this.maybeResolveKickVote()) return null;
    this.changed();
    return null;
  }

  /** Cast Ja (remove) or Nein (keep) on the open table kick vote. */
  voteKick(playerId: string, agree: boolean): EngineError | null {
    const vote = this.room.kickVote;
    if (!vote) {
      return err('INVALID_ACTION', 'There is no kick vote in progress.');
    }
    if (playerId === vote.targetId) {
      return err('INVALID_ACTION', 'You cannot vote on your own kick.');
    }
    const player = this.room.findPlayer(playerId);
    if (!player?.isAlive) {
      return err('INVALID_ACTION', 'You cannot vote on this kick.');
    }
    if (vote.votes.has(playerId)) {
      return err('INVALID_ACTION', 'You have already voted.');
    }
    vote.votes.set(playerId, agree);
    if (this.maybeResolveKickVote()) return null;
    this.changed();
    return null;
  }

  /** Server calls this when the kick-vote window elapses. */
  resolveKickVoteTimeout(): void {
    if (!this.room.kickVote) return;
    this.finishKickVote(this.kickVoteYesCount() >= this.room.kickVote.needed);
  }

  private kickVoteYesCount(): number {
    const vote = this.room.kickVote;
    if (!vote) return 0;
    return [...vote.votes.values()].filter((agree) => agree).length;
  }

  private kickVoteRemainingVoters(): number {
    const vote = this.room.kickVote;
    if (!vote) return 0;
    return this.room.players.filter(
      (player) =>
        player.isAlive &&
        player.id !== vote.targetId &&
        !vote.votes.has(player.id),
    ).length;
  }

  /** Resolve if the table has decided; returns true when the vote closed. */
  private maybeResolveKickVote(): boolean {
    const vote = this.room.kickVote;
    if (!vote) return false;
    const yes = this.kickVoteYesCount();
    if (yes >= vote.needed) {
      this.finishKickVote(true);
      return true;
    }
    if (yes + this.kickVoteRemainingVoters() < vote.needed) {
      this.finishKickVote(false);
      return true;
    }
    if (this.kickVoteRemainingVoters() === 0) {
      this.finishKickVote(false);
      return true;
    }
    return false;
  }

  private finishKickVote(kicked: boolean): void {
    const vote = this.room.kickVote;
    if (!vote) return;
    const target = this.room.findPlayer(vote.targetId);
    const requester = this.room.findPlayer(vote.requesterId);
    const yesCount = this.kickVoteYesCount();
    const needed = vote.needed;
    const heldOffice =
      kicked &&
      target != null &&
      (this.room.presidentId === target.id || this.room.chancellorId === target.id);
    const pausedAt = vote.startedAt;

    this.log(kicked ? 'kickVotePassed' : 'kickVoteFailed', {
      name: target?.name ?? requester?.name ?? '',
      requester: requester?.name ?? '',
      requesterId: vote.requesterId,
      targetId: vote.targetId,
      yes: yesCount,
      needed,
    });

    this.room.kickVote = null;
    if (kicked) this.room.spentKickRequestIds.delete(vote.requesterId);
    this.emit('kickVoteTimerChanged', { endsAt: null });

    if (kicked && target) {
      this.settlingKickVote = true;
      if (!heldOffice) this.resumeDeadlineTimers(pausedAt);
      this.vacateInGame(target, 'kicked');
      this.settlingKickVote = false;
    } else {
      this.resumeDeadlineTimers(pausedAt);
      this.changed();
    }
    this.emit('kickVoteResolved', {
      requesterId: vote.requesterId,
      targetId: vote.targetId,
      yesCount,
      needed,
      kicked,
    });
  }

  /** Unschedule running phase clocks without clearing their remaining time. */
  private pauseDeadlineTimers(): void {
    this.emit('discussionTimerChanged', { endsAt: null });
    this.emit('voteTimerChanged', { endsAt: null });
    this.emit('legislativeTimerChanged', { endsAt: null });
    this.emit('nominationTimerChanged', { endsAt: null });
  }

  /** Slide frozen deadlines forward by the pause so remaining time is intact. */
  private resumeDeadlineTimers(pausedAt: number): void {
    const pauseMs = Math.max(0, Date.now() - pausedAt);
    const shift = (
      startedAt: number,
      endsAt: number,
    ): { startedAt: number; endsAt: number } => ({
      startedAt: startedAt > 0 ? startedAt + pauseMs : 0,
      endsAt: endsAt > 0 ? endsAt + pauseMs : 0,
    });
    const room = this.room;
    if (room.discussionEndsAt > 0) {
      const next = shift(room.discussionStartedAt, room.discussionEndsAt);
      room.discussionStartedAt = next.startedAt;
      room.discussionEndsAt = next.endsAt;
      this.emit('discussionTimerChanged', { endsAt: room.discussionEndsAt });
    }
    if (room.voteEndsAt > 0) {
      const next = shift(room.voteStartedAt, room.voteEndsAt);
      room.voteStartedAt = next.startedAt;
      room.voteEndsAt = next.endsAt;
      this.emit('voteTimerChanged', { endsAt: room.voteEndsAt });
    }
    if (room.legislativeEndsAt > 0) {
      const next = shift(room.legislativeStartedAt, room.legislativeEndsAt);
      room.legislativeStartedAt = next.startedAt;
      room.legislativeEndsAt = next.endsAt;
      this.emit('legislativeTimerChanged', { endsAt: room.legislativeEndsAt });
    }
    if (room.nominationEndsAt > 0) {
      const next = shift(room.nominationStartedAt, room.nominationEndsAt);
      room.nominationStartedAt = next.startedAt;
      room.nominationEndsAt = next.endsAt;
      this.emit('nominationTimerChanged', { endsAt: room.nominationEndsAt });
    }
  }

  // --- Host migration ----------------------------------------------------------

  /** Server calls this after the disconnect grace period; no-op if the host
   *  came back in time. */
  migrateHostIfDisconnected(): void {
    if (this.maybeMigrateHost()) this.changed();
  }

  private maybeMigrateHost(): boolean {
    const host = this.room.findPlayer(this.room.hostId);
    if (host?.connected) return false;
    const successor = this.room.players.find((p) => p.connected);
    if (!successor) return false;
    this.room.players.forEach((p) => (p.isHost = p.id === successor.id));
    this.room.hostId = successor.id;
    successor.ready = true;
    this.log('newHost', { name: successor.name });
    return true;
  }

  // --- Internals ---------------------------------------------------------

  private dealRoles(players: Player[]): void {
    const bag = shuffle(buildRoleBag(players.length));
    players.forEach((player, i) => {
      player.role = bag[i];
      this.emit('roleAssigned', { playerId: player.id });
    });
  }

  log(code: LogCode, params?: Record<string, string | number>): void {
    this.emit('log', { entry: { id: makeId(), code, params, at: Date.now() } });
  }

  changed(): void {
    this.emit('stateChanged', { room: this.room });
  }
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
