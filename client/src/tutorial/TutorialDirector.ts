import { Phase, type Vote } from '@secret-hitler/shared';
import {
  fascistIndex,
  fiveBot,
  liberalIndex,
  type FiveLock,
  type FiveTable,
} from './fiveTable';

const TEST =
  import.meta.env.MODE === 'test' || process.env.NODE_ENV === 'test';

/** Human-feeling delays; collapsed in tests. */
function delayMs(min: number, max: number): number {
  if (TEST) return 0;
  return min + Math.floor(Math.random() * (max - min + 1));
}

export interface DirectorHooks {
  onView: () => void;
  onLock: (lock: FiveLock) => void;
  onHeadline: (key: string) => void;
  onDone: () => void;
}

/**
 * Drives bot seats through the five-player teaching script. Player actions
 * are validated by TutorialService against {@link FiveLock}; this only moves
 * the scripted seats after the player unlocks each beat.
 */
export class TutorialDirector {
  private timers: number[] = [];
  private stopped = false;

  constructor(
    private readonly table: FiveTable,
    private readonly hooks: DirectorHooks,
  ) {}

  start(): void {
    this.hooks.onHeadline('onboard.pick');
    this.hooks.onLock('nominate');
  }

  stop(): void {
    this.stopped = true;
    for (const timer of this.timers) window.clearTimeout(timer);
    this.timers = [];
  }

  /** Player finished a locked action — advance bots for that beat. */
  afterPlayer(lock: FiveLock): void {
    if (this.stopped || lock == null) return;
    if (lock === 'nominate') this.afterNominate();
    else if (lock === 'voteJa') this.afterVoteJa();
    else if (lock === 'burnFascist') this.afterBurn();
    else if (lock === 'voteNein') this.afterVoteNein();
    else if (lock === 'enactLiberal') this.afterEnact();
    else if (lock === 'peek') this.afterPeek();
    else if (lock === 'execute') this.afterExecute();
  }

  private afterNominate(): void {
    this.hooks.onLock(null);
    this.hooks.onView();
    this.hooks.onHeadline('onboard.vote');
    this.schedule(() => {
      this.hooks.onLock('voteJa');
      this.hooks.onView();
    }, delayMs(400, 700));
  }

  private afterVoteJa(): void {
    this.hooks.onLock(null);
    this.castBotVotes({
      [this.table.nimaId]: 'ja',
      [this.table.saraId]: 'ja',
      [this.table.rezaId]: 'nein',
      [this.table.omidId]: 'ja',
    });
    this.hooks.onHeadline('onboard.votesRead');
    this.hooks.onView();
    this.schedule(() => {
      this.hooks.onHeadline('onboard.draw');
      this.hooks.onLock('burnFascist');
      this.hooks.onView();
    }, delayMs(1800, 2800));
  }

  private afterBurn(): void {
    this.hooks.onLock(null);
    this.hooks.onView();
    // Nima (chancellor) enacts the liberal.
    this.schedule(() => {
      const hand = this.table.room.drawnPolicies;
      const liberal = liberalIndex(hand);
      if (liberal >= 0) {
        fiveBot(this.table, this.table.nimaId, {
          kind: 'enactPolicy',
          index: liberal,
        });
      }
      this.hooks.onHeadline('onboard.watch');
      this.hooks.onView();
      this.schedule(() => this.runBotGovernmentThenRefuse(), delayMs(2200, 3600));
    }, delayMs(1600, 2600));
  }

  private runBotGovernmentThenRefuse(): void {
    if (this.stopped) return;
    // Advance presidency if needed — after liberal law, nomination reopens.
    if (this.table.room.phase === Phase.Nomination) {
      if (this.table.room.discussionEndsAt > 0) {
        const president = this.table.room.presidentId;
        if (president) fiveBot(this.table, president, { kind: 'endTurn' });
      }
      const president = this.table.room.presidentId;
      // Prefer Reza nominating Omid for the refuse lesson.
      if (president === this.table.rezaId) {
        fiveBot(this.table, this.table.rezaId, {
          kind: 'nominateChancellor',
          targetId: this.table.omidId,
        });
        this.hooks.onHeadline('onboard.refuse');
        this.hooks.onLock('voteNein');
        this.hooks.onView();
        return;
      }
      // If someone else is president, nominate Reza → then we'll fail later.
      if (president && president !== this.table.youId) {
        fiveBot(this.table, president, {
          kind: 'nominateChancellor',
          targetId: this.table.rezaId,
        });
        this.castAllAlive('ja');
        this.hooks.onView();
        this.schedule(() => this.finishBotLegislateThenRefuse(), delayMs(2000, 3200));
        return;
      }
    }
    this.hooks.onDone();
  }

  private finishBotLegislateThenRefuse(): void {
    if (this.stopped) return;
    const room = this.table.room;
    if (room.phase === Phase.PresidentLegislative && room.presidentId) {
      const burn = fascistIndex(room.drawnPolicies);
      fiveBot(this.table, room.presidentId, {
        kind: 'discardPolicy',
        index: burn >= 0 ? burn : 0,
      });
    }
    this.schedule(() => {
      if (room.phase === Phase.ChancellorLegislative && room.chancellorId) {
        const enact = liberalIndex(room.drawnPolicies);
        fiveBot(this.table, room.chancellorId, {
          kind: 'enactPolicy',
          index: enact >= 0 ? enact : 0,
        });
      }
      this.hooks.onView();
      this.schedule(() => this.runBotGovernmentThenRefuse(), delayMs(2000, 3200));
    }, delayMs(1600, 2400));
  }

  private afterVoteNein(): void {
    this.hooks.onLock(null);
    this.castBotVotes({
      [this.table.nimaId]: 'nein',
      [this.table.saraId]: 'nein',
      [this.table.rezaId]: 'ja',
      [this.table.omidId]: 'ja',
    });
    this.hooks.onHeadline('onboard.tracker');
    this.hooks.onView();
    this.schedule(() => {
      // Open nomination again; if player is chancellor path, wait for enact.
      if (this.table.room.phase === Phase.Nomination) {
        if (this.table.room.discussionEndsAt > 0 && this.table.room.presidentId) {
          fiveBot(this.table, this.table.room.presidentId, { kind: 'endTurn' });
        }
      }
      this.hooks.onHeadline('onboard.chancellor');
      // If you are chancellor with a hand, lock enact; else nominate again.
      if (
        this.table.room.phase === Phase.ChancellorLegislative &&
        this.table.room.chancellorId === this.table.youId
      ) {
        this.hooks.onLock('enactLiberal');
      } else if (this.table.room.presidentId === this.table.youId) {
        this.hooks.onLock('nominate');
        this.hooks.onHeadline('onboard.pick');
      } else {
        this.schedule(() => this.driveTowardWin(), delayMs(1500, 2500));
      }
      this.hooks.onView();
    }, delayMs(1800, 2800));
  }

  private afterEnact(): void {
    this.hooks.onLock(null);
    this.hooks.onView();
    this.schedule(() => this.driveTowardWin(), delayMs(1500, 2500));
  }

  private afterPeek(): void {
    this.hooks.onLock(null);
    if (this.table.room.activePower === 'policyPeek') {
      fiveBot(this.table, this.table.youId, { kind: 'useSpecialPower', targetId: '' });
    }
    this.hooks.onView();
    this.schedule(() => this.driveTowardWin(), delayMs(1200, 2000));
  }

  private afterExecute(): void {
    this.hooks.onLock(null);
    this.hooks.onView();
    this.schedule(() => this.driveTowardWin(), delayMs(1200, 2000));
  }

  private driveTowardWin(): void {
    if (this.stopped) return;
    if (this.table.room.winner) {
      this.hooks.onHeadline('onboard.win');
      this.hooks.onDone();
      return;
    }
    if (this.table.room.activePower === 'policyPeek') {
      this.hooks.onHeadline('onboard.peek');
      this.hooks.onLock('peek');
      this.hooks.onView();
      return;
    }
    if (this.table.room.activePower === 'execution') {
      this.hooks.onHeadline('onboard.execute');
      this.hooks.onLock('execute');
      this.hooks.onView();
      return;
    }
    // Auto-play remaining bot turns toward a Liberal board fill.
    if (this.table.room.phase === Phase.Nomination) {
      if (this.table.room.discussionEndsAt > 0 && this.table.room.presidentId) {
        fiveBot(this.table, this.table.room.presidentId, { kind: 'endTurn' });
      }
      const president = this.table.room.presidentId;
      if (president === this.table.youId) {
        this.hooks.onLock('nominate');
        this.hooks.onHeadline('onboard.pick');
        this.hooks.onView();
        return;
      }
      if (president) {
        const target =
          president === this.table.nimaId ? this.table.saraId : this.table.nimaId;
        fiveBot(this.table, president, {
          kind: 'nominateChancellor',
          targetId: target,
        });
        this.castAllAlive('ja');
        this.hooks.onView();
        this.schedule(() => this.autoLegislate(), delayMs(1600, 2600));
        return;
      }
    }
    if (
      this.table.room.phase === Phase.ChancellorLegislative &&
      this.table.room.chancellorId === this.table.youId
    ) {
      this.hooks.onLock('enactLiberal');
      this.hooks.onHeadline('onboard.chancellor');
      this.hooks.onView();
      return;
    }
    if (
      this.table.room.phase === Phase.PresidentLegislative &&
      this.table.room.presidentId === this.table.youId
    ) {
      this.hooks.onLock('burnFascist');
      this.hooks.onHeadline('onboard.draw');
      this.hooks.onView();
      return;
    }
    this.schedule(() => this.autoLegislate(), delayMs(800, 1400));
  }

  private autoLegislate(): void {
    if (this.stopped) return;
    const room = this.table.room;
    if (room.phase === Phase.PresidentLegislative && room.presidentId) {
      const burn = fascistIndex(room.drawnPolicies);
      fiveBot(this.table, room.presidentId, {
        kind: 'discardPolicy',
        index: burn >= 0 ? burn : 0,
      });
      this.hooks.onView();
    }
    this.schedule(() => {
      if (room.phase === Phase.ChancellorLegislative && room.chancellorId) {
        if (room.chancellorId === this.table.youId) {
          this.hooks.onLock('enactLiberal');
          this.hooks.onHeadline('onboard.chancellor');
          this.hooks.onView();
          return;
        }
        const enact = liberalIndex(room.drawnPolicies);
        fiveBot(this.table, room.chancellorId, {
          kind: 'enactPolicy',
          index: enact >= 0 ? enact : 0,
        });
        this.hooks.onView();
      }
      this.schedule(() => this.driveTowardWin(), delayMs(1500, 2500));
    }, delayMs(1400, 2200));
  }

  private castBotVotes(votes: Record<string, Vote>): void {
    for (const [playerId, vote] of Object.entries(votes)) {
      fiveBot(this.table, playerId, { kind: 'castVote', vote });
    }
    this.hooks.onView();
  }

  private castAllAlive(vote: Vote): void {
    for (const player of this.table.room.players) {
      if (!player.isAlive || !player.connected) continue;
      fiveBot(this.table, player.id, { kind: 'castVote', vote });
    }
    this.hooks.onView();
  }

  private schedule(work: () => void, wait: number): void {
    const timer = window.setTimeout(() => {
      if (this.stopped) return;
      work();
    }, wait);
    this.timers.push(timer);
  }
}
