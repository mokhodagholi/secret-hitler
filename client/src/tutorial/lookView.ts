import {
  AVATAR_COUNT,
  Phase,
  type GameStateView,
  type PublicPlayer,
} from '@secret-hitler/shared';
import type { MessageKey } from '../i18n';

export const LOOK_ROOM_ID = 'look';

export const LOOK_SEAT = {
  you: 'look-you',
  nima: 'look-nima',
  sara: 'look-sara',
  reza: 'look-reza',
  omid: 'look-omid',
} as const;

export type LookWait = 'continue' | 'talk' | 'say' | 'auto';

interface LookBeatSpec {
  target: string;
  headline: MessageKey;
  wait: LookWait;
  lifted?: boolean;
  chat?: boolean;
  blur?: boolean;
  continueKey?: MessageKey;
}

/**
 * Step 1 — the table, then how people talk their way into office.
 * Step 0 already named the pieces.
 */
export const LOOK_BEATS = [
  {
    target: 'table',
    headline: 'onboard.idea.welcome',
    wait: 'continue',
    lifted: true,
  },
  { target: 'seats', headline: 'onboard.idea.people', wait: 'continue' },
  { target: 'boards', headline: 'onboard.idea.boards', wait: 'continue' },
  {
    target: 'president',
    headline: 'onboard.idea.thisPresident',
    wait: 'continue',
  },
  { target: 'chat', headline: 'onboard.idea.talk', wait: 'continue', chat: true },
  {
    target: 'chat',
    headline: 'onboard.idea.campaign',
    wait: 'continue',
    chat: true,
  },
  {
    target: 'chat',
    headline: 'onboard.idea.talkAbout',
    wait: 'continue',
    chat: true,
  },
  {
    target: 'chat',
    headline: 'onboard.idea.talkAbout',
    wait: 'talk',
    chat: true,
  },
  {
    target: 'composer',
    headline: 'onboard.idea.yourTurn',
    wait: 'say',
    chat: true,
  },
  {
    target: 'government',
    headline: 'onboard.idea.youChancellor',
    wait: 'continue',
    chat: true,
  },
  {
    target: 'table',
    headline: 'onboard.idea.seeNext',
    wait: 'continue',
    lifted: true,
    blur: true,
    continueKey: 'onboard.seeNext',
  },
] as const satisfies ReadonlyArray<LookBeatSpec>;

export type LookBeat = (typeof LOOK_BEATS)[number];

export function lookBeatAt(index: number): LookBeat {
  return LOOK_BEATS[Math.max(0, Math.min(index, LOOK_BEATS.length - 1))]!;
}

export function lookShowsChat(index: number): boolean {
  return lookBeatAt(index).chat === true;
}

export function lookBlursTable(index: number): boolean {
  return lookBeatAt(index).blur === true;
}

/** Nima is President; the other three campaign, two lines each. */
export const LOOK_CAMPAIGN: ReadonlyArray<{
  seat: keyof typeof LOOK_SEAT;
  key: MessageKey;
}> = [
  { seat: 'reza', key: 'onboard.talk.trustMe' },
  { seat: 'sara', key: 'onboard.talk.playingYou' },
  { seat: 'omid', key: 'onboard.talk.anyoneCan' },
  { seat: 'nima', key: 'onboard.talk.listening' },
  { seat: 'reza', key: 'onboard.talk.putMeIn' },
  { seat: 'sara', key: 'onboard.talk.tooEager' },
  { seat: 'omid', key: 'onboard.talk.quietlyLiberal' },
  { seat: 'nima', key: 'onboard.talk.illPick' },
];

/** Second pass after a pitch that was not the suggestion. */
export const LOOK_CAMPAIGN_AGAIN: ReadonlyArray<{
  seat: keyof typeof LOOK_SEAT;
  key: MessageKey;
}> = [
  { seat: 'reza', key: 'onboard.talk.stillLiberal' },
  { seat: 'sara', key: 'onboard.talk.pickElse' },
  { seat: 'omid', key: 'onboard.talk.sameSong' },
  { seat: 'nima', key: 'onboard.talk.stillListening' },
  { seat: 'reza', key: 'onboard.talk.thisHand' },
  { seat: 'sara', key: 'onboard.talk.noRush' },
];

/**
 * The compose ghost is the required line. Allow collapsed spaces and the
 * usual ي/ك slip; do not accept a different sentence.
 */
export function samePitch(typed: string, expected: string): boolean {
  return normalizePitch(typed) === normalizePitch(expected);
}

function normalizePitch(text: string): string {
  return text
    .replace(/\u064A/g, '\u06CC')
    .replace(/\u0643/g, '\u06A9')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Lesson sting for the punched-out widget. Not live-table foley. */
export type LookBeatEffect =
  | 'onboard-seats'
  | 'onboard-boards'
  | 'onboard-offices'
  | 'onboard-vote'
  | 'onboard-tracker'
  | 'onboard-deck'
  | 'onboard-laws';

export function effectForLookTarget(target: string): LookBeatEffect | null {
  switch (target) {
    case 'seats':
      return 'onboard-seats';
    case 'boards':
      return 'onboard-boards';
    case 'president':
    case 'government':
      return 'onboard-offices';
    case 'vote':
      return 'onboard-vote';
    case 'tracker':
      return 'onboard-tracker';
    case 'deck':
      return 'onboard-deck';
    case 'laws':
      return 'onboard-laws';
    default:
      return null;
  }
}

const COMPANIONS: ReadonlyArray<{
  id: (typeof LOOK_SEAT)[keyof typeof LOOK_SEAT];
  name: string;
  seat: number;
}> = [
  { id: LOOK_SEAT.nima, name: 'Nima', seat: 1 },
  { id: LOOK_SEAT.sara, name: 'Sara', seat: 2 },
  { id: LOOK_SEAT.reza, name: 'Reza', seat: 3 },
  { id: LOOK_SEAT.omid, name: 'Omid', seat: 4 },
];

export interface LookYou {
  name: string;
  avatar: number;
  /** Localized companion names, seat 1…n. English defaults if omitted. */
  companions?: readonly string[];
}

export interface LookViewOptions {
  /** President has already named the viewer Chancellor. */
  picked?: boolean;
}

/**
 * Frozen table staged for the current look beat. No server room — GameScreen
 * paints the same chrome a live match would.
 */
export function buildLookView(
  you: LookYou,
  beatIndex = 0,
  options: LookViewOptions = {},
): GameStateView {
  const beat = lookBeatAt(beatIndex);
  const target = beat.target;
  const withChancellor = options.picked === true || target === 'government';

  const avatars = companionAvatars(you.avatar);
  const players: PublicPlayer[] = [
    seat({
      id: LOOK_SEAT.you,
      name: you.name,
      avatar: you.avatar,
      seat: 0,
      isHost: true,
      isChancellor: withChancellor,
    }),
    seat({
      id: LOOK_SEAT.nima,
      name: you.companions?.[0] ?? COMPANIONS[0].name,
      avatar: avatars[0],
      seat: COMPANIONS[0].seat,
      isPresident: true,
    }),
    seat({
      id: LOOK_SEAT.sara,
      name: you.companions?.[1] ?? COMPANIONS[1].name,
      avatar: avatars[1],
      seat: COMPANIONS[1].seat,
    }),
    seat({
      id: LOOK_SEAT.reza,
      name: you.companions?.[2] ?? COMPANIONS[2].name,
      avatar: avatars[2],
      seat: COMPANIONS[2].seat,
    }),
    seat({
      id: LOOK_SEAT.omid,
      name: you.companions?.[3] ?? COMPANIONS[3].name,
      avatar: avatars[3],
      seat: COMPANIONS[3].seat,
    }),
  ];

  return emptyView(players, withChancellor);
}

function emptyView(players: PublicPlayer[], withChancellor: boolean): GameStateView {
  return {
    roomId: LOOK_ROOM_ID,
    code: 'LOOK',
    name: '',
    phase: Phase.Nomination,
    hostId: LOOK_SEAT.you,
    minPlayers: 5,
    maxPlayers: 10,
    kind: 'hosted',
    adminPlay: false,
    startChoice: null,
    players,
    board: {
      liberalPolicies: 0,
      fascistPolicies: 0,
      electionTracker: 0,
      drawPile: 17,
      discardPile: 0,
      president: LOOK_SEAT.nima,
      chancellor: withChancellor ? LOOK_SEAT.you : null,
      lastEnacted: [],
    },
    winner: null,
    roundHistory: [],
    breathDeadline: null,
    discussionDeadline: null,
    voteDeadline: null,
    legislativeDeadline: null,
    nominationDeadline: null,
    specialPowerDeadline: null,
    ineligibleChancellors: [],
    activePower: null,
    vetoUnlocked: false,
    vetoRequested: false,
    kickVote: null,
    you: {
      id: LOOK_SEAT.you,
      role: null,
      vote: null,
      policies: [],
      peek: [],
      investigation: null,
      canRequestKick: false,
      wantStartCooldownUntil: null,
    },
  };
}

function companionAvatars(youAvatar: number): [number, number, number, number] {
  const picks: number[] = [];
  for (let index = 0; picks.length < 4; index++) {
    const avatar = index % AVATAR_COUNT;
    if (avatar === youAvatar && AVATAR_COUNT > 1) continue;
    if (picks.includes(avatar)) continue;
    picks.push(avatar);
  }
  return picks as [number, number, number, number];
}

function seat(
  overrides: Partial<PublicPlayer> & Pick<PublicPlayer, 'id' | 'name' | 'seat'>,
): PublicPlayer {
  return {
    avatar: 0,
    isHost: false,
    connected: true,
    ready: true,
    wantsStart: false,
    isAlive: true,
    isPresident: false,
    isChancellor: false,
    hasVoted: false,
    vote: null,
    wantsContinue: false,
    role: null,
    party: null,
    selfMuted: false,
    ...overrides,
  };
}
