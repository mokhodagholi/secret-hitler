/**
 * Bundler-imported Ravi clips. Rsbuild cannot `import.meta.glob`,
 * so each mp3 is a static import the same way SoundService registers effects.
 * Table voice is Daniel (ElevenLabs); one speaker for every line.
 */

import chaosEnacted from './daniel/chaos.enacted.mp3';
import chaosStart from './daniel/chaos.start.mp3';
import dealLook from './daniel/deal.look.mp3';
import dealStart from './daniel/deal.start.mp3';
import discussClosing from './daniel/discuss.closing.mp3';
import discussEnded from './daniel/discuss.ended.mp3';
import discussAfterFail from './daniel/discuss.afterFail.mp3';
import discussAfterLeave from './daniel/discuss.afterLeave.mp3';
import discussAfterLeave2 from './daniel/discuss.afterLeave2.mp3';
import discussAfterLeave3 from './daniel/discuss.afterLeave3.mp3';
import discussAfterPower from './daniel/discuss.afterPower.mp3';
import discussStart from './daniel/discuss.start.mp3';
import gameFascistsWinPolicies from './daniel/game.fascistsWin.policies.mp3';
import gameLiberalsWinPolicies from './daniel/game.liberalsWin.policies.mp3';
import gameReveal from './daniel/game.reveal.mp3';
import kickAsked from './daniel/kick.asked.mp3';
import kickAskedOnYou from './daniel/kick.askedOnYou.mp3';
import kickAskedYou from './daniel/kick.askedYou.mp3';
import kickFailed from './daniel/kick.failed.mp3';
import kickFailedOnYou from './daniel/kick.failedOnYou.mp3';
import kickFailedYou from './daniel/kick.failedYou.mp3';
import kickPassed from './daniel/kick.passed.mp3';
import kickPassedOnYou from './daniel/kick.passedOnYou.mp3';
import kickPassedYou from './daniel/kick.passedYou.mp3';
import lawBurned from './daniel/law.burned.mp3';
import lawChancellorChoosing from './daniel/law.chancellorChoosing.mp3';
import lawDraw from './daniel/law.draw.mp3';
import lawFascist from './daniel/law.fascist.mp3';
import lawLiberal from './daniel/law.liberal.mp3';
import lawPass from './daniel/law.pass.mp3';
import lawPassYou from './daniel/law.passYou.mp3';
import lawPresidentChoosing from './daniel/law.presidentChoosing.mp3';
import lawVetoAgreed from './daniel/law.vetoAgreed.mp3';
import lawVetoOffered from './daniel/law.vetoOffered.mp3';
import lawVetoRejected from './daniel/law.vetoRejected.mp3';
import lawVetoUnlocked from './daniel/law.vetoUnlocked.mp3';
import nightEnd from './daniel/night.end.mp3';
import nightStart from './daniel/night.start.mp3';
import nominateNamed from './daniel/nominate.named.mp3';
import nominateNamedAsYou from './daniel/nominate.namedAsYou.mp3';
import nominateNamedYou from './daniel/nominate.namedYou.mp3';
import nominateStart from './daniel/nominate.start.mp3';
import nominateTimeout from './daniel/nominate.timeout.mp3';
import officeChancellorLeft from './daniel/office.chancellorLeft.mp3';
import officePresidentLeft from './daniel/office.presidentLeft.mp3';
import officeRoundOver from './daniel/office.roundOver.mp3';
import playerAway from './daniel/player.away.mp3';
import playerBack from './daniel/player.back.mp3';
import playerBackYou from './daniel/player.backYou.mp3';
import playerLeft from './daniel/player.left.mp3';
import powerExecuted from './daniel/power.executed.mp3';
import powerExecutedYou from './daniel/power.executedYou.mp3';
import powerExecution from './daniel/power.execution.mp3';
import powerHitlerExecuted from './daniel/power.hitlerExecuted.mp3';
import powerInvestigate from './daniel/power.investigate.mp3';
import powerInvestigated from './daniel/power.investigated.mp3';
import powerInvestigatedFascist from './daniel/power.investigatedFascist.mp3';
import powerInvestigatedLiberal from './daniel/power.investigatedLiberal.mp3';
import powerInvestigatedYou from './daniel/power.investigatedYou.mp3';
import powerPeek from './daniel/power.peek.mp3';
import powerPeekDone from './daniel/power.peekDone.mp3';
import powerSpecialElection from './daniel/power.specialElection.mp3';
import presidentFirst from './daniel/president.first.mp3';
import presidentFirstYou from './daniel/president.firstYou.mp3';
import presidentNext from './daniel/president.next.mp3';
import presidentNextYou from './daniel/president.nextYou.mp3';
import presidentSpecial from './daniel/president.special.mp3';
import trackerAdvance from './daniel/tracker.advance.mp3';
import voteCollecting from './daniel/vote.collecting.mp3';
import voteCount from './daniel/vote.count.mp3';
import voteFailed from './daniel/vote.failed.mp3';
import voteHitlerChancellor from './daniel/vote.hitlerChancellor.mp3';
import votePassed from './daniel/vote.passed.mp3';
import voteStart from './daniel/vote.start.mp3';
import privateDiscard from './daniel/private.discard.mp3';
import privateEnact from './daniel/private.enact.mp3';
import privateNightFascistLarge from './daniel/private.nightFascistLarge.mp3';
import privateNightFascistSmall from './daniel/private.nightFascistSmall.mp3';
import privateNightHitlerSmall from './daniel/private.nightHitlerSmall.mp3';
import privateNightLiberal from './daniel/private.nightLiberal.mp3';
import privateNominate from './daniel/private.nominate.mp3';
import privateVote from './daniel/private.vote.mp3';
import privateYouFascist from './daniel/private.youFascist.mp3';
import privateYouHitler from './daniel/private.youHitler.mp3';
import privateYouLiberal from './daniel/private.youLiberal.mp3';

const DANIEL = {
  'chaos.enacted': chaosEnacted,
  'chaos.start': chaosStart,
  'deal.look': dealLook,
  'deal.start': dealStart,
  'discuss.afterFail': discussAfterFail,
  'discuss.afterLeave': discussAfterLeave,
  'discuss.afterLeave2': discussAfterLeave2,
  'discuss.afterLeave3': discussAfterLeave3,
  'discuss.afterPower': discussAfterPower,
  'discuss.closing': discussClosing,
  'discuss.ended': discussEnded,
  'discuss.start': discussStart,
  'game.fascistsWin.policies': gameFascistsWinPolicies,
  'game.liberalsWin.policies': gameLiberalsWinPolicies,
  'game.reveal': gameReveal,
  'kick.asked': kickAsked,
  'kick.askedOnYou': kickAskedOnYou,
  'kick.askedYou': kickAskedYou,
  'kick.failed': kickFailed,
  'kick.failedOnYou': kickFailedOnYou,
  'kick.failedYou': kickFailedYou,
  'kick.passed': kickPassed,
  'kick.passedOnYou': kickPassedOnYou,
  'kick.passedYou': kickPassedYou,
  'law.burned': lawBurned,
  'law.chancellorChoosing': lawChancellorChoosing,
  'law.draw': lawDraw,
  'law.fascist': lawFascist,
  'law.liberal': lawLiberal,
  'law.pass': lawPass,
  'law.passYou': lawPassYou,
  'law.presidentChoosing': lawPresidentChoosing,
  'law.vetoAgreed': lawVetoAgreed,
  'law.vetoOffered': lawVetoOffered,
  'law.vetoRejected': lawVetoRejected,
  'law.vetoUnlocked': lawVetoUnlocked,
  'night.end': nightEnd,
  'night.start': nightStart,
  'nominate.named': nominateNamed,
  'nominate.namedAsYou': nominateNamedAsYou,
  'nominate.namedYou': nominateNamedYou,
  'nominate.start': nominateStart,
  'nominate.timeout': nominateTimeout,
  'office.chancellorLeft': officeChancellorLeft,
  'office.presidentLeft': officePresidentLeft,
  'office.roundOver': officeRoundOver,
  'player.away': playerAway,
  'player.back': playerBack,
  'player.backYou': playerBackYou,
  'player.left': playerLeft,
  'power.executed': powerExecuted,
  'power.executedYou': powerExecutedYou,
  'power.execution': powerExecution,
  'power.hitlerExecuted': powerHitlerExecuted,
  'power.investigate': powerInvestigate,
  'power.investigated': powerInvestigated,
  'power.investigatedFascist': powerInvestigatedFascist,
  'power.investigatedLiberal': powerInvestigatedLiberal,
  'power.investigatedYou': powerInvestigatedYou,
  'power.peek': powerPeek,
  'power.peekDone': powerPeekDone,
  'power.specialElection': powerSpecialElection,
  'president.first': presidentFirst,
  'president.firstYou': presidentFirstYou,
  'president.next': presidentNext,
  'president.nextYou': presidentNextYou,
  'president.special': presidentSpecial,
  'tracker.advance': trackerAdvance,
  'vote.collecting': voteCollecting,
  'vote.count': voteCount,
  'vote.failed': voteFailed,
  'vote.hitlerChancellor': voteHitlerChancellor,
  'vote.passed': votePassed,
  'vote.start': voteStart,
  'private.discard': privateDiscard,
  'private.enact': privateEnact,
  'private.nightFascistLarge': privateNightFascistLarge,
  'private.nightFascistSmall': privateNightFascistSmall,
  'private.nightHitlerSmall': privateNightHitlerSmall,
  'private.nightLiberal': privateNightLiberal,
  'private.nominate': privateNominate,
  'private.vote': privateVote,
  'private.youFascist': privateYouFascist,
  'private.youHitler': privateYouHitler,
  'private.youLiberal': privateYouLiberal,
} as const;

/** Spoken catalog keyed by speaker. Add a folder + map entry to ship another voice. */
export const RAVI_CLIPS = {
  daniel: DANIEL,
} as const;

export type RaviWho = keyof typeof RAVI_CLIPS;
