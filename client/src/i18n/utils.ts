/** Locale-formatting helpers shared across locale files and the i18n service. */
import type { LocaleMessages, MessageKey, MessageValues } from './types';

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** Convert ASCII digits in a value to Persian (Eastern Arabic) numerals. */
export function faNum(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

/**
 * Wrap text in Unicode isolates so its own direction can't reorder the line it
 * sits in — e.g. an English name embedded in a Persian (RTL) log sentence.
 */
export function isolateBidi(value: string): string {
  // U+2068 First Strong Isolate … U+2069 Pop Directional Isolate.
  return `⁨${value}⁩`;
}

/**
 * Substitute `{token}` placeholders in a template with values from `data`.
 * An unmatched token is left intact so missing values are visible, not blank.
 */
export function formatStrings(template: string, data: MessageValues): string {
  return template.replace(/\{(\w+)\}/g, (whole, key) =>
    key in data ? String(data[key]) : whole,
  );
}

/** Walk a dot-path (`'rules.steps.deal.title'`) to its leaf string. */
export function resolveMessage(
  strings: LocaleMessages,
  id: MessageKey,
): string | undefined {
  let node: unknown = strings;
  for (const key of id.split('.')) {
    if (node && typeof node === 'object') {
      node = (node as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return typeof node === 'string' ? node : undefined;
}
