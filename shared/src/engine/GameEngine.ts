import {
  LEGISLATIVE_DURATION_MS,
  NOMINATION_DURATION_MS,
  Phase,
  SPEAKING_TURN_MS,
  VOTE_DURATION_MS,
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
  /** Talking stick moved; the server (re)schedules the turn timer. */
  speakerChanged: { speakerId: string | null };
  /** Vote window opened (endsAt set) or closed (null); server (un)schedules. */
  voteTimerChanged: { endsAt: number | null };
  /** Legislative window opened (endsAt set) or closed (null); server (un)schedules. */
  legislativeTimerChanged: { endsAt: number | null };
  /** Nomination window opened (endsAt set) or closed (null); server (un)schedules. */
  nominationTimerChanged: { endsAt: number | null };
}

/**
 * State-machine host. Owns a single {@link Room} and is the only place its
 * state mutates. Lobby flow (join → ready → start) lives here; every in-game
 * command is delegated to the current {@link GamePhase}.
 */
export class GameEngine extends TypedEmitter<EngineEvents> implements PhaseHost {
  private readonly phases: Partial<Record<Phase, GamePhase>>;
  private currentPhase: GamePhase;

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

  addPlayer(name: string, asHost = false): Player | EngineError {
    const room = this.room;
    if (room.phase !== Phase.Lobby) {
      return err('ALREADY_STARTED', 'The game has already started.');
    }
    if (room.isFull) {
      return err('ROOM_FULL', 'This room is full.');
    }

    const isHost = asHost || room.players.length === 0;
    const player = PlayerFactory.create(name, room.players.length, isHost);
    room.players.push(player);
    if (isHost) room.hostId = player.id;

    this.log('joined', { name: player.name });
    this.changed();
    return player;
  }

  /**
   * Permanently vacate a seat (explicit leave, not a network drop). Only
   * meaningful in the lobby — in-game leavers are treated as disconnected so
   * their seat survives a possible rejoin. A leaving host is handled at the
   * server layer by destroying the whole room before this is reached, but the
   * host seat is migrated here too as a safety net.
   */
  removePlayer(playerId: string): void {
    const room = this.room;
    if (room.phase !== Phase.Lobby) return;
    const index = room.players.findIndex((player) => player.id === playerId);
    if (index === -1) return;

    const [removed] = room.players.splice(index, 1);
    room.players.forEach((player, seat) => (player.seat = seat));
    if (room.hostId === removed.id) this.maybeMigrateHost();

    this.log('left', { name: removed.name });
    this.changed();
  }

  setConnected(playerId: string, connected: boolean): void {
    const player = this.room.findPlayer(playerId);
    if (!player || player.connected === connected) return;
    player.connected = connected;
    this.log(connected ? 'reconnected' : 'disconnected', { name: player.name });
    // A disconnected speaker must not hold everyone's chat hostage.
    if (!connected && this.room.speakerId === playerId) this.advanceSpeaker();
    // Reopen a discussion that stalled with nobody eligible to speak.
    if (connected && !this.room.speakerId && this.isDiscussionPhase()) {
      this.startSpeakingTurnAt(playerId);
    }
    this.currentPhase.presenceChanged?.();
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
    room.peekedPolicies = [];
    room.investigation = null;
    room.specialElectionResumeAfterId = null;
    room.vetoRequested = false;
    room.presidentId = this.livingInSeatOrder()[0]?.id ?? null;
    this.transitionTo(Phase.Nomination);

    this.log('gameStarted');
    this.emit('gameStarted', { room });
    this.changed();
    return null;
  }

  // --- Chat / log ------------------------------------------------------------

  postChat(playerId: string, text: string): void {
    const player = this.room.findPlayer(playerId);
    const body = text.trim();
    if (!player || !body) return;
    // While the talking stick is active, only its holder may speak.
    if (this.room.speakerId && this.room.speakerId !== playerId) return;
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
    this.clearSpeaker();
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

  /** Living players ordered by seat — the presidential rotation order. */
  private livingInSeatOrder(): Player[] {
    return this.room.players
      .filter((p) => p.isAlive)
      .sort((a, b) => a.seat - b.seat);
  }

  private nextPresidentId(): string | null {
    return this.nextLivingAfter(this.room.presidentId);
  }

  /** Next living player by seat after `playerId`, wrapping around. */
  private nextLivingAfter(playerId: string | null): string | null {
    const living = this.livingInSeatOrder();
    if (living.length === 0) return null;
    const currentIndex = living.findIndex((p) => p.id === playerId);
    return living[(currentIndex + 1) % living.length].id;
  }

  // --- Speaking turns (talking stick) ----------------------------------------

  private speakingEligible(): Player[] {
    return this.livingInSeatOrder().filter((p) => p.connected);
  }

  /** Give the talking stick to a player (or the first eligible). */
  startSpeakingTurnAt(playerId: string | null): void {
    const eligible = this.speakingEligible();
    const next = eligible.find((p) => p.id === playerId) ?? eligible[0];
    this.setSpeaker(next ?? null);
  }

  /**
   * Pass the talking stick to the next player who hasn't spoken this round.
   * Once everyone eligible has had a turn, discussion ends and the President's
   * nomination window opens.
   */
  advanceSpeaker(): void {
    const room = this.room;
    if (!this.isDiscussionPhase()) return this.setSpeaker(null);
    if (room.speakerId && !room.discussionSpokenIds.includes(room.speakerId)) {
      room.discussionSpokenIds.push(room.speakerId);
    }
    const remaining = this.speakingEligible().filter(
      (p) => !room.discussionSpokenIds.includes(p.id),
    );
    if (remaining.length === 0) return this.beginNomination();
    this.setSpeaker(remaining[0]);
  }

  /** Discussion is over: drop the talking stick and start the nomination clock. */
  private beginNomination(): void {
    this.clearSpeaker();
    this.openNominationTimer();
    this.changed();
  }

  clearSpeaker(): void {
    this.setSpeaker(null);
  }

  /** True during the talking-stick discussion that precedes nomination. */
  private isDiscussionPhase(): boolean {
    return (
      this.room.phase === Phase.Nomination && this.room.nominationEndsAt === 0
    );
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
    this.currentPhase.timeout?.();
  }

  // --- Legislative timer (PhaseHost) -----------------------------------------

  openLegislativeTimer(): void {
    const room = this.room;
    room.legislativeStartedAt = Date.now();
    room.legislativeEndsAt = room.legislativeStartedAt + LEGISLATIVE_DURATION_MS;
    this.emit('legislativeTimerChanged', { endsAt: room.legislativeEndsAt });
  }

  closeLegislativeTimer(): void {
    this.room.legislativeStartedAt = 0;
    this.room.legislativeEndsAt = 0;
    this.emit('legislativeTimerChanged', { endsAt: null });
  }

  /** Server calls this when a legislator's choice window elapses. */
  resolveLegislativeTimeout(): void {
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
    this.currentPhase.timeout?.();
  }

  private setSpeaker(player: Player | null): void {
    const room = this.room;
    room.speakerId = player?.id ?? null;
    room.speakerStartedAt = player ? Date.now() : 0;
    room.speakerEndsAt = player ? room.speakerStartedAt + SPEAKING_TURN_MS : 0;
    this.emit('speakerChanged', { speakerId: room.speakerId });
    this.changed();
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
