import { describe, expect, it } from '@rstest/core';
import { slotSizeForSeats, seatLayoutForBox, SEAT_GAP_PX } from './slotSize';

describe('slotSizeForSeats', () => {
  it('Should pick more rows when that makes each portrait larger than a wide two-row strip', () => {
    const wideRow = slotSizeForSeats({ width: 322, height: 500, count: 10 });
    const twoRowWidthLimited = slotSizeForSeats({ width: 322, height: 140, count: 10 });
    expect(wideRow).toBeGreaterThan(twoRowWidthLimited);
    expect(wideRow).toBeGreaterThan(70);
  });

  it('Should shrink portraits so ten seats still fit a short phone box', () => {
    const short = slotSizeForSeats({ width: 322, height: 180, count: 10 });
    const tall = slotSizeForSeats({ width: 322, height: 420, count: 10 });
    expect(short).toBeLessThan(tall);
    expect(short).toBeGreaterThanOrEqual(52);
  });

  it('Should stay at the floor when the box has not been measured yet', () => {
    expect(slotSizeForSeats({ width: 0, height: 0, count: 10 })).toBe(52);
  });

  it('Should spend leftover height on the gap between rows', () => {
    const layout = seatLayoutForBox({ width: 322, height: 420, count: 10 });
    expect(layout.rows).toBeGreaterThan(1);
    expect(layout.rowGapPx).toBeGreaterThan(SEAT_GAP_PX);
  });
});
