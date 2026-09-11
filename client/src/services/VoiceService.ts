import { createSignal, type Accessor } from 'solid-js';
import { createStore, type SetStoreFunction, type Store } from 'solid-js/store';
import {
  OPENING_CEREMONY_MS,
  Phase,
  isOpeningNight,
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

/**
 * AEC subtracts this tab’s speakers from the send track so Ravi/music stay local.
 * Do not tap the capture stream with Web Audio — Chrome then disables AEC.
 */
const MIC_AUDIO: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

const SPEAKING_ON = 0.04;
const SPEAKING_OFF = 0.02;
const SPEAKING_HOLD_MS = 500;
const UNLOCK_EVENTS = ['pointerdown', 'touchend', 'keydown', 'click'] as const;

interface VoiceUiState {
  selfMuted: boolean;
  speaking: Record<string, boolean>;
  remoteMuted: Record<string, boolean>;
  tableMuted: Record<string, boolean>;
}

interface PendingPeer {
  playerId: string;
  producerId: string;
}

interface MsProducer {
  id: string;
  getStats?: () => Promise<RTCStatsReport>;
  rtpSender?: { getStats: () => Promise<RTCStatsReport> };
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
  readonly needsMicAccess: Accessor<boolean>;
  readonly micBlocked: Accessor<boolean>;
  private readonly setStatus: (status: VoiceStatus) => void;
  private readonly update: SetStoreFunction<VoiceUiState>;
  private readonly setNeedsMicAccess: (value: boolean) => void;
  private readonly setMicBlocked: (value: boolean) => void;
  private joined = false;
  private produced = false;
  private selfId: string | null = null;
  private waitingForDay = false;
  private pendingUnmute = false;
  private nightWait: ReturnType<typeof setTimeout> | null = null;
  private localStream: MediaStream | null = null;
  private device: MsDevice | null = null;
  private iceServers: IceServer[] = [];
  private sendTransport: MsTransport | null = null;
  private recvTransport: MsTransport | null = null;
  private localProducer: MsProducer | null = null;
  private readonly remotes = new Map<string, HTMLMediaElement>();
  private readonly remoteTracks = new Map<string, MediaStreamTrack>();
  private readonly producerPlayers = new Map<string, string>();
  private readonly pendingPeers: PendingPeer[] = [];
  private readonly connectWaiters = new Map<string, () => void>();
  private readonly produceWaiters = new Map<string, (arg: { id: string }) => void>();
  private speaking = false;
  private speakingHoldUntil = 0;
  private analyserTimer: ReturnType<typeof setInterval> | null = null;
  private levelPollInFlight = false;
  private unlockGesture: (() => void) | null = null;
  private playbackUnlocked = false;

  constructor(
    private readonly socket: WebSocketService,
    private readonly flags: FeatureFlagService,
    private readonly settings: SettingsService,
  ) {
    const [status, setStatus] = createSignal<VoiceStatus>('off');
    const [needsMicAccess, setNeedsMicAccess] = createSignal(false);
    const [micBlocked, setMicBlocked] = createSignal(false);
    const [ui, update] = createStore<VoiceUiState>({
      selfMuted: true,
      speaking: {},
      remoteMuted: {},
      tableMuted: {},
    });
    this.status = status;
    this.setStatus = setStatus;
    this.needsMicAccess = needsMicAccess;
    this.setNeedsMicAccess = setNeedsMicAccess;
    this.micBlocked = micBlocked;
    this.setMicBlocked = setMicBlocked;
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

  /** Table-wide mute. Unknown peers count as muted — join starts that way. */
  isTableMuted(playerId: string): boolean {
    if (playerId === this.selfId) return this.ui.selfMuted;
    return this.ui.tableMuted[playerId] !== false;
  }

  /** Join or leave based on the current snapshot. Safe to call often. */
  sync(view: GameStateView | null): void {
    this.selfId = view?.you.id ?? null;
    this.clearNightWait();
    const enabled = this.flags.enabled('voice');
    const inGame = view != null && view.phase !== Phase.Lobby;
    if (!enabled || !inGame) {
      this.waitingForDay = false;
      this.leave();
      this.setMicBlocked(false);
      this.setStatus(enabled ? 'idle' : 'off');
      return;
    }
    const wait = openingNightRemaining(view);
    if (wait != null) {
      this.waitingForDay = true;
      if (!this.joined) this.setStatus('idle');
      this.nightWait = setTimeout(() => this.sync(view), wait);
      return;
    }
    this.waitingForDay = false;
    if (this.joined || this.status() === 'connecting') return;
    if (this.status() === 'denied' || this.status() === 'failed') return;
    void this.join();
  }

  toggleSelfMute(): void {
    if (!this.flags.enabled('voice')) return;
    if (this.localStream) {
      this.setSelfMuted(!this.ui.selfMuted);
      return;
    }
    if (this.status() === 'connecting') return;
    this.pendingUnmute = this.ui.selfMuted;
    // Browser prompt during night sits on the role cards.
    if (!this.waitingForDay) this.setNeedsMicAccess(true);
  }

  /** Confirm on the mic-access dialog — user gesture so the browser may prompt again. */
  async grantMicAccess(): Promise<void> {
    if (!this.flags.enabled('voice')) return;
    if (this.localStream) {
      this.setNeedsMicAccess(false);
      if (this.ui.selfMuted) this.setSelfMuted(false);
      return;
    }
    const ok = await this.join({ unmute: true });
    this.setNeedsMicAccess(!ok);
  }

  dismissMicAccess(): void {
    this.pendingUnmute = false;
    this.setNeedsMicAccess(false);
  }

  toggleRemoteMute(playerId: string): void {
    if (!this.flags.enabled('voice')) return;
    const muted = !this.isRemoteMuted(playerId);
    this.update('remoteMuted', playerId, muted);
    this.applyRemoteMute(playerId);
  }

  setListenEnabled(enabled: boolean): void {
    for (const playerId of this.remotes.keys()) this.applyRemoteMute(playerId);
    if (enabled) this.unlockPlayback();
  }

  private async join(opts: { unmute?: boolean } = {}): Promise<boolean> {
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
      this.setMicBlocked(false);
      this.armUnlock();
      this.socket.send({ type: 'voice:join' });
      await this.tryProduce();
      if (opts.unmute || this.pendingUnmute) {
        this.pendingUnmute = false;
        this.setSelfMuted(false);
      }
      return true;
    } catch (error) {
      const denied =
        error instanceof DOMException &&
        (error.name === 'NotAllowedError' || error.name === 'NotFoundError');
      this.setStatus(denied ? 'denied' : 'failed');
      if (opts.unmute) this.setMicBlocked(denied);
      return false;
    }
  }

  private setSelfMuted(muted: boolean): void {
    this.update('selfMuted', muted);
    const track = this.localStream?.getAudioTracks()[0];
    if (track) track.enabled = !muted;
    this.socket.send({ type: 'voice:mute', muted });
    if (muted) this.applySpeakingLevel(0);
    if (!muted) void this.tryProduce();
    this.unlockPlayback();
  }

  private leave(): void {
    this.clearNightWait();
    this.pendingUnmute = false;
    this.setNeedsMicAccess(false);
    if (!this.joined && this.status() !== 'connecting') return;
    if (this.joined) this.socket.send({ type: 'voice:leave' });
    this.joined = false;
    this.produced = false;
    this.localProducer = null;
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
    this.producerPlayers.clear();
    this.remoteTracks.clear();
    this.playbackUnlocked = false;
    for (const media of this.remotes.values()) {
      media.srcObject = null;
      media.remove();
    }
    this.remotes.clear();
    this.update('speaking', {});
    this.update('tableMuted', {});
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
        // Missed voice:peer unmute used to leave the seat “muted” and hide the glow.
        if (message.speaking) {
          this.update('tableMuted', message.playerId, false);
          this.unlockPlayback();
        }
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
    this.update('tableMuted', message.playerId, message.muted);
    if (message.muted) this.update('speaking', message.playerId, false);
    if (message.playerId === this.selfId) return;
    if (message.producerId == null) {
      this.dropRemote(message.playerId);
      return;
    }
    this.consumePeer(message.playerId, message.producerId);
  }

  private consumePeer(playerId: string, producerId: string): void {
    this.producerPlayers.set(producerId, playerId);
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
      this.localProducer = await this.sendTransport.produce({
        track,
        codecOptions: { opusDtx: false, opusFec: true },
      });
      this.startLevelWatch();
    } catch {
      this.produced = false;
      this.localProducer = null;
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
      const playerId = this.producerPlayers.get(message.producerId) ?? message.playerId;
      if (!playerId) return;
      this.attachRemote(playerId, consumer.track);
      this.socket.send({ type: 'voice:resumeConsumer', consumerId: message.id });
    } catch {
      this.attachSilentRemote(message.playerId);
    }
  }

  private attachRemote(playerId: string, track: MediaStreamTrack): void {
    this.dropRemote(playerId);
    // iOS Safari is silent with <audio srcObject>; <video playsinline> plays WebRTC.
    const media = document.createElement('video');
    media.autoplay = true;
    media.playsInline = true;
    media.defaultMuted = true;
    media.muted = true;
    media.setAttribute('playsinline', 'true');
    media.setAttribute('webkit-playsinline', 'true');
    media.setAttribute('muted', 'true');
    media.volume = 1;
    media.style.cssText =
      'position:absolute;width:2px;height:2px;opacity:0.01;pointer-events:none;';
    document.body.appendChild(media);
    media.srcObject = new MediaStream([track]);
    this.remotes.set(playerId, media);
    this.remoteTracks.set(playerId, track);
    this.applyRemoteMute(playerId);
    this.playRemote(media);
    media.addEventListener('loadedmetadata', () => this.playRemote(media));
    track.addEventListener('unmute', () => this.applyRemoteMute(playerId));
  }

  private applyRemoteMute(playerId: string): void {
    const silence =
      this.isRemoteMuted(playerId) || !this.settings.settings.voiceEnabled;
    const track = this.remoteTracks.get(playerId);
    if (track) track.enabled = !silence;
    const media = this.remotes.get(playerId);
    if (!media) return;
    media.volume = silence ? 0 : 1;
    media.muted = silence || !this.playbackUnlocked;
    if (silence) {
      media.pause();
      return;
    }
    if (this.playbackUnlocked) this.playRemote(media);
  }

  private playRemote(media: HTMLMediaElement): void {
    if (media.volume === 0) return;
    const played = media.play() as Promise<void> | undefined;
    played?.catch((error) => {
      const name = error instanceof Error ? error.name : '';
      if (name === 'NotAllowedError' || name === 'NotSupportedError') this.armUnlock();
    });
  }

  private attachSilentRemote(playerId: string): void {
    if (this.remotes.has(playerId)) return;
    const media = document.createElement('video');
    media.autoplay = true;
    media.muted = true;
    this.remotes.set(playerId, media);
  }

  private dropRemote(playerId: string): void {
    const media = this.remotes.get(playerId);
    if (media) {
      media.srcObject = null;
      media.remove();
      this.remotes.delete(playerId);
    }
    this.remoteTracks.delete(playerId);
    this.update('speaking', playerId, false);
  }

  private unlockPlayback(): void {
    this.playbackUnlocked = true;
    for (const playerId of this.remotes.keys()) this.applyRemoteMute(playerId);
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

  private clearNightWait(): void {
    if (this.nightWait) clearTimeout(this.nightWait);
    this.nightWait = null;
  }

  /** RTP stats, not Web Audio — tapping capture for an analyser disables AEC. */
  private startLevelWatch(): void {
    if (this.analyserTimer) return;
    this.analyserTimer = setInterval(() => {
      void this.pollLocalLevel();
    }, 120);
  }

  private async pollLocalLevel(): Promise<void> {
    if (this.levelPollInFlight) return;
    this.levelPollInFlight = true;
    try {
      if (this.ui.selfMuted || !this.localProducer) {
        this.applySpeakingLevel(0);
        return;
      }
      const stats = await readProducerStats(this.localProducer);
      if (this.ui.selfMuted) {
        this.applySpeakingLevel(0);
        return;
      }
      this.applySpeakingLevel(audioLevelFromStats(stats));
    } finally {
      this.levelPollInFlight = false;
    }
  }

  private applySpeakingLevel(rms: number): void {
    if (rms > SPEAKING_ON) this.speakingHoldUntil = Date.now() + SPEAKING_HOLD_MS;
    const loud =
      !this.ui.selfMuted &&
      (rms > SPEAKING_OFF || Date.now() < this.speakingHoldUntil);
    if (loud === this.speaking) return;
    this.speaking = loud;
    if (this.selfId) this.update('speaking', this.selfId, loud);
    this.socket.send({ type: 'voice:speaking', speaking: loud });
  }

  private stopLevel(): void {
    if (this.analyserTimer) clearInterval(this.analyserTimer);
    this.analyserTimer = null;
    this.speakingHoldUntil = 0;
    if (this.speaking) {
      this.speaking = false;
      if (this.selfId) this.update('speaking', this.selfId, false);
      this.socket.send({ type: 'voice:speaking', speaking: false });
    }
  }
}

function readProducerStats(producer: MsProducer): Promise<RTCStatsReport | undefined> {
  if (producer.getStats) return producer.getStats();
  if (producer.rtpSender) return producer.rtpSender.getStats();
  return Promise.resolve(undefined);
}

function audioLevelFromStats(stats: RTCStatsReport | undefined): number {
  if (!stats) return 0;
  let level = 0;
  stats.forEach((report) => {
    const value = (report as { audioLevel?: number }).audioLevel;
    if (typeof value === 'number' && value > level) level = value;
  });
  return level;
}

function openingNightRemaining(view: GameStateView): number | null {
  const startedAt = view.discussionDeadline?.startedAt ?? 0;
  if (
    !isOpeningNight({
      phase: view.phase,
      discussionStartedAt: startedAt,
      liberalPolicies: view.board.liberalPolicies,
      fascistPolicies: view.board.fascistPolicies,
      electionTracker: view.board.electionTracker,
    })
  ) {
    return null;
  }
  return OPENING_CEREMONY_MS - (Date.now() - startedAt) + 1;
}
