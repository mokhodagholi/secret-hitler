import {
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
import { companionPortraits, DEFAULT_COMPANION_NAMES } from './cast';
import { StackedDeck } from './StackedDeck';
import type { LookYou } from './lookView';

export type OnboardCount = 5 | 6 | 7 | 8 | 9 | 10;

export const PLAY_ROOM_PREFIX = 'play-';

/**
 * Liberals early for a safe first hand, then fascists so peek / investigate
 * / execute can fire, then liberals toward a Liberal win.
 */
const PLAY_STACK: Policy[] = [
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

export interface ScriptedTable {
  count: OnboardCount;
  engine: GameEngine;
  room: Room;
  youId: string;
  nimaId: string;
  saraId: string;
  rezaId: string;
  omidId: string;
  seatIds: string[];
  /** Five-player first pick: only Nima. */
  strictFirstPick: boolean;
}

export type FiveTable = ScriptedTable;

export type PlayLock =
  | 'night'
  | 'delta'
  | 'openNominate'
  | 'nominate'
  | 'voteJa'
  | 'burnFascist'
  | 'watchEnact'
  | 'voteNein'
  | 'enactLiberal'
  | 'peek'
  | 'execute'
  | 'investigate'
  | 'specialElection'
  | null;

export type FiveLock = PlayLock;

function rolesFor(count: OnboardCount): Role[] {
  const fascistSeats = new Set(
    count <= 6 ? [3] : count <= 8 ? [3, 6] : [3, 6, 8],
  );
  return Array.from({ length: count }, (_, index) => {
    if (index === 4) return 'hitler';
    if (fascistSeats.has(index)) return 'fascist';
    return 'liberal';
  });
}

function companionName(you: LookYou, index: number): string {
  return you.companions?.[index] ?? DEFAULT_COMPANION_NAMES[index] ?? `Seat ${index + 1}`;
}

/**
 * Client-only table at `count`. Five keeps opening night. Six seeds a term
 * limit so the first nominate is the new rule. Seven–ten skip night — the
 * player is Liberal and would not see the difference anyway.
 */
export function startScriptedTable(you: LookYou, count: OnboardCount): ScriptedTable {
  const deck = new StackedDeck([...PLAY_STACK]);
  const room = new Room({
    id: `${PLAY_ROOM_PREFIX}${count}`,
    code: `P${count}`,
    passwordHash: null,
    deck,
    options: {
      name: '',
      hasPassword: false,
      minPlayers: count,
      maxPlayers: count,
      timerEnabled: false,
      confirmActions: false,
    },
  });
  const engine = new GameEngine(room);

  const cast: Array<{ name: string; avatar: number; host?: boolean }> = [
    { name: you.name || 'You', avatar: you.avatar, host: true },
  ];
  const portraits = companionPortraits(you.avatar, count - 1);
  for (let index = 0; index < count - 1; index++) {
    cast.push({
      name: companionName(you, index),
      avatar: portraits[index] ?? 0,
    });
  }

  const seated: Player[] = [];
  for (const member of cast) {
    const player = engine.addPlayer(member.name, !!member.host, member.avatar);
    if ('code' in player) throw new Error(`play seat failed: ${player.code}`);
    seated.push(player);
    engine.setReady(player.id, true);
  }

  const youSeat = seated[0];
  if (!youSeat) throw new Error('play table missing you');
  const started = engine.startGame(youSeat.id);
  if (started) throw new Error(`play start failed: ${started.code}`);
  // Teaching table: you hold the first placard. Live games pick at random.
  room.presidentId = youSeat.id;
  if (room.currentRound) {
    room.currentRound.presidentId = youSeat.id;
    room.currentRound.presidentName = youSeat.name;
  }

  const roles = rolesFor(count);
  room.players.forEach((player, index) => {
    player.role = roles[index] ?? 'liberal';
  });

  if (count !== 5) {
    skipOpeningNight(room);
    engine.handleCommand(youSeat.id, { kind: 'endTurn' });
  }

  const seatIds = seated.map((player) => player.id);
  const nimaId = seatIds[1] ?? '';
  const table: ScriptedTable = {
    count,
    engine,
    room,
    youId: youSeat.id,
    nimaId,
    saraId: seatIds[2] ?? '',
    rezaId: seatIds[3] ?? '',
    omidId: seatIds[4] ?? '',
    seatIds,
    strictFirstPick: count === 5,
  };

  if (count === 6) {
    room.lastElectedChancellorId = nimaId;
    room.lastElectedPresidentId = youSeat.id;
  }

  return table;
}

export function startFiveTable(you: LookYou): ScriptedTable {
  return startScriptedTable(you, 5);
}

export function playView(table: ScriptedTable): GameStateView {
  return table.room.viewFor(table.youId);
}

export const fiveView = playView;

export function playHandle(
  table: ScriptedTable,
  command: GameCommand,
): ReturnType<GameEngine['handleCommand']> {
  const error = table.engine.handleCommand(table.youId, command);
  // Tutorial is scripted — settle announce breaths so the next beat can run.
  flushTutorialBreath(table.engine);
  return error;
}

export const fiveHandle = playHandle;

export function playBot(
  table: ScriptedTable,
  playerId: string,
  command: GameCommand,
): ReturnType<GameEngine['handleCommand']> {
  const error = table.engine.handleCommand(playerId, command);
  flushTutorialBreath(table.engine);
  return error;
}

export const fiveBot = playBot;

function flushTutorialBreath(engine: GameEngine): void {
  let guard = 0;
  while (engine.room.pendingBreath && guard < 10) {
    engine.resolveBreathTimeout();
    guard += 1;
  }
}

/** Backdate the opening ceremony so the President can tap Choose Chancellor. */
export function skipOpeningNight(room: Room): void {
  if (room.discussionStartedAt > 0) {
    room.discussionStartedAt -= OPENING_CEREMONY_MS + 1;
  }
}

export function isAllowedChancellor(table: ScriptedTable, targetId: string): boolean {
  const target = table.room.findPlayer(targetId);
  if (!target?.isAlive || targetId === table.youId) return false;
  if (table.room.ineligibleChancellorIds().includes(targetId)) return false;
  if (table.strictFirstPick) return targetId === table.nimaId;
  return true;
}

export function isAllowedPowerTarget(
  table: ScriptedTable,
  lock: PlayLock,
  targetId: string,
): boolean {
  const target = table.room.findPlayer(targetId);
  if (!target?.isAlive || targetId === table.youId) return false;
  if (lock === 'execute') return targetId !== table.omidId;
  if (lock === 'investigate') {
    return !table.room.investigatedIds.includes(targetId);
  }
  if (lock === 'specialElection') return target.connected;
  return false;
}

export function fascistIndex(policies: Policy[]): number {
  return policies.findIndex((policy) => policy === 'fascist');
}

export function liberalIndex(policies: Policy[]): number {
  return policies.findIndex((policy) => policy === 'liberal');
}

export function inPhase(table: ScriptedTable, phase: Phase): boolean {
  return table.room.phase === phase;
}

export function onboardStepForCount(count: OnboardCount): number {
  return count - 3;
}

export function nextOnboardCount(count: OnboardCount): OnboardCount | null {
  if (count >= 10) return null;
  return (count + 1) as OnboardCount;
}

export function deltaHeadline(count: OnboardCount): 'onboard.nextSix' | 'onboard.nextSeven' | 'onboard.nextEight' | 'onboard.nextNine' | 'onboard.nextTen' | 'onboard.pick' {
  if (count === 6) return 'onboard.nextSix';
  if (count === 7) return 'onboard.nextSeven';
  if (count === 8) return 'onboard.nextEight';
  if (count === 9) return 'onboard.nextNine';
  if (count === 10) return 'onboard.nextTen';
  return 'onboard.pick';
}
