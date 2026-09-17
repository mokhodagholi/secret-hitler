/**
 * Bundler-imported table SFX. Rsbuild cannot `import.meta.glob`,
 * so each mp3 is a static import the same way Ravi clips are registered.
 */

import ballotSlide from './ballot-slide.mp3';
import ballotTap from './ballot-tap.mp3';
import cardFlip from './card-flip.mp3';
import chancellorSeal from './chancellor-seal.mp3';
import chaosEnact from './chaos-enact.mp3';
import chaosHit from './chaos-hit.mp3';
import dealSlide from './deal-slide.mp3';
import discussClose from './discuss-close.mp3';
import discussOpen from './discuss-open.mp3';
import discussWarn from './discuss-warn.mp3';
import executeStrike from './execute-strike.mp3';
import glanceTick from './glance-tick.mp3';
import governmentElected from './government-elected.mp3';
import governmentRejected from './government-rejected.mp3';
import lawFascist from './law-fascist.mp3';
import lawLiberal from './law-liberal.mp3';
import nightFall from './night-fall.mp3';
import nightLift from './night-lift.mp3';
import nominateTimeout from './nominate-timeout.mp3';
import onboardBoards from './onboard-boards.mp3';
import onboardChaos from './onboard-chaos.mp3';
import onboardDeck from './onboard-deck.mp3';
import onboardLaws from './onboard-laws.mp3';
import onboardOffices from './onboard-offices.mp3';
import onboardRoles from './onboard-roles.mp3';
import onboardSeats from './onboard-seats.mp3';
import onboardTracker from './onboard-tracker.mp3';
import onboardTurn from './onboard-turn.mp3';
import onboardVote from './onboard-vote.mp3';
import partySlide from './party-slide.mp3';
import peekDone from './peek-done.mp3';
import peekFlip from './peek-flip.mp3';
import playerJoin from './player-join.mp3';
import playerLeave from './player-leave.mp3';
import playerReady from './player-ready.mp3';
import policyBurn from './policy-burn.mp3';
import policyDraw from './policy-draw.mp3';
import policyPass from './policy-pass.mp3';
import presidentSeal from './president-seal.mp3';
import roleCascade from './role-cascade.mp3';
import roomClosed from './room-closed.mp3';
import roomStart from './room-start.mp3';
import sealOpen from './seal-open.mp3';
import swapPage from './swap-page.mp3';
import timerTick from './timer-tick.mp3';
import timerUrgent from './timer-urgent.mp3';
import trackerTick from './tracker-tick.mp3';
import uiCopied from './ui-copied.mp3';
import uiError from './ui-error.mp3';
import vetoAgree from './veto-agree.mp3';
import vetoOffer from './veto-offer.mp3';
import vetoRefuse from './veto-refuse.mp3';
import vetoUnlock from './veto-unlock.mp3';
import voteTally from './vote-tally.mp3';
import winFascist from './win-fascist.mp3';
import winLiberal from './win-liberal.mp3';
import youDied from './you-died.mp3';

export const EFFECT_URLS = {
  'ballot-slide': ballotSlide,
  'ballot-tap': ballotTap,
  'card-flip': cardFlip,
  'chancellor-seal': chancellorSeal,
  'chaos-enact': chaosEnact,
  'chaos-hit': chaosHit,
  'deal-slide': dealSlide,
  'discuss-close': discussClose,
  'discuss-open': discussOpen,
  'discuss-warn': discussWarn,
  'execute-strike': executeStrike,
  'glance-tick': glanceTick,
  'government-elected': governmentElected,
  'government-rejected': governmentRejected,
  'law-fascist': lawFascist,
  'law-liberal': lawLiberal,
  'night-fall': nightFall,
  'night-lift': nightLift,
  'nominate-timeout': nominateTimeout,
  'onboard-boards': onboardBoards,
  'onboard-chaos': onboardChaos,
  'onboard-deck': onboardDeck,
  'onboard-laws': onboardLaws,
  'onboard-offices': onboardOffices,
  'onboard-roles': onboardRoles,
  'onboard-seats': onboardSeats,
  'onboard-tracker': onboardTracker,
  'onboard-turn': onboardTurn,
  'onboard-vote': onboardVote,
  'party-slide': partySlide,
  'peek-done': peekDone,
  'peek-flip': peekFlip,
  'player-join': playerJoin,
  'player-leave': playerLeave,
  'player-ready': playerReady,
  'policy-burn': policyBurn,
  'policy-draw': policyDraw,
  'policy-pass': policyPass,
  'president-seal': presidentSeal,
  'role-cascade': roleCascade,
  'room-closed': roomClosed,
  'room-start': roomStart,
  'seal-open': sealOpen,
  'swap-page': swapPage,
  'timer-tick': timerTick,
  'timer-urgent': timerUrgent,
  'tracker-tick': trackerTick,
  'ui-copied': uiCopied,
  'ui-error': uiError,
  'veto-agree': vetoAgree,
  'veto-offer': vetoOffer,
  'veto-refuse': vetoRefuse,
  'veto-unlock': vetoUnlock,
  'vote-tally': voteTally,
  'win-fascist': winFascist,
  'win-liberal': winLiberal,
  'you-died': youDied,
} as const;
