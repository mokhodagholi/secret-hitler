import type { VoiceJson, VoiceTransportDirection } from '@secret-hitler/shared';
import type {
  ConsumeResult,
  PeerProducer,
  ProduceResult,
  TransportOffer,
  VoiceMediaBackend,
} from './media';

interface PlayerMedia {
  roomId: string;
  sendId: string | null;
  recvId: string | null;
  producerId: string | null;
  paused: boolean;
  consumers: Set<string>;
}

/** In-memory SFU stand-in so VoiceHub tests never load the native worker. */
export class MemoryMediaBackend implements VoiceMediaBackend {
  private readonly players = new Map<string, PlayerMedia>();
  private readonly producers = new Map<string, { playerId: string; roomId: string }>();

  rtpCapabilities(_roomId?: string): VoiceJson {
    return {
      codecs: [{ mimeType: 'audio/opus', clockRate: 48000, channels: 2 }],
    };
  }

  async createTransport(
    roomId: string,
    playerId: string,
    direction: VoiceTransportDirection,
  ): Promise<TransportOffer> {
    const seat = this.seat(roomId, playerId);
    const id = `${direction}-${playerId}`;
    if (direction === 'send') seat.sendId = id;
    else seat.recvId = id;
    return {
      id,
      iceParameters: { usernameFragment: 'test', password: 'test', iceLite: true },
      iceCandidates: [],
      dtlsParameters: { role: 'auto', fingerprints: [] },
    };
  }

  async connectTransport(): Promise<void> {
    /* memory transports have no DTLS */
  }

  async produce(
    playerId: string,
    transportId: string,
    _rtpParameters: VoiceJson,
  ): Promise<ProduceResult> {
    const seat = this.players.get(playerId);
    if (!seat || seat.sendId !== transportId) {
      throw new Error('send transport is missing');
    }
    const producerId = `prod-${playerId}`;
    seat.producerId = producerId;
    seat.paused = true;
    this.producers.set(producerId, { playerId, roomId: seat.roomId });
    return { producerId, paused: true };
  }

  async consume(
    playerId: string,
    producerId: string,
    _rtpCapabilities: VoiceJson,
  ): Promise<ConsumeResult> {
    const producer = this.producers.get(producerId);
    const seat = this.players.get(playerId);
    if (!producer || !seat || seat.roomId !== producer.roomId) {
      throw new Error('producer is not in this room');
    }
    const id = `cons-${playerId}-${producerId}`;
    seat.consumers.add(id);
    return {
      id,
      producerId,
      kind: 'audio',
      rtpParameters: {},
      paused: true,
    };
  }

  async resumeConsumer(playerId: string, consumerId: string): Promise<void> {
    const seat = this.players.get(playerId);
    if (!seat?.consumers.has(consumerId)) throw new Error('consumer is missing');
  }

  async setProducerPaused(playerId: string, paused: boolean): Promise<boolean> {
    const seat = this.players.get(playerId);
    if (!seat?.producerId) return false;
    seat.paused = paused;
    return true;
  }

  async removePlayer(playerId: string): Promise<string | null> {
    const seat = this.players.get(playerId);
    this.players.delete(playerId);
    if (!seat?.producerId) return null;
    this.producers.delete(seat.producerId);
    return seat.producerId;
  }

  async removeRoom(roomId: string): Promise<void> {
    const ids = [...this.players.entries()]
      .filter(([, seat]) => seat.roomId === roomId)
      .map(([playerId]) => playerId);
    for (const playerId of ids) {
      await this.removePlayer(playerId);
    }
  }

  listProducers(roomId: string): PeerProducer[] {
    const peers: PeerProducer[] = [];
    for (const [playerId, seat] of this.players) {
      if (seat.roomId === roomId && seat.producerId) {
        peers.push({ playerId, producerId: seat.producerId, muted: seat.paused });
      }
    }
    return peers;
  }

  private seat(roomId: string, playerId: string): PlayerMedia {
    const existing = this.players.get(playerId);
    if (existing) return existing;
    const created: PlayerMedia = {
      roomId,
      sendId: null,
      recvId: null,
      producerId: null,
      paused: true,
      consumers: new Set(),
    };
    this.players.set(playerId, created);
    return created;
  }
}
