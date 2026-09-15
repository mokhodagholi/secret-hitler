import { describe, expect, it } from '@rstest/core';
import { FeatureFlagService } from './FeatureFlagService';
import { SettingsService } from './SettingsService';
import { VoiceService } from './VoiceService';
import {
  FakeSocket,
  makeView,
  stubDeniedMicrophone,
  stubGrantedMicrophone,
} from '../../test/test-utils';
import { Phase } from '@secret-hitler/shared';
import type { WebSocketService } from './WebSocketService';

function makeVoice(voiceFlag: boolean): {
  voice: VoiceService;
  socket: FakeSocket;
} {
  const socket = new FakeSocket();
  const settings = new SettingsService();
  const flags = new FeatureFlagService({ voice: voiceFlag });
  const voice = new VoiceService(
    socket as unknown as WebSocketService,
    flags,
    settings,
  );
  return { voice, socket };
}

describe('VoiceService', () => {
  it('Should stay off and send nothing when the voice flag is off', () => {
    const { voice, socket } = makeVoice(false);
    voice.sync(makeView({ phase: Phase.Nomination }));
    expect(voice.status()).toBe('off');
    expect(socket.lastSent('voice:join')).toBeUndefined();
  });

  it('Should not join while the table is still in the lobby', () => {
    stubDeniedMicrophone();
    const { voice, socket } = makeVoice(true);
    voice.sync(makeView({ phase: Phase.Lobby }));
    expect(voice.status()).toBe('idle');
    expect(socket.lastSent('voice:join')).toBeUndefined();
  });

  it('Should not ask for the microphone during opening night', () => {
    let asked = 0;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: () => {
          asked += 1;
          return Promise.resolve({ getAudioTracks: () => [], getTracks: () => [] });
        },
      },
    });
    const { voice, socket } = makeVoice(true);
    voice.sync(
      makeView({
        phase: Phase.Nomination,
        discussionDeadline: {
          startedAt: Date.now(),
          endsAt: Date.now() + 60_000,
        },
      }),
    );
    expect(asked).toBe(0);
    expect(voice.status()).toBe('idle');
    expect(socket.lastSent('voice:join')).toBeUndefined();
    voice.sync(makeView({ phase: Phase.Lobby }));
  });

  it('Should request the microphone on the unmute tap', async () => {
    let asked = 0;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: () => {
          asked += 1;
          return Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
        },
      },
    });
    const { voice, socket } = makeVoice(true);
    voice.sync(makeView({ phase: Phase.Nomination }));
    expect(socket.lastSent('voice:join')).toEqual({ type: 'voice:join' });
    expect(asked).toBe(0);
    voice.toggleSelfMute();
    await Promise.resolve();
    expect(asked).toBe(1);
    expect(voice.micBlocked()).toBe(true);
    expect(voice.needsMicAccess()).toBe(true);
    expect(voice.selfMuted()).toBe(true);
  });

  it('Should join the table as a listener without a microphone', async () => {
    stubDeniedMicrophone();
    const { voice, socket } = makeVoice(true);
    voice.sync(makeView({ phase: Phase.Nomination }));
    expect(socket.lastSent('voice:join')).toEqual({ type: 'voice:join' });
    await Promise.resolve();
    expect(socket.lastSent('voice:join')).toEqual({ type: 'voice:join' });
  });

  it('Should wait for a tap before capturing the microphone', async () => {
    let grant: (stream: MediaStream) => void = () => {};
    const pending = new Promise<MediaStream>((resolve) => {
      grant = resolve;
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: () => pending },
    });
    const { voice, socket } = makeVoice(true);
    voice.sync(makeView({ phase: Phase.Nomination }));
    expect(socket.lastSent('voice:join')).toEqual({ type: 'voice:join' });

    voice.toggleSelfMute();
    const track = { enabled: true, stop: () => {} };
    const stream = {
      getAudioTracks: () => [track],
      getTracks: () => [track],
    };
    grant(stream as unknown as MediaStream);
    await Promise.resolve();
    await Promise.resolve();
    expect(track.enabled).toBe(true);
  });

  it('Should capture with echo cancellation and not force NS/AGC off', async () => {
    let asked: MediaStreamConstraints | undefined;
    const track = { enabled: true, stop: () => {} };
    const stream = {
      getAudioTracks: () => [track],
      getTracks: () => [track],
    };
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: (constraints: MediaStreamConstraints) => {
          asked = constraints;
          return Promise.resolve(stream);
        },
      },
    });
    const { voice } = makeVoice(true);
    voice.sync(makeView({ phase: Phase.Nomination }));
    voice.toggleSelfMute();
    await Promise.resolve();
    await Promise.resolve();
    expect(asked).toEqual({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
  });

  it('Should not consume this player’s own producer', () => {
    stubGrantedMicrophone();
    const { voice, socket } = makeVoice(true);
    voice.sync(makeView({ phase: Phase.Nomination }));
    socket.emit({
      type: 'voice:peer',
      playerId: 'you',
      producerId: 'prod-you',
      muted: false,
    });
    expect(socket.lastSent('voice:consume')).toBeUndefined();
  });

  it('Should queue a peer until the recv transport exists', () => {
    stubGrantedMicrophone();
    const { voice, socket } = makeVoice(true);
    voice.sync(makeView({ phase: Phase.Nomination }));
    socket.emit({
      type: 'voice:peer',
      playerId: 'cal',
      producerId: 'prod-cal',
      muted: false,
    });
    expect(socket.lastSent('voice:consume')).toBeUndefined();
  });

  it('Should push the current mute once the SFU has a producer', () => {
    const { voice, socket } = makeVoice(true);
    socket.emit({
      type: 'voice:produced',
      id: 'prod-you',
      transportId: 'send-you',
    });
    expect(socket.lastSent('voice:mute')).toEqual({
      type: 'voice:mute',
      muted: true,
    });
  });

  it('Should send a table-wide mute and keep mute-other off the wire', async () => {
    stubGrantedMicrophone();
    const { voice, socket } = makeVoice(true);
    voice.sync(makeView({ phase: Phase.Nomination }));
    await Promise.resolve();
    await Promise.resolve();
    expect(voice.selfMuted()).toBe(true);
    voice.toggleSelfMute();
    await Promise.resolve();
    await Promise.resolve();
    expect(voice.selfMuted()).toBe(false);
    expect(socket.lastSent('voice:mute')).toEqual({ type: 'voice:mute', muted: false });

    voice.toggleRemoteMute('cal');
    expect(voice.isRemoteMuted('cal')).toBe(true);
    expect(socket.lastSent('voice:mute')).toEqual({ type: 'voice:mute', muted: false });
  });

  it('Should keep a local mute when this player unmutes themselves', () => {
    const { voice } = makeVoice(true);
    voice.toggleRemoteMute('cal');
    expect(voice.isRemoteMuted('cal')).toBe(true);
    voice.toggleSelfMute();
    expect(voice.isRemoteMuted('cal')).toBe(true);
  });

  it('Should mark a peer as speaking when the table says they are', () => {
    stubGrantedMicrophone();
    const { voice, socket } = makeVoice(true);
    voice.sync(makeView({ phase: Phase.Nomination }));
    socket.emit({ type: 'voice:speaking', playerId: 'cal', speaking: true });
    expect(voice.isSpeaking('cal')).toBe(true);
  });

  it('Should treat a speaking peer as live even without a mute frame', () => {
    stubGrantedMicrophone();
    const { voice, socket } = makeVoice(true);
    voice.sync(makeView({ phase: Phase.Nomination }));
    expect(voice.isTableMuted('cal')).toBe(true);
    socket.emit({ type: 'voice:speaking', playerId: 'cal', speaking: true });
    expect(voice.isSpeaking('cal')).toBe(true);
    expect(voice.isTableMuted('cal')).toBe(false);
  });

  it('Should light this player’s seat from a speaking frame for their id', () => {
    stubGrantedMicrophone();
    const { voice, socket } = makeVoice(true);
    voice.sync(makeView({ phase: Phase.Nomination }));
    socket.emit({ type: 'voice:speaking', playerId: 'you', speaking: true });
    expect(voice.isSpeaking('you')).toBe(true);
  });

  it('Should show a peer as live after they unmute on the table', () => {
    stubGrantedMicrophone();
    const { voice, socket } = makeVoice(true);
    voice.sync(makeView({ phase: Phase.Nomination }));
    expect(voice.isTableMuted('cal')).toBe(true);
    socket.emit({
      type: 'voice:peer',
      playerId: 'cal',
      producerId: 'prod-cal',
      muted: true,
    });
    expect(voice.isTableMuted('cal')).toBe(true);
    socket.emit({
      type: 'voice:peer',
      playerId: 'cal',
      producerId: 'prod-cal',
      muted: false,
    });
    expect(voice.isTableMuted('cal')).toBe(false);
    voice.toggleRemoteMute('cal');
    expect(voice.isTableMuted('cal')).toBe(false);
    expect(voice.isRemoteMuted('cal')).toBe(true);
  });
});
