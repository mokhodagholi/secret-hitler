import {
  Phase,
  type ChatMessage,
  type LogEntry,
  type Player,
  type Policy,
  type Vote,
} from '../types/GameState';
import type { GameCommand, ServerErrorCode } from '../types/events';
import { TypedEmitter } from './EventEmitter';
import { makeId } from './ids';
import { PlayerFactory } from './PlayerFactory';
import { Room } from './Room';
import { buildRoleBag } from './roleDistribution';

export interface EngineError {
  code: ServerErrorCode;
  message: string;
}

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
}

/**
 * State-machine host. Owns a single {@link Room} and is the only place its
 * state mutates. Lobby flow (join → ready → start) is fully implemented here;
 * in-game phase handling is delegated to `handleCommand`, the extension point
 * where the GamePhase state machine will be wired.
 */
export class GameEngine extends TypedEmitter<EngineEvents> {
  constructor(readonly room: Room) {
    super();
  }

  // --- Lobby -------------------------------------------------------------

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

    this.log(`${player.name} joined the room.`);
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

    this.log(`${removed.name} left the room.`);
    this.changed();
  }

  setConnected(playerId: string, connected: boolean): void {
    const player = this.room.findPlayer(playerId);
    if (!player || player.connected === connected) return;
    player.connected = connected;
    // Ready mirrors presence — players are ready while seated and connected,
    // so the host can start as soon as enough players have joined.
    player.ready = connected || player.isHost;
    this.log(`${player.name} ${connected ? 'reconnected' : 'disconnected'}.`);
    this.maybeMigrateHost();
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
    if (requesterId !== room.hostId) {
      return err('NOT_HOST', 'Only the host can start the game.');
    }
    const players = room.players.filter((p) => p.connected);
    if (players.length < room.options.minPlayers) {
      return err(
        'NOT_ENOUGH_PLAYERS',
        `Need at least ${room.options.minPlayers} players.`,
      );
    }

    this.dealRoles(players);
    room.deck.reset();
    room.liberalPolicies = 0;
    room.fascistPolicies = 0;
    room.electionTracker = 0;
    room.presidentId = this.livingInSeatOrder()[0]?.id ?? null;
    this.beginNomination();

    this.log('The game has started. Roles have been dealt.');
    this.emit('gameStarted', { room });
    this.changed();
    return null;
  }

  // --- Chat / log --------------------------------------------------------

  postChat(playerId: string, text: string): void {
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

  // --- In-game commands --------------------------------------------------

  /** Dispatches an in-game {@link GameCommand} to the matching phase handler. */
  handleCommand(playerId: string, command: GameCommand): EngineError | null {
    switch (command.kind) {
      case 'nominateChancellor':
        return this.nominateChancellor(playerId, command.targetId);
      case 'castVote':
        return this.castVote(playerId, command.vote);
      default:
        // Legislative / special-power commands are not implemented yet.
        return err('INVALID_ACTION', 'That action is not available yet.');
    }
  }

  private nominateChancellor(playerId: string, targetId: string): EngineError | null {
    const room = this.room;
    if (room.phase !== Phase.Nomination || playerId !== room.presidentId) {
      return err('INVALID_ACTION', 'You cannot nominate right now.');
    }
    const target = room.findPlayer(targetId);
    if (!target || !target.isAlive || target.id === playerId) {
      return err('INVALID_ACTION', 'That player cannot be nominated.');
    }

    room.chancellorId = targetId;
    room.phase = Phase.Voting;
    room.votes.clear();
    this.log(
      `${room.findPlayer(playerId)?.name} nominated ${target.name} as Chancellor.`,
    );
    this.changed();
    return null;
  }

  private castVote(playerId: string, vote: Vote): EngineError | null {
    const room = this.room;
    const player = room.findPlayer(playerId);
    if (room.phase !== Phase.Voting || !player?.isAlive) {
      return err('INVALID_ACTION', 'There is no vote in progress.');
    }

    room.votes.set(playerId, vote);
    const voters = room.players.filter((p) => p.isAlive && p.connected);
    if (voters.every((p) => room.votes.has(p.id))) {
      this.resolveElection(voters);
    } else {
      this.changed();
    }
    return null;
  }

  // --- Election resolution -----------------------------------------------

  private resolveElection(voters: Player[]): void {
    const room = this.room;
    const ja = voters.filter((p) => room.votes.get(p.id) === 'ja').length;
    const elected = ja * 2 > voters.length;
    const chancellor = room.findPlayer(room.chancellorId ?? '');
    this.log(`The vote ${elected ? 'passed' : 'failed'} (${ja}/${voters.length} Ja).`);

    if (elected && chancellor) {
      room.electionTracker = 0;
      if (room.fascistPolicies >= 3 && chancellor.role === 'hitler') {
        this.log(`${chancellor.name} was Hitler — the Fascists win!`);
        this.endGame();
        return;
      }
      // Legislative session is the next milestone; for now advance the round.
      this.log(`${chancellor.name}'s government takes office.`);
      this.advanceRound();
    } else {
      room.electionTracker += 1;
      if (room.electionTracker >= 3) this.enactChaosPolicy();
      this.advanceRound();
    }
  }

  /** Three failed elections — the top policy is enacted automatically. */
  private enactChaosPolicy(): void {
    const [policy] = this.room.deck.drawTiles(1);
    if (policy) {
      this.log('Three elections failed — the top policy is enacted.');
      this.enactPolicy(policy);
    }
    this.room.electionTracker = 0;
  }

  private enactPolicy(policy: Policy): void {
    const room = this.room;
    if (policy === 'liberal') room.liberalPolicies += 1;
    else room.fascistPolicies += 1;
    room.lastEnacted = [...room.lastEnacted, policy].slice(-5);

    if (room.liberalPolicies >= 5) {
      this.log('Five Liberal policies enacted — the Liberals win!');
      this.endGame();
    } else if (room.fascistPolicies >= 6) {
      this.log('Six Fascist policies enacted — the Fascists win!');
      this.endGame();
    }
  }

  private advanceRound(): void {
    if (this.room.phase === Phase.GameOver) return;
    this.room.presidentId = this.nextPresidentId();
    this.beginNomination();
    this.changed();
  }

  private beginNomination(): void {
    this.room.phase = Phase.Nomination;
    this.room.chancellorId = null;
    this.room.votes.clear();
  }

  private endGame(): void {
    this.room.phase = Phase.GameOver;
    this.emit('gameOver', { room: this.room });
    this.changed();
  }

  /** Living players ordered by seat — the presidential rotation order. */
  private livingInSeatOrder(): Player[] {
    return this.room.players
      .filter((p) => p.isAlive)
      .sort((a, b) => a.seat - b.seat);
  }

  /** Next living player after the current president, wrapping around. */
  private nextPresidentId(): string | null {
    const living = this.livingInSeatOrder();
    if (living.length === 0) return null;
    const currentIndex = living.findIndex((p) => p.id === this.room.presidentId);
    return living[(currentIndex + 1) % living.length].id;
  }

  // --- Internals ---------------------------------------------------------

  private dealRoles(players: Player[]): void {
    const bag = shuffle(buildRoleBag(players.length));
    players.forEach((player, i) => {
      player.role = bag[i];
      this.emit('roleAssigned', { playerId: player.id });
    });
  }

  private maybeMigrateHost(): void {
    const host = this.room.findPlayer(this.room.hostId);
    if (host?.connected) return;
    const successor = this.room.players.find((p) => p.connected);
    if (!successor) return;
    this.room.players.forEach((p) => (p.isHost = p.id === successor.id));
    this.room.hostId = successor.id;
    successor.ready = true;
    this.log(`${successor.name} is now the host.`);
  }

  private log(text: string): void {
    this.emit('log', { entry: { id: makeId(), text, at: Date.now() } });
  }

  private changed(): void {
    this.emit('stateChanged', { room: this.room });
  }
}

function err(code: ServerErrorCode, message: string): EngineError {
  return { code, message };
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
