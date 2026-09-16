import { describe, expect, it } from '@rstest/core';
import { Phase, type RoomSummary } from '@secret-hitler/shared';
import { baleStartLink, broadcastHelpReply, broadcastPlayerReply, createGroupClosedReply, deleteRoomDoneReply, deleteRoomHelpReply, deleteRoomMissingReply, friendTableInviteReply, handleBotText, isBroadcastCommand, isDeleteRoomCommand, isDirectMessageCommand, isUnsendCommand, isUsersCommand, parseBotCommand, parseChatIds, parseMessageArg, unsendEmptyReply, usersEmptyReply, usersListReply } from './commands';

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
    expect(parseBotCommand('/play-game 2')).toEqual({
      command: 'play_game',
      arg: '2',
    });
    expect(parseBotCommand('/broadcast امشب بیا')).toEqual({
      command: 'broadcast',
      arg: 'امشب بیا',
    });
    expect(parseBotCommand('/send-all hi')).toEqual({
      command: 'send_all',
      arg: 'hi',
    });
    expect(parseBotCommand('/message 9,11 بیا')).toEqual({
      command: 'message',
      arg: '9,11 بیا',
    });
    expect(parseBotCommand('/unsend')).toEqual({
      command: 'unsend',
      arg: '',
    });
    expect(parseBotCommand('/delete ABC123')).toEqual({
      command: 'delete',
      arg: 'ABC123',
    });
  });

  it('Should treat a typed start without a slash as /start', () => {
    expect(parseBotCommand('start')).toEqual({ command: 'start', arg: '' });
    expect(parseBotCommand('Start')).toEqual({ command: 'start', arg: '' });
  });

  it('Should treat bare admin commands the same as their / form', () => {
    expect(parseBotCommand('users')).toEqual({ command: 'users', arg: '' });
    expect(parseBotCommand('Users')).toEqual({ command: 'users', arg: '' });
    expect(parseBotCommand('broadcast امشب')).toEqual({
      command: 'broadcast',
      arg: 'امشب',
    });
    expect(parseBotCommand('message 9,11')).toEqual({
      command: 'message',
      arg: '9,11',
    });
    expect(parseBotCommand('unsend')).toEqual({ command: 'unsend', arg: '' });
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
  it('Should put Telegram startapp links on Play when startLink is injected', () => {
    const reply = ctx({
      startLink: (startApp = '') => `https://t.me/secret_hitler_bot/game?startapp=${startApp}`,
      platform: 'telegram',
    });
    expect(JSON.stringify(reply.reply_markup)).toContain(
      'https://t.me/secret_hitler_bot/game?startapp=',
    );
    expect(JSON.stringify(reply)).not.toContain('ble.ir');
    expect(reply.text).not.toContain('بازی کن');
    expect(reply.text).not.toContain('t.me');
  });

  it('Should greet /start in natural Persian and never mention the public domain', () => {
    const reply = ctx({ text: '/start' });
    expect(reply.text).toContain('راز هیتلر');
    expect(reply.text).not.toContain('هیتلر مخفی');
    expect(reply.text).toContain('پیدا کردن بازی');
    expect(reply.text).not.toContain('secret_hitler_official');
    expect(reply.text).toContain('/create');
    expect(reply.text).not.toContain('/find_game');
    expect(reply.parse_mode).toBeUndefined();
    expect(JSON.stringify(reply)).not.toContain('mrfantastic');
    expect(reply.text).not.toContain('بازی کن');
    expect(reply.text).not.toContain('ble.ir');
    expect(reply.reply_markup?.inline_keyboard[0]?.[0]?.url).toBe(
      'https://ble.ir/secret_hitler_bot?startapp=',
    );
    expect(reply.reply_markup?.inline_keyboard[1]?.[0]).toEqual({
      text: 'کانال',
      url: 'https://ble.ir/secret_hitler_official',
    });
  });

  it('Should keep Telegram /start as plain text with a t.me channel button', () => {
    const reply = ctx({ text: '/start', platform: 'telegram' });
    expect(reply.parse_mode).toBeUndefined();
    expect(reply.text).not.toContain('\\_');
    expect(reply.text).not.toContain('secret_hitler_official');
    expect(reply.reply_markup?.inline_keyboard[1]?.[0]).toEqual({
      text: 'کانال',
      url: 'https://t.me/secret_hitler_official',
    });
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

  it('Should call the public table میز عمومی on /find_game', () => {
    const publicLobby: RoomSummary = {
      id: 'pub',
      code: 'PUB001',
      name: 'Untitled',
      playerCount: 0,
      maxPlayers: 10,
      hasPassword: false,
      phase: Phase.Lobby,
      kind: 'public',
    };
    const reply = ctx({
      text: '/find_game',
      lobbies: [publicLobby, lobby],
      games: [publicLobby, lobby],
    });
    expect(reply.text).toContain('میز عمومی');
    expect(reply.text).not.toContain('Untitled');
  });

  it('Should join by code with a ble.ir startapp link', () => {
    const reply = ctx({ text: '/join ABC123' });
    expect(reply.text).toContain('Friday');
    expect(reply.text).not.toContain('بازی کن');
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
    expect(reply.text).not.toContain('ورود به اتاق');
    expect(reply.reply_markup?.inline_keyboard[0]?.[0]?.url).toBe(
      'https://ble.ir/secret_hitler_bot?startapp=ABC123',
    );
  });

  it('Should DM a friend invite with who asked and a lobby button', () => {
    const reply = friendTableInviteReply({
      fromName: 'Ana',
      code: 'ABC123',
      botUsername: BOT,
    });
    expect(reply.text).toContain('Ana');
    expect(reply.text).toContain('ABC123');
    expect(reply.reply_markup?.inline_keyboard[0]?.[0]).toEqual({
      text: 'ورود به اتاق',
      url: 'https://ble.ir/secret_hitler_bot?startapp=ABC123',
    });
  });

  it('Should tell a private /create to open a table in a group instead', () => {
    const reply = ctx({ text: '/create' });
    expect(reply.text).toContain('گروه');
    expect(reply.reply_markup).toBeUndefined();
  });

  it('Should say the host left and the table closed when rewriting a group /create post', () => {
    const reply = createGroupClosedReply({ creatorName: 'Ana' });
    expect(reply.text).toContain('میزبان رفت');
    expect(reply.text).toContain('Ana');
    expect(reply.reply_markup?.inline_keyboard).toEqual([]);
  });

  it('Should list in-progress games on /games', () => {
    const playing: RoomSummary = { ...lobby, code: 'PLAY01', phase: Phase.Nomination };
    const reply = ctx({ text: '/games', games: [lobby, playing], lobbies: [lobby] });
    expect(reply.text).toContain('در حال بازی');
    expect(reply.text).toContain('PLAY01');
  });

  it('Should keep Play on the inline button when no games are live', () => {
    const reply = ctx({ text: '/games', games: [], lobbies: [] });
    expect(reply.text).toContain('یکی بساز');
    expect(reply.text).not.toContain('بازی کن');
    expect(reply.reply_markup?.inline_keyboard[0]?.[0]?.text).toBe('بازی کن');
  });

  it('Should keep Play on the inline button when no lobbies are open', () => {
    const reply = ctx({ text: '/find_game', games: [], lobbies: [] });
    expect(reply.text).toContain('یکی بساز');
    expect(reply.text).not.toContain('بازی کن');
    expect(reply.reply_markup?.inline_keyboard[0]?.[0]?.text).toBe('بازی کن');
  });
});

describe('broadcast copy', () => {
  it('Should recognize hidden admin broadcast aliases', () => {
    expect(isBroadcastCommand('broadcast')).toBe(true);
    expect(isBroadcastCommand('sendall')).toBe(true);
    expect(isBroadcastCommand('send_all')).toBe(true);
    expect(isBroadcastCommand('start')).toBe(false);
  });

  it('Should tell the admin to send the text next', () => {
    expect(broadcastHelpReply().text).toContain('متن');
  });

  it('Should escape underscores in a ble.ir path so Bale Markdown accepts it', () => {
    const reply = broadcastPlayerReply(
      { botUsername: BOT, platform: 'bale' },
      'شناسه درست: ble.ir/secret_hitler_official',
    );
    expect(reply.text).toContain('secret\\_hitler\\_official');
    expect(reply.parse_mode).toBeUndefined();
  });

  it('Should leave @username mentions unescaped so the tap stays alive', () => {
    const reply = broadcastPlayerReply(
      { botUsername: BOT, platform: 'bale' },
      'بیا کانال @secret_hitler_official',
    );
    expect(reply.text).toContain('@secret_hitler_official');
    expect(reply.text).not.toContain('\\_');
  });
});

describe('users copy', () => {
  it('Should recognize the hidden admin users aliases', () => {
    expect(isUsersCommand('users')).toBe(true);
    expect(isUsersCommand('user')).toBe(true);
    expect(isUsersCommand('broadcast')).toBe(false);
  });

  it('Should list chat ids that can still receive DMs', () => {
    expect(usersEmptyReply().text).toContain('بلاک');
    expect(usersListReply(['9', '11']).text).toBe(
      ['کسایی که بلاک نکردن (2 نفر):', '', '9', '11'].join('\n'),
    );
  });
});

describe('direct message copy', () => {
  it('Should parse comma-separated ids then the body', () => {
    expect(isDirectMessageCommand('message')).toBe(true);
    expect(isDirectMessageCommand('broadcast')).toBe(false);
    expect(parseMessageArg('9,11 امشب بیا')).toEqual({
      chatIds: ['9', '11'],
      text: 'امشب بیا',
    });
    expect(parseMessageArg('9، 11، 22  سلام')).toEqual({
      chatIds: ['9', '11', '22'],
      text: 'سلام',
    });
    expect(parseMessageArg('9,11')).toEqual({ chatIds: ['9', '11'], text: '' });
    expect(parseChatIds('9,11')).toEqual(['9', '11']);
    expect(parseChatIds('9,11 سلام')).toBeNull();
    expect(parseMessageArg('امشب بیا')).toBeNull();
  });
});

describe('unsend copy', () => {
  it('Should recognize hidden admin unsend aliases', () => {
    expect(isUnsendCommand('unsend')).toBe(true);
    expect(isUnsendCommand('undo')).toBe(true);
    expect(isUnsendCommand('retract')).toBe(true);
    expect(isUnsendCommand('broadcast')).toBe(false);
  });

  it('Should tell the admin when nothing was stored', () => {
    expect(unsendEmptyReply().text).toContain('نیست');
  });
});

describe('delete room copy', () => {
  it('Should recognize the hidden admin delete command', () => {
    expect(isDeleteRoomCommand('delete')).toBe(true);
    expect(isDeleteRoomCommand('unsend')).toBe(false);
  });

  it('Should tell the admin how to pass a room code', () => {
    expect(deleteRoomHelpReply().text).toContain('/delete');
  });

  it('Should confirm the room that was removed', () => {
    expect(deleteRoomDoneReply({ name: 'Friday', code: 'ABC123' }).text).toContain('ABC123');
    expect(deleteRoomMissingReply('ABC123').text).toContain('پیدا نشد');
  });
});
