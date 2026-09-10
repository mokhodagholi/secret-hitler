import type { LogCode } from '@secret-hitler/shared';
import type { FormatMessage, MessageKey } from './types';

/** Seat and list labels: first-person when this player is the viewer. */
export function playerLabel(
  isYou: boolean,
  name: string,
  formatMessage: FormatMessage,
): string {
  return isYou ? formatMessage('game.you') : name;
}

export function namedIsYou(
  value: string | number | undefined,
  myName: string,
): boolean {
  return typeof value === 'string' && value !== '' && value === myName;
}

const YOU_LOG: Partial<Record<LogCode, MessageKey>> = {
  joined: 'log.joinedYou',
  left: 'log.leftYou',
  kicked: 'log.kickedYou',
  reconnected: 'log.reconnectedYou',
  disconnected: 'log.disconnectedYou',
  newHost: 'log.newHostYou',
  hitlerChancellor: 'log.hitlerChancellorYou',
  governmentElected: 'log.governmentElectedYou',
  investigated: 'log.investigatedYou',
  executed: 'log.executedYou',
};

/** Game-log line: first-person when a named param is the viewer. */
export function logLineKey(
  code: LogCode,
  params: Record<string, string | number> | undefined,
  myName: string,
  youId?: string,
): MessageKey {
  if (code === 'nominated') {
    if (youId && (params?.presidentId || params?.chancellorId)) {
      if (officeIsYou(params?.presidentId, youId)) return 'log.nominatedYou';
      if (officeIsYou(params?.chancellorId, youId)) return 'log.nominatedAsYou';
      return 'log.nominated';
    }
    if (namedIsYou(params?.president, myName)) return 'log.nominatedYou';
    if (namedIsYou(params?.chancellor, myName)) return 'log.nominatedAsYou';
    return 'log.nominated';
  }
  const youKey = YOU_LOG[code];
  if (youKey && namedIsYou(params?.name, myName)) return youKey;
  return `log.${code}`;
}

/** Ravi line when a nomination names the viewer. Match seat id first so a
 *  shared name cannot tell every device "you chose the Chancellor". */
export function raviNominatedLine(
  params: Record<string, string | number> | undefined,
  myName: string,
  youId?: string,
): 'nominate.named' | 'nominate.namedYou' | 'nominate.namedAsYou' {
  if (youId) {
    if (officeIsYou(params?.presidentId, youId)) return 'nominate.namedYou';
    if (officeIsYou(params?.chancellorId, youId)) return 'nominate.namedAsYou';
    if (params?.presidentId || params?.chancellorId) return 'nominate.named';
  }
  if (namedIsYou(params?.president, myName)) return 'nominate.namedYou';
  if (namedIsYou(params?.chancellor, myName)) return 'nominate.namedAsYou';
  return 'nominate.named';
}

function officeIsYou(
  value: string | number | undefined,
  youId: string | undefined,
): boolean {
  return Boolean(youId) && typeof value === 'string' && value === youId;
}
