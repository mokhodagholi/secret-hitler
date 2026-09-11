import { describe, expect, it } from '@rstest/core';
import { FeatureFlagService } from './FeatureFlagService';
import { SettingsService } from './SettingsService';
import { VoiceService } from './VoiceService';
import { FakeSocket, makeView, stubDeniedMicrophone } from '../../test/test-utils';
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

  it('Should ask to join once the game has started', async () => {
    stubDeniedMicrophone();
    const { voice, socket } = makeVoice(true);
    voice.sync(makeView({ phase: Phase.Nomination }));
    expect(socket.lastSent('voice:join')).toEqual({ type: 'voice:join' });
    await Promise.resolve();
    expect(voice.status()).toBe('denied');
  });

  it('Should send a table-wide mute and keep mute-other off the wire', () => {
    const { voice, socket } = makeVoice(true);
    expect(voice.selfMuted()).toBe(true);
    voice.toggleSelfMute();
    expect(voice.selfMuted()).toBe(false);
    expect(socket.lastSent('voice:mute')).toEqual({ type: 'voice:mute', muted: false });

    voice.toggleRemoteMute('cal');
    expect(voice.isRemoteMuted('cal')).toBe(true);
    expect(socket.lastSent('voice:mute')).toEqual({ type: 'voice:mute', muted: false });
  });
});
