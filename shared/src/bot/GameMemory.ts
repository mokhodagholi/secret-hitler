// Tracks observable history across rounds so bot strategies
// can make informed decisions instead of acting blindly.

import type { Vote, Policy, ExecutivePower, Faction } from '../types/GameState';

export interface RoundRecord {
  round: number;
  presidentId: string;
  chancellorId: string | null;
  elected: boolean | null;
  votes: Map<string, Vote>;
  enacted: Policy | null;
  power: ExecutivePower | null;
}

export interface InvestigationRecord {
  investigatorId: string;
  targetId: string;
  /** Party the investigator claimed publicly (may be a lie). */
  claimedParty: Faction | null;
}

/**
 * Per-game observable history for a bot. The bot only stores what
 * it could legitimately see — no hidden information from other players.
 */
export class GameMemory {
  private readonly rounds: RoundRecord[] = [];
  private readonly investigations: InvestigationRecord[] = [];

  recordRound(record: RoundRecord): void {
    this.rounds.push(record);
  }

  recordInvestigation(record: InvestigationRecord): void {
    this.investigations.push(record);
  }

  /** Rounds where the government was elected. */
  electedRounds(): RoundRecord[] {
    return this.rounds.filter((r) => r.elected === true);
  }

  /**
   * How many fascist policies did this government (president + chancellor pair)
   * enact in the past?
   */
  fascistEnactedBy(presidentId: string, chancellorId: string): number {
    return this.electedRounds().filter(
      (r) =>
        r.presidentId === presidentId &&
        r.chancellorId === chancellorId &&
        r.enacted === 'fascist',
    ).length;
  }

  /**
   * Net suspicion score for a player: +1 for each fascist policy enacted in
   * governments they were part of, -1 for each liberal policy enacted.
   * Higher = more suspicious.
   */
  suspicionScore(playerId: string): number {
    let score = 0;
    for (const round of this.electedRounds()) {
      const inGov =
        round.presidentId === playerId || round.chancellorId === playerId;
      if (!inGov) continue;
      if (round.enacted === 'fascist') score += 1;
      else if (round.enacted === 'liberal') score -= 1;
    }
    return score;
  }

  /**
   * Vote alignment: how often did two players vote the same way?
   * 1.0 = always aligned, 0.0 = never aligned.
   */
  voteAlignment(playerA: string, playerB: string): number {
    const shared = this.rounds.filter(
      (r) => r.votes.has(playerA) && r.votes.has(playerB),
    );
    if (shared.length === 0) return 0.5; // neutral if no data
    const matching = shared.filter(
      (r) => r.votes.get(playerA) === r.votes.get(playerB),
    ).length;
    return matching / shared.length;
  }

  /** Players this bot has seen being investigated (as targets). */
  investigatedTargets(): string[] {
    return this.investigations.map((i) => i.targetId);
  }

  /** All rounds on record (oldest first). */
  allRounds(): RoundRecord[] {
    return [...this.rounds];
  }

  clear(): void {
    this.rounds.length = 0;
    this.investigations.length = 0;
  }
}
