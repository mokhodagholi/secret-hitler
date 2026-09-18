import type { MessageKey } from '../i18n';
import { assignPortraits, type PortraitGender } from '../assets/avatars';
import type { LookYou } from './lookView';

export const COMPANION_IDS = [
  'nima',
  'sara',
  'reza',
  'omid',
  'maryam',
  'kian',
  'arash',
  'hoda',
  'behrad',
] as const;

export const COMPANION_GENDERS: readonly PortraitGender[] = [
  'man',
  'woman',
  'man',
  'man',
  'woman',
  'man',
  'man',
  'woman',
  'man',
];

export const DEFAULT_COMPANION_NAMES = [
  'Nima',
  'Sara',
  'Reza',
  'Omid',
  'Maryam',
  'Kian',
  'Arash',
  'Hoda',
  'Behrad',
] as const;

export function localizedCompanions(
  formatMessage: (key: MessageKey) => string,
): string[] {
  return COMPANION_IDS.map((id) => formatMessage(`onboard.seat.${id}`));
}

export function companionPortraits(youAvatar: number, count: number): number[] {
  return assignPortraits(youAvatar, COMPANION_GENDERS.slice(0, count));
}

export function tutorialYou(
  name: string,
  avatar: number,
  formatMessage: (key: MessageKey) => string,
): LookYou {
  return { name, avatar, companions: localizedCompanions(formatMessage) };
}
