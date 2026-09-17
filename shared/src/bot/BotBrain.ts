// Bot decision engine. Receives a per-viewer GameStateView (the same
// snapshot the client receives) and emits the next GameCommand for the bot's
// turn. Strategy is role-aware: liberals play defensively, fascists coordinate,
// Hitler plays cautiously until the endgame.

import type {
  GameStateView,
  PublicPlayer,
  Role,
  Policy,
  Faction,
} from '../types/GameState';
import { Phase } from '../types/GameState';
import type { GameCommand } from '../types/events';
import type { GameMemory } from './GameMemory';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ---------------------------------------------------------------------------
// Role strategies
// ---------------------------------------------------------------------------

interface StrategyContext {
  view: GameStateView;
  memory: GameMemory;
  botId: string;
  role: Role;
  /** IDs of players the bot knows are fascist (from role assignment). */
  knownFascistIds: ReadonlySet<string>;
}

function livingPlayers(view: GameStateView): PublicPlayer[] {
  return view.players.filter((p) => p.isAlive);
}

function eligibleChancellors(
  view: GameStateView,
  presidentId: string,
): PublicPlayer[] {
  return livingPlayers(view).filter(
    (p) =>
      p.id !== presidentId &&
      p.connected &&
      !view.ineligibleChancellors.includes(p.id),
  );
}

// --- Nomination -----------------------------------------------------------

function nominateAsLiberal(ctx: StrategyContext): GameCommand {
  const { view, memory } = ctx;
  const candidates = eligibleChancellors(view, ctx.botId);
  if (candidates.length === 0) {
    // Fallback: pick any eligible seat
    const any = livingPlayers(view).find(
      (p) => p.id !== ctx.botId && !view.ineligibleChancellors.includes(p.id),
    );
    return { kind: 'nominateChancellor', targetId: any!.id };
  }

  // Prefer the candidate with the lowest suspicion score
  const sorted = [...candidates].sort(
    (a, b) => memory.suspicionScore(a.id) - memory.suspicionScore(b.id),
  );
  return { kind: 'nominateChancellor', targetId: sorted[0].id };
}

function nominateAsFascist(ctx: StrategyContext): GameCommand {
  const { view, knownFascistIds } = ctx;
  const candidates = eligibleChancellors(view, ctx.botId);

  // Prefer a known fascist partner if available and unlikely to raise suspicion
  const fascistPartner = candidates.find((p) => knownFascistIds.has(p.id));
  if (fascistPartner) {
    return { kind: 'nominateChancellor', targetId: fascistPartner.id };
  }

  // Otherwise pick a random eligible candidate
  return { kind: 'nominateChancellor', targetId: pickRandom(candidates).id };
}

function nominateAsHitler(ctx: StrategyContext): GameCommand {
  // Hitler doesn't know fascist partners (by game rules — only knows them in
  // 5-6 player games). Play defensively: nominate a low-suspicion liberal-seeming player.
  return nominateAsLiberal(ctx);
}

// --- Voting ---------------------------------------------------------------

function voteAsLiberal(ctx: StrategyContext): GameCommand {
  const { view, memory, botId } = ctx;
  const presidentId = view.board.president;
  const chancellorId = view.board.chancellor;
  if (!presidentId || !chancellorId) return { kind: 'castVote', vote: 'ja' };

  // Reject governments that previously enacted fascist policies together
  const fascistTogether = memory.fascistEnactedBy(presidentId, chancellorId);
  if (fascistTogether > 0) return { kind: 'castVote', vote: 'nein' };

  // Reject governments where both members have high suspicion
  const presScore = memory.suspicionScore(presidentId);
  const chanScore = memory.suspicionScore(chancellorId);
  if (presScore + chanScore >= 2) return { kind: 'castVote', vote: 'nein' };

  // Small chance of random dissent to be unpredictable
  if (Math.random() < 0.08) return { kind: 'castVote', vote: 'nein' };

  return { kind: 'castVote', vote: 'ja' };
}

function voteAsFascist(ctx: StrategyContext): GameCommand {
  const { view, knownFascistIds } = ctx;
  const presidentId = view.board.president;
  const chancellorId = view.board.chancellor;

  // Vote Ja if at least one government member is a known fascist
  if (
    (presidentId && knownFascistIds.has(presidentId)) ||
    (chancellorId && knownFascistIds.has(chancellorId))
  ) {
    return { kind: 'castVote', vote: 'ja' };
  }

  // Otherwise mirror liberal logic to avoid standing out
  return voteAsLiberal({ ...ctx, role: 'liberal' });
}

// --- Legislative (President) -----------------------------------------------

function discardAsLiberal(policies: Policy[]): GameCommand {
  // Discard a fascist policy if possible
  const fascistIdx = policies.findIndex((p) => p === 'fascist');
  if (fascistIdx !== -1) return { kind: 'discardPolicy', index: fascistIdx };
  // All liberal — discard first (doesn't matter)
  return { kind: 'discardPolicy', index: 0 };
}

function discardAsFascist(policies: Policy[]): GameCommand {
  // Discard a liberal policy if possible
  const liberalIdx = policies.findIndex((p) => p === 'liberal');
  if (liberalIdx !== -1) return { kind: 'discardPolicy', index: liberalIdx };
  // All fascist — discard first
  return { kind: 'discardPolicy', index: 0 };
}

// --- Legislative (Chancellor) ----------------------------------------------

function enactAsLiberal(
  policies: Policy[],
  view: GameStateView,
): GameCommand {
  const liberalIdx = policies.findIndex((p) => p === 'liberal');
  if (liberalIdx !== -1) return { kind: 'enactPolicy', index: liberalIdx };

  // All fascist — consider veto if available
  if (view.vetoUnlocked) return { kind: 'vetoRequest' };

  // Must enact fascist (no choice)
  return { kind: 'enactPolicy', index: 0 };
}

function enactAsFascist(policies: Policy[]): GameCommand {
  const fascistIdx = policies.findIndex((p) => p === 'fascist');
  if (fascistIdx !== -1) return { kind: 'enactPolicy', index: fascistIdx };
  return { kind: 'enactPolicy', index: 0 };
}

// --- Special powers --------------------------------------------------------

function useSpecialPowerAsLiberal(
  ctx: StrategyContext,
): GameCommand | null {
  const { view, memory } = ctx;
  const power = view.activePower;
  const alive = livingPlayers(view).filter((p) => p.id !== ctx.botId);

  if (power === 'policyPeek') {
    // Just acknowledge — no target needed
    return { kind: 'useSpecialPower', targetId: '' };
  }

  if (power === 'investigate') {
    // Investigate the most suspicious player not yet investigated
    const alreadyInvestigated = memory.investigatedTargets();
    const candidates = alive.filter(
      (p) => !alreadyInvestigated.includes(p.id),
    );
    if (candidates.length === 0) return null;
    const sorted = [...candidates].sort(
      (a, b) => memory.suspicionScore(b.id) - memory.suspicionScore(a.id),
    );
    return { kind: 'useSpecialPower', targetId: sorted[0].id };
  }

  if (power === 'execution') {
    // Execute the most suspicious player
    const sorted = [...alive].sort(
      (a, b) => memory.suspicionScore(b.id) - memory.suspicionScore(a.id),
    );
    return { kind: 'useSpecialPower', targetId: sorted[0].id };
  }

  if (power === 'specialElection') {
    // Nominate the least suspicious player (someone trustworthy)
    const sorted = [...alive].sort(
      (a, b) => memory.suspicionScore(a.id) - memory.suspicionScore(b.id),
    );
    return { kind: 'useSpecialPower', targetId: sorted[0].id };
  }

  return null;
}

function useSpecialPowerAsFascist(
  ctx: StrategyContext,
): GameCommand | null {
  const { view, knownFascistIds } = ctx;
  const power = view.activePower;
  const alive = livingPlayers(view).filter(
    (p) => p.id !== ctx.botId && !knownFascistIds.has(p.id),
  );

  if (power === 'policyPeek') {
    return { kind: 'useSpecialPower', targetId: '' };
  }

  if (power === 'investigate') {
    // Investigate a liberal (then can claim they're fascist)
    if (alive.length === 0) return null;
    return { kind: 'useSpecialPower', targetId: pickRandom(alive).id };
  }

  if (power === 'execution') {
    // Execute a liberal or the most dangerous liberal-seeming player
    if (alive.length === 0) return null;
    const sorted = [...alive].sort(
      (a, b) => ctx.memory.suspicionScore(a.id) - ctx.memory.suspicionScore(b.id),
    );
    return { kind: 'useSpecialPower', targetId: sorted[0].id };
  }

  if (power === 'specialElection') {
    // Nominate Hitler if safe (enough fascist laws) or another fascist
    const hitlerPlayer = view.players.find((p) => {
      // We can only guess — just pick a fellow fascist
      return p.isAlive && p.id !== ctx.botId && knownFascistIds.has(p.id);
    });
    if (hitlerPlayer) {
      return { kind: 'useSpecialPower', targetId: hitlerPlayer.id };
    }
    if (alive.length === 0) return null;
    return { kind: 'useSpecialPower', targetId: pickRandom(alive).id };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main BotBrain class
// ---------------------------------------------------------------------------

export interface BotDecision {
  command: GameCommand;
  /** Milliseconds the bot should wait before acting (human-like delay). */
  delayMs: number;
}

/**
 * Stateless decision engine. Given a view snapshot and a memory record,
 * it returns the next command the bot should send plus a humanlike delay.
 *
 * All randomness is deterministic within a call — no async work here.
 */
export class BotBrain {
  private readonly botId: string;
  private readonly role: Role;
  private readonly knownFascistIds: ReadonlySet<string>;

  constructor(
    botId: string,
    role: Role,
    /** IDs the bot knows are fascist (server assigns this on game start). */
    knownFascistIds: ReadonlySet<string>,
  ) {
    this.botId = botId;
    this.role = role;
    this.knownFascistIds = knownFascistIds;
  }

  decide(view: GameStateView, memory: GameMemory): BotDecision | null {
    const ctx: StrategyContext = {
      view,
      memory,
      botId: this.botId,
      role: this.role,
      knownFascistIds: this.knownFascistIds,
    };

    const command = this.commandFor(ctx);
    if (!command) return null;

    return {
      command,
      delayMs: this.humanDelay(view.phase),
    };
  }

  private commandFor(ctx: StrategyContext): GameCommand | null {
    const { view } = ctx;
    const iAmPresident = view.board.president === this.botId;
    const iAmChancellor = view.board.chancellor === this.botId;

    switch (view.phase) {
      case Phase.Nomination: {
        if (!iAmPresident) return null;
        // Skip during the open discussion window
        if (view.discussionDeadline != null) return null;
        return this.nominateFor(ctx);
      }

      case Phase.Voting: {
        // Already voted?
        if (view.you.vote != null) return null;
        return this.voteFor(ctx);
      }

      case Phase.PresidentLegislative: {
        if (!iAmPresident) return null;
        const policies = view.you.policies;
        if (policies.length === 0) return null;
        // Wait until legislative window is open (delay built into engine)
        if (view.legislativeDeadline == null) return null;
        return this.role === 'liberal' || this.role === 'hitler'
          ? discardAsLiberal(policies)
          : discardAsFascist(policies);
      }

      case Phase.ChancellorLegislative: {
        if (!iAmChancellor) return null;
        const policies = view.you.policies;
        if (policies.length === 0) return null;
        if (view.legislativeDeadline == null) return null;
        // Handle veto consent if president requested
        if (view.vetoRequested && iAmChancellor) {
          // Liberal: agree if available; fascist: reject
          const agree = this.role !== 'fascist';
          return { kind: 'vetoConsent', agree };
        }
        return this.role === 'liberal' || this.role === 'hitler'
          ? enactAsLiberal(policies, view)
          : enactAsFascist(policies);
      }

      case Phase.SpecialPower: {
        if (!iAmPresident) return null;
        if (view.specialPowerDeadline == null) return null;
        if (!view.activePower) return null;
        return this.specialPowerFor(ctx);
      }

      default:
        return null;
    }
  }

  private nominateFor(ctx: StrategyContext): GameCommand {
    switch (ctx.role) {
      case 'fascist':
        return nominateAsFascist(ctx);
      case 'hitler':
        return nominateAsHitler(ctx);
      default:
        return nominateAsLiberal(ctx);
    }
  }

  private voteFor(ctx: StrategyContext): GameCommand {
    switch (ctx.role) {
      case 'fascist':
        return voteAsFascist(ctx);
      case 'hitler':
        return voteAsFascist(ctx); // Hitler votes with fascists
      default:
        return voteAsLiberal(ctx);
    }
  }

  private specialPowerFor(ctx: StrategyContext): GameCommand | null {
    switch (ctx.role) {
      case 'fascist':
      case 'hitler':
        return useSpecialPowerAsFascist(ctx);
      default:
        return useSpecialPowerAsLiberal(ctx);
    }
  }

  /**
   * Simulates human thinking time. Faster for simple decisions (voting),
   * slower for nominations and special powers.
   */
  private humanDelay(phase: Phase): number {
    const base: Partial<Record<Phase, [number, number]>> = {
      [Phase.Nomination]: [2000, 5000],
      [Phase.Voting]: [1000, 3500],
      [Phase.PresidentLegislative]: [1500, 4000],
      [Phase.ChancellorLegislative]: [1500, 4000],
      [Phase.SpecialPower]: [2000, 5000],
    };
    const [min, max] = base[phase] ?? [1000, 3000];
    return Math.floor(min + Math.random() * (max - min));
  }
}
