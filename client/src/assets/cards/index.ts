import type { Policy } from '@secret-hitler/shared';
import cardBack from './card-back.png';
import policyLiberal from '../images/liberal_rule.png';
import policyFascist from '../images/facist_rule.png';

export const CARD_BACK = cardBack;

export const POLICY_FACE: Record<Policy, string> = {
  liberal: policyLiberal,
  fascist: policyFascist,
};
