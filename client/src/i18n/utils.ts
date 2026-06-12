/** Locale-formatting helpers shared across locale files and the i18n service. */
import type { MessageValues } from './types';

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** Convert ASCII digits in a value to Persian (Eastern Arabic) numerals. */
export function faNum(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
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
