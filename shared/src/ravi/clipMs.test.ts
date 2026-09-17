import { describe, expect, it } from '@rstest/core';
import {
  NOMINATION_PROMPT_MS,
  POWER_PROMPT_MS,
  RAVI_CLIP_MS,
  VOTE_PROMPT_MS,
  raviClipMs,
  raviHoldMs,
} from './clipMs';

describe('ravi clip catalog', () => {
  it('Should measure private.nominate longer than nominate.start', () => {
    expect(raviClipMs('daniel', 'private.nominate')).toBeGreaterThan(
      raviClipMs('daniel', 'nominate.start')!,
    );
  });

  it('Should size prompt holds to the longest take plus pad', () => {
    expect(NOMINATION_PROMPT_MS).toBe(
      raviHoldMs('private.nominate', 'nominate.start'),
    );
    expect(VOTE_PROMPT_MS).toBe(raviHoldMs('private.vote', 'vote.start'));
    expect(POWER_PROMPT_MS).toBeGreaterThan(RAVI_CLIP_MS.daniel['power.peek']);
  });
});
