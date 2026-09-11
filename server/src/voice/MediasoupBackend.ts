import type { VoiceJson, VoiceTransportDirection } from '@secret-hitler/shared';
import type {
  ConsumeResult,
  PeerProducer,
  ProduceResult,
  TransportOffer,
  VoiceMediaBackend,
} from './media';

export interface MediasoupListen {
  listenIp: string;
  announcedIp?: string;
  rtcMinPort: number;
  rtcMaxPort: number;
}

type MediasoupRouter = {
  rtpCapabilities: VoiceJson;
  createWebRtcTransport: (options: {
    listenInfos: Array<{
      protocol: 'udp' | 'tcp';
      ip: string;
      announcedAddress?: string;
    }>;
    enableUdp: boolean;
    enableTcp: boolean;
    preferUdp: boolean;
  }) => Promise<MediasoupTransport>;
  canConsume: (options: { producerId: string; rtpCapabilities: VoiceJson }) => boolean;
};

type MediasoupTransport = {
  id: string;
  iceParameters: VoiceJson;
  iceCandidates: VoiceJson[];
  dtlsParameters: VoiceJson;
  connect: (options: { dtlsParameters: VoiceJson }) => Promise<void>;
  produce: (options: { kind: 'audio'; rtpParameters: VoiceJson; paused: boolean }) => Promise<{
    id: string;
    paused: boolean;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    close: () => void;
  }>;
  consume: (options: {
    producerId: string;
    rtpCapabilities: VoiceJson;
    paused: boolean;
  }) => Promise<{
    id: string;
    producerId: string;
    kind: 'audio';
    rtpParameters: VoiceJson;
    paused: boolean;
    resume: () => Promise<void>;
    close: () => void;
  }>;
  close: () => void;
};

type MediasoupProducer = {
  id: string;
  paused: boolean;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  close: () => void;
};

interface PlayerMedia {
  roomId: string;
  send: MediasoupTransport | null;
  recv: MediasoupTransport | null;
  producer: MediasoupProducer | null;
  consumers: Map<string, { resume: () => Promise<void>; close: () => void }>;
}

/**
 * Real mediasoup worker. Loaded only when FEATURE_VOICE is on — tests use
 * {@link MemoryMediaBackend} so they never compile the native addon.
 */
export class MediasoupBackend implements VoiceMediaBackend {
  private readonly rooms = new Map<string, MediasoupRouter>();
  private readonly players = new Map<string, PlayerMedia>();

  constructor(
    private readonly worker: {
      createRouter: (options: { mediaCodecs: VoiceJson[] }) => Promise<MediasoupRouter>;
    },
    private readonly listen: MediasoupListen,
  ) {}

  static async create(listen: MediasoupListen): Promise<MediasoupBackend> {
    const mediasoup = await import('mediasoup');
    const worker = await mediasoup.createWorker({
      rtcMinPort: listen.rtcMinPort,
      rtcMaxPort: listen.rtcMaxPort,
    });
    const backend = new MediasoupBackend(worker as never, listen);
    await backend.ensureRouter('__capabilities__');
    return backend;
  }

  rtpCapabilities(roomId?: string): VoiceJson {
    if (roomId) {
      const roomRouter = this.rooms.get(roomId);
      if (roomRouter) return roomRouter.rtpCapabilities as VoiceJson;
    }
    const router = this.rooms.get('__capabilities__');
    if (!router) throw new Error('voice worker is not ready');
    return router.rtpCapabilities as VoiceJson;
  }

  async prepareRoom(roomId: string): Promise<void> {
    await this.ensureRouter(roomId);
  }

  async ensureRouter(roomId: string): Promise<MediasoupRouter> {
    const existing = this.rooms.get(roomId);
    if (existing) return existing;
    const router = await this.worker.createRouter({
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
      ],
    });
    this.rooms.set(roomId, router);
    return router;
  }

  routerCapabilities(roomId: string): VoiceJson {
    const router = this.rooms.get(roomId);
    if (!router) throw new Error('voice router is missing');
    return router.rtpCapabilities as VoiceJson;
  }

  async createTransport(
    roomId: string,
    playerId: string,
    direction: VoiceTransportDirection,
  ): Promise<TransportOffer> {
    const router = await this.ensureRouter(roomId);
    const announced = this.listen.announcedIp;
    const listenInfos: Array<{
      protocol: 'udp' | 'tcp';
      ip: string;
      announcedAddress?: string;
    }> = [
      {
        protocol: 'udp',
        ip: this.listen.listenIp,
        ...(announced ? { announcedAddress: announced } : {}),
      },
      {
        protocol: 'tcp',
        ip: this.listen.listenIp,
        ...(announced ? { announcedAddress: announced } : {}),
      },
    ];
    const transport = await router.createWebRtcTransport({
      listenInfos,
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    });
    const seat = this.seat(roomId, playerId);
    if (direction === 'send') seat.send = transport;
    else seat.recv = transport;
    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
  }

  async connectTransport(
    playerId: string,
    transportId: string,
    dtlsParameters: VoiceJson,
  ): Promise<void> {
    const transport = this.transport(playerId, transportId);
    await transport.connect({ dtlsParameters });
  }

  async produce(
    playerId: string,
    transportId: string,
    rtpParameters: VoiceJson,
  ): Promise<ProduceResult> {
    const seat = this.players.get(playerId);
    if (!seat?.send || seat.send.id !== transportId) {
      throw new Error('send transport is missing');
    }
    const producer = await seat.send.produce({
      kind: 'audio',
      rtpParameters,
      paused: true,
    });
    seat.producer = producer;
    return { producerId: producer.id, paused: true };
  }

  async consume(
    playerId: string,
    producerId: string,
    rtpCapabilities: VoiceJson,
  ): Promise<ConsumeResult> {
    const seat = this.players.get(playerId);
    const router = seat ? this.rooms.get(seat.roomId) : undefined;
    if (!seat?.recv || !router) throw new Error('recv transport is missing');
    if (!router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error('cannot consume producer');
    }
    const consumer = await seat.recv.consume({
      producerId,
      rtpCapabilities,
      paused: true,
    });
    seat.consumers.set(consumer.id, consumer);
    return {
      id: consumer.id,
      producerId: consumer.producerId,
      kind: 'audio',
      rtpParameters: consumer.rtpParameters,
      paused: true,
    };
  }

  async resumeConsumer(playerId: string, consumerId: string): Promise<void> {
    const consumer = this.players.get(playerId)?.consumers.get(consumerId);
    if (!consumer) throw new Error('consumer is missing');
    await consumer.resume();
  }

  async setProducerPaused(playerId: string, paused: boolean): Promise<boolean> {
    const producer = this.players.get(playerId)?.producer;
    if (!producer) return false;
    if (paused) await producer.pause();
    else await producer.resume();
    return true;
  }

  async removePlayer(playerId: string): Promise<string | null> {
    const seat = this.players.get(playerId);
    this.players.delete(playerId);
    if (!seat) return null;
    for (const consumer of seat.consumers.values()) consumer.close();
    seat.send?.close();
    seat.recv?.close();
    const producerId = seat.producer?.id ?? null;
    seat.producer?.close();
    return producerId;
  }

  async removeRoom(roomId: string): Promise<void> {
    const ids = [...this.players.entries()]
      .filter(([, seat]) => seat.roomId === roomId)
      .map(([playerId]) => playerId);
    for (const playerId of ids) await this.removePlayer(playerId);
    this.rooms.delete(roomId);
  }

  listProducers(roomId: string): PeerProducer[] {
    const peers: PeerProducer[] = [];
    for (const [playerId, seat] of this.players) {
      if (seat.roomId === roomId && seat.producer) {
        peers.push({
          playerId,
          producerId: seat.producer.id,
          muted: seat.producer.paused,
        });
      }
    }
    return peers;
  }

  private seat(roomId: string, playerId: string): PlayerMedia {
    const existing = this.players.get(playerId);
    if (existing) return existing;
    const created: PlayerMedia = {
      roomId,
      send: null,
      recv: null,
      producer: null,
      consumers: new Map(),
    };
    this.players.set(playerId, created);
    return created;
  }

  private transport(playerId: string, transportId: string): MediasoupTransport {
    const seat = this.players.get(playerId);
    if (seat?.send?.id === transportId) return seat.send;
    if (seat?.recv?.id === transportId) return seat.recv;
    throw new Error('transport is missing');
  }
}
