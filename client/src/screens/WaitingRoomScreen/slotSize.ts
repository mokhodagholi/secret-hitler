/** Space between seat tiles. Used as the column gap and the minimum row gap. */
export const SEAT_GAP_PX = 10;

/** Name + seat number under the square paper. */
export const SEAT_CAPTION_PX = 20;

const SLOT_MIN_PX = 52;
const SLOT_MAX_PX = 168;

export interface SeatSlotSizeOptions {
  width: number;
  height: number;
  count: number;
  captionPx?: number;
}

export interface SeatLayout {
  slotPx: number;
  columns: number;
  rows: number;
  columnGapPx: number;
  rowGapPx: number;
}

/**
 * Largest square paper that still fits `count` seats in the box.
 * Leftover height goes into the row gap so a tall phone does not leave a
 * dead band between the last row and the quote.
 */
export function seatLayoutForBox(options: SeatSlotSizeOptions): SeatLayout {
  const empty: SeatLayout = {
    slotPx: SLOT_MIN_PX,
    columns: 1,
    rows: 1,
    columnGapPx: SEAT_GAP_PX,
    rowGapPx: SEAT_GAP_PX,
  };
  if (options.width < 8 || options.height < 8) return empty;

  const captionPx = options.captionPx ?? SEAT_CAPTION_PX;
  const count = Math.max(1, options.count);
  let bestPaper = 0;
  let bestColumns = 1;
  let bestRows = count;

  for (let columns = 1; columns <= count; columns++) {
    const rows = Math.ceil(count / columns);
    const cellWidth = (options.width - SEAT_GAP_PX * (columns - 1)) / columns;
    const cellHeight = (options.height - SEAT_GAP_PX * (rows - 1)) / rows;
    const paper = Math.min(cellWidth, cellHeight - captionPx);
    if (paper > bestPaper) {
      bestPaper = paper;
      bestColumns = columns;
      bestRows = rows;
    }
  }

  const slotPx = Math.max(SLOT_MIN_PX, Math.min(SLOT_MAX_PX, Math.floor(bestPaper)));
  const usedHeight =
    bestRows * (slotPx + captionPx) + SEAT_GAP_PX * Math.max(0, bestRows - 1);
  const leftover = options.height - usedHeight;
  const rowGapPx =
    bestRows < 2
      ? SEAT_GAP_PX
      : Math.max(SEAT_GAP_PX, SEAT_GAP_PX + leftover / (bestRows - 1));

  return {
    slotPx,
    columns: bestColumns,
    rows: bestRows,
    columnGapPx: SEAT_GAP_PX,
    rowGapPx,
  };
}

export function slotSizeForSeats(options: SeatSlotSizeOptions): number {
  return seatLayoutForBox(options).slotPx;
}
