import { Phase, type Policy, type Vote } from '@secret-hitler/shared';
import {
  deltaHeadline,
  fascistIndex,
  liberalIndex,
  playBot,
  type PlayLock,
  type ScriptedTable,
} from './scriptedTable';

const TEST =
  import.meta.env.MODE === 'test' || process.env.NODE_ENV === 'test';

/** Human-feeling delays; collapsed in tests. */
function delayMs(min: number, max: number): number {
  if (TEST) return 0;
  return min + Math.floor(Math.random() * (max - min + 1));
}

export interface DirectorHooks {
  onView: () => void;
  onLock: (lock: PlayLock) => void;
  onHeadline: (key: string) => void;
  onTalk: (playerId: string, key: string) => void;
  onDone: () => void;
}

/**
 * Drives bot seats. Player taps are validated by TutorialService against
 * {@link PlayLock}. Five plays the full small-table script. Six–ten only
 * teach the count delta, then auto toward a Liberal win.
 */
export class TutorialDirector {
  private timers: number[] = [];
  private stopped = false;
  private investigatesSeen = 0;
  private seenSpecialElection = false;
  private seenPeek = false;
  private seenExecute = false;
  /** When true, the director plays the viewer's seat too. */
  private handsOff: boolean;

  constructor(
    private readonly table: ScriptedTable,
    private readonly hooks: DirectorHooks,
  ) {
    this.handsOff = table.count !== 5;
  }

  start(): void {
    if (this.table.count === 5) {
      this.hooks.onHeadline('onboard.nightDone');
      this.hooks.onLock('night');
      return;
    }
    this.hooks.onHeadline(deltaHeadline(this.table.count));
    this.hooks.onLock('delta');
  }

  stop(): void {
    this.stopped = true;
    for (const timer of this.timers) window.clearTimeout(timer);
    this.timers = [];
  }

  /** Player finished a locked action — advance bots for that beat. */
  afterPlayer(lock: PlayLock): void {
    if (this.stopped || lock == null) return;
    if (lock === 'night') this.afterNight();
    else if (lock === 'delta') this.afterDelta();
    else if (lock === 'nominate') this.afterNominate();
    else if (lock === 'voteJa') this.afterVoteJa();
    else if (lock === 'burnFascist') this.afterBurn();
    else if (lock === 'voteNein') this.afterVoteNein();
    else if (lock === 'enactLiberal') this.afterEnact();
    else if (lock === 'peek') this.afterPeek();
    else if (lock === 'execute') this.afterExecute();
    else if (lock === 'investigate') this.afterInvestigate();
    else if (lock === 'specialElection') this.afterSpecialElection();
  }

  private afterNight(): void {
    this.hooks.onLock(null);
    this.endDiscussion();
    this.shufflePresident();
    this.hooks.onView();
    this.campaignThenNominate();
  }

  /** Live tables pick a random living president; tests keep seat 0 so the first teaching lock stays stable. */
  private shufflePresident(): void {
    if (this.table.count !== 5) return;
    const living = this.table.room.players.filter((player) => player.isAlive);
    if (living.length === 0) return;
    const index = TEST ? 0 : Math.floor(Math.random() * living.length);
    const pick = living[index];
    if (pick) this.table.room.presidentId = pick.id;
  }

  private campaignThenNominate(): void {
    const president = this.table.room.presidentId;
    const lines: Array<[string, string]> = [
      [this.table.nimaId, 'onboard.talk.pickMe'],
      [this.table.saraId, 'onboard.talk.meToo'],
      [this.table.rezaId, 'onboard.talk.meToo'],
    ].filter(([id]) => id !== president);

    const speak = (offset: number): void => {
      if (offset >= lines.length) {
        this.openFirstNomination();
        return;
      }
      const line = lines[offset];
      if (!line) {
        this.openFirstNomination();
        return;
      }
      this.hooks.onTalk(line[0], line[1]);
      this.schedule(() => speak(offset + 1), delayMs(1600, 2800));
    };

    if (president === this.table.youId) {
      this.hooks.onHeadline('onboard.pick');
      this.hooks.onLock('nominate');
      this.hooks.onView();
    } else {
      this.hooks.onHeadline('onboard.watch');
      this.hooks.onView();
    }
    this.schedule(() => speak(0), delayMs(800, 1400));
  }

  private openFirstNomination(): void {
    if (this.stopped) return;
    const president = this.table.room.presidentId;
    if (president === this.table.youId) return;
    if (!president) return;
    const target = this.chancellorFor(president);
    if (!target) return;
    playBot(this.table, president, {
      kind: 'nominateChancellor',
      targetId: target,
    });
    this.hooks.onView();
    this.afterNominate();
  }

  private afterDelta(): void {
    this.hooks.onLock(null);
    this.hooks.onView();
    if (this.table.count === 6) {
      this.hooks.onHeadline('onboard.termLimit');
      this.hooks.onLock('nominate');
      this.hooks.onView();
      return;
    }
    this.schedule(() => this.driveTowardWin(), delayMs(800, 1400));
  }

  private afterNominate(): void {
    this.table.strictFirstPick = false;
    this.hooks.onLock(null);
    this.hooks.onView();
    if (this.table.count !== 5) {
      this.castAllAlive('ja');
      this.hooks.onView();
      this.schedule(() => this.autoLegislate(), delayMs(1600, 2600));
      return;
    }
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
      const president = this.table.room.presidentId;
      if (
        president === this.table.youId &&
        this.table.room.phase === Phase.PresidentLegislative
      ) {
        this.hooks.onHeadline('onboard.draw');
        this.hooks.onLock('burnFascist');
        this.hooks.onView();
        return;
      }
      this.autoLegislate();
    }, delayMs(1800, 2800));
  }

  private afterBurn(): void {
    this.hooks.onLock(null);
    this.hooks.onView();
    this.schedule(() => {
      const hand = this.table.room.drawnPolicies;
      const liberal = liberalIndex(hand);
      if (liberal >= 0 && this.table.room.chancellorId) {
        playBot(this.table, this.table.room.chancellorId, {
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
    if (this.table.room.phase === Phase.Nomination) {
      this.endDiscussion();
      const president = this.table.room.presidentId;
      if (president === this.table.rezaId) {
        playBot(this.table, this.table.rezaId, {
          kind: 'nominateChancellor',
          targetId: this.table.omidId,
        });
        this.hooks.onHeadline('onboard.refuse');
        this.hooks.onLock('voteNein');
        this.hooks.onView();
        return;
      }
      if (president && president !== this.table.youId) {
        const target = this.chancellorFor(president);
        if (target) {
          playBot(this.table, president, {
            kind: 'nominateChancellor',
            targetId: target,
          });
          this.castAllAlive('ja');
          this.hooks.onView();
          this.schedule(() => this.finishBotLegislateThenRefuse(), delayMs(2000, 3200));
          return;
        }
      }
    }
    this.schedule(() => this.driveTowardWin(), delayMs(800, 1400));
  }

  private finishBotLegislateThenRefuse(): void {
    if (this.stopped) return;
    const room = this.table.room;
    if (room.phase === Phase.PresidentLegislative && room.presidentId) {
      const burn = fascistIndex(room.drawnPolicies);
      playBot(this.table, room.presidentId, {
        kind: 'discardPolicy',
        index: burn >= 0 ? burn : 0,
      });
    }
    this.schedule(() => {
      if (room.phase === Phase.ChancellorLegislative && room.chancellorId) {
        const enact = liberalIndex(room.drawnPolicies);
        playBot(this.table, room.chancellorId, {
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
      if (this.table.room.phase === Phase.Nomination) {
        this.endDiscussion();
      }
      this.hooks.onHeadline('onboard.chancellor');
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
    this.seenPeek = true;
    this.hooks.onLock(null);
    if (this.table.room.activePower === 'policyPeek') {
      playBot(this.table, this.table.youId, { kind: 'useSpecialPower', targetId: '' });
    }
    this.hooks.onView();
    this.schedule(() => this.driveTowardWin(), delayMs(1200, 2000));
  }

  private afterExecute(): void {
    this.seenExecute = true;
    this.handsOff = true;
    this.hooks.onLock(null);
    this.hooks.onView();
    this.schedule(() => this.driveTowardWin(), delayMs(1200, 2000));
  }

  private afterInvestigate(): void {
    this.hooks.onLock(null);
    if (this.table.room.investigation) {
      const president = this.table.room.presidentId;
      if (president) {
        playBot(this.table, president, { kind: 'useSpecialPower', targetId: '' });
      }
    }
    this.investigatesSeen += 1;
    this.hooks.onView();
    this.schedule(() => this.driveTowardWin(), delayMs(1200, 2000));
  }

  private afterSpecialElection(): void {
    this.seenSpecialElection = true;
    this.hooks.onLock(null);
    this.hooks.onView();
    this.schedule(() => this.driveTowardWin(), delayMs(1200, 2000));
  }

  private driveTowardWin(): void {
    if (this.stopped) return;
    if (this.table.room.winner) {
      this.hooks.onHeadline(
        this.table.count === 10 ? 'onboard.win' : 'onboard.winNext',
      );
      this.hooks.onDone();
      return;
    }
    if (this.takePowerIfNeeded()) return;

    if (this.table.room.phase === Phase.Nomination) {
      this.endDiscussion();
      const president = this.table.room.presidentId;
      if (president === this.table.youId && !this.handsOff) {
        this.hooks.onLock('nominate');
        this.hooks.onHeadline('onboard.pick');
        this.hooks.onView();
        return;
      }
      if (president) {
        const target = this.chancellorFor(president);
        if (target) {
          playBot(this.table, president, {
            kind: 'nominateChancellor',
            targetId: target,
          });
          this.castAllAlive('ja');
          this.hooks.onView();
          this.schedule(() => this.autoLegislate(), delayMs(1600, 2600));
          return;
        }
      }
    }
    if (
      !this.handsOff &&
      this.table.room.phase === Phase.ChancellorLegislative &&
      this.table.room.chancellorId === this.table.youId
    ) {
      this.hooks.onLock('enactLiberal');
      this.hooks.onHeadline('onboard.chancellor');
      this.hooks.onView();
      return;
    }
    if (
      !this.handsOff &&
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

  private takePowerIfNeeded(): boolean {
    const room = this.table.room;
    const president = room.presidentId;
    if (room.activePower === 'policyPeek') {
      this.hooks.onHeadline('onboard.peek');
      this.hooks.onView();
      if (president === this.table.youId) {
        this.hooks.onLock('peek');
        return true;
      }
      if (president) {
        this.schedule(() => {
          playBot(this.table, president, { kind: 'useSpecialPower', targetId: '' });
          this.seenPeek = true;
          this.hooks.onView();
          this.schedule(() => this.driveTowardWin(), delayMs(800, 1400));
        }, delayMs(1600, 2400));
        return true;
      }
    }
    if (room.activePower === 'execution') {
      this.hooks.onHeadline('onboard.execute');
      this.hooks.onView();
      if (president === this.table.youId) {
        this.hooks.onLock('execute');
        return true;
      }
      if (president) {
        const target = this.executeTarget(president);
        this.schedule(() => {
          if (target) {
            playBot(this.table, president, {
              kind: 'useSpecialPower',
              targetId: target,
            });
          }
          this.seenExecute = true;
          this.hooks.onView();
          this.schedule(() => this.driveTowardWin(), delayMs(800, 1400));
        }, delayMs(1600, 2400));
        return true;
      }
    }
    if (room.activePower === 'investigate' && !room.investigation) {
      this.hooks.onHeadline('onboard.investigate');
      this.hooks.onView();
      if (president === this.table.youId) {
        this.hooks.onLock('investigate');
        return true;
      }
      if (president) {
        const target = this.investigateTarget(president);
        this.schedule(() => {
          if (target) {
            playBot(this.table, president, {
              kind: 'useSpecialPower',
              targetId: target,
            });
            playBot(this.table, president, { kind: 'useSpecialPower', targetId: '' });
          }
          this.investigatesSeen += 1;
          this.hooks.onView();
          this.schedule(() => this.driveTowardWin(), delayMs(800, 1400));
        }, delayMs(1600, 2400));
        return true;
      }
    }
    if (room.activePower === 'investigate' && room.investigation) {
      if (president) {
        playBot(this.table, president, { kind: 'useSpecialPower', targetId: '' });
        this.hooks.onView();
      }
      return false;
    }
    if (room.activePower === 'specialElection') {
      this.hooks.onHeadline('onboard.specialElection');
      this.hooks.onView();
      if (president === this.table.youId) {
        this.hooks.onLock('specialElection');
        return true;
      }
      if (president) {
        const target = this.chancellorFor(president) ?? this.table.nimaId;
        this.schedule(() => {
          playBot(this.table, president, {
            kind: 'useSpecialPower',
            targetId: target,
          });
          this.seenSpecialElection = true;
          this.hooks.onView();
          this.schedule(() => this.driveTowardWin(), delayMs(800, 1400));
        }, delayMs(1600, 2400));
        return true;
      }
    }
    return false;
  }

  private autoLegislate(): void {
    if (this.stopped) return;
    const room = this.table.room;
    const prefer: Policy = this.preferFascist() ? 'fascist' : 'liberal';
    if (room.phase === Phase.PresidentLegislative && room.presidentId) {
      const burn = this.discardIndex(room.drawnPolicies, prefer);
      playBot(this.table, room.presidentId, {
        kind: 'discardPolicy',
        index: burn,
      });
      this.hooks.onView();
    }
    this.schedule(() => {
      if (room.phase === Phase.ChancellorLegislative && room.chancellorId) {
        if (!this.handsOff && room.chancellorId === this.table.youId) {
          this.hooks.onLock('enactLiberal');
          this.hooks.onHeadline('onboard.chancellor');
          this.hooks.onView();
          return;
        }
        const enact = this.enactIndex(room.drawnPolicies, prefer);
        playBot(this.table, room.chancellorId, {
          kind: 'enactPolicy',
          index: enact,
        });
        this.hooks.onView();
      }
      this.schedule(() => this.driveTowardWin(), delayMs(1500, 2500));
    }, delayMs(1400, 2200));
  }

  private preferFascist(): boolean {
    const count = this.table.count;
    const fascists = this.table.room.fascistPolicies;
    if (count === 5) return fascists < 4 && (!this.seenPeek || !this.seenExecute);
    if (count === 7) return this.investigatesSeen < 1 || !this.seenSpecialElection;
    if (count === 9) return this.investigatesSeen < 2;
    return false;
  }

  private discardIndex(hand: Policy[], preferEnact: Policy): number {
    const burn = preferEnact === 'fascist' ? liberalIndex(hand) : fascistIndex(hand);
    return burn >= 0 ? burn : 0;
  }

  private enactIndex(hand: Policy[], prefer: Policy): number {
    const index = prefer === 'fascist' ? fascistIndex(hand) : liberalIndex(hand);
    return index >= 0 ? index : 0;
  }

  private chancellorFor(presidentId: string): string | null {
    const ineligible = this.table.room.ineligibleChancellorIds();
    const order = this.table.seatIds.filter((id) => id !== presidentId);
    for (const id of order) {
      const player = this.table.room.findPlayer(id);
      if (!player?.isAlive) continue;
      if (ineligible.includes(id)) continue;
      return id;
    }
    return null;
  }

  private executeTarget(presidentId: string): string | null {
    if (this.table.rezaId !== presidentId) {
      const reza = this.table.room.findPlayer(this.table.rezaId);
      if (reza?.isAlive) return this.table.rezaId;
    }
    return this.chancellorFor(presidentId);
  }

  private investigateTarget(presidentId: string): string | null {
    const investigated = this.table.room.investigatedIds;
    if (
      this.table.rezaId !== presidentId &&
      !investigated.includes(this.table.rezaId)
    ) {
      return this.table.rezaId;
    }
    const order = this.table.seatIds.filter(
      (id) => id !== presidentId && !investigated.includes(id),
    );
    return order[0] ?? null;
  }

  private endDiscussion(): void {
    if (this.table.room.discussionEndsAt > 0 && this.table.room.presidentId) {
      playBot(this.table, this.table.room.presidentId, { kind: 'endTurn' });
    }
  }

  private castBotVotes(votes: Record<string, Vote>): void {
    for (const [playerId, vote] of Object.entries(votes)) {
      playBot(this.table, playerId, { kind: 'castVote', vote });
    }
    this.hooks.onView();
  }

  private castAllAlive(vote: Vote): void {
    for (const player of this.table.room.players) {
      if (!player.isAlive || !player.connected) continue;
      playBot(this.table, player.id, { kind: 'castVote', vote });
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
