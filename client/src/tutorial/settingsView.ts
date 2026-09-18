import type { MessageKey } from '../i18n';

export const SETTINGS_TARGET = {
  gear: 'homeSettings',
  name: 'settingsName',
  card: 'settingsCard',
  music: 'settingsMusic',
  sound: 'settingsSound',
  ravi: 'settingsRavi',
  table: 'settingsTable',
  who: 'settingsWho',
  motion: 'settingsMotion',
  briefing: 'settingsBriefing',
  support: 'settingsSupport',
} as const;

export type SettingsWait = 'continue' | 'open';

export interface SettingsBeatSpec {
  target: string;
  headline: MessageKey;
  wait: SettingsWait;
  voice?: boolean;
  lifted?: boolean;
}

/**
 * Home gear, then each Settings row. Table voice only when that flag is on.
 */
export const SETTINGS_BEATS: SettingsBeatSpec[] = [
  {
    target: SETTINGS_TARGET.gear,
    headline: 'onboard.idea.homeSettings',
    wait: 'open',
  },
  {
    target: SETTINGS_TARGET.name,
    headline: 'onboard.settings.name',
    wait: 'continue',
  },
  {
    target: SETTINGS_TARGET.card,
    headline: 'onboard.settings.card',
    wait: 'continue',
  },
  {
    target: SETTINGS_TARGET.music,
    headline: 'onboard.settings.music',
    wait: 'continue',
  },
  {
    target: SETTINGS_TARGET.sound,
    headline: 'onboard.settings.sound',
    wait: 'continue',
  },
  {
    target: SETTINGS_TARGET.ravi,
    headline: 'onboard.settings.ravi',
    wait: 'continue',
  },
  {
    target: SETTINGS_TARGET.table,
    headline: 'onboard.settings.table',
    wait: 'continue',
    voice: true,
  },
  {
    target: SETTINGS_TARGET.who,
    headline: 'onboard.settings.who',
    wait: 'continue',
  },
  {
    target: SETTINGS_TARGET.motion,
    headline: 'onboard.settings.motion',
    wait: 'continue',
  },
  {
    target: SETTINGS_TARGET.briefing,
    headline: 'onboard.settings.briefing',
    wait: 'continue',
  },
  {
    target: SETTINGS_TARGET.support,
    headline: 'onboard.settings.support',
    wait: 'continue',
  },
  {
    target: SETTINGS_TARGET.gear,
    headline: 'onboard.settings.done',
    wait: 'continue',
    lifted: true,
  },
];

export function settingsBeats(voice: boolean): SettingsBeatSpec[] {
  return SETTINGS_BEATS.filter((beat) => !beat.voice || voice);
}

export function settingsBeatAt(
  index: number,
  beats: SettingsBeatSpec[] = SETTINGS_BEATS,
): SettingsBeatSpec {
  return beats[index] ?? beats[0] ?? SETTINGS_BEATS[0];
}

export function settingsShowsPage(beat: SettingsBeatSpec): boolean {
  return beat.wait !== 'open';
}
