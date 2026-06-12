import {
  Phase,
  type ChatMessage,
  type LogEntry,
  type Player,
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
    room.phase = Phase.Nomination;
    // First president: lowest seat among the living.
    room.presidentId = players[0]?.id ?? null;

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

  // --- In-game commands (extension point) --------------------------------

  /**
   * Entry point for every in-game {@link GameCommand}. The GamePhase state
   * machine (Nomination → Voting → Legislative → SpecialPower → GameOver)
   * plugs in here: validate against the current phase, mutate the room, then
   * call `this.changed()`. Returns an error while the engine is unimplemented.
   */
  handleCommand(_playerId: string, _command: GameCommand): EngineError | null {
    return err('INVALID_ACTION', 'In-game actions are not available yet.');
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
