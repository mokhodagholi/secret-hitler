import { afterEach, describe, expect, it } from '@rstest/core';
import { DEFAULT_FLAGS, type RoomSummary } from '@secret-hitler/shared';
import { RoomRepository } from '../rooms/RoomRepository';
import { TokenStore } from '../rooms/TokenStore';
import { SocketHandler } from './SocketHandler';

describe('SocketHandler — join list', () => {
  let handler: SocketHandler | undefined;

  afterEach(() => {
    handler?.dispose();
    handler = undefined;
  });

  it('Should push a new lobby onto Join watchers when a player sits', () => {
    const repo = new RoomRepository(3);
    const tokens = new TokenStore();
    handler = new SocketHandler(repo, tokens, null, null, null, DEFAULT_FLAGS);
    const lists: RoomSummary[][] = [];
    const stop = handler.watchJoinList((rooms) => lists.push(rooms));

    expect(lists).toEqual([[]]);

    const entry = repo.create({ name: 'Bunker' });
    handler.registerEngine(entry);
    const host = entry.engine.addPlayer('Ana', true);
    if (!('id' in host)) throw new Error('expected a host');

    expect(lists.at(-1)).toMatchObject([
      { name: 'Bunker', playerCount: 1, hasPassword: false },
    ]);

    const guest = entry.engine.addPlayer('Ben');
    if (!('id' in guest)) throw new Error('expected a guest');
    expect(lists.at(-1)?.[0]?.playerCount).toBe(2);

    stop();
    entry.engine.addPlayer('Cal');
    expect(lists.filter((list) => list[0]?.playerCount === 3)).toHaveLength(0);
  });
});
