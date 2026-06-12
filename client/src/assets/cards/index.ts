import type { Policy } from '@secret-hitler/shared';
import cardBack from './card-back.png';
import policyLiberal from './policy-liberal.png';
import policyFascist from './policy-fascist.png';

// Placeholder art — swap these PNGs for the final card faces/back later.
export const CARD_BACK = cardBack;

export const POLICY_FACE: Record<Policy, string> = {
  liberal: policyLiberal,
  fascist: policyFascist,
};
