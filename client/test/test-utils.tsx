import { createSignal, type JSX } from 'solid-js';
import { render } from '@solidjs/testing-library';
import {
  Phase,
  type ClientMessage,
  type GameStateView,
  type PublicPlayer,
  type ServerMessage,
} from '@secret-hitler/shared';
import { AnimationService } from '../src/services/AnimationService';
import { AppProvider, type AppServices } from '../src/services/AppContext';
import { GameStateService, type RoomSession } from '../src/services/GameStateService';
import { I18nService } from '../src/services/I18nService';
import { NavigationService } from '../src/services/NavigationService';
import { SettingsService } from '../src/services/SettingsService';
import { SoundService } from '../src/services/SoundService';
import type {
  ConnectionStatus,
  WebSocketService,
} from '../src/services/WebSocketService';

/**
 * Stand-in for the real socket: records what the UI sends and lets a test push
 * server messages into the client, so flows can be driven without a network.
 */
export class FakeSocket {
  readonly sent: ClientMessage[] = [];
  private readonly listeners = new Set<(message: ServerMessage) => void>();
  private readonly statusSignal = createSignal<ConnectionStatus>('connected');
  readonly status = this.statusSignal[0];

  onMessage(listener: (message: ServerMessage) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  connect(): void {
    this.statusSignal[1]('connected');
  }

  disconnect(): void {
    this.statusSignal[1]('disconnected');
  }

  send(message: ClientMessage): void {
    this.sent.push(message);
  }

  /** Push a server message to every listener, as if it arrived over the wire. */
  emit(message: ServerMessage): void {
    for (const listener of this.listeners) listener(message);
  }

  /** The most recent message of a given type the UI sent, if any. */
  lastSent<Type extends ClientMessage['type']>(
    type: Type,
  ): Extract<ClientMessage, { type: Type }> | undefined {
    for (let i = this.sent.length - 1; i >= 0; i--) {
      if (this.sent[i].type === type) {
        return this.sent[i] as Extract<ClientMessage, { type: Type }>;
      }
    }
    return undefined;
  }
}

export interface Harness {
  services: AppServices;
  socket: FakeSocket;
  /** Push a full state snapshot to the client (server broadcast). */
  pushState(view: GameStateView): void;
}

const SESSION: RoomSession = {
  roomId: 'room-1',
  code: 'ABC123',
  token: 'token-1',
  playerId: 'you',
};

/**
 * Build a real service graph wired to a {@link FakeSocket}. When `seated` is
 * set the client already holds a room session (skips the HTTP join), which the
 * in-room screens require. Language defaults to English for readable assertions.
 */
export function buildHarness(
  options: { seated?: boolean; initialPath?: string } = {},
): Harness {
  if (options.seated) {
    sessionStorage.setItem('sh:session', JSON.stringify(SESSION));
  }
  const settings = new SettingsService();
  settings.set('language', 'en');
  const socket = new FakeSocket();
  const game = new GameStateService(socket as unknown as WebSocketService);
  const services: AppServices = {
    nav: new NavigationService(options.initialPath ?? '/'),
    settings,
    i18n: new I18nService(() => settings.settings.language),
    socket: socket as unknown as WebSocketService,
    game,
    sound: new SoundService(settings),
    animation: new AnimationService(settings),
  };
  return {
    services,
    socket,
    pushState: (view) => socket.emit({ type: 'state', state: view }),
  };
}

/** Render `ui` inside the harness's service graph. Query via `screen`. */
export function renderWithApp(ui: () => JSX.Element, harness: Harness): void {
  render(() => <AppProvider services={harness.services}>{ui()}</AppProvider>);
}

let seatCounter = 0;

export function makePlayer(overrides: Partial<PublicPlayer> = {}): PublicPlayer {
  return {
    id: overrides.id ?? `p${seatCounter}`,
    name: overrides.name ?? `Player ${seatCounter}`,
    avatar: 0,
    seat: overrides.seat ?? seatCounter++,
    isHost: false,
    connected: true,
    ready: false,
    isAlive: true,
    isPresident: false,
    isChancellor: false,
    hasVoted: false,
    role: null,
    ...overrides,
  };
}

/** A minimal but complete {@link GameStateView} for the given players. */
export function makeView(overrides: Partial<GameStateView> = {}): GameStateView {
  const players = overrides.players ?? [
    makePlayer({ id: 'you', name: 'You', seat: 0 }),
    makePlayer({ id: 'other', name: 'Other', seat: 1 }),
  ];
  return {
    roomId: 'room-1',
    code: 'ABC123',
    name: 'Test Room',
    phase: Phase.Lobby,
    hostId: 'you',
    minPlayers: 3,
    maxPlayers: 10,
    players,
    board: {
      liberalPolicies: 0,
      fascistPolicies: 0,
      electionTracker: 0,
      drawPile: 17,
      discardPile: 0,
      president: null,
      chancellor: null,
      lastEnacted: [],
    },
    winner: null,
    speaker: null,
    voteDeadline: null,
    legislativeDeadline: null,
    nominationDeadline: null,
    ineligibleChancellors: [],
    activePower: null,
    vetoUnlocked: false,
    vetoRequested: false,
    you: {
      id: 'you',
      role: null,
      vote: null,
      policies: [],
      peek: [],
      investigation: null,
    },
    ...overrides,
  };
}
