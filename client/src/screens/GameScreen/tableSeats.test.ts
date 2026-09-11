import { describe, expect, it } from '@rstest/core';
import { splitTableRows, tableSeatOrder } from './tableSeats';

function seats(...ids: string[]) {
  return ids.map((id, seat) => ({ id, seat }));
}

describe('tableSeatOrder', () => {
  it('Should start at the current player and wrap back to seat 1', () => {
    const players = seats('a', 'b', 'c', 'd', 'e');
    expect(tableSeatOrder(players, 'c').map((player) => player.id)).toEqual([
      'c',
      'd',
      'e',
      'a',
      'b',
    ]);
  });

  it('Should keep seat order when the viewer is already first', () => {
    const players = seats('a', 'b', 'c');
    expect(tableSeatOrder(players, 'a').map((player) => player.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });
});

describe('splitTableRows', () => {
  it('Should put the viewer first on the bottom row at a three-player table', () => {
    const ordered = tableSeatOrder(seats('pres', 'you', 'cal'), 'you');
    const { top, bottom } = splitTableRows(ordered);
    expect(bottom.map((player) => player.id)).toEqual(['you', 'cal']);
    expect(top.map((player) => player.id)).toEqual(['pres']);
  });

  it('Should pack clockwise seats to the left of the viewer at a five-player table', () => {
    const ordered = tableSeatOrder(seats('a', 'b', 'c', 'd', 'e'), 'c');
    const { top, bottom } = splitTableRows(ordered);
    expect(bottom.map((player) => player.id)).toEqual(['c', 'd', 'e']);
    expect(top.map((player) => player.id)).toEqual(['a', 'b']);
  });
});
