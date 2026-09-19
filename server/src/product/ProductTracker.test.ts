import { describe, expect, it } from '@rstest/core';
import { GameEngine, Phase, RoomFactory } from '@secret-hitler/shared';
import { InMemoryProductStore } from './InMemoryProductStore';
import { ProductTracker } from './ProductTracker';

const flush = (tracker: ProductTracker) => tracker.flush();

function hostedLobby() {
  const room = RoomFactory.create({ name: 'Friday' });
  const engine = new GameEngine(room);
  engine.addPlayer('Ana', true);
  return { room, engine };
}

describe('ProductTracker — funnel', () => {
  it('Should record bot start, mini-app open, create, join, and seated', async () => {
    const store = new InMemoryProductStore();
    const tracker = new ProductTracker(store);
    const { room, engine } = hostedLobby();

    tracker.botStarted('bale', '9');
    tracker.miniappOpened('bale', 9);
    tracker.hostedRoomCreated(room, 'bale:9');
    engine.addPlayer('Ben', false, 0, 'bale:11');
    tracker.hostedRoomJoined(room, 'bale:11');
    await flush(tracker);

    expect(store.events.map((event) => event.name)).toEqual([
      'bot_start',
      'miniapp_auth',
      'room_create',
      'seated',
      'room_join',
      'seated',
    ]);
    expect(store.events[0]).toMatchObject({ platform: 'bale', userKey: 'bale:9' });
    expect(store.events[1].payload).toBeNull();
  });

  it('Should stamp startapp on miniapp_auth so ad opens can be joined later', async () => {
    const store = new InMemoryProductStore();
    const tracker = new ProductTracker(store);
    tracker.miniappOpened('bale', 9, '1');
    await flush(tracker);
    expect(store.events[0]).toMatchObject({
      name: 'miniapp_auth',
      userKey: 'bale:9',
      payload: { startParam: '1' },
    });
  });

  it('Should record Find Match and group create as their own funnel steps', async () => {
    const store = new InMemoryProductStore();
    const tracker = new ProductTracker(store);
    const publicRoom = RoomFactory.create({ name: 'میز عمومی', kind: 'public' });
    const groupRoom = RoomFactory.create({ name: 'Ana', originChatId: 12 });
    new GameEngine(groupRoom).addPlayer('Ana', true);

    tracker.findMatchQueued('telegram:4');
    tracker.seated(publicRoom, 'telegram:4');
    tracker.groupRoomCreated(groupRoom, 'bale:9');
    await flush(tracker);

    expect(store.events.map((event) => event.name)).toEqual([
      'find_match',
      'seated',
      'group_create',
      'seated',
    ]);
  });
});

describe('ProductTracker — lobby fill', () => {
  it('Should open a hosted lobby, track peak seats and time-to-five, then deal', async () => {
    const store = new InMemoryProductStore();
    const tracker = new ProductTracker(store);
    const room = RoomFactory.create({ name: 'Friday', minPlayers: 5 });
    const engine = new GameEngine(room);
    engine.addPlayer('Ana', true);
    tracker.hostedRoomCreated(room, 'client:ana');
    for (const name of ['Ben', 'Cal', 'Deb', 'Eve']) {
      engine.addPlayer(name);
      tracker.hostedRoomJoined(room, `client:${name.toLowerCase()}`);
    }
    tracker.tableDealt(room);
    await flush(tracker);

    expect(store.lobbies).toHaveLength(1);
    expect(store.lobbies[0]).toMatchObject({
      source: 'hosted',
      peakSeats: 5,
      deathReason: null,
    });
    expect(store.lobbies[0].reached5At).toBeTruthy();
    expect(store.lobbies[0].dealtAt).toBeTruthy();
    expect(store.lobbies[0].hourIran).toBeGreaterThanOrEqual(0);
    expect(store.lobbies[0].hourIran).toBeLessThan(24);
    expect(store.events.some((event) => event.name === 'table_dealt')).toBe(true);
  });

  it('Should mark a lobby dead when the host empties it before a deal', async () => {
    const store = new InMemoryProductStore();
    const tracker = new ProductTracker(store);
    const { room } = hostedLobby();
    tracker.hostedRoomCreated(room, 'bale:9');
    await flush(tracker);
    room.players.splice(0);
    tracker.onRoomRemoved(room, 'host_left');
    await flush(tracker);

    expect(store.lobbies[0].deathReason).toBe('host_left');
    expect(store.lobbies[0].diedAt).toBeTruthy();
    expect(store.events.at(-1)?.name).toBe('lobby_died');
  });

  it('Should not invent a lobby_died event for a public table that never seated', async () => {
    const store = new InMemoryProductStore();
    const tracker = new ProductTracker(store);
    const room = RoomFactory.create({ name: 'میز عمومی', kind: 'public' });
    tracker.onRoomRemoved(room, 'never_started');
    await flush(tracker);

    expect(store.lobbies).toHaveLength(0);
    expect(store.events).toHaveLength(0);
  });
});

describe('ProductTracker — blast conversion', () => {
  it('Should attribute a mini-app open and a sit to the last blast within 24h', async () => {
    const store = new InMemoryProductStore();
    const tracker = new ProductTracker(store);
    tracker.blastSent('bale', ['9', '11']);
    tracker.miniappOpened('bale', 9);
    const { room } = hostedLobby();
    tracker.hostedRoomCreated(room, 'bale:9');
    await flush(tracker);

    expect(store.blasts).toHaveLength(1);
    expect(store.blasts[0].reached).toBe(2);
    const ana = store.blasts[0].recipients.find((row) => row.chatId === '9');
    const ben = store.blasts[0].recipients.find((row) => row.chatId === '11');
    expect(ana?.openedAt).toBeTruthy();
    expect(ana?.satAt).toBeTruthy();
    expect(ben?.openedAt).toBeNull();
    expect(ben?.satAt).toBeNull();
  });
});

describe('ProductTracker — match health', () => {
  it('Should record a finished Hitler-elected win and in-game disconnects', async () => {
    const store = new InMemoryProductStore();
    const tracker = new ProductTracker(store);
    const room = RoomFactory.create({ name: 'Friday', minPlayers: 3 });
    const engine = new GameEngine(room);
    const ana = engine.addPlayer('Ana', true);
    const ben = engine.addPlayer('Ben');
    const cal = engine.addPlayer('Cal');
    if ('code' in ana || 'code' in ben || 'code' in cal) throw new Error('expected seats');
    room.findPlayer(ana.id)!.role = 'liberal';
    room.findPlayer(ben.id)!.role = 'fascist';
    room.findPlayer(cal.id)!.role = 'hitler';
    room.chancellorId = cal.id;
    room.fascistPolicies = 3;
    room.phase = Phase.Voting;

    tracker.tableDealt(room);
    tracker.disconnectedInGame(room);
    tracker.kickVoteResolved(room);
    engine.endGame('fascist');
    tracker.gameFinished(room);
    await flush(tracker);

    expect(store.matches).toHaveLength(1);
    expect(store.matches[0]).toMatchObject({
      outcome: 'hitler_elected',
      disconnects: 1,
      kickVotes: 1,
    });
    expect(store.events.some((event) => event.name === 'game_finished')).toBe(true);
  });

  it('Should mark an in-progress table abandoned when the room is removed', async () => {
    const store = new InMemoryProductStore();
    const tracker = new ProductTracker(store);
    const room = RoomFactory.create({ name: 'Friday' });
    room.phase = Phase.Nomination;
    tracker.tableDealt(room);
    tracker.onRoomRemoved(room);
    await flush(tracker);

    expect(store.matches[0].outcome).toBe('abandoned');
    expect(store.events.at(-1)?.name).toBe('game_abandoned');
  });

  it('Should skip admin play tables', async () => {
    const store = new InMemoryProductStore();
    const tracker = new ProductTracker(store);
    const room = RoomFactory.create({ name: 'میز آزمایش', adminPlayUserId: 1 });
    tracker.hostedRoomCreated(room, 'bale:9');
    tracker.tableDealt(room);
    await flush(tracker);
    expect(store.events).toHaveLength(0);
    expect(store.lobbies).toHaveLength(0);
  });
});
