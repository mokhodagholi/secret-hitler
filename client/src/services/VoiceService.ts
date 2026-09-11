import { createSignal, type Accessor } from 'solid-js';
import { createStore, type SetStoreFunction, type Store } from 'solid-js/store';
import {
  Phase,
  type GameStateView,
  type ServerMessage,
  type VoiceJson,
  type VoiceTransportDirection,
} from '@secret-hitler/shared';
import type { FeatureFlagService } from './FeatureFlagService';
import type { SettingsService } from './SettingsService';
import type { WebSocketService } from './WebSocketService';

export type VoiceStatus = 'off' | 'idle' | 'connecting' | 'live' | 'denied' | 'failed';

interface VoiceUiState {
  selfMuted: boolean;
  speaking: Record<string, boolean>;
  remoteMuted: Record<string, boolean>;
}

interface MsTransport {
  id: string;
  on: (event: string, handler: (...args: never[]) => void) => void;
  produce: (opts: { track: MediaStreamTrack }) => Promise<{ id: string }>;
  consume: (opts: {
    id: string;
    producerId: string;
    kind: 'audio';
    rtpParameters: VoiceJson;
  }) => Promise<{ track: MediaStreamTrack }>;
  close: () => void;
}

interface MsDevice {
  loaded: boolean;
  load: (opts: { routerRtpCapabilities: VoiceJson }) => Promise<void>;
  rtpCapabilities: VoiceJson;
  createSendTransport: (opts: VoiceJson) => MsTransport;
  createRecvTransport: (opts: VoiceJson) => MsTransport;
}

/**
 * Table voice. No-ops unless `flags.voice` is on and the view is in-game.
 * Callers never check the flag or the listen toggle — this class does.
 */
export class VoiceService {
  readonly status: Accessor<VoiceStatus>;
  readonly ui: Store<VoiceUiState>;
  private readonly setStatus: (status: VoiceStatus) => void;
  private readonly update: SetStoreFunction<VoiceUiState>;
  private joined = false;
  private localStream: MediaStream | null = null;
  private device: MsDevice | null = null;
  private sendTransport: MsTransport | null = null;
  private recvTransport: MsTransport | null = null;
  private readonly remotes = new Map<string, HTMLAudioElement>();
  private readonly connectWaiters = new Map<string, () => void>();
  private speaking = false;
  private analyserTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly socket: WebSocketService,
    private readonly flags: FeatureFlagService,
    private readonly settings: SettingsService,
  ) {
    const [status, setStatus] = createSignal<VoiceStatus>('off');
    const [ui, update] = createStore<VoiceUiState>({
      selfMuted: true,
      speaking: {},
      remoteMuted: {},
    });
    this.status = status;
    this.setStatus = setStatus;
    this.ui = ui;
    this.update = update;
    socket.onMessage((message) => this.onMessage(message));
  }

  selfMuted(): boolean {
    return this.ui.selfMuted;
  }

  isSpeaking(playerId: string): boolean {
    return this.ui.speaking[playerId] === true;
  }

  isRemoteMuted(playerId: string): boolean {
    return this.ui.remoteMuted[playerId] === true;
  }

  /** Join or leave based on the current snapshot. Safe to call often. */
  sync(view: GameStateView | null): void {
    const enabled = this.flags.enabled('voice');
    const inGame = view != null && view.phase !== Phase.Lobby;
    if (!enabled || !inGame) {
      this.leave();
      this.setStatus(enabled ? 'idle' : 'off');
      return;
    }
    if (this.joined || this.status() === 'connecting') return;
    void this.join();
  }

  toggleSelfMute(): void {
    if (!this.flags.enabled('voice')) return;
    const muted = !this.ui.selfMuted;
    this.update('selfMuted', muted);
    const track = this.localStream?.getAudioTracks()[0];
    if (track) track.enabled = !muted;
    this.socket.send({ type: 'voice:mute', muted });
  }

  toggleRemoteMute(playerId: string): void {
    if (!this.flags.enabled('voice')) return;
    const muted = !this.isRemoteMuted(playerId);
    this.update('remoteMuted', playerId, muted);
    const audio = this.remotes.get(playerId);
    if (audio) audio.muted = muted || !this.settings.settings.voiceEnabled;
  }

  setListenEnabled(enabled: boolean): void {
    for (const [playerId, audio] of this.remotes) {
      audio.muted = !enabled || this.isRemoteMuted(playerId);
    }
  }

  private async join(): Promise<void> {
    this.setStatus('connecting');
    this.socket.send({ type: 'voice:join' });
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      const track = this.localStream.getAudioTracks()[0];
      if (track) track.enabled = false;
      this.update('selfMuted', true);
      this.watchLevel(this.localStream);
      this.joined = true;
    } catch (error) {
      const denied =
        error instanceof DOMException &&
        (error.name === 'NotAllowedError' || error.name === 'NotFoundError');
      this.joined = true;
      this.setStatus(denied ? 'denied' : 'failed');
    }
  }

  private leave(): void {
    if (!this.joined && this.status() !== 'connecting') return;
    if (this.joined) this.socket.send({ type: 'voice:leave' });
    this.joined = false;
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
    this.stopLevel();
    this.sendTransport?.close();
    this.recvTransport?.close();
    this.sendTransport = null;
    this.recvTransport = null;
    this.device = null;
    for (const audio of this.remotes.values()) {
      audio.srcObject = null;
      audio.remove();
    }
    this.remotes.clear();
    this.update('speaking', {});
  }

  private onMessage(message: ServerMessage): void {
    if (!this.flags.enabled('voice')) return;
    switch (message.type) {
      case 'voice:capabilities':
        void this.onCapabilities(message.rtpCapabilities, message);
        break;
      case 'voice:transportCreated':
        void this.onTransportCreated(message);
        break;
      case 'voice:transportConnected':
        this.connectWaiters.get(message.id)?.();
        this.connectWaiters.delete(message.id);
        break;
      case 'voice:peer':
        if (message.producerId == null) this.dropRemote(message.playerId);
        else if (this.recvTransport && this.device) {
          this.socket.send({
            type: 'voice:consume',
            producerId: message.producerId,
            rtpCapabilities: this.device.rtpCapabilities,
          });
        }
        break;
      case 'voice:consumed':
        void this.onConsumed(message);
        break;
      case 'voice:speaking':
        this.update('speaking', message.playerId, message.speaking);
        break;
      case 'room:closed':
        this.leave();
        this.setStatus('off');
        break;
      default:
        break;
    }
  }

  private async onCapabilities(
    rtpCapabilities: VoiceJson,
    message: Extract<ServerMessage, { type: 'voice:capabilities' }>,
  ): Promise<void> {
    try {
      const loaded = (await import('mediasoup-client')) as {
        Device: new () => MsDevice;
      };
      const device = new loaded.Device();
      await device.load({ routerRtpCapabilities: rtpCapabilities });
      this.device = device;
      this.socket.send({ type: 'voice:createTransport', direction: 'send' });
      this.socket.send({ type: 'voice:createTransport', direction: 'recv' });
      void message;
    } catch {
      if (this.status() === 'connecting') this.setStatus('live');
    }
  }

  private async onTransportCreated(
    message: Extract<ServerMessage, { type: 'voice:transportCreated' }>,
  ): Promise<void> {
    const device = this.device;
    if (!device) return;
    const options = {
      id: message.id,
      iceParameters: message.iceParameters,
      iceCandidates: message.iceCandidates,
      dtlsParameters: message.dtlsParameters,
    };
    const transport =
      message.direction === 'send'
        ? device.createSendTransport(options)
        : device.createRecvTransport(options);
    this.bindTransport(transport, message.direction);
    if (message.direction === 'send') {
      this.sendTransport = transport;
      const track = this.localStream?.getAudioTracks()[0];
      if (track) {
        try {
          await transport.produce({ track });
        } catch {
          /* produce can fail if DTLS never connects; mute still works */
        }
      }
    } else {
      this.recvTransport = transport;
    }
    if (this.sendTransport && this.recvTransport) this.setStatus('live');
  }

  private bindTransport(transport: MsTransport, direction: VoiceTransportDirection): void {
    transport.on(
      'connect',
      (({ dtlsParameters }: { dtlsParameters: VoiceJson }, callback: () => void) => {
        this.connectWaiters.set(transport.id, callback);
        this.socket.send({
          type: 'voice:connectTransport',
          transportId: transport.id,
          dtlsParameters,
        });
      }) as (...args: never[]) => void,
    );
    if (direction === 'send') {
      transport.on(
        'produce',
        ((
          { rtpParameters }: { rtpParameters: VoiceJson },
          callback: (arg: { id: string }) => void,
        ) => {
          this.socket.send({
            type: 'voice:produce',
            transportId: transport.id,
            rtpParameters,
          });
          callback({ id: `local-${transport.id}` });
        }) as (...args: never[]) => void,
      );
    }
  }

  private async onConsumed(
    message: Extract<ServerMessage, { type: 'voice:consumed' }>,
  ): Promise<void> {
    if (!this.recvTransport) return;
    try {
      const consumer = await this.recvTransport.consume({
        id: message.id,
        producerId: message.producerId,
        kind: 'audio',
        rtpParameters: message.rtpParameters,
      });
      const audio = new Audio();
      audio.autoplay = true;
      audio.srcObject = new MediaStream([consumer.track]);
      audio.muted = this.isRemoteMuted(message.playerId) || !this.settings.settings.voiceEnabled;
      this.remotes.set(message.playerId, audio);
      void audio.play().catch(() => undefined);
    } catch {
      this.attachSilentRemote(message.playerId);
    }
  }

  private attachSilentRemote(playerId: string): void {
    if (this.remotes.has(playerId)) return;
    const audio = new Audio();
    audio.autoplay = true;
    audio.muted = this.isRemoteMuted(playerId) || !this.settings.settings.voiceEnabled;
    this.remotes.set(playerId, audio);
  }

  private dropRemote(playerId: string): void {
    const audio = this.remotes.get(playerId);
    if (audio) {
      audio.srcObject = null;
      audio.remove();
      this.remotes.delete(playerId);
    }
    this.update('speaking', playerId, false);
  }

  private watchLevel(stream: MediaStream): void {
    this.stopLevel();
    try {
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      this.analyserTimer = setInterval(() => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const sample of data) {
          const centered = (sample - 128) / 128;
          sum += centered * centered;
        }
        const loud = Math.sqrt(sum / data.length) > 0.04 && !this.ui.selfMuted;
        if (loud === this.speaking) return;
        this.speaking = loud;
        this.socket.send({ type: 'voice:speaking', speaking: loud });
      }, 120);
    } catch {
      /* AudioContext can be blocked until a tap; mute still works. */
    }
  }

  private stopLevel(): void {
    if (this.analyserTimer) clearInterval(this.analyserTimer);
    this.analyserTimer = null;
    if (this.speaking) {
      this.speaking = false;
      this.socket.send({ type: 'voice:speaking', speaking: false });
    }
  }
}
