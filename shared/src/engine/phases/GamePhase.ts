import type {
  ExecutivePower,
  Faction,
  LogCode,
  Phase,
  Policy,
} from '../../types/GameState';
import type { GameCommand } from '../../types/events';
import type { Room } from '../../domain/Room';
import type { EngineError } from '../errors';

/** Engine services available to phases. Implemented by GameEngine. */
export interface PhaseHost {
  readonly room: Room;
  log(code: LogCode, params?: Record<string, string | number>): void;
  changed(): void;
  transitionTo(phase: Phase): void;
  enactPolicy(policy: Policy): void;
  advanceRound(): void;
  /** A government failed: advance the tracker, enact on chaos, next round. */
  failElection(): void;
  endGame(winner: Faction): void;
  /** True during the first-round deal / night / glance. */
  inOpeningNight(): boolean;
  /** Open the 3-minute discussion window before nomination (everyone may chat). */
  openDiscussion(): void;
  /** Cancel the discussion window without opening nomination (phase exit). */
  closeDiscussion(): void;
  /** End discussion early and open the nomination window. */
  endDiscussion(): void;
  /** Open the vote window (`delayMs` delays the auto-timeout, not a committed vote). */
  openVote(delayMs?: number): void;
  /** Close the vote window (vote resolved) and cancel its deadline. */
  closeVote(): void;
  /**
   * Open the legislative choice window and schedule its deadline.
   * `delayMs` delays the auto-timeout until the public deal/pass has landed.
   * `durationMs` is the choose clock (default legislative window; veto consent
   * passes its own).
   */
  openLegislativeTimer(delayMs?: number, durationMs?: number): void;
  /** Close the legislative choice window and cancel its deadline. */
  closeLegislativeTimer(): void;
  /**
   * Open the nomination window (`delayMs` delays the auto-timeout for Ravi's
   * nominate prompt).
   */
  openNominationTimer(delayMs?: number): void;
  /** Close the nomination window and cancel its deadline. */
  closeNominationTimer(): void;
  /**
   * Open the executive-power window. `durationMs` is the choose clock;
   * `delayMs` delays the auto-timeout for Ravi's power prompt.
   */
  openSpecialPowerTimer(durationMs?: number, delayMs?: number): void;
  /** Close the executive-power window and cancel its deadline. */
  closeSpecialPowerTimer(): void;
  /** Enter the SpecialPower phase with the President's pending power. */
  grantPower(power: ExecutivePower): void;
  /** Special election: hand the presidency to `playerId` for the next round. */
  startSpecialElection(playerId: string): void;
  /** Start an in-match history draft for the sitting President. */
  beginRoundHistory(): void;
  /** Record the Chancellor nominee on the open history draft. */
  recordHistoryNomination(chancellorId: string): void;
  /** Snapshot Ja/Nein (missing = Nein) after the vote window closes. */
  recordHistoryVote(elected: boolean): void;
  /** Record a veto both offices agreed to. */
  recordHistoryVetoAgreed(): void;
  /** Record an executive power on the open history draft. */
  recordHistoryPower(kind: ExecutivePower, targetId?: string | null): void;
  /** Push the open history draft into the finished list. */
  finalizeRoundHistory(): void;
  /**
   * Hold briefly so Ravi can announce, then advance the presidency.
   * `delayMs` defaults to the post-power breath.
   */
  scheduleAdvanceRound(delayMs?: number): void;
  /** Hold briefly after a law, then open the executive power. */
  scheduleGrantPower(power: ExecutivePower, delayMs?: number): void;
  /** Hold briefly after a special election pick, then open the next nomination. */
  scheduleSpecialElection(playerId: string, delayMs?: number): void;
}

/**
 * One state of the game's state machine. The engine holds the current phase
 * and delegates every in-game command to it; `enter`/`exit` run on transition.
 */
export interface GamePhase {
  readonly name: Phase;
  enter?(): void;
  exit?(): void;
  handle(playerId: string, command: GameCommand): EngineError | null;
  /** A player connected or disconnected — re-evaluate phase conditions. */
  presenceChanged?(): void;
  /** A scheduled phase deadline elapsed (e.g. the vote window closed). */
  timeout?(): void;
}
