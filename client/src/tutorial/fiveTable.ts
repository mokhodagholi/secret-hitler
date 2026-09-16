import {
  AVATAR_COUNT,
  GameEngine,
  OPENING_CEREMONY_MS,
  Phase,
  Room,
  type GameCommand,
  type GameStateView,
  type Player,
  type Policy,
  type Role,
} from '@secret-hitler/shared';
import { StackedDeck } from './StackedDeck';
import type { LookYou } from './lookView';

export const FIVE_ROOM_ID = 'five-look';

/**
 * Enough liberals early for a safe first hand, then fascists to unlock peek
 * and execute, then liberals toward a Liberal win.
 */
const FIVE_STACK: Policy[] = [
  'liberal',
  'fascist',
  'liberal',
  'liberal',
  'liberal',
  'fascist',
  'liberal',
  'fascist',
  'liberal',
  'fascist',
  'fascist',
  'liberal',
  'fascist',
  'liberal',
  'fascist',
  'liberal',
  'liberal',
  'liberal',
  'liberal',
  'liberal',
  'fascist',
  'fascist',
  'fascist',
  'fascist',
  'fascist',
];

export interface FiveTable {
  engine: GameEngine;
  room: Room;
  youId: string;
  nimaId: string;
  saraId: string;
  rezaId: string;
  omidId: string;
}

export type FiveLock =
  | 'nominate'
  | 'voteJa'
  | 'burnFascist'
  | 'voteNein'
  | 'enactLiberal'
  | 'peek'
  | 'execute'
  | null;

/**
 * Build a client-only five-player room, force the cast, skip opening night,
 * and open the nomination window so the player can pick a chancellor.
 */
export function startFiveTable(you: LookYou): FiveTable {
  const deck = new StackedDeck([...FIVE_STACK]);
  const room = new Room({
    id: FIVE_ROOM_ID,
    code: 'FIVE',
    passwordHash: null,
    deck,
    options: {
      name: '',
      hasPassword: false,
      minPlayers: 5,
      maxPlayers: 5,
      timerEnabled: false,
      confirmActions: false,
    },
  });
  const engine = new GameEngine(room);

  const cast: Array<{ name: string; avatar: number; host?: boolean }> = [
    { name: you.name || 'You', avatar: you.avatar, host: true },
    { name: 'Nima', avatar: (you.avatar + 1) % AVATAR_COUNT },
    { name: 'Sara', avatar: (you.avatar + 2) % AVATAR_COUNT },
    { name: 'Reza', avatar: (you.avatar + 3) % AVATAR_COUNT },
    { name: 'Omid', avatar: (you.avatar + 4) % AVATAR_COUNT },
  ];

  const seated: Player[] = [];
  for (const member of cast) {
    const player = engine.addPlayer(member.name, !!member.host, member.avatar);
    if ('code' in player) throw new Error(`five seat failed: ${player.code}`);
    seated.push(player);
    engine.setReady(player.id, true);
  }

  const [youSeat, nima, sara, reza, omid] = seated;
  const started = engine.startGame(youSeat.id);
  if (started) throw new Error(`five start failed: ${started.code}`);

  const roles: Role[] = ['liberal', 'liberal', 'liberal', 'fascist', 'hitler'];
  room.players.forEach((player, index) => {
    player.role = roles[index] ?? 'liberal';
  });

  skipOpeningNight(room);
  engine.handleCommand(youSeat.id, { kind: 'endTurn' });

  return {
    engine,
    room,
    youId: youSeat.id,
    nimaId: nima.id,
    saraId: sara.id,
    rezaId: reza.id,
    omidId: omid.id,
  };
}

export function fiveView(table: FiveTable): GameStateView {
  return table.room.viewFor(table.youId);
}

export function fiveHandle(
  table: FiveTable,
  command: GameCommand,
): ReturnType<GameEngine['handleCommand']> {
  return table.engine.handleCommand(table.youId, command);
}

export function fiveBot(
  table: FiveTable,
  playerId: string,
  command: GameCommand,
): ReturnType<GameEngine['handleCommand']> {
  return table.engine.handleCommand(playerId, command);
}

function skipOpeningNight(room: Room): void {
  if (room.discussionStartedAt > 0) {
    room.discussionStartedAt -= OPENING_CEREMONY_MS + 1;
  }
}

export function isAllowedChancellor(table: FiveTable, targetId: string): boolean {
  return targetId === table.nimaId || targetId === table.saraId;
}

export function fascistIndex(policies: Policy[]): number {
  return policies.findIndex((policy) => policy === 'fascist');
}

export function liberalIndex(policies: Policy[]): number {
  return policies.findIndex((policy) => policy === 'liberal');
}

export function inPhase(table: FiveTable, phase: Phase): boolean {
  return table.room.phase === phase;
}
