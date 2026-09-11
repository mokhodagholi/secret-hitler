/**
 * Table order from the viewer's seat: you first, then the next numbers,
 * wrapping back to seat 1 until everyone is shown.
 */
export function tableSeatOrder<T extends { id: string; seat: number }>(
  players: readonly T[],
  youId: string,
): T[] {
  const seated = [...players].sort((a, b) => a.seat - b.seat);
  const start = seated.findIndex((player) => player.id === youId);
  if (start <= 0) return seated;
  return [...seated.slice(start), ...seated.slice(0, start)];
}

/**
 * Two rows as if sitting around the table: you in the middle of the bottom,
 * neighbours on either side, everyone else on the far side facing you.
 * `players` must already be clockwise from the viewer (`tableSeatOrder`).
 */
export function splitTableRows<T>(players: readonly T[]): {
  top: T[];
  bottom: T[];
} {
  if (players.length === 0) return { top: [], bottom: [] };
  const [you, ...clockwise] = players;
  const bottomCount = Math.ceil(players.length / 2);
  const sideSeats = bottomCount - 1;
  const rightCount = Math.ceil(sideSeats / 2);
  const leftCount = sideSeats - rightCount;
  const right = clockwise.slice(0, rightCount);
  const left = leftCount > 0 ? clockwise.slice(-leftCount) : [];
  const facing = clockwise.slice(rightCount, clockwise.length - leftCount);
  return {
    top: facing.reverse(),
    bottom: [...left, you, ...right],
  };
}
