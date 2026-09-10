import {
  OPENING_CEREMONY_MS,
  Phase,
  isOpeningNight,
  type GameStateView,
  type LogEntry,
} from '@secret-hitler/shared';
import type { ScreenName } from './NavigationService';
import type { MusicTrack } from './SoundService';

/** How long chaos-theme sits under the enacted-policy reveal. */
const CHAOS_HOLD_MS = 8_000;

export interface MusicScene {
  screen: ScreenName;
  roomClosed: boolean;
  view: GameStateView | null;
  logs?: readonly LogEntry[];
  now?: number;
}

/** Which looping bed belongs under this screen + snapshot. */
export function trackForScene(scene: MusicScene): MusicTrack {
  if (scene.roomClosed) return 'menu-theme';
  switch (scene.screen) {
    case 'play':
    case 'create-room':
    case 'join-game':
      return 'play-theme';
    case 'waiting-room':
      return 'lobby-theme';
    case 'game':
      return trackForGame(scene);
    default:
      return 'menu-theme';
  }
}

/**
 * The bed that usually follows this scene. Prefetch it; do not play it yet.
 * `null` means nothing useful is next (ending, or already on the last room).
 */
export function nextTrackForScene(scene: MusicScene): MusicTrack | null {
  if (scene.roomClosed) return null;
  switch (scene.screen) {
    case 'play':
    case 'create-room':
    case 'join-game':
      return 'lobby-theme';
    case 'waiting-room':
      return 'night-ambient';
    case 'game':
      return nextGameTrack(scene);
    default:
      return 'play-theme';
  }
}

/**
 * Remaining ms until night or chaos should give way to the next bed.
 * `null` means the current track can sit until the next snapshot.
 */
export function nextMusicCheckMs(scene: MusicScene): number | null {
  const now = scene.now ?? Date.now();
  if (scene.screen !== 'game' || scene.roomClosed || !scene.view) return null;
  if (openingNight(scene.view, now)) {
    const start = scene.view.discussionDeadline?.startedAt ?? 0;
    return Math.max(0, start + OPENING_CEREMONY_MS - now);
  }
  const chaosAt = latestChaosAt(scene.logs);
  if (chaosAt != null && now - chaosAt < CHAOS_HOLD_MS) {
    return Math.max(0, chaosAt + CHAOS_HOLD_MS - now);
  }
  return null;
}

function trackForGame(scene: MusicScene): MusicTrack {
  const view = scene.view;
  if (!view) return 'play-theme';
  const now = scene.now ?? Date.now();

  if (view.phase === Phase.GameOver) {
    return view.winner === 'fascist' ? 'over-dusk' : 'over-dawn';
  }
  if (openingNight(view, now)) return 'night-ambient';
  if (view.phase === Phase.Voting) return 'vote-theme';
  if (
    view.phase === Phase.PresidentLegislative ||
    view.phase === Phase.ChancellorLegislative
  ) {
    return 'legislative-theme';
  }
  if (view.phase === Phase.SpecialPower) return 'power-theme';

  const chaosAt = latestChaosAt(scene.logs);
  if (chaosAt != null && now - chaosAt < CHAOS_HOLD_MS) return 'chaos-theme';

  if (isLateBoard(view)) return 'discuss-late';
  return 'discuss-theme';
}

function openingNight(view: GameStateView, now: number): boolean {
  return isOpeningNight({
    phase: view.phase,
    discussionStartedAt: view.discussionDeadline?.startedAt ?? 0,
    liberalPolicies: view.board.liberalPolicies,
    fascistPolicies: view.board.fascistPolicies,
    electionTracker: view.board.electionTracker,
    now,
  });
}

function nextGameTrack(scene: MusicScene): MusicTrack | null {
  const current = trackForGame(scene);
  switch (current) {
    case 'night-ambient':
      return 'discuss-theme';
    case 'discuss-theme':
    case 'discuss-late':
      return 'vote-theme';
    case 'vote-theme':
      return 'legislative-theme';
    case 'legislative-theme': {
      const fascist = scene.view?.board.fascistPolicies ?? 0;
      return fascist >= 1 ? 'power-theme' : 'discuss-theme';
    }
    case 'power-theme':
    case 'chaos-theme':
      return scene.view && isLateBoard(scene.view)
        ? 'discuss-late'
        : 'discuss-theme';
    default:
      return null;
  }
}

function isLateBoard(view: GameStateView): boolean {
  return (
    view.board.liberalPolicies >= 4 ||
    view.board.fascistPolicies >= 4 ||
    view.board.electionTracker === 2
  );
}

function latestChaosAt(logs: readonly LogEntry[] | undefined): number | null {
  if (!logs) return null;
  for (let i = logs.length - 1; i >= 0; i--) {
    if (logs[i].code === 'chaos') return logs[i].at;
  }
  return null;
}
