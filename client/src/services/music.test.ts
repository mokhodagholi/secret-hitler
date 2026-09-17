import { describe, expect, it } from '@rstest/core';
import { OPENING_CEREMONY_MS, Phase } from '@secret-hitler/shared';
import { makeView } from '../../test/test-utils';
import { nextMusicCheckMs, nextTrackForScene, trackForScene } from './music';

function scene(
  screen: Parameters<typeof trackForScene>[0]['screen'],
  view = makeView(),
  extra: Partial<Parameters<typeof trackForScene>[0]> = {},
) {
  return trackForScene({ screen, roomClosed: false, view, ...extra });
}

describe('trackForScene', () => {
  it('Should play the foyer bed on home and the ticket window on Play', () => {
    expect(scene('home')).toBe('menu-theme');
    expect(scene('play')).toBe('play-theme');
    expect(scene('waiting-room')).toBe('lobby-theme');
  });

  it('Should keep the lesson off the live table beds', () => {
    expect(scene('onboarding')).toBe('onboard-theme');
    expect(
      trackForScene({
        screen: 'game',
        roomClosed: false,
        view: makeView({ phase: Phase.Voting }),
        looking: true,
      }),
    ).toBe('look-theme');
    expect(
      trackForScene({
        screen: 'game',
        roomClosed: false,
        view: makeView({ phase: Phase.Nomination }),
        introducing: true,
      }),
    ).toBe('onboard-theme');
  });

  it('Should return to the foyer when the room is closed', () => {
    expect(
      trackForScene({
        screen: 'game',
        roomClosed: true,
        view: makeView({ phase: Phase.Nomination }),
      }),
    ).toBe('menu-theme');
  });

  it('Should follow the table: night, talk, vote, desk, power, ending', () => {
    const now = 1_000_000;
    const night = makeView({
      phase: Phase.Nomination,
      discussionDeadline: { startedAt: now, endsAt: now + 180_000 },
    });
    expect(scene('game', night, { now })).toBe('night-ambient');

    const talk = makeView({ phase: Phase.Nomination });
    expect(scene('game', talk)).toBe('discuss-theme');

    const late = makeView({
      phase: Phase.Nomination,
      board: { ...talk.board, liberalPolicies: 4 },
    });
    expect(scene('game', late)).toBe('discuss-late');

    expect(scene('game', makeView({ phase: Phase.Voting }))).toBe('vote-theme');
    expect(scene('game', makeView({ phase: Phase.PresidentLegislative }))).toBe(
      'legislative-theme',
    );
    expect(
      scene('game', makeView({ phase: Phase.SpecialPower, activePower: 'execution' })),
    ).toBe('power-theme');
    expect(
      scene('game', makeView({ phase: Phase.GameOver, winner: 'liberal' })),
    ).toBe('over-dawn');
    expect(
      scene('game', makeView({ phase: Phase.GameOver, winner: 'fascist' })),
    ).toBe('over-dusk');
  });

  it('Should hold chaos-theme under a fresh chaos log, then let talk resume', () => {
    const now = 5_000;
    const view = makeView({ phase: Phase.Nomination });
    expect(
      scene('game', view, { now, logs: [{ id: '1', code: 'chaos', at: now - 200 }] }),
    ).toBe('chaos-theme');
    expect(
      scene('game', view, { now, logs: [{ id: '1', code: 'chaos', at: now - 9_000 }] }),
    ).toBe('discuss-theme');
  });

  it('Should keep vote and desk beds on a late board', () => {
    const late = makeView({
      phase: Phase.Voting,
      board: { ...makeView().board, fascistPolicies: 4 },
    });
    expect(scene('game', late)).toBe('vote-theme');
  });
});

describe('nextMusicCheckMs', () => {
  it('Should wake when opening night elapses', () => {
    const now = 1_000_000;
    const wait = nextMusicCheckMs({
      screen: 'game',
      roomClosed: false,
      now,
      view: makeView({
        phase: Phase.Nomination,
        discussionDeadline: { startedAt: now, endsAt: now + 180_000 },
      }),
    });
    expect(wait).toBe(OPENING_CEREMONY_MS);
  });
});

describe('nextTrackForScene', () => {
  it('Should prefetch the next room, not the one already playing', () => {
    expect(
      nextTrackForScene({ screen: 'home', roomClosed: false, view: null }),
    ).toBe('play-theme');
    expect(
      nextTrackForScene({
        screen: 'onboarding',
        roomClosed: false,
        view: null,
        introducing: true,
      }),
    ).toBe('look-theme');
    expect(
      nextTrackForScene({ screen: 'play', roomClosed: false, view: null }),
    ).toBe('lobby-theme');
    expect(
      nextTrackForScene({
        screen: 'waiting-room',
        roomClosed: false,
        view: makeView(),
      }),
    ).toBe('night-ambient');
  });

  it('Should prefetch vote after talk and the desk after a vote', () => {
    expect(
      nextTrackForScene({
        screen: 'game',
        roomClosed: false,
        view: makeView({ phase: Phase.Nomination }),
      }),
    ).toBe('vote-theme');
    expect(
      nextTrackForScene({
        screen: 'game',
        roomClosed: false,
        view: makeView({ phase: Phase.Voting }),
      }),
    ).toBe('legislative-theme');
  });
});
