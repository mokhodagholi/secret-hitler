import type { ExecutivePower, Policy, Role } from '@secret-hitler/shared';
import cardBack from '../table/card-back.webp';
import policyLiberal from '../table/policy/liberal.webp';
import policyFascist from '../table/policy/fascist.webp';
import voteBack from '../table/votes/back.webp';
import voteJa from '../table/votes/ja.webp';
import voteNein from '../table/votes/nein.webp';
import roleLiberal from '../table/roles/liberal.webp';
import roleLiberal2 from '../table/roles/liberal-2.webp';
import roleLiberal3 from '../table/roles/liberal-3.webp';
import roleFascist from '../table/roles/fascist.webp';
import roleFascist2 from '../table/roles/fascist-2.webp';
import roleFascist3 from '../table/roles/fascist-3.webp';
import roleHitler from '../table/roles/hitler.webp';
import roleHitler2 from '../table/roles/hitler-2.webp';
import roleHitler3 from '../table/roles/hitler-3.webp';
import partyLiberal from '../table/party/liberal.webp';
import partyFascist from '../table/party/fascist.webp';
import sealInvestigate from '../table/seals/investigate.webp';
import sealSpecialElection from '../table/seals/special-election.webp';
import sealPeek from '../table/seals/peek.webp';
import sealExecution from '../table/seals/execution.webp';
import sealVeto from '../table/seals/veto.webp';
import raviIdle from '../table/ravi/farid-idle.webp';
import raviSpeaking from '../table/ravi/farid-speaking.webp';
import nightVeil from '../table/night-veil.webp';

export const CARD_BACK = cardBack;

export const POLICY_FACE: Record<Policy, string> = {
  liberal: policyLiberal,
  fascist: policyFascist,
};

export const VOTE_BACK = voteBack;

export const VOTE_FACE = {
  ja: voteJa,
  nein: voteNein,
} as const;

export const ROLE_FACES: Record<Role, readonly string[]> = {
  liberal: [roleLiberal, roleLiberal2, roleLiberal3],
  fascist: [roleFascist, roleFascist2, roleFascist3],
  hitler: [roleHitler, roleHitler2, roleHitler3],
};

/** Same player always gets the same portrait so night, inspect, and the strip match. */
export function roleFace(role: Role, playerId: string): string {
  const faces = ROLE_FACES[role];
  let hash = 0;
  for (const char of playerId) {
    hash = (Math.imul(hash, 31) + char.charCodeAt(0)) | 0;
  }
  return faces[Math.abs(hash) % faces.length]!;
}

export const PARTY_FACE = {
  liberal: partyLiberal,
  fascist: partyFascist,
} as const;

export const POWER_SEAL: Record<ExecutivePower, string> = {
  investigate: sealInvestigate,
  specialElection: sealSpecialElection,
  policyPeek: sealPeek,
  execution: sealExecution,
};

export const VETO_SEAL = sealVeto;

export const RAVI = {
  idle: raviIdle,
  speaking: raviSpeaking,
} as const;

export const NIGHT_VEIL = nightVeil;
