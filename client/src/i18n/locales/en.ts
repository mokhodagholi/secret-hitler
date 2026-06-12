import type { LocaleMessages } from '../types';

/** English catalog. Reference locale — keep keys in sync with `MessageKey`. */
export const en = {
  'logo.secret': 'Secret',
  'logo.hitler': 'Hitler',
  'logo.tagline': 'A game of deduction,\ndeception, and fascism',

  'nav.rules': 'Rules',
  'nav.howToPlay': 'How to Play',
  'nav.settings': 'Settings',
  'nav.home': 'Home',

  'home.play': 'Play',

  'common.comingSoon': 'Coming soon.',
  'common.goBack': 'Go back',

  'rules.title': 'Rules',
  'rules.overview': 'Overview',
  'rules.overviewBody':
    'Secret Hitler is a game of hidden identities and suspicion. Liberals must pass policies and elect a Liberal government. Hitler and the Fascists must sabotage the government and pass Fascist policies.',
  'rules.components': 'Components',
  'rules.componentCards.roleCards': '17 Role Cards',
  'rules.componentCards.policyDeck': 'Policy Deck',
  'rules.componentCards.policyTracker': 'Policy Tracker',
  'rules.componentCards.envelope': 'Envelope',
  'rules.howToPlay': 'How to Play',
  'rules.steps.deal.title': 'Deal Roles',
  'rules.steps.deal.body': 'Each player is secretly assigned a role.',
  'rules.steps.elect.title': 'Elect a President',
  'rules.steps.elect.body': 'Players elect a President and Chancellor.',
  'rules.steps.enact.title': 'Enact Policies',
  'rules.steps.enact.body':
    'The government draws and enacts policies. Track the policies on the board.',
  'rules.steps.agenda.title': 'Achieve Your Agenda',
  'rules.steps.agenda.body':
    'Liberals win by passing 5 Liberal policies. Fascists win by passing 6 Fascist policies or electing Hitler as Chancellor after 3 Fascist policies.',
  'rules.remember': 'Remember',
  'rules.rememberBody':
    'Deduction, deception, and discussion are your greatest weapons.',
  'rules.trustNoOne': 'Trust no one.',

  'settings.title': 'Settings',
  'settings.headerLabel': 'Settings',
  'settings.gameSettings': 'Game Settings',
  'settings.playerCount': 'Player Count',
  'settings.players': '{count} Players',
  'settings.showRoles': 'Show Roles in Game',
  'settings.timer': 'Timer',
  'settings.enabled': 'Enabled',
  'settings.disabled': 'Disabled',
  'settings.confirmActions': 'Confirm Actions',
  'settings.display': 'Display',
  'settings.theme': 'Theme',
  'settings.classicBlue': 'Classic Blue',
  'settings.language': 'Language',
  'settings.music': 'Music',
  'settings.soundEffects': 'Sound Effects',
  'settings.other': 'Other',
  'settings.howToPlay': 'How to Play',
  'settings.about': 'About',
  'settings.resetTutorials': 'Reset Tutorials',
  'settings.clearLocalData': 'Clear Local Data',
  'settings.restorePurchases': 'Restore Purchases',

  'screens.howToPlay': 'How to Play',
  'screens.about': 'About',
  'screens.play': 'Play',
} satisfies LocaleMessages;
