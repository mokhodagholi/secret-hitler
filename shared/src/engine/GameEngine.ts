import {
  BREATH_AFTER_CHAOS_MS,
  BREATH_AFTER_FAIL_MS,
  BREATH_AFTER_LAW_MS,
  BREATH_AFTER_POWER_MS,
  DISCUSSION_DURATION_MS,
  KICK_VOTE_DURATION_MS,
  LEGISLATIVE_DURATION_MS,
  LOBBY_AFK_MS,
  LOBBY_DISCONNECT_MS,
  NOMINATION_DURATION_MS,
  Phase,
  SPECIAL_POWER_DURATION_MS,
  START_CHOICE_DURATION_MS,
  VOTE_DURATION_MS,
  isOpeningNight,
  isPublicTable,
  kickVoteYesNeeded,
  type BreathAction,
  type ChatMessage,
  type ExecutivePower,
  type Faction,
  type LogCode,
  type LogEntry,
  type Player,
  type Policy,
  type RoundHistoryEntry,
} from '../types/GameState';
import {
  NOMINATION_PROMPT_MS,
  VOTE_PROMPT_MS,
  ceremonyDelay,
} from '../ravi/clipMs';
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
  /** Executive-power window opened (endsAt set) or closed (null); server (un)schedules. */
  specialPowerTimerChanged: { endsAt: number | null };
  /** Announce breath before the next hand-off; server (un)schedules. */
  breathTimerChanged: { endsAt: number | null };
  /** Table kick-vote window opened or closed; server (un)schedules. */
  kickVoteTimerChanged: { endsAt: number | null };
  /** Public-table Accept window opened or closed; server (un)schedules. */
  startChoiceTimerChanged: { endsAt: number | null };
  /** Lobby AFK clock for one seat; dueAt null cancels. */
  lobbyAfkTimerChanged: { playerId: string; dueAt: number | null };
  /** Lobby seats the socket layer must close (AFK / start-choice silence). */
  lobbyPlayersEjected: { playerIds: string[]; reason: 'AFK' };
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
  /** True while kicking start-choice holdouts so lobby math runs once at the end. */
  private settlingStartChoice = false;

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

  addPlayer(
    name: string,
    asHost = false,
    avatar?: number,
    joinKey?: string | null,
  ): Player | EngineError {
    const room = this.room;
    if (room.phase !== Phase.Lobby) {
      return err('ALREADY_STARTED', 'The game has already started.');
    }
    if (room.isFull) {
      return err('ROOM_FULL', 'This room is full.');
    }
    if (joinKey && room.bannedJoinKeys.has(joinKey)) {
      return err('BANNED', 'You cannot sit at this table.');
    }

    const isHost = asHost || room.players.length === 0;
    const player = PlayerFactory.create(
      name,
      room.players.length,
      isHost,
      avatar,
      joinKey,
    );
    room.players.push(player);
    if (isHost) room.hostId = player.id;

    this.log('joined', { name: player.name });
    this.armLobbyAfk(player);
    this.maybeAdvancePublicStart();
    this.changed();
    return player;
  }

  /**
   * Permanently vacate a seat (explicit leave, not a network drop). In the
   * lobby the seat is removed. In-game the player is marked dead so they
   * cannot be President or Chancellor; the socket layer then closes them.
   */
  removePlayer(playerId: string, logCode: LogCode = 'left'): void {
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

    this.emit('lobbyAfkTimerChanged', { playerId: removed.id, dueAt: null });
    this.log(logCode, { name: removed.name });
    if (!this.settlingStartChoice) this.maybeAdvancePublicStart();
    this.changed();
  }

  /**
   * Host-only kick. Lobby: the seat is removed (no ban — they may sit again).
   * In-game: marked dead and banned from this room, same as a passed kick vote.
   * The socket layer then closes the target's connection.
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
    this.banFromTable(target);
    this.vacateInGame(target, 'kicked');
    return null;
  }

  setConnected(playerId: string, connected: boolean): void {
    const player = this.room.findPlayer(playerId);
    if (!player || player.connected === connected) return;
    player.connected = connected;
    this.log(connected ? 'reconnected' : 'disconnected', { name: player.name });
    if (this.room.phase === Phase.Lobby) {
      if (connected) {
        player.unreadySince = this.isLobbyIdle(player) ? Date.now() : null;
      } else {
        player.unreadySince = Date.now();
      }
      this.armLobbyAfk(player);
      this.maybeAdvancePublicStart();
    }
    if (this.room.kickVote) this.maybeResolveKickVote();
    if (!this.room.kickVote) this.currentPhase.presenceChanged?.();
    this.changed();
  }

  setReady(playerId: string, ready: boolean): void {
    const player = this.room.findPlayer(playerId);
    if (!player || this.room.phase !== Phase.Lobby) return;
    if (this.room.startChoice && !ready) return;
    player.ready = ready;
    if (ready) {
      player.unreadySince = null;
    } else {
      player.wantsStart = false;
      player.unreadySince = Date.now();
    }
    this.armLobbyAfk(player);
    this.maybeAdvancePublicStart();
    this.changed();
  }

  setWantStart(playerId: string, want: boolean): EngineError | null {
    const room = this.room;
    if (room.phase !== Phase.Lobby) {
      return err('ALREADY_STARTED', 'The game has already started.');
    }
    if (!isPublicTable(room.options)) {
      return err('INVALID_ACTION', 'This table starts with the host.');
    }
    if (room.kickVote) {
      return err('INVALID_ACTION', 'A kick vote is already in progress.');
    }
    const player = room.findPlayer(playerId);
    if (!player || !player.connected) {
      return err('INVALID_ACTION', 'That player is not in the room.');
    }
    if (!want && room.startChoice) {
      return err('INVALID_ACTION', 'Start is locked while the table decides.');
    }
    if (want && !room.startChoice) {
      return err('INVALID_ACTION', 'Wait until the table is full.');
    }
    if (player.wantsStart === want) return null;
    player.wantsStart = want;
    if (want) {
      player.wantStartAt = Date.now();
      player.unreadySince = null;
      this.armLobbyAfk(player);
    } else {
      player.unreadySince = Date.now();
      this.armLobbyAfk(player);
    }
    this.maybeAdvancePublicStart();
    this.changed();
    return null;
  }

  /** True when the host may start: minimum players present. Hosted rooms also need Ready. */
  canStart(): boolean {
    const connected = this.room.players.filter((p) => p.connected);
    if (this.room.phase !== Phase.Lobby) return false;
    if (connected.length < this.room.options.minPlayers) return false;
    if (isPublicTable(this.room.options)) return true;
    return connected.every((p) => p.ready);
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
    const adminPlay = room.options.adminPlayUserId != null;
    if (!adminPlay && connected.length < room.options.minPlayers) {
      return err(
        'NOT_ENOUGH_PLAYERS',
        `Need at least ${room.options.minPlayers} players.`,
      );
    }
    if (
      !adminPlay &&
      !isPublicTable(room.options) &&
      !connected.every((p) => p.ready)
    ) {
      return err('PLAYERS_NOT_READY', 'Everyone must be ready to start.');
    }
    this.dealLobby(connected);
    return null;
  }

  resolveStartChoiceTimeout(): void {
    const room = this.room;
    if (!room.startChoice || room.phase !== Phase.Lobby) return;
    this.clearStartChoice();
    const holdouts = room.players.filter((player) => player.connected && !player.wantsStart);
    const kickedIds = holdouts.map((player) => player.id);
    this.settlingStartChoice = true;
    for (const player of holdouts) {
      this.removePlayer(player.id, 'kicked');
    }
    this.settlingStartChoice = false;
    if (kickedIds.length > 0) {
      this.emit('lobbyPlayersEjected', { playerIds: kickedIds, reason: 'AFK' });
    }
    this.maybeDealPublicTable();
    this.changed();
  }

  resolveLobbyAfkTimeout(playerId: string): void {
    const room = this.room;
    if (room.phase !== Phase.Lobby) return;
    const player = room.findPlayer(playerId);
    if (!player || player.unreadySince == null) return;
    if (!player.connected) {
      if (Date.now() < player.unreadySince + LOBBY_DISCONNECT_MS) return;
      this.removePlayer(playerId, 'kicked');
      this.emit('lobbyPlayersEjected', { playerIds: [playerId], reason: 'AFK' });
      return;
    }
    if (room.startChoice) return;
    if (!this.isLobbyIdle(player)) return;
    if (player.isHost || player.id === room.hostId) return;
    if (Date.now() < player.unreadySince + LOBBY_AFK_MS) return;
    this.removePlayer(playerId, 'kicked');
    this.emit('lobbyPlayersEjected', { playerIds: [playerId], reason: 'AFK' });
  }

  // --- Chat / log ------------------------------------------------------------

  postChat(playerId: string, text: string): void {
    if (this.inOpeningNight()) return;
    if (
      this.room.phase === Phase.PresidentLegislative ||
      this.room.phase === Phase.ChancellorLegislative
    ) {
      return;
    }
    const player = this.room.findPlayer(playerId);
    const body = text.trim();
    if (!player || !body || !player.isAlive) return;
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
    if (command.kind === 'skipTimer') {
      return this.skipTimer(playerId);
    }
    if (this.room.kickVote) {
      return err('INVALID_ACTION', 'A kick vote is in progress.');
    }
    if (this.room.pendingBreath) {
      return err('INVALID_ACTION', 'Wait for the table to settle.');
    }
    return this.currentPhase.handle(playerId, command);
  }

  /**
   * Admin `/play-game` only — resolve the open announce breath or decision
   * clock immediately so local DEV can step through ceremony waits.
   */
  skipTimer(playerId: string): EngineError | null {
    if (this.room.options.adminPlayUserId == null) {
      return err('INVALID_ACTION', 'Only available on admin play tables.');
    }
    const player = this.room.findPlayer(playerId);
    if (!player?.connected) {
      return err('INVALID_ACTION', 'That player is not in the room.');
    }
    if (this.room.kickVote) {
      return err('INVALID_ACTION', 'A kick vote is in progress.');
    }
    if (this.room.pendingBreath) {
      this.resolveBreathTimeout();
      return null;
    }
    if (this.room.discussionEndsAt > 0) {
      this.endDiscussion();
      return null;
    }
    // Still in a Ravi prompt hold — open the choice clock without timing out.
    if (this.releasePromptHold()) return null;
    if (this.room.phase === Phase.Voting && this.room.voteEndsAt > 0) {
      this.resolveVoteTimeout();
      return null;
    }
    if (this.room.legislativeEndsAt > 0) {
      this.resolveLegislativeTimeout();
      return null;
    }
    if (this.room.nominationEndsAt > 0) {
      this.resolveNominationTimeout();
      return null;
    }
    if (this.room.phase === Phase.SpecialPower && this.room.specialPowerEndsAt > 0) {
      this.resolveSpecialPowerTimeout();
      return null;
    }
    return err('INVALID_ACTION', 'Nothing to skip.');
  }

  /** Snap a future `startedAt` to now so the choice UI unlocks (keeps remaining duration). */
  private releasePromptHold(): boolean {
    const now = Date.now();
    const room = this.room;
    if (room.nominationEndsAt > 0 && now < room.nominationStartedAt) {
      const windowMs = room.nominationEndsAt - room.nominationStartedAt;
      room.nominationStartedAt = now;
      room.nominationEndsAt = now + windowMs;
      this.emit('nominationTimerChanged', { endsAt: room.nominationEndsAt });
      this.changed();
      return true;
    }
    if (room.voteEndsAt > 0 && now < room.voteStartedAt) {
      const windowMs = room.voteEndsAt - room.voteStartedAt;
      room.voteStartedAt = now;
      room.voteEndsAt = now + windowMs;
      this.emit('voteTimerChanged', { endsAt: room.voteEndsAt });
      this.changed();
      return true;
    }
    if (room.legislativeEndsAt > 0 && now < room.legislativeStartedAt) {
      const windowMs = room.legislativeEndsAt - room.legislativeStartedAt;
      room.legislativeStartedAt = now;
      room.legislativeEndsAt = now + windowMs;
      this.emit('legislativeTimerChanged', { endsAt: room.legislativeEndsAt });
      this.changed();
      return true;
    }
    if (room.specialPowerEndsAt > 0 && now < room.specialPowerStartedAt) {
      const windowMs = room.specialPowerEndsAt - room.specialPowerStartedAt;
      room.specialPowerStartedAt = now;
      room.specialPowerEndsAt = now + windowMs;
      this.emit('specialPowerTimerChanged', { endsAt: room.specialPowerEndsAt });
      this.changed();
      return true;
    }
    return false;
  }

  // --- Board / round progression (PhaseHost) ----------------------------------

  enactPolicy(policy: Policy): void {
    const room = this.room;
    if (policy === 'liberal') room.liberalPolicies += 1;
    else room.fascistPolicies += 1;
    room.lastEnacted = [...room.lastEnacted, policy].slice(-5);
    this.recordHistoryEnacted(policy);

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
    if (room.currentRound && room.currentRound.chancellorId == null) {
      room.currentRound.nominationFailed = true;
      room.currentRound.elected = false;
    }
    room.electionTracker += 1;
    let chaos = false;
    if (room.electionTracker >= 3) {
      const [policy] = room.deck.drawTiles(1);
      if (policy) {
        chaos = true;
        this.log('chaos');
        this.recordHistoryChaos();
        this.enactPolicy(policy);
      }
      room.electionTracker = 0;
      // Chaos clears term limits — every player is eligible again.
      room.lastElectedPresidentId = null;
      room.lastElectedChancellorId = null;
    }
    if (room.phase === Phase.GameOver) return;
    this.scheduleAdvanceRound(
      chaos ? BREATH_AFTER_CHAOS_MS : BREATH_AFTER_FAIL_MS,
    );
  }

  advanceRound(): void {
    const room = this.room;
    if (room.phase === Phase.GameOver) return;
    this.clearBreath();
    this.finalizeRoundHistory();
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
    this.clearBreath();
    room.activePower = power;
    room.investigation = null;
    room.peekedPolicies = power === 'policyPeek' ? room.deck.peekTop(3) : [];
    this.transitionTo(Phase.SpecialPower);
    this.changed();
  }

  startSpecialElection(playerId: string): void {
    const room = this.room;
    this.clearBreath();
    this.recordHistoryPower('specialElection', playerId);
    this.finalizeRoundHistory();
    room.specialElectionResumeAfterId = room.presidentId;
    room.presidentId = playerId;
    this.transitionTo(Phase.Nomination);
  }

  scheduleAdvanceRound(delayMs = BREATH_AFTER_POWER_MS): void {
    this.scheduleBreath(delayMs, { kind: 'advanceRound' });
  }

  scheduleGrantPower(
    power: ExecutivePower,
    delayMs = BREATH_AFTER_LAW_MS,
  ): void {
    this.scheduleBreath(delayMs, { kind: 'grantPower', power });
  }

  scheduleSpecialElection(
    playerId: string,
    delayMs = BREATH_AFTER_POWER_MS,
  ): void {
    this.scheduleBreath(delayMs, {
      kind: 'startSpecialElection',
      playerId,
    });
  }

  /** Server calls this when an announce breath elapses. */
  resolveBreathTimeout(): void {
    if (this.room.kickVote) return;
    const pending = this.room.pendingBreath;
    if (!pending) return;
    const action = pending.action;
    this.clearBreath();
    this.runBreathAction(action);
  }

  endGame(winner: Faction): void {
    this.clearBreath();
    this.finalizeRoundHistory();
    this.room.winner = winner;
    this.transitionTo(Phase.GameOver);
    this.emit('gameOver', { room: this.room });
    this.changed();
  }

  /** Stay after a win — the table returns to lobby as soon as this player stays. */
  continuePlaying(playerId: string): EngineError | null {
    const room = this.room;
    if (room.phase !== Phase.GameOver) {
      return err('INVALID_ACTION', 'The game is not over.');
    }
    const player = room.findPlayer(playerId);
    if (!player?.connected) {
      return err('INVALID_ACTION', 'That player is not in the room.');
    }
    player.wantsContinue = true;
    if (!this.maybeReturnToLobby()) this.changed();
    return null;
  }

  /** Living players ordered by seat. */
  private livingInSeatOrder(): Player[] {
    return this.room.players
      .filter((p) => p.isAlive)
      .sort((a, b) => a.seat - b.seat);
  }

  /** First candidate is random; later rounds walk clockwise from there. */
  private pickFirstPresident(): string | null {
    const living = this.livingInSeatOrder();
    if (living.length === 0) return null;
    return living[Math.floor(Math.random() * living.length)]?.id ?? null;
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
      if (this.room.hostId === player.id) this.maybeMigrateHost();
      if (this.room.phase === Phase.GameOver) this.maybeReturnToLobby();
      this.changed();
      return;
    }

    this.log(reason, { name: player.name });
    if (this.room.hostId === player.id) this.maybeMigrateHost();
    if (this.room.phase === Phase.GameOver) {
      this.maybeReturnToLobby();
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
    this.openNominationTimer(ceremonyDelay(this.room.options.skipCeremony, NOMINATION_PROMPT_MS));
    this.changed();
  }

  /** Server calls this when the discussion window elapses. */
  resolveDiscussionTimeout(): void {
    if (this.room.kickVote) return;
    if (this.room.pendingBreath) return;
    this.endDiscussion();
  }

  // --- Vote timer (PhaseHost) ------------------------------------------------

  openVote(delayMs = ceremonyDelay(this.room.options.skipCeremony, VOTE_PROMPT_MS)): void {
    const room = this.room;
    const openAt = Date.now() + Math.max(0, delayMs);
    room.voteStartedAt = openAt;
    room.voteEndsAt = openAt + VOTE_DURATION_MS;
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
    if (this.room.pendingBreath) return;
    this.currentPhase.timeout?.();
  }

  // --- Legislative timer (PhaseHost) -----------------------------------------

  openLegislativeTimer(
    delayMs = 0,
    durationMs = LEGISLATIVE_DURATION_MS,
  ): void {
    const room = this.room;
    const openAt =
      Date.now() + ceremonyDelay(room.options.skipCeremony, Math.max(0, delayMs));
    room.legislativeStartedAt = openAt;
    room.legislativeEndsAt = openAt + durationMs;
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
    if (this.room.pendingBreath) return;
    this.currentPhase.timeout?.();
  }

  // --- Nomination timer (PhaseHost) ------------------------------------------

  openNominationTimer(
    delayMs = ceremonyDelay(this.room.options.skipCeremony, NOMINATION_PROMPT_MS),
  ): void {
    const room = this.room;
    const openAt = Date.now() + Math.max(0, delayMs);
    room.nominationStartedAt = openAt;
    room.nominationEndsAt = openAt + NOMINATION_DURATION_MS;
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
    if (this.room.pendingBreath) return;
    this.currentPhase.timeout?.();
  }

  // --- Special power timer (PhaseHost) ---------------------------------------

  openSpecialPowerTimer(
    durationMs = SPECIAL_POWER_DURATION_MS,
    delayMs = 0,
  ): void {
    const room = this.room;
    const openAt = Date.now() + Math.max(0, delayMs);
    room.specialPowerStartedAt = openAt;
    room.specialPowerEndsAt = openAt + durationMs;
    this.emit('specialPowerTimerChanged', { endsAt: room.specialPowerEndsAt });
  }

  closeSpecialPowerTimer(): void {
    this.room.specialPowerStartedAt = 0;
    this.room.specialPowerEndsAt = 0;
    this.emit('specialPowerTimerChanged', { endsAt: null });
  }

  /** Server calls this when the President's power window elapses. */
  resolveSpecialPowerTimeout(): void {
    if (this.room.kickVote) return;
    if (this.room.pendingBreath) return;
    this.currentPhase.timeout?.();
  }

  // --- In-match round history ------------------------------------------------

  beginRoundHistory(): void {
    const room = this.room;
    if (room.currentRound) this.finalizeRoundHistory();
    const president = room.findPlayer(room.presidentId ?? '');
    if (!president) return;
    room.currentRound = {
      round: room.nextRoundNumber,
      presidentId: president.id,
      presidentName: president.name,
      chancellorId: null,
      chancellorName: null,
      ballots: null,
      ja: null,
      nein: null,
      elected: null,
      nominationFailed: false,
      vetoAgreed: false,
      chaos: false,
      enacted: null,
      power: null,
    };
    room.nextRoundNumber += 1;
  }

  recordHistoryNomination(chancellorId: string): void {
    const draft = this.room.currentRound;
    if (!draft) return;
    const chancellor = this.room.findPlayer(chancellorId);
    if (!chancellor) return;
    draft.chancellorId = chancellor.id;
    draft.chancellorName = chancellor.name;
  }

  recordHistoryVote(elected: boolean): void {
    const room = this.room;
    const draft = room.currentRound;
    if (!draft) return;
    const electorate = room.players.filter(
      (player) => player.isAlive && player.connected,
    );
    const ballots = electorate.map((player) => {
      const cast = room.votes.get(player.id);
      return {
        playerId: player.id,
        name: player.name,
        vote: cast ?? ('nein' as const),
        abstained: cast == null,
      };
    });
    draft.ballots = ballots;
    draft.ja = ballots.filter((ballot) => ballot.vote === 'ja').length;
    draft.nein = ballots.filter((ballot) => ballot.vote === 'nein').length;
    draft.elected = elected;
    draft.nominationFailed = false;
  }

  recordHistoryVetoAgreed(): void {
    const draft = this.room.currentRound;
    if (!draft) return;
    draft.vetoAgreed = true;
  }

  recordHistoryPower(kind: ExecutivePower, targetId: string | null = null): void {
    const draft = this.room.currentRound;
    if (!draft) return;
    const target = targetId ? this.room.findPlayer(targetId) : null;
    draft.power = {
      kind,
      targetId: target?.id ?? null,
      targetName: target?.name ?? null,
    };
  }

  finalizeRoundHistory(): void {
    const room = this.room;
    const draft = room.currentRound;
    if (!draft) return;
    room.roundHistory = [...room.roundHistory, cloneHistoryEntry(draft)];
    room.currentRound = null;
  }

  private recordHistoryEnacted(policy: Policy): void {
    const draft = this.room.currentRound;
    if (!draft) return;
    draft.enacted = policy;
  }

  private recordHistoryChaos(): void {
    const draft = this.room.currentRound;
    if (!draft) return;
    draft.chaos = true;
  }

  private scheduleBreath(delayMs: number, action: BreathAction): void {
    const room = this.room;
    if (room.phase === Phase.GameOver) return;
    // Stop decision clocks so a late timeout cannot double-apply the hand-off.
    this.closeDiscussion();
    this.closeVote();
    this.closeLegislativeTimer();
    this.closeNominationTimer();
    this.closeSpecialPowerTimer();
    const wait = ceremonyDelay(room.options.skipCeremony, Math.max(0, delayMs));
    if (wait <= 0) {
      this.clearBreath();
      this.runBreathAction(action);
      return;
    }
    const startedAt = Date.now();
    room.pendingBreath = {
      startedAt,
      endsAt: startedAt + wait,
      action,
    };
    this.emit('breathTimerChanged', { endsAt: room.pendingBreath.endsAt });
    this.changed();
  }

  private clearBreath(): void {
    if (!this.room.pendingBreath) return;
    this.room.pendingBreath = null;
    this.emit('breathTimerChanged', { endsAt: null });
  }

  private runBreathAction(action: BreathAction): void {
    switch (action.kind) {
      case 'advanceRound':
        this.advanceRound();
        this.changed();
        return;
      case 'grantPower':
        this.grantPower(action.power);
        return;
      case 'startSpecialElection':
        this.startSpecialElection(action.playerId);
        this.changed();
        return;
    }
  }

  // --- Table kick vote ----------------------------------------------------------

  /**
   * Ask the table to remove another player. In-game, clocks freeze until the
   * vote is settled. Public lobby uses connected sitters; hosted lobby stays
   * host-kick.
   */
  requestKick(requesterId: string, targetId: string): EngineError | null {
    const room = this.room;
    const inLobby = room.phase === Phase.Lobby;
    if (room.phase === Phase.GameOver || (inLobby && !isPublicTable(room.options))) {
      return err('INVALID_ACTION', 'There is no game in progress.');
    }
    if (inLobby && room.startChoice) {
      return err('INVALID_ACTION', 'The table is deciding whether to start.');
    }
    if (!inLobby && this.inOpeningNight()) {
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
    const electorate = room.kickVoteElectorate();
    if (!requester || !electorate.some((player) => player.id === requesterId)) {
      return err('INVALID_ACTION', 'You cannot request a kick.');
    }
    if (!target) {
      return err('INVALID_ACTION', 'That player is not in the room.');
    }
    if (!inLobby && !target.isAlive) {
      return err('INVALID_ACTION', 'That player is not in the game.');
    }
    if (room.spentKickRequestIds.has(requesterId)) {
      return err('INVALID_ACTION', 'You have already requested a kick.');
    }
    if (electorate.length < 3) {
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
      needed: kickVoteYesNeeded(electorate.length),
    };
    if (!inLobby) this.pauseDeadlineTimers();
    else {
      for (const player of room.players) this.armLobbyAfk(player);
    }
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
    const canVote =
      this.room.phase === Phase.Lobby ? !!player?.connected : !!player?.isAlive;
    if (!canVote) {
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
    return this.room
      .kickVoteElectorate()
      .filter(
        (player) => player.id !== vote.targetId && !vote.votes.has(player.id),
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

  private banFromTable(player: Player): void {
    if (player.joinKey) this.room.bannedJoinKeys.add(player.joinKey);
  }

  private finishKickVote(kicked: boolean): void {
    const vote = this.room.kickVote;
    if (!vote) return;
    const target = this.room.findPlayer(vote.targetId);
    const requester = this.room.findPlayer(vote.requesterId);
    const yesCount = this.kickVoteYesCount();
    const needed = vote.needed;
    const inLobby = this.room.phase === Phase.Lobby;
    const heldOffice =
      kicked &&
      !inLobby &&
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
      if (inLobby) {
        // Lobby kick clears the seat only; AFK / Accept silence already
        // allow a re-sit, and host kick matches that.
        this.removePlayer(target.id, 'kicked');
      } else {
        this.banFromTable(target);
        this.settlingKickVote = true;
        if (!heldOffice) this.resumeDeadlineTimers(pausedAt);
        this.vacateInGame(target, 'kicked');
        this.settlingKickVote = false;
      }
    } else if (inLobby) {
      for (const player of this.room.players) this.armLobbyAfk(player);
      this.maybeAdvancePublicStart();
      this.changed();
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
    this.emit('specialPowerTimerChanged', { endsAt: null });
    this.emit('breathTimerChanged', { endsAt: null });
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
    if (room.specialPowerEndsAt > 0) {
      const next = shift(room.specialPowerStartedAt, room.specialPowerEndsAt);
      room.specialPowerStartedAt = next.startedAt;
      room.specialPowerEndsAt = next.endsAt;
      this.emit('specialPowerTimerChanged', { endsAt: room.specialPowerEndsAt });
    }
    if (room.pendingBreath) {
      const next = shift(room.pendingBreath.startedAt, room.pendingBreath.endsAt);
      room.pendingBreath = {
        ...room.pendingBreath,
        startedAt: next.startedAt,
        endsAt: next.endsAt,
      };
      this.emit('breathTimerChanged', { endsAt: room.pendingBreath.endsAt });
    }
  }

  // --- Host migration ----------------------------------------------------------

  /** Server calls this after the disconnect grace period; no-op if the host
   *  came back in time. */
  migrateHostIfDisconnected(): void {
    if (this.maybeMigrateHost()) this.changed();
  }

  private maybeMigrateHost(): boolean {
    // Public salon uses the same gavel as a hosted room.
    if (!this.room.hostId) return false;
    const host = this.room.findPlayer(this.room.hostId);
    if (host?.connected) return false;
    const successor = this.room.players.find((p) => p.connected);
    if (!successor) return false;
    this.room.players.forEach((p) => (p.isHost = p.id === successor.id));
    this.room.hostId = successor.id;
    successor.ready = true;
    successor.unreadySince = null;
    this.armLobbyAfk(successor);
    this.log('newHost', { name: successor.name });
    return true;
  }

  private isLobbyIdle(player: Player): boolean {
    return !player.ready;
  }

  private connectedLobby(): Player[] {
    return this.room.players.filter((player) => player.connected);
  }

  /**
   * Deploy may drop the public cap onto a lobby that was still 10-seat.
   * Open Accept immediately if that lobby is already full.
   */
  applyPublicSeatCap(maxPlayers: number): void {
    if (!isPublicTable(this.room.options) || this.room.phase !== Phase.Lobby) {
      return;
    }
    if (this.room.options.maxPlayers === maxPlayers) return;
    this.room.options.maxPlayers = maxPlayers;
    this.maybeAdvancePublicStart();
    this.changed();
  }

  private maybeAdvancePublicStart(): void {
    return;
  }

  private maybeDealPublicTable(): void {
    const connected = this.connectedLobby();
    if (connected.length < this.room.options.minPlayers) return;
    if (!connected.every((player) => player.wantsStart)) return;
    this.dealLobby(connected);
  }

  private openStartChoice(): void {
    if (this.room.startChoice) return;
    const now = Date.now();
    this.room.startChoice = {
      startedAt: now,
      endsAt: now + START_CHOICE_DURATION_MS,
    };
    this.emit('startChoiceTimerChanged', { endsAt: this.room.startChoice.endsAt });
    for (const player of this.room.players) this.armLobbyAfk(player);
  }

  private clearStartChoice(): void {
    if (!this.room.startChoice) return;
    this.room.startChoice = null;
    this.emit('startChoiceTimerChanged', { endsAt: null });
    for (const player of this.room.players) this.armLobbyAfk(player);
  }

  private armLobbyAfk(player: Player): void {
    this.emit('lobbyAfkTimerChanged', {
      playerId: player.id,
      dueAt: this.lobbyAfkDueAt(player),
    });
  }

  private lobbyAfkDueAt(player: Player): number | null {
    if (this.room.phase !== Phase.Lobby || player.unreadySince == null) return null;
    if (!player.connected) return player.unreadySince + LOBBY_DISCONNECT_MS;
    if (this.room.startChoice != null || this.room.kickVote != null) return null;
    if (!this.isLobbyIdle(player)) return null;
    if (player.isHost || player.id === this.room.hostId) return null;
    return player.unreadySince + LOBBY_AFK_MS;
  }

  /** Shared deal path — host check already happened, or the public table is legal. */
  private dealLobby(connected: Player[]): void {
    const room = this.room;
    this.clearStartChoice();
    for (const player of connected) {
      player.wantsStart = false;
      player.wantStartAt = null;
      player.wantsContinue = false;
      player.unreadySince = null;
      this.armLobbyAfk(player);
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
    room.roundHistory = [];
    room.currentRound = null;
    room.nextRoundNumber = 1;
    room.pendingBreath = null;
    room.presidentId = this.pickFirstPresident();
    if (isPublicTable(room.options) && !room.hostId) {
      const first = this.livingInSeatOrder()[0];
      if (first) {
        room.hostId = first.id;
        first.isHost = true;
      }
    }
    this.transitionTo(Phase.Nomination);

    this.log('gameStarted');
    this.emit('gameStarted', { room });
    this.changed();
  }

  /**
   * After a win: reset this room to lobby as soon as someone still
   * connected has chosen to stay. Everyone still here comes along;
   * leavers are already gone.
   */
  private maybeReturnToLobby(): boolean {
    if (this.room.phase !== Phase.GameOver) return false;
    const remaining = this.room.players.filter((player) => player.connected);
    if (remaining.length === 0) return false;
    if (!remaining.some((player) => player.wantsContinue)) return false;
    this.returnToLobby(remaining);
    return true;
  }

  private returnToLobby(seated: Player[]): void {
    const room = this.room;
    this.closeDiscussion();
    this.closeVote();
    this.closeLegislativeTimer();
    this.closeNominationTimer();
    this.closeSpecialPowerTimer();
    this.clearBreath();
    if (room.kickVote) {
      room.kickVote = null;
      this.emit('kickVoteTimerChanged', { endsAt: null });
    }
    this.clearStartChoice();

    room.players = seated;
    this.maybeMigrateHost();

    seated.forEach((player, seat) => {
      player.seat = seat;
      player.isAlive = true;
      // Last-game roles stay until dealRoles overwrites them for the rematch.
      player.wantsContinue = false;
      player.wantsStart = false;
      player.wantStartAt = null;
      player.isHost = player.id === room.hostId;
      player.ready = player.isHost;
      player.unreadySince = player.ready ? null : Date.now();
      this.armLobbyAfk(player);
    });

    room.deck.reset();
    room.liberalPolicies = 0;
    room.fascistPolicies = 0;
    room.electionTracker = 0;
    room.lastEnacted = [];
    room.drawnPolicies = [];
    room.winner = null;
    room.votes.clear();
    room.lastElectedPresidentId = null;
    room.lastElectedChancellorId = null;
    room.presidentId = null;
    room.chancellorId = null;
    room.activePower = null;
    room.investigatedIds = [];
    room.investigations = [];
    room.peekedPolicies = [];
    room.investigation = null;
    room.specialElectionResumeAfterId = null;
    room.vetoRequested = false;
    room.spentKickRequestIds.clear();
    room.roundHistory = [];
    room.currentRound = null;
    room.nextRoundNumber = 1;
    room.pendingBreath = null;

    this.transitionTo(Phase.Lobby);
    this.changed();
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

function cloneHistoryEntry(entry: RoundHistoryEntry): RoundHistoryEntry {
  return {
    ...entry,
    ballots: entry.ballots?.map((ballot) => ({ ...ballot })) ?? null,
    power: entry.power ? { ...entry.power } : null,
  };
}
