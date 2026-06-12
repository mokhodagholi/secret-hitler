import type { BoardState } from '@secret-hitler/shared';

export interface BoardLabels {
  liberal: string;
  fascist: string;
  draw: string;
  discard: string;
  currentTrack: string;
}

// Logical drawing size — the canvas is scaled to the device pixel ratio.
const WIDTH = 380;
const HEIGHT = 290;

// Palette mirrors styles/_vars.scss plus the table-top panel tones.
const COLORS = {
  liberal: '#4f8fd0',
  liberalPanel: 'rgba(38, 80, 128, 0.85)',
  liberalSlot: 'rgba(16, 41, 65, 0.8)',
  fascist: '#c4452c',
  fascistPanel: 'rgba(116, 38, 26, 0.85)',
  fascistSlot: 'rgba(58, 18, 12, 0.8)',
  drawBack: '#2b5e8e',
  discardBack: '#8a2f23',
  cardEdge: 'rgba(255, 255, 255, 0.35)',
  gold: '#f0c14b',
  text: '#f3e7c9',
  dim: '#cfe2f5',
  trackerOff: 'rgba(16, 41, 65, 0.8)',
} as const;

const FONT = '"Yekan Bakh", "Oswald", sans-serif';

/**
 * Canvas 2D renderer for the table-top policy board: draw/discard piles,
 * the liberal (5-slot) and fascist (6-slot) track panels, the election
 * tracker and the CURRENT TRACK counters. Pure draw-on-demand — the screen
 * calls {@link render} whenever state changes, batched inside a single
 * requestAnimationFrame.
 */
export class BoardRenderer {
  private readonly context: CanvasRenderingContext2D;
  private frameHandle: number | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = WIDTH * dpr;
    canvas.height = HEIGHT * dpr;
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

    this.pile(WIDTH / 2 - 52, board.drawPile, labels.draw, COLORS.drawBack);
    this.pile(WIDTH / 2 + 14, board.discardPile, labels.discard, COLORS.discardBack);

    this.trackPanel({
      y: 86,
      slots: 5,
      filled: board.liberalPolicies,
      label: labels.liberal,
      panel: COLORS.liberalPanel,
      slot: COLORS.liberalSlot,
      fill: COLORS.liberal,
    });
    this.trackPanel({
      y: 158,
      slots: 6,
      filled: board.fascistPolicies,
      label: labels.fascist,
      panel: COLORS.fascistPanel,
      slot: COLORS.fascistSlot,
      fill: COLORS.fascist,
    });

    this.electionTracker(board.electionTracker);
    this.currentTrack(board, labels);
  }

  /** One face-down card pile with its count inside and label underneath. */
  private pile(x: number, count: number, label: string, back: string): void {
    const ctx = this.context;
    const cardWidth = 38;
    const cardHeight = 50;
    const y = 6;

    this.roundedRect(x, y, cardWidth, cardHeight, 5);
    ctx.fillStyle = back;
    ctx.fill();
    ctx.strokeStyle = COLORS.cardEdge;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = `700 16px ${FONT}`;
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(count), x + cardWidth / 2, y + cardHeight / 2);

    ctx.font = `600 9px ${FONT}`;
    ctx.fillStyle = COLORS.dim;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(label.toUpperCase(), x + cardWidth / 2, y + cardHeight + 14);
  }

  /** A colored track panel with its name and a row of policy slots. */
  private trackPanel(args: {
    y: number;
    slots: number;
    filled: number;
    label: string;
    panel: string;
    slot: string;
    fill: string;
  }): void {
    const ctx = this.context;
    const panelX = 16;
    const panelWidth = WIDTH - panelX * 2;
    const panelHeight = 62;

    this.roundedRect(panelX, args.y, panelWidth, panelHeight, 8);
    ctx.fillStyle = args.panel;
    ctx.fill();
    ctx.strokeStyle = COLORS.cardEdge;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = `600 10px ${FONT}`;
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(args.label.toUpperCase(), WIDTH / 2, args.y + 14);

    const slotHeight = 34;
    const slotWidth = args.slots === 5 ? 56 : 48;
    const gap = 8;
    const rowWidth = args.slots * slotWidth + (args.slots - 1) * gap;
    const startX = (WIDTH - rowWidth) / 2;
    const slotY = args.y + 20;

    for (let index = 0; index < args.slots; index++) {
      const x = startX + index * (slotWidth + gap);
      const filled = index < args.filled;
      this.roundedRect(x, slotY, slotWidth, slotHeight, 4);
      ctx.fillStyle = filled ? args.fill : args.slot;
      ctx.fill();
      ctx.strokeStyle = filled ? COLORS.cardEdge : 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  private electionTracker(marks: number): void {
    const ctx = this.context;
    const radius = 5;
    const gap = 22;
    const startX = WIDTH / 2 - gap;
    const y = 234;
    for (let index = 0; index < 3; index++) {
      ctx.beginPath();
      ctx.arc(startX + index * gap, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = index < marks ? COLORS.gold : COLORS.trackerOff;
      ctx.fill();
      ctx.strokeStyle = index < marks ? COLORS.gold : COLORS.cardEdge;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  /** "CURRENT TRACK" caption + the two policy counters as colored chips. */
  private currentTrack(board: BoardState, labels: BoardLabels): void {
    const ctx = this.context;
    ctx.font = `600 9px ${FONT}`;
    ctx.fillStyle = COLORS.dim;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(labels.currentTrack.toUpperCase(), WIDTH / 2, 256);

    const chipHeight = 22;
    const chipWidth = 104;
    const gap = 12;
    const y = 262;
    this.chip(
      WIDTH / 2 - chipWidth - gap / 2,
      y,
      chipWidth,
      chipHeight,
      `${labels.liberal.toUpperCase()}  ${board.liberalPolicies}`,
      COLORS.liberal,
    );
    this.chip(
      WIDTH / 2 + gap / 2,
      y,
      chipWidth,
      chipHeight,
      `${labels.fascist.toUpperCase()}  ${board.fascistPolicies}`,
      COLORS.fascist,
    );
  }

  private chip(
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    color: string,
  ): void {
    const ctx = this.context;
    this.roundedRect(x, y, width, height, height / 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.font = `700 10px ${FONT}`;
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width / 2, y + height / 2 + 0.5);
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
