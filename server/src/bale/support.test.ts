import { describe, expect, it } from '@rstest/core';
import { formatSupportLetter, parseSupportChatId } from './support';

describe('formatSupportLetter', () => {
  it('Should put topic, sender id, and description in the letter', () => {
    expect(
      formatSupportLetter({
        topic: 'suggestion',
        description: 'add a veto hint',
        senderId: '42',
      }),
    ).toBe('پیشنهاد\n\nفرستنده: 42\n\nadd a veto hint');
  });
});

describe('parseSupportChatId', () => {
  it('Should keep group ids as numbers and usernames as strings', () => {
    expect(parseSupportChatId('-100123')).toBe(-100123);
    expect(parseSupportChatId(' 42 ')).toBe(42);
    expect(parseSupportChatId('@table')).toBe('@table');
    expect(parseSupportChatId('')).toBeUndefined();
    expect(parseSupportChatId(undefined)).toBeUndefined();
  });
});
