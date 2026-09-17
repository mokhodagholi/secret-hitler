import { afterEach, describe, expect, it } from '@rstest/core';
import { DEFAULT_FLAGS } from '@secret-hitler/shared';
import { RoomRepository } from '../rooms/RoomRepository';
import { TokenStore } from '../rooms/TokenStore';
import { SocketHandler } from './SocketHandler';

/**
 * Same shape as bale-bot: editMessageText reads `this.http`. Detaching the
 * method used to crash the process when a group table closed.
 */
class GroupEditBot {
  http = { request: async () => ({ ok: true }) };
  edits = 0;

  async editMessageText(): Promise<unknown> {
    this.edits += 1;
    return this.http.request();
  }

  async sendMessage(): Promise<unknown> {
    return {};
  }
}

describe('SocketHandler — group room close', () => {
  let handler: SocketHandler | undefined;

  afterEach(() => {
    handler?.dispose();
    handler = undefined;
  });

  it('Should edit the group post without crashing when a table is deleted', () => {
    const repo = new RoomRepository(3);
    const tokens = new TokenStore();
    const bot = new GroupEditBot();
    handler = new SocketHandler(repo, tokens, null, null, {
      kind: 'bale',
      bot,
      botUsername: '@secret_hitler_bot',
    });

    const entry = repo.create({ name: 'Ana', originChatId: 12 });
    entry.room.bindOriginMessage(77);
    handler.registerEngine(entry);

    expect(() => handler!.destroyRoomByCode(entry.room.code)).not.toThrow();
    expect(bot.edits).toBe(1);
    expect(repo.get(entry.room.id)).toBeUndefined();
  });
});
