import type { IceServer, VoiceJson, VoiceTransportDirection } from '@secret-hitler/shared';

export interface TransportOffer {
  id: string;
  iceParameters: VoiceJson;
  iceCandidates: VoiceJson[];
  dtlsParameters: VoiceJson;
}

export interface ProduceResult {
  producerId: string;
  paused: boolean;
}

export interface ConsumeResult {
  id: string;
  producerId: string;
  kind: 'audio';
  rtpParameters: VoiceJson;
  paused: boolean;
}

export interface PeerProducer {
  playerId: string;
  producerId: string;
  muted: boolean;
}

/** SFU operations VoiceHub needs. Tests inject a memory backend. */
export interface VoiceMediaBackend {
  rtpCapabilities(roomId?: string): VoiceJson;
  prepareRoom?(roomId: string): Promise<void>;
  createTransport(
    roomId: string,
    playerId: string,
    direction: VoiceTransportDirection,
  ): Promise<TransportOffer>;
  connectTransport(
    playerId: string,
    transportId: string,
    dtlsParameters: VoiceJson,
  ): Promise<void>;
  produce(
    playerId: string,
    transportId: string,
    rtpParameters: VoiceJson,
  ): Promise<ProduceResult>;
  consume(
    playerId: string,
    producerId: string,
    rtpCapabilities: VoiceJson,
  ): Promise<ConsumeResult>;
  resumeConsumer(playerId: string, consumerId: string): Promise<void>;
  setProducerPaused(playerId: string, paused: boolean): Promise<boolean>;
  /** Drop transports and producers for this player. Returns the producer id if any. */
  removePlayer(playerId: string): Promise<string | null>;
  removeRoom(roomId: string): Promise<void>;
  listProducers(roomId: string): PeerProducer[];
}

export function iceServersFromEnv(
  source: Record<string, string | undefined>,
): IceServer[] {
  const servers: IceServer[] = [];
  const stun = splitUrls(source.STUN_URLS);
  for (const url of stun) servers.push({ urls: url });
  const turn = splitUrls(source.TURN_URLS);
  const username = source.TURN_USERNAME?.trim();
  const credential = source.TURN_PASSWORD?.trim();
  for (const url of turn) {
    if (username && credential) {
      servers.push({ urls: url, username, credential });
    } else {
      servers.push({ urls: url });
    }
  }
  return servers;
}

function splitUrls(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((url) => url.trim())
    .filter((url) => url.length > 0);
}
