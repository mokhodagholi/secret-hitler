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
 * Pack you onto the bottom row, then clockwise seats to your left. Overflow
 * continues on the row above, still right-to-left. `players` must already be
 * clockwise from the viewer (`tableSeatOrder`).
 */
export function splitTableRows<T>(players: readonly T[]): {
  top: T[];
  bottom: T[];
} {
  if (players.length === 0) return { top: [], bottom: [] };
  const bottomCount = Math.ceil(players.length / 2);
  return {
    top: players.slice(bottomCount),
    bottom: players.slice(0, bottomCount),
  };
}
