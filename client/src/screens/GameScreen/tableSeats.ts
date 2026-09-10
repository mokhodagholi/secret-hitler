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

/** You sit on the bottom row; the remaining seats wrap onto the top. */
export function splitTableRows<T>(players: readonly T[]): {
  top: T[];
  bottom: T[];
} {
  const bottomCount = Math.ceil(players.length / 2);
  return {
    bottom: players.slice(0, bottomCount),
    top: players.slice(bottomCount),
  };
}
