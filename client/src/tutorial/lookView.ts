import {
  AVATAR_COUNT,
  Phase,
  type GameStateView,
  type Policy,
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

/**
 * Punch-outs follow the real widgets: seats → boards → vote dialog (Ja/Nein
 * + government ticket) → office seats → three-law hand → seats again.
 */
export const LOOK_BEATS = [
  { target: 'seats', headline: 'onboard.idea.table' },
  { target: 'boards', headline: 'onboard.idea.boards' },
  { target: 'vote', headline: 'onboard.idea.vote' },
  { target: 'government', headline: 'onboard.idea.government' },
  { target: 'laws', headline: 'onboard.idea.laws' },
  { target: 'seats', headline: 'onboard.letsSit' },
] as const satisfies ReadonlyArray<{
  target: string;
  headline: MessageKey;
}>;

export type LookBeat = (typeof LOOK_BEATS)[number];

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

const LOOK_DEADLINE_MS = 60_000;

export interface LookYou {
  name: string;
  avatar: number;
}

/**
 * Frozen table staged for the current look beat. No server room — GameScreen
 * paints the same chrome a live match would.
 */
export function buildLookView(you: LookYou, beatIndex = 0): GameStateView {
  const beat = LOOK_BEATS[Math.max(0, Math.min(beatIndex, LOOK_BEATS.length - 1))];
  const avatars = companionAvatars(you.avatar);
  const withOffices = beat.target === 'vote' || beat.target === 'government' || beat.target === 'laws';

  const players: PublicPlayer[] = [
    seat({
      id: LOOK_SEAT.you,
      name: you.name,
      avatar: you.avatar,
      seat: 0,
      isHost: true,
      isPresident: withOffices,
    }),
    seat({
      id: LOOK_SEAT.nima,
      name: COMPANIONS[0].name,
      avatar: avatars[0],
      seat: COMPANIONS[0].seat,
      isChancellor: withOffices,
    }),
    seat({
      id: LOOK_SEAT.sara,
      name: COMPANIONS[1].name,
      avatar: avatars[1],
      seat: COMPANIONS[1].seat,
    }),
    seat({
      id: LOOK_SEAT.reza,
      name: COMPANIONS[2].name,
      avatar: avatars[2],
      seat: COMPANIONS[2].seat,
    }),
    seat({
      id: LOOK_SEAT.omid,
      name: COMPANIONS[3].name,
      avatar: avatars[3],
      seat: COMPANIONS[3].seat,
    }),
  ];

  const base = emptyView(players, withOffices);

  if (beat.target === 'vote') return votingStage(base);
  if (beat.target === 'laws') return lawsStage(base);
  return base;
}

function emptyView(players: PublicPlayer[], withOffices: boolean): GameStateView {
  return {
    roomId: LOOK_ROOM_ID,
    code: 'LOOK',
    name: '',
    phase: Phase.Nomination,
    hostId: LOOK_SEAT.you,
    minPlayers: 5,
    maxPlayers: 10,
    kind: 'hosted',
    startChoice: null,
    players,
    board: {
      liberalPolicies: 0,
      fascistPolicies: 0,
      electionTracker: 0,
      drawPile: 17,
      discardPile: 0,
      president: withOffices ? LOOK_SEAT.you : null,
      chancellor: withOffices ? LOOK_SEAT.nima : null,
      lastEnacted: [],
    },
    winner: null,
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

/** Real vote dialog: Ja / Nein plus the president → chancellor ticket. */
function votingStage(base: GameStateView): GameStateView {
  const now = Date.now();
  return {
    ...base,
    phase: Phase.Voting,
    voteDeadline: { startedAt: now, endsAt: now + LOOK_DEADLINE_MS },
    you: { ...base.you, vote: null },
  };
}

/** Three policy tiles in the president's hand — same LegislativeModal as a live deal. */
function lawsStage(base: GameStateView): GameStateView {
  const now = Date.now();
  const policies: Policy[] = ['liberal', 'fascist', 'liberal'];
  return {
    ...base,
    phase: Phase.PresidentLegislative,
    board: {
      ...base.board,
      drawPile: 14,
    },
    legislativeDeadline: { startedAt: now, endsAt: now + LOOK_DEADLINE_MS },
    you: { ...base.you, policies },
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

function seat(overrides: Partial<PublicPlayer> & Pick<PublicPlayer, 'id' | 'name' | 'seat'>): PublicPlayer {
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
