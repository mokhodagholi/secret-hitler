import {
  Phase,
  type GameStateView,
  type Policy,
  type PublicPlayer,
} from '@secret-hitler/shared';
import type { MessageKey } from '../i18n';
import { companionPortraits } from './cast';

export const LOOK_ROOM_ID = 'look';

export const LOOK_SEAT = {
  you: 'look-you',
  nima: 'look-nima',
  sara: 'look-sara',
  reza: 'look-reza',
  omid: 'look-omid',
} as const;

export type LookWait =
  | 'continue'
  | 'talk'
  | 'say'
  | 'try'
  | 'auto'
  | 'pause'
  | 'pick'
  | 'open';

interface LookBeatSpec {
  target: string;
  headline: MessageKey;
  wait: LookWait;
  lifted?: boolean;
  chat?: boolean;
  blur?: boolean;
  /** Punch out the in-game settings sheet (gear already opened it). */
  menu?: boolean;
  continueKey?: MessageKey;
  /** Staged law hand after the ticket — deal / burn-pass / chancellor pick. */
  laws?: 'deal' | 'pass' | 'enact';
  /** After the header finishes, wait this long then advance. Pause beats only. */
  pauseMs?: number;
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
  {
    target: 'president',
    headline: 'onboard.idea.thisPresidentLaws',
    wait: 'continue',
  },
  { target: 'chat', headline: 'onboard.idea.talk', wait: 'continue', chat: true },
  {
    target: 'settings',
    headline: 'onboard.idea.settings',
    wait: 'open',
    chat: true,
  },
  {
    target: 'menu',
    headline: 'onboard.idea.settingsMenu',
    wait: 'continue',
    chat: true,
    menu: true,
  },
  {
    target: 'messages',
    headline: 'onboard.idea.messages',
    wait: 'continue',
    chat: true,
  },
  {
    target: 'composer',
    headline: 'onboard.idea.writeHere',
    wait: 'try',
    chat: true,
  },
  {
    target: 'table',
    headline: 'onboard.idea.whereWereWe',
    wait: 'pause',
    lifted: true,
    chat: true,
  },
  {
    target: 'table',
    headline: 'onboard.idea.campaign',
    wait: 'continue',
    lifted: true,
    chat: true,
  },
  {
    target: 'chat',
    headline: 'onboard.idea.talkAbout',
    wait: 'pause',
    lifted: true,
    chat: true,
    pauseMs: 2000,
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
    target: 'government',
    headline: 'onboard.idea.chancellorDoes',
    wait: 'continue',
    chat: true,
  },
  {
    target: 'laws',
    headline: 'onboard.idea.onlyPresidentSees',
    wait: 'continue',
    chat: true,
    laws: 'deal',
  },
  {
    target: 'laws',
    headline: 'onboard.idea.presidentBurns',
    wait: 'continue',
    chat: true,
    laws: 'pass',
  },
  {
    target: 'laws',
    headline: 'onboard.idea.youPickLaw',
    wait: 'pick',
    chat: true,
    laws: 'enact',
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

export function lookShowsMenu(index: number): boolean {
  return lookBeatAt(index).menu === true;
}

export function lookBlursTable(index: number): boolean {
  return lookBeatAt(index).blur === true;
}

/** Nima asks the table; the others campaign, two lines each. */
export const LOOK_CAMPAIGN: ReadonlyArray<{
  seat: keyof typeof LOOK_SEAT;
  key: MessageKey;
}> = [
  { seat: 'nima', key: 'onboard.talk.listening' },
  { seat: 'reza', key: 'onboard.talk.trustMe' },
  { seat: 'sara', key: 'onboard.talk.playingYou' },
  { seat: 'omid', key: 'onboard.talk.anyoneCan' },
  { seat: 'reza', key: 'onboard.talk.putMeIn' },
  { seat: 'sara', key: 'onboard.talk.tooEager' },
  { seat: 'omid', key: 'onboard.talk.quietlyLiberal' },
  { seat: 'nima', key: 'onboard.talk.illPick' },
];

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
    case 'nima':
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
  const laws = 'laws' in beat ? beat.laws : undefined;
  const withChancellor =
    options.picked === true || target === 'government' || laws != null;

  const avatars = companionPortraits(you.avatar, 4);
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

  return emptyView(players, withChancellor, laws);
}

function emptyView(
  players: PublicPlayer[],
  withChancellor: boolean,
  laws?: 'deal' | 'pass' | 'enact',
): GameStateView {
  return {
    roomId: LOOK_ROOM_ID,
    code: 'LOOK',
    name: '',
    phase: lawsPhase(laws),
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
      policies: lawsPolicies(laws),
      peek: [],
      investigation: null,
      canRequestKick: false,
      wantStartCooldownUntil: null,
    },
  };
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

function lawsPhase(laws?: 'deal' | 'pass' | 'enact'): Phase {
  if (laws === 'deal') return Phase.PresidentLegislative;
  if (laws === 'pass' || laws === 'enact') return Phase.ChancellorLegislative;
  return Phase.Nomination;
}

function lawsPolicies(laws?: 'deal' | 'pass' | 'enact'): Policy[] {
  return laws === 'enact' ? ['liberal', 'fascist'] : [];
}
