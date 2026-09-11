import type {
  GameStateView,
  IceServer,
  VoiceJson,
  VoiceTransportDirection,
} from '@secret-hitler/shared';
import type { PeerProducer, VoiceMediaBackend } from './media';

/**
 * Per-room SFU bookkeeping. Does not touch GameEngine — SocketHandler asks
 * it to pause a producer when the seat is dead or disconnected.
 */
export class VoiceHub {
  private readonly selfMuted = new Set<string>();

  constructor(
    private readonly media: VoiceMediaBackend,
    private readonly iceServers: IceServer[] = [],
  ) {}

  async prepareRoom(roomId: string): Promise<void> {
    await this.media.prepareRoom?.(roomId);
  }

  capabilities(): { rtpCapabilities: VoiceJson; iceServers: IceServer[] } {
    return {
      rtpCapabilities: this.media.rtpCapabilities(),
      iceServers: this.iceServers,
    };
  }

  peers(roomId: string): PeerProducer[] {
    return this.media.listProducers(roomId);
  }

  async createTransport(
    roomId: string,
    playerId: string,
    direction: VoiceTransportDirection,
  ) {
    return this.media.createTransport(roomId, playerId, direction);
  }

  async connectTransport(
    playerId: string,
    transportId: string,
    dtlsParameters: VoiceJson,
  ): Promise<void> {
    await this.media.connectTransport(playerId, transportId, dtlsParameters);
  }

  async produce(playerId: string, transportId: string, rtpParameters: VoiceJson) {
    const result = await this.media.produce(playerId, transportId, rtpParameters);
    this.selfMuted.add(playerId);
    return result;
  }

  async consume(playerId: string, producerId: string, rtpCapabilities: VoiceJson) {
    return this.media.consume(playerId, producerId, rtpCapabilities);
  }

  async setMuted(playerId: string, muted: boolean): Promise<boolean> {
    const ok = await this.media.setProducerPaused(playerId, muted);
    if (!ok) return false;
    if (muted) this.selfMuted.add(playerId);
    else this.selfMuted.delete(playerId);
    return true;
  }

  /** Pause (or keep paused) when this seat may not speak. */
  async applySeat(playerId: string, canSpeak: boolean): Promise<void> {
    if (!canSpeak) {
      await this.media.setProducerPaused(playerId, true);
      this.selfMuted.add(playerId);
    }
  }

  async removePlayer(playerId: string): Promise<string | null> {
    this.selfMuted.delete(playerId);
    return this.media.removePlayer(playerId);
  }

  async removeRoom(roomId: string): Promise<void> {
    await this.media.removeRoom(roomId);
  }

  decorateView(state: GameStateView): GameStateView {
    return {
      ...state,
      players: state.players.map((player) => ({
        ...player,
        selfMuted: this.selfMuted.has(player.id),
      })),
    };
  }
}
