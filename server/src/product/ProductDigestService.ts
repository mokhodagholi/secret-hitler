import type { RoomRepository } from '../rooms/RoomRepository';
import type { BaleRuntime } from '../bale/webhook';
import { escapeBaleMarkdown } from '../bale/commands';
import type { ProductStore } from './ProductStore';
import { PRODUCT_DIGEST } from './productDigest';
import {
  lastProductDigestAt,
  nextProductDigestAt,
  productDigestWindow,
  productScoreboardRange,
} from './scheduleProductDigest';
import {
  formatProductDigest,
  summarizeProductDigest,
  summarizeProductScoreboard,
} from './summarizeProductDigest';

export interface ProductDigestServiceOptions {
  product: ProductStore;
  repo: RoomRepository;
  bale?: BaleRuntime;
  telegram?: BaleRuntime;
  /** Override cadence (tests). Defaults to {@link PRODUCT_DIGEST.intervalMs}. */
  intervalMs?: number;
  /** Injectable clock (tests). */
  now?: () => Date;
  /** Injectable timer APIs (tests). */
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
}

/**
 * Posts a product digest to each configured support group on Iran-local
 * boundaries (every 6h for now; constant is the one place to move to 24h).
 * The same message includes the Iran-day fight scoreboard vs PRODUCT_GOALS.
 */
export class ProductDigestService {
  private readonly product: ProductStore;
  private readonly repo: RoomRepository;
  private readonly bale?: BaleRuntime;
  private readonly telegram?: BaleRuntime;
  private readonly intervalMs: number;
  private readonly now: () => Date;
  private readonly setTimeoutFn: typeof setTimeout;
  private readonly clearTimeoutFn: typeof clearTimeout;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  constructor(options: ProductDigestServiceOptions) {
    this.product = options.product;
    this.repo = options.repo;
    this.bale = options.bale;
    this.telegram = options.telegram;
    this.intervalMs = options.intervalMs ?? PRODUCT_DIGEST.intervalMs;
    this.now = options.now ?? (() => new Date());
    this.setTimeoutFn = options.setTimeoutFn ?? setTimeout;
    this.clearTimeoutFn = options.clearTimeoutFn ?? clearTimeout;
  }

  start(): void {
    if (this.disposed || !this.hasDesk()) return;
    this.arm();
  }

  dispose(): void {
    this.disposed = true;
    if (this.timer != null) {
      this.clearTimeoutFn(this.timer);
      this.timer = null;
    }
  }

  /** Run one digest for the window ending at `to` (tests / manual). */
  async postWindow(to: Date = this.now()): Promise<string | null> {
    if (!this.hasDesk()) return null;
    const now = this.now();
    const closedAt =
      to.getTime() > now.getTime() + PRODUCT_DIGEST.futureBoundarySlackMs
        ? lastProductDigestAt(now, this.intervalMs)
        : to;
    const { from, to: end } = productDigestWindow(closedAt, this.intervalMs);
    const scoreRange = productScoreboardRange(end);
    const totals = await this.product.summarizeDigestWindow(scoreRange.lookbackFrom, end);
    const snapshot = summarizeProductDigest({
      from,
      to: end,
      liveRooms: this.repo.listEntries().length,
      events: totals.events,
      lobbies: totals.lobbies,
      matches: totals.matches,
    });
    const scoreboard = summarizeProductScoreboard({
      range: scoreRange,
      events: totals.events,
      lobbies: totals.lobbies,
      matches: totals.matches,
      friendAccepts: totals.friendAccepts,
      tableInviteAccepts: totals.tableInviteAccepts,
    });
    const text = escapeBaleMarkdown(formatProductDigest(snapshot, scoreboard));
    await this.broadcast(text);
    return text;
  }

  private hasDesk(): boolean {
    return this.bale?.supportChatId != null || this.telegram?.supportChatId != null;
  }

  private arm(): void {
    if (this.disposed) return;
    const fireAt = nextProductDigestAt(this.now(), this.intervalMs);
    const delay = Math.max(1_000, fireAt.getTime() - this.now().getTime());
    this.timer = this.setTimeoutFn(() => {
      void this.tick(fireAt);
    }, delay);
  }

  private async tick(boundary: Date): Promise<void> {
    if (this.disposed) return;
    try {
      await this.postWindow(boundary);
    } catch (error) {
      console.error('Failed to post product digest', error);
    }
    this.arm();
  }

  private async broadcast(text: string): Promise<void> {
    const desks = [this.bale, this.telegram].filter(
      (runtime): runtime is BaleRuntime => runtime?.supportChatId != null,
    );
    await Promise.all(
      desks.map((runtime) =>
        runtime.bot
          .sendMessage({ chat_id: runtime.supportChatId!, text })
          .catch((error) => {
            console.error('Failed to post product digest to support chat', error);
          }),
      ),
    );
  }
}
