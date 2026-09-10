import { Phase } from '@secret-hitler/shared';
import type { RaviLineId } from '../../services/RaviService';

/** Leave jokes — only after someone left. Never mixed into other opens. */
export const LEAVE_OPEN = [
  'discuss.afterLeave',
  'discuss.afterLeave2',
  'discuss.afterLeave3',
] as const satisfies readonly RaviLineId[];

let lastLeaveOpen: RaviLineId | null = null;

export function resetLeaveOpenPick(): void {
  lastLeaveOpen = null;
}

function pickLeaveOpen(random: () => number): RaviLineId {
  const pool = lastLeaveOpen
    ? LEAVE_OPEN.filter((id) => id !== lastLeaveOpen)
    : [...LEAVE_OPEN];
  const id = pool[Math.floor(random() * pool.length)] ?? LEAVE_OPEN[0];
  lastLeaveOpen = id;
  return id;
}

/**
 * Round-open line. Power and leave are condition-locked — they never appear
 * as a random default. Leave jokes shuffle only on a leaver.
 */
export function discussOpenLine(
  lastPhase: string | null,
  tableChanged: boolean,
  governmentFailed: boolean,
  random: () => number = Math.random,
): RaviLineId {
  if (tableChanged) return pickLeaveOpen(random);
  if (lastPhase === Phase.SpecialPower) return 'discuss.afterPower';
  if (governmentFailed) return 'discuss.afterFail';
  return 'discuss.start';
}
