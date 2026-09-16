import type { Room } from '@secret-hitler/shared';
import type { MatchOutcome } from './ProductStore';

/** How a finished board ended — policy, Hitler, or numbers. */
export function matchOutcomeOf(room: Room): MatchOutcome | null {
  if (!room.winner) return null;
  if (room.winner === 'liberal') {
    const hitler = room.players.find((player) => player.role === 'hitler');
    if (hitler && !hitler.isAlive) return 'hitler_executed';
    return 'liberal_policy';
  }
  if (room.fascistPolicies >= 6) return 'fascist_policy';
  const chancellor = room.players.find((player) => player.id === room.chancellorId);
  if (chancellor?.role === 'hitler') return 'hitler_elected';
  return 'fascist_numbers';
}
