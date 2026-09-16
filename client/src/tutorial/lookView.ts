import {
  AVATAR_COUNT,
  Phase,
  type GameStateView,
  type Policy,
  type PublicPlayer,
  type Vote,
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
 * Step 1 — how a hand plays on the real table.
 * Step 0 already named the pieces; here Daniel walks the moves.
 */
export const LOOK_BEATS = [
  { target: 'government', headline: 'onboard.idea.government' },
  { target: 'vote', headline: 'onboard.idea.vote' },
  { target: 'ballots', headline: 'onboard.idea.ballots' },
  { target: 'tracker', headline: 'onboard.idea.trackerFail1' },
  { target: 'nextPresident', headline: 'onboard.idea.nextPresident' },
  { target: 'tracker', headline: 'onboard.idea.trackerFail2' },
  { target: 'tracker', headline: 'onboard.idea.trackerChaos' },
  { target: 'deck', headline: 'onboard.idea.deck' },
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

/** Majority Nein on a 5-seat table (half + 1). */
const FAILED_VOTES: Record<string, Vote> = {
  [LOOK_SEAT.you]: 'nein',
  [LOOK_SEAT.nima]: 'nein',
  [LOOK_SEAT.sara]: 'nein',
  [LOOK_SEAT.reza]: 'ja',
  [LOOK_SEAT.omid]: 'ja',
};

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
  const target = beat.target;
  const headline = beat.headline;
  const withOffices =
    target === 'government' ||
    target === 'vote' ||
    target === 'ballots' ||
    target === 'laws';

  const avatars = companionAvatars(you.avatar);
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

  if (target === 'vote') return votingStage(base);
  if (headline === 'onboard.idea.trackerFail1') return failTrackerStage(base, 1);
  if (headline === 'onboard.idea.nextPresident') return nextPresidentStage(base);
  if (headline === 'onboard.idea.trackerFail2') return failTrackerStage(base, 2);
  if (headline === 'onboard.idea.trackerChaos') return failTrackerStage(base, 3);
  if (target === 'ballots') return ballotsStage(base);
  if (target === 'laws') return lawsStage(base);
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

/** Real vote dialog: Ja / Nein cards. */
function votingStage(base: GameStateView): GameStateView {
  const now = Date.now();
  return {
    ...base,
    phase: Phase.Voting,
    voteDeadline: { startedAt: now, endsAt: now + LOOK_DEADLINE_MS },
    you: { ...base.you, vote: null },
  };
}

/** Face-up Ja / Nein cards on the seats after the table has voted. */
function ballotsStage(base: GameStateView): GameStateView {
  const votes: Record<string, Vote> = {
    [LOOK_SEAT.you]: 'ja',
    [LOOK_SEAT.nima]: 'ja',
    [LOOK_SEAT.sara]: 'ja',
    [LOOK_SEAT.reza]: 'nein',
    [LOOK_SEAT.omid]: 'ja',
  };
  return {
    ...base,
    phase: Phase.Nomination,
    players: base.players.map((player) => ({
      ...player,
      hasVoted: true,
      vote: votes[player.id] ?? null,
    })),
    you: { ...base.you, vote: 'ja' },
  };
}

/**
 * Failed government: majority Nein (half + 1), tracker advanced, offices clear.
 * marks = 1 | 2 | 3 (third mark = chaos threshold).
 */
function failTrackerStage(base: GameStateView, marks: 1 | 2 | 3): GameStateView {
  return {
    ...base,
    phase: Phase.Nomination,
    board: {
      ...base.board,
      electionTracker: marks,
      president: null,
      chancellor: null,
    },
    players: base.players.map((player) => ({
      ...player,
      isPresident: false,
      isChancellor: false,
      hasVoted: true,
      vote: FAILED_VOTES[player.id] ?? 'nein',
    })),
    you: { ...base.you, vote: 'nein' },
  };
}

/** Presidency rotated to the next seat after a failed vote. */
function nextPresidentStage(base: GameStateView): GameStateView {
  return {
    ...base,
    phase: Phase.Nomination,
    board: {
      ...base.board,
      electionTracker: 1,
      president: LOOK_SEAT.nima,
      chancellor: null,
    },
    players: base.players.map((player) => ({
      ...player,
      isPresident: player.id === LOOK_SEAT.nima,
      isChancellor: false,
      hasVoted: false,
      vote: null,
    })),
    you: { ...base.you, vote: null },
  };
}

/** Three policy tiles in the president's hand. */
function lawsStage(base: GameStateView): GameStateView {
  const now = Date.now();
  const policies: Policy[] = ['liberal', 'fascist', 'liberal'];
  return {
    ...base,
    phase: Phase.PresidentLegislative,
    board: { ...base.board, drawPile: 14 },
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
