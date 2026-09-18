import type { HistoryMatchView, SocialTieStatus } from '@secret-hitler/shared';
import type { MessageKey } from '../i18n';
import { DEFAULT_COMPANION_NAMES } from './cast';
import type { LookYou } from './lookView';

export const HISTORY_WIN_ID = 'look-history-win';
export const HISTORY_LOSS_ID = 'look-history-loss';

export const HISTORY_ACCOUNT = {
  nima: 'look-history-nima',
  sara: 'look-history-sara',
  reza: 'look-history-reza',
  omid: 'look-history-omid',
  maryam: 'look-history-maryam',
  kian: 'look-history-kian',
  arash: 'look-history-arash',
  behrad: 'look-history-behrad',
} as const;

/** The Add button Daniel asks them to tap. */
export const HISTORY_ADD_ACCOUNT = HISTORY_ACCOUNT.reza;

export const HISTORY_TARGET = {
  chip: 'homeHistory',
  sheet: 'historySheet',
  outcome: 'historyOutcome',
  result: 'historyResult',
  players: 'historyPlayers',
  you: 'historyYou',
  role: 'historyRole',
  add: 'historyAdd',
  sent: 'historySent',
  tie: 'historyTie',
  close: 'historyClose',
  loss: 'historyLoss',
} as const;

export type HistoryWait = 'continue' | 'open';

interface HistoryBeatSpec {
  target: string;
  headline: MessageKey;
  wait: HistoryWait;
  sheet?: boolean;
  lifted?: boolean;
  expand?: 'win' | 'loss';
  loss?: boolean;
}

/**
 * Home — past tables. One mock win first. Roles, Add, Reza's sent chip,
 * then the other statuses. Close via X, reopen, then a loss under it.
 */
export const HISTORY_BEATS = [
  {
    target: HISTORY_TARGET.chip,
    headline: 'onboard.history.chip',
    wait: 'open',
  },
  {
    target: HISTORY_TARGET.sheet,
    headline: 'onboard.history.list',
    wait: 'continue',
    sheet: true,
  },
  {
    target: HISTORY_TARGET.outcome,
    headline: 'onboard.history.outcome',
    wait: 'continue',
    sheet: true,
  },
  {
    target: HISTORY_TARGET.result,
    headline: 'onboard.history.yours',
    wait: 'continue',
    sheet: true,
  },
  {
    target: HISTORY_TARGET.players,
    headline: 'onboard.history.people',
    wait: 'continue',
    sheet: true,
    expand: 'win',
  },
  {
    target: HISTORY_TARGET.you,
    headline: 'onboard.history.you',
    wait: 'continue',
    sheet: true,
    expand: 'win',
  },
  {
    target: HISTORY_TARGET.role,
    headline: 'onboard.history.roles',
    wait: 'continue',
    sheet: true,
    expand: 'win',
  },
  {
    target: HISTORY_TARGET.add,
    headline: 'onboard.history.add',
    wait: 'open',
    sheet: true,
    expand: 'win',
  },
  {
    target: HISTORY_TARGET.sent,
    headline: 'onboard.history.sent',
    wait: 'continue',
    sheet: true,
    expand: 'win',
  },
  {
    target: HISTORY_TARGET.tie,
    headline: 'onboard.history.ties',
    wait: 'continue',
    sheet: true,
    expand: 'win',
  },
  {
    target: HISTORY_TARGET.close,
    headline: 'onboard.history.close',
    wait: 'open',
    sheet: true,
    expand: 'win',
  },
  {
    target: HISTORY_TARGET.chip,
    headline: 'onboard.history.loss',
    wait: 'open',
  },
  {
    target: HISTORY_TARGET.loss,
    headline: 'onboard.history.lossCard',
    wait: 'continue',
    sheet: true,
    expand: 'loss',
    loss: true,
  },
  {
    target: HISTORY_TARGET.sheet,
    headline: 'onboard.history.done',
    wait: 'continue',
    sheet: true,
    lifted: true,
    loss: true,
  },
] as const satisfies ReadonlyArray<HistoryBeatSpec>;

export type HistoryBeat = (typeof HISTORY_BEATS)[number];

export function historyBeatAt(index: number): HistoryBeat {
  return HISTORY_BEATS[Math.max(0, Math.min(index, HISTORY_BEATS.length - 1))]!;
}

export function historyShowsSheet(index: number): boolean {
  return historyBeatAt(index).sheet === true;
}

export function historyShowsLoss(index: number): boolean {
  return historyBeatAt(index).loss === true;
}

export function historyExpandMatchIds(index: number): string[] {
  const expand = historyBeatAt(index).expand;
  if (expand === 'win') return [HISTORY_WIN_ID];
  if (expand === 'loss') return [HISTORY_LOSS_ID];
  return [];
}

export const INITIAL_HISTORY_TIES: Record<string, SocialTieStatus> = {
  [HISTORY_ACCOUNT.nima]: 'friends',
  [HISTORY_ACCOUNT.sara]: 'outgoing',
  [HISTORY_ACCOUNT.reza]: 'none',
  [HISTORY_ACCOUNT.omid]: 'incoming',
  [HISTORY_ACCOUNT.maryam]: 'none',
  [HISTORY_ACCOUNT.kian]: 'friends',
  [HISTORY_ACCOUNT.arash]: 'none',
  [HISTORY_ACCOUNT.behrad]: 'none',
};

function companionName(you: LookYou, index: number): string {
  return you.companions?.[index] ?? DEFAULT_COMPANION_NAMES[index] ?? 'Seat';
}

export function buildHistoryWin(you: LookYou): HistoryMatchView {
  return {
    id: HISTORY_WIN_ID,
    winner: 'liberal',
    playerCount: 5,
    endedAt: '2026-09-12T18:00:00.000Z',
    youWon: true,
    players: [
      {
        name: you.name,
        role: 'liberal',
        seat: 0,
        won: true,
        you: true,
        accountId: null,
      },
      {
        name: companionName(you, 0),
        role: 'liberal',
        seat: 1,
        won: true,
        you: false,
        accountId: HISTORY_ACCOUNT.nima,
      },
      {
        name: companionName(you, 1),
        role: 'liberal',
        seat: 2,
        won: true,
        you: false,
        accountId: HISTORY_ACCOUNT.sara,
      },
      {
        name: companionName(you, 2),
        role: 'fascist',
        seat: 3,
        won: false,
        you: false,
        accountId: HISTORY_ACCOUNT.reza,
      },
      {
        name: companionName(you, 3),
        role: 'hitler',
        seat: 4,
        won: false,
        you: false,
        accountId: HISTORY_ACCOUNT.omid,
      },
    ],
  };
}

export function buildHistoryLoss(you: LookYou): HistoryMatchView {
  return {
    id: HISTORY_LOSS_ID,
    winner: 'fascist',
    playerCount: 5,
    endedAt: '2026-09-08T21:30:00.000Z',
    youWon: false,
    players: [
      {
        name: you.name,
        role: 'liberal',
        seat: 0,
        won: false,
        you: true,
        accountId: null,
      },
      {
        name: companionName(you, 4),
        role: 'fascist',
        seat: 1,
        won: true,
        you: false,
        accountId: HISTORY_ACCOUNT.maryam,
      },
      {
        name: companionName(you, 5),
        role: 'hitler',
        seat: 2,
        won: true,
        you: false,
        accountId: HISTORY_ACCOUNT.kian,
      },
      {
        name: companionName(you, 6),
        role: 'liberal',
        seat: 3,
        won: false,
        you: false,
        accountId: HISTORY_ACCOUNT.arash,
      },
      {
        name: companionName(you, 8),
        role: 'liberal',
        seat: 4,
        won: false,
        you: false,
        accountId: HISTORY_ACCOUNT.behrad,
      },
    ],
  };
}

/** Both mock tables — tests and the loss beat. */
export function buildHistoryMatches(you: LookYou): HistoryMatchView[] {
  return [buildHistoryWin(you), buildHistoryLoss(you)];
}
