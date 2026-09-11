import type {
  ClientMessage,
  GameCommand,
  VoiceJson,
  VoiceTransportDirection,
} from '../types/events';

// Runtime guards for the WS wire format. The server must never trust a cast —
// one malformed frame reaching the engine would throw inside the `ws` message
// handler and take the whole process down.

function isGameCommand(value: unknown): value is GameCommand {
  if (typeof value !== 'object' || value === null) return false;
  const command = value as Record<string, unknown>;
  switch (command.kind) {
    case 'nominateChancellor':
    case 'useSpecialPower':
      return typeof command.targetId === 'string';
    case 'castVote':
      return command.vote === 'ja' || command.vote === 'nein';
    case 'discardPolicy':
    case 'enactPolicy':
      return Number.isInteger(command.index);
    case 'vetoRequest':
    case 'endTurn':
      return true;
    case 'vetoConsent':
      return typeof command.agree === 'boolean';
    default:
      return false;
  }
}

/**
 * Parse and structurally validate a raw client frame. Returns null for
 * anything that is not a well-formed {@link ClientMessage}. Payloads are
 * rebuilt field by field so unexpected extra properties never travel further.
 */
export function parseClientMessage(raw: string): ClientMessage | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const message = value as Record<string, unknown>;

  switch (message.type) {
    case 'auth':
      return typeof message.token === 'string'
        ? { type: 'auth', token: message.token }
        : null;
    case 'chat:message':
      return typeof message.text === 'string'
        ? { type: 'chat:message', text: message.text }
        : null;
    case 'command':
      return isGameCommand(message.command)
        ? { type: 'command', command: message.command }
        : null;
    case 'player:kick':
    case 'kick:request':
      return typeof message.playerId === 'string'
        ? { type: message.type, playerId: message.playerId }
        : null;
    case 'kick:vote':
      return typeof message.agree === 'boolean'
        ? { type: 'kick:vote', agree: message.agree }
        : null;
    case 'player:ready':
    case 'player:unready':
    case 'game:start':
    case 'room:leave':
    case 'ping':
    case 'voice:join':
    case 'voice:leave':
      return { type: message.type };
    case 'voice:createTransport':
      return isVoiceDirection(message.direction)
        ? { type: 'voice:createTransport', direction: message.direction }
        : null;
    case 'voice:connectTransport':
      return typeof message.transportId === 'string' && isVoiceJson(message.dtlsParameters)
        ? {
            type: 'voice:connectTransport',
            transportId: message.transportId,
            dtlsParameters: message.dtlsParameters,
          }
        : null;
    case 'voice:produce':
      return typeof message.transportId === 'string' && isVoiceJson(message.rtpParameters)
        ? {
            type: 'voice:produce',
            transportId: message.transportId,
            rtpParameters: message.rtpParameters,
          }
        : null;
    case 'voice:consume':
      return typeof message.producerId === 'string' && isVoiceJson(message.rtpCapabilities)
        ? {
            type: 'voice:consume',
            producerId: message.producerId,
            rtpCapabilities: message.rtpCapabilities,
          }
        : null;
    case 'voice:mute':
      return typeof message.muted === 'boolean'
        ? { type: 'voice:mute', muted: message.muted }
        : null;
    case 'voice:speaking':
      return typeof message.speaking === 'boolean'
        ? { type: 'voice:speaking', speaking: message.speaking }
        : null;
    default:
      return null;
  }
}

function isVoiceDirection(value: unknown): value is VoiceTransportDirection {
  return value === 'send' || value === 'recv';
}

function isVoiceJson(value: unknown): value is VoiceJson {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
