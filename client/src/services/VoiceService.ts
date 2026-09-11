import { createSignal, type Accessor } from 'solid-js';
import { createStore, type SetStoreFunction, type Store } from 'solid-js/store';
import {
  Phase,
  type GameStateView,
  type IceServer,
  type ServerMessage,
  type VoiceJson,
  type VoiceTransportDirection,
} from '@secret-hitler/shared';
import type { FeatureFlagService } from './FeatureFlagService';
import type { SettingsService } from './SettingsService';
import type { WebSocketService } from './WebSocketService';

export type VoiceStatus = 'off' | 'idle' | 'connecting' | 'live' | 'denied' | 'failed';

/** Exact NS/AGC false + AEC can return a silent macOS Voice Processing track. */
const MIC_AUDIO: MediaTrackConstraints = {
  echoCancellation: true,
};

const SPEAKING_ON = 0.02;
const SPEAKING_OFF = 0.01;
const SPEAKING_HOLD_MS = 500;
const UNLOCK_EVENTS = ['pointerdown', 'touchend', 'keydown', 'click'] as const;

interface VoiceUiState {
  selfMuted: boolean;
  speaking: Record<string, boolean>;
  remoteMuted: Record<string, boolean>;
}

interface PendingPeer {
  playerId: string;
  producerId: string;
}

interface MsProducer {
  id: string;
  getStats?: () => Promise<RTCStatsReport>;
}

interface MsTransport {
  id: string;
  on: (event: string, handler: (...args: never[]) => void) => void;
  produce: (opts: {
    track: MediaStreamTrack;
    codecOptions?: { opusDtx?: boolean; opusFec?: boolean };
  }) => Promise<MsProducer>;
  consume: (opts: {
    id: string;
    producerId: string;
    kind: 'audio';
    rtpParameters: VoiceJson;
  }) => Promise<{
    track: MediaStreamTrack;
    paused?: boolean;
    resume?: () => void | Promise<void>;
  }>;
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
  private produced = false;
  private selfId: string | null = null;
  private localStream: MediaStream | null = null;
  private device: MsDevice | null = null;
  private iceServers: IceServer[] = [];
  private sendTransport: MsTransport | null = null;
  private recvTransport: MsTransport | null = null;
  private readonly remotes = new Map<string, HTMLAudioElement>();
  private readonly pendingPeers: PendingPeer[] = [];
  private readonly connectWaiters = new Map<string, () => void>();
  private readonly produceWaiters = new Map<string, (arg: { id: string }) => void>();
  private speaking = false;
  private speakingHoldUntil = 0;
  private analyserTimer: ReturnType<typeof setInterval> | null = null;
  private unlockGesture: (() => void) | null = null;

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
    this.selfId = view?.you.id ?? null;
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
    if (!muted) void this.tryProduce();
    this.unlockPlayback();
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
    if (enabled) this.unlockPlayback();
  }

  private async join(): Promise<void> {
    this.setStatus('connecting');
    try {
      // Mic first — capabilities/produce used to race ahead of getUserMedia.
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: MIC_AUDIO,
        video: false,
      });
      const track = this.localStream.getAudioTracks()[0];
      if (track) track.enabled = false;
      this.update('selfMuted', true);
      this.joined = true;
      this.armUnlock();
      this.socket.send({ type: 'voice:join' });
      await this.tryProduce();
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
    this.produced = false;
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
    this.stopLevel();
    this.disarmUnlock();
    this.sendTransport?.close();
    this.recvTransport?.close();
    this.sendTransport = null;
    this.recvTransport = null;
    this.device = null;
    this.iceServers = [];
    this.pendingPeers.length = 0;
    this.connectWaiters.clear();
    this.produceWaiters.clear();
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
        void this.onCapabilities(message);
        break;
      case 'voice:transportCreated':
        void this.onTransportCreated(message);
        break;
      case 'voice:transportConnected':
        this.connectWaiters.get(message.id)?.();
        this.connectWaiters.delete(message.id);
        break;
      case 'voice:produced':
        this.produceWaiters.get(message.transportId)?.({ id: message.id });
        this.produceWaiters.delete(message.transportId);
        this.socket.send({ type: 'voice:mute', muted: this.ui.selfMuted });
        break;
      case 'voice:peer':
        this.onPeer(message);
        break;
      case 'voice:consumed':
        void this.onConsumed(message);
        break;
      case 'voice:speaking':
        this.update('speaking', message.playerId, message.speaking);
        if (message.speaking) this.unlockPlayback();
        break;
      case 'room:closed':
        this.leave();
        this.setStatus('off');
        break;
      default:
        break;
    }
  }

  private onPeer(message: Extract<ServerMessage, { type: 'voice:peer' }>): void {
    if (message.playerId === this.selfId) return;
    if (message.producerId == null) {
      this.dropRemote(message.playerId);
      return;
    }
    this.consumePeer(message.playerId, message.producerId);
  }

  private consumePeer(playerId: string, producerId: string): void {
    if (this.recvTransport && this.device) {
      this.socket.send({
        type: 'voice:consume',
        producerId,
        rtpCapabilities: this.device.rtpCapabilities,
      });
      return;
    }
    if (this.pendingPeers.some((peer) => peer.producerId === producerId)) return;
    this.pendingPeers.push({ playerId, producerId });
  }

  private flushPendingPeers(): void {
    const waiting = this.pendingPeers.splice(0);
    for (const peer of waiting) this.consumePeer(peer.playerId, peer.producerId);
  }

  private async tryProduce(): Promise<void> {
    if (this.produced || !this.sendTransport || !this.localStream) return;
    const track = this.localStream.getAudioTracks()[0];
    if (!track) return;
    this.produced = true;
    try {
      const producer = await this.sendTransport.produce({
        track,
        codecOptions: { opusDtx: false, opusFec: true },
      });
      this.watchSpeaking(producer);
    } catch {
      this.produced = false;
    }
  }

  private async onCapabilities(
    message: Extract<ServerMessage, { type: 'voice:capabilities' }>,
  ): Promise<void> {
    try {
      const loaded = (await import('mediasoup-client')) as {
        Device: new () => MsDevice;
      };
      const device = new loaded.Device();
      await device.load({ routerRtpCapabilities: message.rtpCapabilities });
      this.device = device;
      this.iceServers = message.iceServers;
      this.socket.send({ type: 'voice:createTransport', direction: 'send' });
      this.socket.send({ type: 'voice:createTransport', direction: 'recv' });
    } catch {
      if (this.status() === 'connecting') this.setStatus('live');
    }
  }

  private async onTransportCreated(
    message: Extract<ServerMessage, { type: 'voice:transportCreated' }>,
  ): Promise<void> {
    const device = this.device;
    if (!device) return;
    const options: VoiceJson = {
      id: message.id,
      iceParameters: message.iceParameters,
      iceCandidates: message.iceCandidates,
      dtlsParameters: message.dtlsParameters,
      iceServers: this.iceServers,
    };
    const transport =
      message.direction === 'send'
        ? device.createSendTransport(options)
        : device.createRecvTransport(options);
    this.bindTransport(transport, message.direction);
    transport.on(
      'connectionstatechange',
      ((state: string) => {
        if (state === 'connected') this.unlockPlayback();
      }) as (...args: never[]) => void,
    );
    if (message.direction === 'send') {
      this.sendTransport = transport;
      await this.tryProduce();
    } else {
      this.recvTransport = transport;
      this.flushPendingPeers();
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
          this.produceWaiters.set(transport.id, callback);
          this.socket.send({
            type: 'voice:produce',
            transportId: transport.id,
            rtpParameters,
          });
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
      consumer.track.enabled = true;
      await consumer.resume?.();
      this.attachRemote(message.playerId, consumer.track);
      this.socket.send({ type: 'voice:resumeConsumer', consumerId: message.id });
    } catch {
      this.attachSilentRemote(message.playerId);
    }
  }

  private attachRemote(playerId: string, track: MediaStreamTrack): void {
    this.dropRemote(playerId);
    const audio = document.createElement('audio');
    audio.autoplay = true;
    audio.playsInline = true;
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
    audio.volume = 1;
    // 1px — iOS can refuse playback on a zero-size, display:none node.
    audio.style.cssText =
      'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;';
    document.body.appendChild(audio);
    audio.srcObject = new MediaStream([track]);
    this.remotes.set(playerId, audio);
    this.applyRemoteMute(playerId);
    this.playRemote(audio);
    track.addEventListener('unmute', () => this.playRemote(audio));
  }

  private applyRemoteMute(playerId: string): void {
    const audio = this.remotes.get(playerId);
    if (!audio) return;
    audio.muted = this.isRemoteMuted(playerId) || !this.settings.settings.voiceEnabled;
  }

  private playRemote(audio: HTMLAudioElement): void {
    const played = audio.play() as Promise<void> | undefined;
    played?.catch((error) => {
      const name = error instanceof Error ? error.name : '';
      if (name === 'NotAllowedError' || name === 'NotSupportedError') this.armUnlock();
    });
  }

  private attachSilentRemote(playerId: string): void {
    if (this.remotes.has(playerId)) return;
    const audio = document.createElement('audio');
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

  private unlockPlayback(): void {
    for (const [playerId, audio] of this.remotes) {
      this.applyRemoteMute(playerId);
      this.playRemote(audio);
    }
  }

  private armUnlock(): void {
    if (this.unlockGesture || typeof window === 'undefined') return;
    const onGesture = () => {
      this.unlockPlayback();
    };
    this.unlockGesture = onGesture;
    for (const event of UNLOCK_EVENTS) {
      window.addEventListener(event, onGesture, true);
    }
  }

  private disarmUnlock(): void {
    const onGesture = this.unlockGesture;
    if (!onGesture || typeof window === 'undefined') return;
    this.unlockGesture = null;
    for (const event of UNLOCK_EVENTS) {
      window.removeEventListener(event, onGesture, true);
    }
  }

  /** Web Audio on the capture stream (even a clone) silences the WebRTC send track. */
  private watchSpeaking(producer: MsProducer): void {
    this.stopLevel();
    if (!producer.getStats) return;
    this.analyserTimer = setInterval(() => {
      void this.sampleSpeaking(producer);
    }, 120);
  }

  private async sampleSpeaking(producer: MsProducer): Promise<void> {
    if (!producer.getStats) return;
    let level = 0;
    try {
      const stats = await producer.getStats();
      stats.forEach((report) => {
        const audioLevel = (report as RTCStats & { audioLevel?: number }).audioLevel;
        if (
          typeof audioLevel === 'number' &&
          (report.type === 'media-source' || report.type === 'track')
        ) {
          level = Math.max(level, audioLevel);
        }
      });
    } catch {
      return;
    }
    if (level > SPEAKING_ON) this.speakingHoldUntil = Date.now() + SPEAKING_HOLD_MS;
    const loud =
      !this.ui.selfMuted &&
      (level > SPEAKING_OFF || Date.now() < this.speakingHoldUntil);
    if (loud === this.speaking) return;
    this.speaking = loud;
    this.socket.send({ type: 'voice:speaking', speaking: loud });
  }

  private stopLevel(): void {
    if (this.analyserTimer) clearInterval(this.analyserTimer);
    this.analyserTimer = null;
    this.speakingHoldUntil = 0;
    if (this.speaking) {
      this.speaking = false;
      this.socket.send({ type: 'voice:speaking', speaking: false });
    }
  }
}
