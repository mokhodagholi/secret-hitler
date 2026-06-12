/** Executive powers a fascist policy can grant the President. */
export type ExecutivePower =
  | 'investigate'
  | 'specialElection'
  | 'policyPeek'
  | 'execution';

// Power granted when the Nth fascist policy (1–5) is enacted, by player-count
// band. Index 0 = first fascist policy. The 6th fascist policy ends the game,
// so it grants nothing. Mirrors the official board layout (docs/game-rules.md).
const LAYOUTS = {
  small: [null, null, 'policyPeek', 'execution', 'execution'], // 5–6 players
  medium: [null, 'investigate', 'specialElection', 'execution', 'execution'], // 7–8
  large: ['investigate', 'investigate', 'specialElection', 'execution', 'execution'], // 9–10
} satisfies Record<string, (ExecutivePower | null)[]>;

/** Number of fascist policies after which the veto power unlocks. */
export const VETO_UNLOCK_FASCIST_POLICIES = 5;

/**
 * The power granted when the `fascistPolicyNumber`-th (1-based) fascist policy
 * is enacted in a game of `playerCount` players, or null for none.
 */
export function powerForFascistPolicy(
  playerCount: number,
  fascistPolicyNumber: number,
): ExecutivePower | null {
  if (fascistPolicyNumber < 1 || fascistPolicyNumber > 5) return null;
  const band = playerCount <= 6 ? 'small' : playerCount <= 8 ? 'medium' : 'large';
  return LAYOUTS[band][fascistPolicyNumber - 1];
}
