import { describe, expect, it } from '@rstest/core';
import type { GameStateView } from '@secret-hitler/shared';
import { iceServersFromEnv } from './media';
import { MemoryMediaBackend } from './MemoryMediaBackend';
import { VoiceHub } from './VoiceHub';

function hub(): VoiceHub {
  return new VoiceHub(new MemoryMediaBackend(), [{ urls: 'stun:example' }]);
}

function viewWith(playerId: string, selfMuted = false): GameStateView {
  return {
    roomId: 'room',
    players: [{ id: playerId, selfMuted } as GameStateView['players'][number]],
  } as GameStateView;
}

describe('VoiceHub', () => {
  it('Should create transports, produce paused, and list the peer', async () => {
    const voice = hub();
    const send = await voice.createTransport('room', 'ana', 'send');
    await voice.connectTransport('ana', send.id, { fingerprints: [] });
    const produced = await voice.produce('ana', send.id, { codecs: [] });
    expect(produced.paused).toBe(true);
    expect(voice.peers('room')).toEqual([
      { playerId: 'ana', producerId: produced.producerId, muted: true },
    ]);
  });

  it('Should unmute a producer and decorate the snapshot', async () => {
    const voice = hub();
    const send = await voice.createTransport('room', 'ana', 'send');
    await voice.produce('ana', send.id, { codecs: [] });
    expect(await voice.setMuted('ana', false)).toBe(true);
    expect(voice.decorateView(viewWith('ana')).players[0].selfMuted).toBe(false);
  });

  it('Should pause a dead seat and drop the player on leave', async () => {
    const voice = hub();
    const send = await voice.createTransport('room', 'ana', 'send');
    await voice.produce('ana', send.id, { codecs: [] });
    await voice.setMuted('ana', false);
    await voice.applySeat('ana', false);
    expect(voice.decorateView(viewWith('ana')).players[0].selfMuted).toBe(true);

    await voice.removePlayer('ana');
    expect(voice.peers('room')).toEqual([]);
  });

  it('Should expose ICE servers with the room capabilities', () => {
    const voice = hub();
    expect(voice.capabilities('room')).toEqual({
      rtpCapabilities: {
        codecs: [{ mimeType: 'audio/opus', clockRate: 48000, channels: 2 }],
      },
      iceServers: [{ urls: 'stun:example' }],
    });
  });

  it('Should refuse to consume a producer from another room', async () => {
    const voice = hub();
    const send = await voice.createTransport('room-a', 'ana', 'send');
    const produced = await voice.produce('ana', send.id, { codecs: [] });
    await voice.createTransport('room-b', 'ben', 'recv');
    await expect(
      voice.consume('ben', produced.producerId, { codecs: [] }),
    ).rejects.toThrow(/not in this room/);
  });
});

describe('iceServersFromEnv', () => {
  it('Should skip empty urls and attach TURN credentials when present', () => {
    expect(iceServersFromEnv({})).toEqual([]);
    expect(
      iceServersFromEnv({
        STUN_URLS: 'stun:a, stun:b',
        TURN_URLS: 'turn:c',
        TURN_USERNAME: 'u',
        TURN_PASSWORD: 'p',
      }),
    ).toEqual([
      { urls: 'stun:a' },
      { urls: 'stun:b' },
      { urls: 'turn:c', username: 'u', credential: 'p' },
    ]);
  });
});
