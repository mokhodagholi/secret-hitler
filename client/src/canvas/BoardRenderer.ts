import type { BoardState } from '@secret-hitler/shared';

export interface BoardLabels {
  liberal: string;
  fascist: string;
  draw: string;
  discard: string;
}

// Logical drawing size — the canvas is scaled to the device pixel ratio.
const WIDTH = 380;
const HEIGHT = 220;

// Palette mirrors styles/_vars.scss.
const COLORS = {
  panel: '#102941',
  panelEdge: 'rgba(106, 154, 199, 0.35)',
  slot: '#0c2036',
  slotEdge: 'rgba(106, 154, 199, 0.25)',
  liberal: '#4f8fd0',
  fascist: '#c4452c',
  gold: '#f0c14b',
  text: '#cfe2f5',
  dim: '#8fa9c4',
} as const;

const FONT = '"Yekan Bakh", "Oswald", sans-serif';

/**
 * Canvas 2D renderer for the central policy board: liberal/fascist tracks,
 * election tracker, draw/discard piles and the last-enacted strip. Pure
 * draw-on-demand — the screen calls {@link render} whenever state changes,
 * batched inside a single requestAnimationFrame.
 */
export class BoardRenderer {
  private readonly context: CanvasRenderingContext2D;
  private frameHandle: number | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = WIDTH * dpr;
    canvas.height = HEIGHT * dpr;
    canvas.style.width = '100%';
    canvas.style.aspectRatio = `${WIDTH} / ${HEIGHT}`;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context unavailable');
    context.scale(dpr, dpr);
    this.context = context;
  }

  /** Schedule a draw of the given board state on the next animation frame. */
  render(board: BoardState, labels: BoardLabels): void {
    if (this.frameHandle != null) cancelAnimationFrame(this.frameHandle);
    this.frameHandle = requestAnimationFrame(() => {
      this.frameHandle = null;
      this.draw(board, labels);
    });
  }

  dispose(): void {
    if (this.frameHandle != null) cancelAnimationFrame(this.frameHandle);
  }

  private draw(board: BoardState, labels: BoardLabels): void {
    const ctx = this.context;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    this.trackRow({
      y: 14,
      slots: 5,
      filled: board.liberalPolicies,
      color: COLORS.liberal,
      label: `${labels.liberal} ${board.liberalPolicies}`,
    });
    this.trackRow({
      y: 84,
      slots: 6,
      filled: board.fascistPolicies,
      color: COLORS.fascist,
      label: `${labels.fascist} ${board.fascistPolicies}`,
    });

    this.electionTracker(board.electionTracker);
    this.piles(board, labels);
    this.lastEnactedStrip(board.lastEnacted);
  }

  private trackRow(args: {
    y: number;
    slots: number;
    filled: number;
    color: string;
    label: string;
  }): void {
    const ctx = this.context;
    const slotWidth = 46;
    const slotHeight = 30;
    const gap = 8;
    const rowWidth = args.slots * slotWidth + (args.slots - 1) * gap;
    const startX = (WIDTH - rowWidth) / 2;

    ctx.font = `600 11px ${FONT}`;
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(args.label, WIDTH / 2, args.y - 2);

    for (let index = 0; index < args.slots; index++) {
      const x = startX + index * (slotWidth + gap);
      const filled = index < args.filled;
      this.roundedRect(x, args.y + 2, slotWidth, slotHeight, 5);
      ctx.fillStyle = filled ? args.color : COLORS.slot;
      ctx.fill();
      ctx.strokeStyle = filled ? args.color : COLORS.slotEdge;
      ctx.lineWidth = 1.25;
      ctx.stroke();
    }
  }

  private electionTracker(marks: number): void {
    const ctx = this.context;
    const radius = 6;
    const gap = 26;
    const startX = WIDTH / 2 - gap;
    const y = 152;
    for (let index = 0; index < 3; index++) {
      ctx.beginPath();
      ctx.arc(startX + index * gap, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = index < marks ? COLORS.gold : COLORS.slot;
      ctx.fill();
      ctx.strokeStyle = index < marks ? COLORS.gold : COLORS.slotEdge;
      ctx.lineWidth = 1.25;
      ctx.stroke();
    }
  }

  private piles(board: BoardState, labels: BoardLabels): void {
    const ctx = this.context;
    ctx.font = `500 11px ${FONT}`;
    ctx.textBaseline = 'middle';

    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.dim;
    ctx.fillText(`${labels.draw}: ${board.drawPile}`, 16, 196);

    ctx.textAlign = 'right';
    ctx.fillText(`${labels.discard}: ${board.discardPile}`, WIDTH - 16, 196);
  }

  private lastEnactedStrip(lastEnacted: BoardState['lastEnacted']): void {
    const ctx = this.context;
    const recent = lastEnacted.slice(-5);
    const tileWidth = 14;
    const tileHeight = 20;
    const gap = 6;
    const stripWidth = recent.length * tileWidth + (recent.length - 1) * gap;
    const startX = (WIDTH - stripWidth) / 2;
    const y = 186;

    recent.forEach((policy, index) => {
      const x = startX + index * (tileWidth + gap);
      this.roundedRect(x, y, tileWidth, tileHeight, 3);
      ctx.fillStyle = policy === 'liberal' ? COLORS.liberal : COLORS.fascist;
      ctx.fill();
    });
  }

  private roundedRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ): void {
    const ctx = this.context;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
  }
}
