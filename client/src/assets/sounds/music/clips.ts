/**
 * Bundler-imported looping beds. Rsbuild cannot `import.meta.glob`,
 * so each mp3 is a static import the same way effects are registered.
 */

import chaosTheme from './chaos-theme.mp3';
import discussLate from './discuss-late.mp3';
import discussTheme from './discuss-theme.mp3';
import legislativeTheme from './legislative-theme.mp3';
import lobbyTheme from './lobby-theme.mp3';
import lookTheme from './look-theme.mp3';
import menuTheme from './menu-theme.mp3';
import nightAmbient from './night-ambient.mp3';
import onboardTheme from './onboard-theme.mp3';
import overDawn from './over-dawn.mp3';
import overDusk from './over-dusk.mp3';
import playTheme from './play-theme.mp3';
import powerTheme from './power-theme.mp3';
import voteTheme from './vote-theme.mp3';

export const MUSIC_URLS = {
  'menu-theme': menuTheme,
  'play-theme': playTheme,
  'lobby-theme': lobbyTheme,
  'night-ambient': nightAmbient,
  'discuss-theme': discussTheme,
  'discuss-late': discussLate,
  'vote-theme': voteTheme,
  'legislative-theme': legislativeTheme,
  'power-theme': powerTheme,
  'chaos-theme': chaosTheme,
  'over-dawn': overDawn,
  'over-dusk': overDusk,
  'onboard-theme': onboardTheme,
  'look-theme': lookTheme,
} as const;
