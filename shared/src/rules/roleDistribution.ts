import type { Role } from '../types/GameState';

/** Standard Secret Hitler role counts keyed by player count (5–10). */
const FASCIST_COUNT: Record<number, number> = {
  3: 1,
  4: 1,
  5: 1,
  6: 1,
  7: 2,
  8: 2,
  9: 3,
  10: 3,
};

/** Build the role bag for `playerCount` players: liberals + N fascists + Hitler. */
export function buildRoleBag(playerCount: number): Role[] {
  const fascists = FASCIST_COUNT[playerCount];
  if (fascists == null) {
    throw new Error(`Unsupported player count: ${playerCount}`);
  }
  const liberals = playerCount - fascists - 1;
  return [
    ...Array<Role>(liberals).fill('liberal'),
    ...Array<Role>(fascists).fill('fascist'),
    'hitler',
  ];
}
