/**
 * Measured Ravi mp3 lengths (ms). Add a voice map when a second
 * speaker ships — ceremony holds use {@link raviHoldMs} (max across
 * voices); the client typewriter prefers live audio.duration.
 *
 * Regenerated with ffprobe on client/src/assets/sounds/ravi/<who>/.
 */

export type RaviClipId = keyof (typeof RAVI_CLIP_MS)['daniel'];

export const RAVI_CLIP_MS = {
  daniel: {
    'chaos.enacted': 6540,
    'chaos.start': 5660,
    'deal.look': 2700,
    'deal.start': 7730,
    'discuss.afterFail': 3020,
    'discuss.afterLeave': 3260,
    'discuss.afterLeave2': 3900,
    'discuss.afterLeave3': 5580,
    'discuss.afterPower': 3820,
    'discuss.closing': 2940,
    'discuss.ended': 1980,
    'discuss.start': 2540,
    'game.fascistsWin.policies': 5820,
    'game.liberalsWin.policies': 5100,
    'game.reveal': 2140,
    'kick.asked': 2460,
    'kick.askedOnYou': 2540,
    'kick.askedYou': 2540,
    'kick.failed': 2380,
    'kick.failedOnYou': 3580,
    'kick.failedYou': 2220,
    'kick.passed': 3100,
    'kick.passedOnYou': 4700,
    'kick.passedYou': 3020,
    'law.burned': 1660,
    'law.chancellorChoosing': 2540,
    'law.draw': 3260,
    'law.fascist': 2940,
    'law.liberal': 2540,
    'law.pass': 2620,
    'law.passYou': 2460,
    'law.presidentChoosing': 2940,
    'law.vetoAgreed': 5500,
    'law.vetoOffered': 3260,
    'law.vetoRejected': 4700,
    'law.vetoUnlocked': 2780,
    'night.end': 2220,
    'night.start': 2140,
    'nominate.named': 2540,
    'nominate.namedAsYou': 3180,
    'nominate.namedYou': 3020,
    'nominate.start': 3180,
    'nominate.timeout': 2380,
    'office.chancellorLeft': 2780,
    'office.presidentLeft': 3180,
    'office.roundOver': 1980,
    'player.away': 3100,
    'player.back': 2220,
    'player.backYou': 1660,
    'player.left': 2860,
    'power.executed': 3580,
    'power.executedYou': 2300,
    'power.execution': 3340,
    'power.hitlerExecuted': 3980,
    'power.investigate': 2940,
    'power.investigated': 1580,
    'power.investigatedFascist': 2380,
    'power.investigatedLiberal': 2140,
    'power.investigatedYou': 2300,
    'power.peek': 4060,
    'power.peekDone': 2780,
    'power.specialElection': 3740,
    'president.first': 2540,
    'president.firstYou': 2860,
    'president.next': 3020,
    'president.nextYou': 2300,
    'president.special': 2620,
    'private.discard': 2380,
    'private.enact': 3900,
    'private.nightFascistLarge': 5980,
    'private.nightFascistSmall': 3340,
    'private.nightHitlerSmall': 2540,
    'private.nightLiberal': 2380,
    'private.nominate': 4860,
    'private.vote': 2620,
    'private.youFascist': 12700,
    'private.youHitler': 7660,
    'private.youLiberal': 9260,
    'tracker.advance': 2380,
    'vote.collecting': 2060,
    'vote.count': 2140,
    'vote.failed': 2540,
    'vote.hitlerChancellor': 4700,
    'vote.passed': 2220,
    'vote.start': 2060,
  },
} as const;

export type RaviVoiceId = keyof typeof RAVI_CLIP_MS;

/** Extra air after the longest take so unlock is not tight on the last word. */
export const RAVI_HOLD_PAD_MS = 400;

export function raviClipMs(who: RaviVoiceId, id: string): number | null {
  const map = RAVI_CLIP_MS[who] as Record<string, number>;
  const ms = map[id];
  return typeof ms === "number" ? ms : null;
}

/** Longest recorded take for this line across every shipped voice. */
export function raviHoldMs(...ids: string[]): number {
  let longest = 0;
  for (const id of ids) {
    for (const who of Object.keys(RAVI_CLIP_MS) as RaviVoiceId[]) {
      const ms = raviClipMs(who, id) ?? 0;
      if (ms > longest) longest = ms;
    }
  }
  return longest > 0 ? longest + RAVI_HOLD_PAD_MS : RAVI_HOLD_PAD_MS;
}

/** Prompt before the President may nominate (private + table lines). */
export const NOMINATION_PROMPT_MS = raviHoldMs('private.nominate', 'nominate.start');

/** Prompt before Ja/Nein are live. */
export const VOTE_PROMPT_MS = raviHoldMs('private.vote', 'vote.start');

/** Prompt before an executive power may be used. */
export const POWER_PROMPT_MS = raviHoldMs(
  'power.investigate',
  'power.peek',
  'power.specialElection',
  'power.execution',
);

/** Prompt before the President may answer a veto. */
export const VETO_CONSENT_PROMPT_MS = raviHoldMs('law.vetoOffered');

/** Collapse ceremony waits on unit-test tables (`RoomOptions.skipCeremony`). */
export function ceremonyDelay(skipCeremony: boolean | undefined, ms: number): number {
  return skipCeremony ? 0 : ms;
}
