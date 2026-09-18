import { afterEach, describe, expect, it } from '@rstest/core';
import {
  DEFAULT_FLAGS,
  Phase,
  type CreateRoomResponse,
  type JoinRoomResponse,
} from '@secret-hitler/shared';
import { TestClient, httpJson, listenServer, type LiveServer } from './test-utils';

let server: LiveServer | undefined;
const clients: TestClient[] = [];

afterEach(async () => {
  for (const client of clients) client.close();
  clients.length = 0;
  await server?.close();
  server = undefined;
});

async function connect(): Promise<TestClient> {
  const client = await TestClient.connect(server!.port);
  clients.push(client);
  return client;
}

/** Create a room + join two guests over HTTP, then auth all three sockets. */
async function seatThreePlayers() {
  const created = (
    await httpJson<CreateRoomResponse>(server!.app, 'POST', '/api/rooms', {
      name: 'Bunker',
      hostName: 'Ana',
    })
  ).body;
  const join = (name: string) =>
    httpJson<JoinRoomResponse>(server!.app, 'POST', `/api/rooms/${created.roomId}/join`, {
      name,
    });
  const ben = (await join('Ben')).body;
  const cal = (await join('Cal')).body;

  const [hostWs, benWs, calWs] = [await connect(), await connect(), await connect()];
  await hostWs.auth(created.token);
  await benWs.auth(ben.token);
  await calWs.auth(cal.token);

  return { created, ben, cal, hostWs, benWs, calWs };
}

describe('WebSocket gameplay', () => {
  it('Should authenticate a join token and deliver the lobby snapshot', async () => {
    server = await listenServer();
    const created = (
      await httpJson<CreateRoomResponse>(server.app, 'POST', '/api/rooms', {
        name: 'Bunker',
        hostName: 'Ana',
      })
    ).body;

    const ws = await connect();
    const playerId = await ws.auth(created.token);
    expect(playerId).toBe(created.playerId);

    const state = await ws.waitFor('state');
    expect(state.state.phase).toBe(Phase.Lobby);
    expect(state.state.players.map((p) => p.name)).toEqual(['Ana']);
  });

  it('Should put feature flags on the auth handshake', async () => {
    server = await listenServer(3, { flags: { ...DEFAULT_FLAGS, voice: true, browserPlay: true } });
    const created = (
      await httpJson<CreateRoomResponse>(server.app, 'POST', '/api/rooms', {
        name: 'Bunker',
        hostName: 'Ana',
      })
    ).body;

    const ws = await connect();
    ws.send({ type: 'auth', token: created.token });
    const authed = await ws.waitFor('authed');
    expect(authed.flags).toEqual({ ...DEFAULT_FLAGS, voice: true, browserPlay: true });
  });

  it('Should reject an invalid token and refuse unauthenticated messages', async () => {
    server = await listenServer();
    const ws = await connect();
    ws.send({ type: 'auth', token: 'forged' });
    const rejected = await ws.waitFor('error');
    expect(rejected.code).toBe('AUTH_FAILED');

    const ws2 = await connect();
    ws2.send({ type: 'game:start' });
    const refused = await ws2.waitFor('error');
    expect(refused.code).toBe('AUTH_FAILED');
  });

  it('Should survive malformed frames without crashing the room', async () => {
    server = await listenServer();
    const created = (
      await httpJson<CreateRoomResponse>(server.app, 'POST', '/api/rooms', {
        name: 'Bunker',
        hostName: 'Ana',
      })
    ).body;
    const ws = await connect();
    await ws.auth(created.token);

    // The exact payloads that would throw if they ever reached the engine.
    ws.sendRaw('{"type":"chat:message","text":123}');
    ws.sendRaw('{"type":"command","command":{"kind":"castVote","vote":{}}}');
    ws.sendRaw('total garbage');

    ws.send({ type: 'ping' });
    await ws.waitFor('pong');
  });

  it('Should keep a player connected after they reopen the socket with the same token', async () => {
    server = await listenServer();
    const created = (
      await httpJson<CreateRoomResponse>(server.app, 'POST', '/api/rooms', {
        name: 'Bunker',
        hostName: 'Ana',
      })
    ).body;

    const first = await connect();
    await first.auth(created.token);
    const firstClosed = first.waitForClose();

    const second = await connect();
    await second.auth(created.token);
    await firstClosed;

    second.send({ type: 'player:unready' });
    const state = await second.waitFor('state');
    const self = state.state.players.find((player) => player.id === created.playerId);
    expect(self?.connected).toBe(true);

    second.send({ type: 'ping' });
    await second.waitFor('pong');
  });

  it('Should run a full round: ready, start, nominate, vote, legislate', async () => {
    server = await listenServer();
    const { created, ben, cal, hostWs, benWs, calWs } = await seatThreePlayers();

    benWs.send({ type: 'player:ready' });
    calWs.send({ type: 'player:ready' });
    await hostWs.waitFor('state', (m) =>
      m.state.players.every((player) => player.ready),
    );

    hostWs.send({ type: 'game:start' });
    const started = await hostWs.waitFor('state', (m) => m.state.phase !== Phase.Lobby);
    expect(started.state.phase).toBe(Phase.Nomination);
    expect(started.state.board.president).toBe(created.playerId);
    await hostWs.waitFor('private');

    hostWs.send({
      type: 'command',
      command: { kind: 'nominateChancellor', targetId: ben.playerId },
    });
    await benWs.waitFor('state', (m) => m.state.phase === Phase.Voting);

    hostWs.send({ type: 'command', command: { kind: 'castVote', vote: 'ja' } });
    benWs.send({ type: 'command', command: { kind: 'castVote', vote: 'ja' } });
    calWs.send({ type: 'command', command: { kind: 'castVote', vote: 'ja' } });

    const legislative = await hostWs.waitFor(
      'state',
      (m) => m.state.phase === Phase.PresidentLegislative,
    );
    expect(legislative.state.you.policies).toHaveLength(3);

    hostWs.send({ type: 'command', command: { kind: 'discardPolicy', index: 0 } });
    const chancellorTurn = await benWs.waitFor(
      'state',
      (m) => m.state.phase === Phase.ChancellorLegislative,
    );
    expect(chancellorTurn.state.you.policies).toHaveLength(2);

    benWs.send({ type: 'command', command: { kind: 'enactPolicy', index: 0 } });
    // Match the next round specifically — an earlier Nomination snapshot from
    // game start is already sitting in Cal's inbox.
    const nextRound = await calWs.waitFor(
      'state',
      (m) =>
        m.state.phase === Phase.Nomination &&
        m.state.board.liberalPolicies + m.state.board.fascistPolicies === 1,
    );
    const board = nextRound.state.board;
    // Presidency rotated off the first seat.
    expect(board.president).toBe(ben.playerId);
    // Spectators never see the legislators' hands.
    expect(nextRound.state.you.id).toBe(cal.playerId);
    expect(nextRound.state.you.policies).toHaveLength(0);
  });

  it('Should reject a start while guests are not ready', async () => {
    server = await listenServer();
    const { hostWs } = await seatThreePlayers();

    hostWs.send({ type: 'game:start' });
    const error = await hostWs.waitFor('error');
    expect(error.code).toBe('PLAYERS_NOT_READY');
  });

  it('Should keep the table open and pass the host when the host leaves the lobby', async () => {
    server = await listenServer();
    const { created, ben, hostWs, benWs } = await seatThreePlayers();

    hostWs.send({ type: 'room:leave' });
    const state = await benWs.waitFor(
      'state',
      (message) => message.state.hostId === ben.playerId,
    );
    expect(state.state.phase).toBe(Phase.Lobby);
    expect(state.state.players.map((player) => player.name)).toEqual(['Ben', 'Cal']);
    expect(server.repo.get(created.roomId)).toBeTruthy();
  });

  it('Should keep an in-game table running when the host leaves', async () => {
    server = await listenServer();
    const { created, ben, hostWs, benWs, calWs } = await seatThreePlayers();

    benWs.send({ type: 'player:ready' });
    calWs.send({ type: 'player:ready' });
    hostWs.send({ type: 'game:start' });
    await benWs.waitFor('state', (message) => message.state.phase === Phase.Nomination);

    hostWs.send({ type: 'room:leave' });
    const state = await benWs.waitFor(
      'state',
      (message) => message.state.hostId === ben.playerId,
    );
    expect(state.state.phase).not.toBe(Phase.Lobby);
    expect(state.state.phase).not.toBe(Phase.GameOver);
    expect(server.repo.get(created.roomId)).toBeTruthy();
  });

  it('Should drop a hosted room when the last player leaves', async () => {
    server = await listenServer();
    const { created, hostWs, benWs, calWs } = await seatThreePlayers();

    hostWs.send({ type: 'room:leave' });
    await benWs.waitFor('state', (message) => message.state.players.length === 2);
    benWs.send({ type: 'room:leave' });
    await calWs.waitFor('state', (message) => message.state.players.length === 1);
    calWs.send({ type: 'room:leave' });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(server.repo.get(created.roomId)).toBeUndefined();
  });

  it('Should let the host kick a guest from the lobby', async () => {
    server = await listenServer(3, { flags: { ...DEFAULT_FLAGS, lobbyKick: true, browserPlay: true } });
    const { ben, hostWs, benWs } = await seatThreePlayers();

    hostWs.send({ type: 'player:kick', playerId: ben.playerId });
    const closed = await benWs.waitFor('room:closed');
    expect(closed.reason).toBe('KICKED');

    const hostState = await hostWs.waitFor(
      'state',
      (m) => !m.state.players.some((p) => p.id === ben.playerId),
    );
    expect(hostState.state.players.map((p) => p.name)).toEqual(['Ana', 'Cal']);
  });

  it('Should refuse a lobby kick when the lobbyKick flag is off', async () => {
    server = await listenServer();
    const { created, ben, hostWs } = await seatThreePlayers();

    hostWs.send({ type: 'player:kick', playerId: ben.playerId });
    const refused = await hostWs.waitFor('error');
    expect(refused.code).toBe('INVALID_ACTION');
    expect(server.repo.get(created.roomId)!.room.findPlayer(ben.playerId)).toBeTruthy();
  });

  it('Should wait between chat messages from the same player', async () => {
    server = await listenServer();
    const { hostWs } = await seatThreePlayers();

    hostWs.send({ type: 'chat:message', text: 'first' });
    hostWs.send({ type: 'chat:message', text: 'too soon' });
    const limited = await hostWs.waitFor('error');
    expect(limited.code).toBe('RATE_LIMITED');
  });

  it('Should reject voice messages when the voice flag is off', async () => {
    server = await listenServer();
    const created = (
      await httpJson<CreateRoomResponse>(server.app, 'POST', '/api/rooms', {
        name: 'Bunker',
        hostName: 'Ana',
      })
    ).body;

    const ws = await connect();
    await ws.auth(created.token);
    ws.send({ type: 'voice:join' });
    const refused = await ws.waitFor('error');
    expect(refused.code).toBe('INVALID_ACTION');
  });
});
