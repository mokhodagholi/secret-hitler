import type { MessageKey } from '../../../i18n';

/** Sahar onboard guide clips (ElevenLabs). Table talk stays on Daniel. */
import onboardComingSoon from './sahar/onboard.comingSoon.mp3';
import onboardDraw from './sahar/onboard.draw.mp3';
import onboardHistoryAdd from './sahar/onboard.history.add.mp3';
import onboardHistoryChip from './sahar/onboard.history.chip.mp3';
import onboardHistoryClose from './sahar/onboard.history.close.mp3';
import onboardHistoryDone from './sahar/onboard.history.done.mp3';
import onboardHistoryList from './sahar/onboard.history.list.mp3';
import onboardHistoryLoss from './sahar/onboard.history.loss.mp3';
import onboardHistoryLossCard from './sahar/onboard.history.lossCard.mp3';
import onboardHistoryOutcome from './sahar/onboard.history.outcome.mp3';
import onboardHistoryPeople from './sahar/onboard.history.people.mp3';
import onboardHistoryRoles from './sahar/onboard.history.roles.mp3';
import onboardHistorySent from './sahar/onboard.history.sent.mp3';
import onboardHistoryTies from './sahar/onboard.history.ties.mp3';
import onboardHistoryYou from './sahar/onboard.history.you.mp3';
import onboardHistoryYours from './sahar/onboard.history.yours.mp3';
import onboardIdeaBoards from './sahar/onboard.idea.boards.mp3';
import onboardIdeaCampaign from './sahar/onboard.idea.campaign.mp3';
import onboardIdeaChancellorDoes from './sahar/onboard.idea.chancellorDoes.mp3';
import onboardIdeaHomeSettings from './sahar/onboard.idea.homeSettings.mp3';
import onboardIdeaMessages from './sahar/onboard.idea.messages.mp3';
import onboardIdeaOnlyPresidentSees from './sahar/onboard.idea.onlyPresidentSees.mp3';
import onboardIdeaPeople from './sahar/onboard.idea.people.mp3';
import onboardIdeaPresidentBurns from './sahar/onboard.idea.presidentBurns.mp3';
import onboardIdeaSeeNext from './sahar/onboard.idea.seeNext.mp3';
import onboardIdeaSettings from './sahar/onboard.idea.settings.mp3';
import onboardIdeaSettingsMenu from './sahar/onboard.idea.settingsMenu.mp3';
import onboardIdeaTalk from './sahar/onboard.idea.talk.mp3';
import onboardIdeaTalkAbout from './sahar/onboard.idea.talkAbout.mp3';
import onboardIdeaThisPresident from './sahar/onboard.idea.thisPresident.mp3';
import onboardIdeaThisPresidentLaws from './sahar/onboard.idea.thisPresidentLaws.mp3';
import onboardIdeaWelcome from './sahar/onboard.idea.welcome.mp3';
import onboardIdeaWhereWereWe from './sahar/onboard.idea.whereWereWe.mp3';
import onboardIdeaWriteHere from './sahar/onboard.idea.writeHere.mp3';
import onboardIdeaYouChancellor from './sahar/onboard.idea.youChancellor.mp3';
import onboardIdeaYouPickLaw from './sahar/onboard.idea.youPickLaw.mp3';
import onboardIdeaYourTurn from './sahar/onboard.idea.yourTurn.mp3';
import onboardLetsSit from './sahar/onboard.letsSit.mp3';
import onboardMustNominate from './sahar/onboard.mustNominate.mp3';
import onboardOpenNominate from './sahar/onboard.openNominate.mp3';
import onboardOpenNominateTap from './sahar/onboard.openNominateTap.mp3';
import onboardPick from './sahar/onboard.pick.mp3';
import onboardPickNima from './sahar/onboard.pickNima.mp3';
import onboardPickRetry from './sahar/onboard.pickRetry.mp3';
import onboardPieceBoards from './sahar/onboard.piece.boards.mp3';
import onboardPieceCheck from './sahar/onboard.piece.check.mp3';
import onboardPieceCheckReassure from './sahar/onboard.piece.checkReassure.mp3';
import onboardPieceDeck from './sahar/onboard.piece.deck.mp3';
import onboardPieceLaws from './sahar/onboard.piece.laws.mp3';
import onboardPieceOffices from './sahar/onboard.piece.offices.mp3';
import onboardPieceRoles from './sahar/onboard.piece.roles.mp3';
import onboardPieceTracker from './sahar/onboard.piece.tracker.mp3';
import onboardPieceTrackerChaos from './sahar/onboard.piece.trackerChaos.mp3';
import onboardPieceTrackerFail1 from './sahar/onboard.piece.trackerFail1.mp3';
import onboardPieceTrackerFail2 from './sahar/onboard.piece.trackerFail2.mp3';
import onboardPieceVote from './sahar/onboard.piece.vote.mp3';
import onboardPieceWelcome from './sahar/onboard.piece.welcome.mp3';
import onboardSecretEnact from './sahar/onboard.secretEnact.mp3';
import onboardSettingsBriefing from './sahar/onboard.settings.briefing.mp3';
import onboardSettingsCard from './sahar/onboard.settings.card.mp3';
import onboardSettingsDone from './sahar/onboard.settings.done.mp3';
import onboardSettingsMotion from './sahar/onboard.settings.motion.mp3';
import onboardSettingsMusic from './sahar/onboard.settings.music.mp3';
import onboardSettingsName from './sahar/onboard.settings.name.mp3';
import onboardSettingsRavi from './sahar/onboard.settings.ravi.mp3';
import onboardSettingsSound from './sahar/onboard.settings.sound.mp3';
import onboardSettingsSupport from './sahar/onboard.settings.support.mp3';
import onboardSettingsTable from './sahar/onboard.settings.table.mp3';
import onboardSettingsWho from './sahar/onboard.settings.who.mp3';
import onboardVote from './sahar/onboard.vote.mp3';
import onboardYouPresident from './sahar/onboard.youPresident.mp3';

export const ONBOARD_CLIPS: Partial<Record<MessageKey, string>> = {
  'onboard.comingSoon': onboardComingSoon,
  'onboard.draw': onboardDraw,
  'onboard.history.add': onboardHistoryAdd,
  'onboard.history.chip': onboardHistoryChip,
  'onboard.history.close': onboardHistoryClose,
  'onboard.history.done': onboardHistoryDone,
  'onboard.history.list': onboardHistoryList,
  'onboard.history.loss': onboardHistoryLoss,
  'onboard.history.lossCard': onboardHistoryLossCard,
  'onboard.history.outcome': onboardHistoryOutcome,
  'onboard.history.people': onboardHistoryPeople,
  'onboard.history.roles': onboardHistoryRoles,
  'onboard.history.sent': onboardHistorySent,
  'onboard.history.ties': onboardHistoryTies,
  'onboard.history.you': onboardHistoryYou,
  'onboard.history.yours': onboardHistoryYours,
  'onboard.idea.boards': onboardIdeaBoards,
  'onboard.idea.campaign': onboardIdeaCampaign,
  'onboard.idea.chancellorDoes': onboardIdeaChancellorDoes,
  'onboard.idea.homeSettings': onboardIdeaHomeSettings,
  'onboard.idea.messages': onboardIdeaMessages,
  'onboard.idea.onlyPresidentSees': onboardIdeaOnlyPresidentSees,
  'onboard.idea.people': onboardIdeaPeople,
  'onboard.idea.presidentBurns': onboardIdeaPresidentBurns,
  'onboard.idea.seeNext': onboardIdeaSeeNext,
  'onboard.idea.settings': onboardIdeaSettings,
  'onboard.idea.settingsMenu': onboardIdeaSettingsMenu,
  'onboard.idea.talk': onboardIdeaTalk,
  'onboard.idea.talkAbout': onboardIdeaTalkAbout,
  'onboard.idea.thisPresident': onboardIdeaThisPresident,
  'onboard.idea.thisPresidentLaws': onboardIdeaThisPresidentLaws,
  'onboard.idea.welcome': onboardIdeaWelcome,
  'onboard.idea.whereWereWe': onboardIdeaWhereWereWe,
  'onboard.idea.writeHere': onboardIdeaWriteHere,
  'onboard.idea.youChancellor': onboardIdeaYouChancellor,
  'onboard.idea.youPickLaw': onboardIdeaYouPickLaw,
  'onboard.idea.yourTurn': onboardIdeaYourTurn,
  'onboard.letsSit': onboardLetsSit,
  'onboard.mustNominate': onboardMustNominate,
  'onboard.openNominate': onboardOpenNominate,
  'onboard.openNominateTap': onboardOpenNominateTap,
  'onboard.pick': onboardPick,
  'onboard.pickNima': onboardPickNima,
  'onboard.pickRetry': onboardPickRetry,
  'onboard.piece.boards': onboardPieceBoards,
  'onboard.piece.check': onboardPieceCheck,
  'onboard.piece.checkReassure': onboardPieceCheckReassure,
  'onboard.piece.deck': onboardPieceDeck,
  'onboard.piece.laws': onboardPieceLaws,
  'onboard.piece.offices': onboardPieceOffices,
  'onboard.piece.roles': onboardPieceRoles,
  'onboard.piece.tracker': onboardPieceTracker,
  'onboard.piece.trackerChaos': onboardPieceTrackerChaos,
  'onboard.piece.trackerFail1': onboardPieceTrackerFail1,
  'onboard.piece.trackerFail2': onboardPieceTrackerFail2,
  'onboard.piece.vote': onboardPieceVote,
  'onboard.piece.welcome': onboardPieceWelcome,
  'onboard.secretEnact': onboardSecretEnact,
  'onboard.settings.briefing': onboardSettingsBriefing,
  'onboard.settings.card': onboardSettingsCard,
  'onboard.settings.done': onboardSettingsDone,
  'onboard.settings.motion': onboardSettingsMotion,
  'onboard.settings.music': onboardSettingsMusic,
  'onboard.settings.name': onboardSettingsName,
  'onboard.settings.ravi': onboardSettingsRavi,
  'onboard.settings.sound': onboardSettingsSound,
  'onboard.settings.support': onboardSettingsSupport,
  'onboard.settings.table': onboardSettingsTable,
  'onboard.settings.who': onboardSettingsWho,
  'onboard.vote': onboardVote,
  'onboard.youPresident': onboardYouPresident,
};
