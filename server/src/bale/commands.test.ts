import { describe, expect, it } from '@rstest/core';
import { Phase, type RoomSummary } from '@secret-hitler/shared';
import { baleStartLink, handleBotText, parseBotCommand } from './commands';

const BOT = '@secret_hitler_bot';

const lobby: RoomSummary = {
  id: 'r1',
  code: 'ABC123',
  name: 'Friday',
  playerCount: 2,
  maxPlayers: 7,
  hasPassword: false,
  phase: Phase.Lobby,
};

function ctx(overrides: Partial<Parameters<typeof handleBotText>[0]> = {}) {
  return handleBotText({
    text: '/start',
    fromId: 1,
    lobbies: [lobby],
    games: [lobby],
    seated: undefined,
    botUsername: BOT,
    ...overrides,
  });
}

describe('parseBotCommand', () => {
  it('Should accept hyphenated and underscored command names', () => {
    expect(parseBotCommand('/find-game')).toEqual({ command: 'find_game', arg: '' });
    expect(parseBotCommand('/find_game')).toEqual({ command: 'find_game', arg: '' });
    expect(parseBotCommand('/join@secretbot ABC123')).toEqual({
      command: 'join',
      arg: 'ABC123',
    });
  });

  it('Should treat a typed start without a slash as /start', () => {
    expect(parseBotCommand('start')).toEqual({ command: 'start', arg: '' });
    expect(parseBotCommand('Start')).toEqual({ command: 'start', arg: '' });
  });

  it('Should not treat a bare room code as a command', () => {
    expect(parseBotCommand('ABC123')).toBeNull();
  });
});

describe('baleStartLink', () => {
  it('Should open the mini-app with startapp, with or without a payload', () => {
    expect(baleStartLink(BOT)).toBe('https://ble.ir/secret_hitler_bot?startapp=');
    expect(baleStartLink('secret_hitler_bot', 'ABC123')).toBe(
      'https://ble.ir/secret_hitler_bot?startapp=ABC123',
    );
    expect(baleStartLink(BOT, 'naqvvxd7vbc2xvky')).toBe(
      'https://ble.ir/secret_hitler_bot?startapp=naqvvxd7vbc2xvky',
    );
  });
});

describe('handleBotText', () => {
  it('Should greet /start in natural Persian and never mention the public domain', () => {
    const reply = ctx({ text: '/start' });
    expect(reply.text).toContain('راز هیتلر');
    expect(reply.text).not.toContain('هیتلر مخفی');
    expect(reply.text).not.toContain('/find_game');
    expect(JSON.stringify(reply)).not.toContain('mrfantastic');
    expect(reply.text).toContain('https://ble.ir/secret_hitler_bot?startapp=');
    expect(reply.reply_markup?.inline_keyboard[0]?.[0]?.url).toBe(
      'https://ble.ir/secret_hitler_bot?startapp=',
    );
  });

  it('Should greet a typed start the same as /start', () => {
    const reply = ctx({ text: 'start' });
    expect(reply.text).toContain('راز هیتلر');
    expect(reply.reply_markup?.inline_keyboard[0]?.[0]?.url).toBe(
      'https://ble.ir/secret_hitler_bot?startapp=',
    );
  });

  it('Should list the same lobby rooms on /find-game with Bale startapp links', () => {
    const reply = ctx({ text: '/find-game' });
    expect(reply.text).toContain('ABC123');
    expect(reply.text).toContain('Friday');
    expect(reply.reply_markup?.inline_keyboard[0]?.[0]?.url).toBe(
      'https://ble.ir/secret_hitler_bot?startapp=ABC123',
    );
  });

  it('Should join by code with a ble.ir startapp link', () => {
    const reply = ctx({ text: '/join ABC123' });
    expect(reply.text).toContain('Friday');
    expect(reply.text).toContain('https://ble.ir/secret_hitler_bot?startapp=ABC123');
    expect(reply.reply_markup?.inline_keyboard[0]?.[0]?.url).toBe(
      'https://ble.ir/secret_hitler_bot?startapp=ABC123',
    );
  });

  it('Should treat a bare room code as /join', () => {
    const reply = ctx({ text: 'abc123' });
    expect(reply.reply_markup?.inline_keyboard[0]?.[0]?.url).toBe(
      'https://ble.ir/secret_hitler_bot?startapp=ABC123',
    );
  });

  it('Should invite using the seat synced from the mini-app', () => {
    const reply = ctx({
      text: '/invite',
      seated: { roomId: 'r1', code: 'ABC123', playerId: 'p1', roomName: 'Friday' },
    });
    expect(reply.text).toContain('ABC123');
    expect(reply.text).toContain('Friday');
    expect(reply.text).toContain(baleStartLink(BOT, 'ABC123'));
    expect(reply.reply_markup?.inline_keyboard[0]?.[0]?.url).toBe(
      'https://ble.ir/secret_hitler_bot?startapp=ABC123',
    );
  });

  it('Should list in-progress games on /games', () => {
    const playing: RoomSummary = { ...lobby, code: 'PLAY01', phase: Phase.Nomination };
    const reply = ctx({ text: '/games', games: [lobby, playing], lobbies: [lobby] });
    expect(reply.text).toContain('در حال بازی');
    expect(reply.text).toContain('PLAY01');
  });
});
