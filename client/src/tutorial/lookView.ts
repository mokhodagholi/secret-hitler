import { AVATAR_COUNT, Phase, type GameStateView, type PublicPlayer } from '@secret-hitler/shared';
import type { MessageKey } from '../i18n';

export const LOOK_ROOM_ID = 'look';

export const LOOK_SEAT = {
  you: 'look-you',
  nima: 'look-nima',
  sara: 'look-sara',
  reza: 'look-reza',
  omid: 'look-omid',
} as const;

export const LOOK_BEATS = [
  { target: 'seats', headline: 'onboard.idea.table' },
  { target: 'boards', headline: 'onboard.idea.boards' },
  { target: 'vote', headline: 'onboard.idea.vote' },
  { target: 'government', headline: 'onboard.idea.government' },
  { target: 'deck', headline: 'onboard.idea.laws' },
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

export interface LookYou {
  name: string;
  avatar: number;
}

/**
 * Frozen Nomination table so Game-screen chrome (boards, deck, offices,
 * a revealed ballot) is on screen. The match itself is not running.
 */
export function buildLookView(you: LookYou): GameStateView {
  const avatars = companionAvatars(you.avatar);
  const players: PublicPlayer[] = [
    seat({
      id: LOOK_SEAT.you,
      name: you.name,
      avatar: you.avatar,
      seat: 0,
      isHost: true,
      isPresident: true,
    }),
    seat({
      id: LOOK_SEAT.nima,
      name: COMPANIONS[0].name,
      avatar: avatars[0],
      seat: COMPANIONS[0].seat,
      isChancellor: true,
    }),
    seat({
      id: LOOK_SEAT.sara,
      name: COMPANIONS[1].name,
      avatar: avatars[1],
      seat: COMPANIONS[1].seat,
      hasVoted: true,
      vote: 'ja',
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
      president: LOOK_SEAT.you,
      chancellor: LOOK_SEAT.nima,
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
