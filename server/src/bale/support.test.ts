import { describe, expect, it } from '@rstest/core';
import { formatKickVoteLetter, formatSupportLetter, parseSupportChatId } from './support';

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

  it('Should escape Markdown so Bale does not reject the letter', () => {
    expect(
      formatSupportLetter({
        topic: 'help',
        description: 'fix /find_game and this_underscore',
        senderId: '42',
      }),
    ).toContain('find\\_game');
    expect(
      formatSupportLetter({
        topic: 'help',
        description: 'fix /find_game and this_underscore',
        senderId: '42',
      }),
    ).toContain('this\\_underscore');
  });
});

describe('formatKickVoteLetter', () => {
  it('Should name both users, the tally, and whether they were removed', () => {
    expect(
      formatKickVoteLetter({
        requesterId: '11',
        targetId: '22',
        yesCount: 3,
        needed: 3,
        kicked: true,
        roomCode: 'ABC123',
      }),
    ).toBe(
      [
        'اخراج از میز',
        '',
        'اتاق: ABC123',
        '',
        'درخواست‌کننده: 11',
        'هدف: 22',
        'رأی موافق: 3 از 3',
        'نتیجه: اخراج شد',
      ].join('\n'),
    );
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
