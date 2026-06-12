import type { ClientMessage, GameCommand } from '../types/events';

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
    case 'player:ready':
    case 'player:unready':
    case 'game:start':
    case 'room:leave':
    case 'ping':
      return { type: message.type };
    default:
      return null;
  }
}
