import type { MessageKey } from '../i18n';
import liberalBoard from '../assets/boards/liberal.png';
import fascistBoard from '../assets/boards/fascist.png';
import liberalRole from '../assets/table/roles/liberal.webp';
import fascistRole from '../assets/table/roles/fascist.webp';
import hitlerRole from '../assets/table/roles/hitler.webp';
import voteJa from '../assets/table/votes/ja.webp';
import voteNein from '../assets/table/votes/nein.webp';

export type IntroVisual =
  | { kind: 'welcome' }
  | { kind: 'images'; srcs: string[]; layout: 'row' | 'stack' | 'trio' }
  | { kind: 'government' }
  | { kind: 'tracker'; marks: 0 | 1 | 2 | 3 }
  | { kind: 'deck'; draw: number; discard: number }
  | { kind: 'laws' }
  | { kind: 'check' };

export interface IntroSlide {
  titleKey: MessageKey;
  bodyKey: MessageKey;
  visual: IntroVisual;
}

/**
 * Step 0 — name the pieces. Images + short labels.
 * Last slide asks if they got it, then step 1 (look) teaches how to play.
 */
export const INTRO_SLIDES: readonly IntroSlide[] = [
  {
    titleKey: 'onboard.piece.welcomeTitle',
    bodyKey: 'onboard.piece.welcome',
    visual: { kind: 'welcome' },
  },
  {
    titleKey: 'onboard.piece.rolesTitle',
    bodyKey: 'onboard.piece.roles',
    visual: {
      kind: 'images',
      layout: 'trio',
      srcs: [liberalRole, fascistRole, hitlerRole],
    },
  },
  {
    titleKey: 'onboard.piece.boardsTitle',
    bodyKey: 'onboard.piece.boards',
    visual: {
      kind: 'images',
      layout: 'stack',
      srcs: [liberalBoard, fascistBoard],
    },
  },
  {
    titleKey: 'onboard.piece.officesTitle',
    bodyKey: 'onboard.piece.offices',
    visual: { kind: 'government' },
  },
  {
    titleKey: 'onboard.piece.voteTitle',
    bodyKey: 'onboard.piece.vote',
    visual: {
      kind: 'images',
      layout: 'row',
      srcs: [voteJa, voteNein],
    },
  },
  {
    titleKey: 'onboard.piece.trackerTitle',
    bodyKey: 'onboard.piece.tracker',
    visual: { kind: 'tracker', marks: 0 },
  },
  {
    titleKey: 'onboard.piece.trackerFail1Title',
    bodyKey: 'onboard.piece.trackerFail1',
    visual: { kind: 'tracker', marks: 1 },
  },
  {
    titleKey: 'onboard.piece.trackerFail2Title',
    bodyKey: 'onboard.piece.trackerFail2',
    visual: { kind: 'tracker', marks: 2 },
  },
  {
    titleKey: 'onboard.piece.trackerChaosTitle',
    bodyKey: 'onboard.piece.trackerChaos',
    visual: { kind: 'tracker', marks: 3 },
  },
  {
    titleKey: 'onboard.piece.deckTitle',
    bodyKey: 'onboard.piece.deck',
    visual: { kind: 'deck', draw: 4, discard: 2 },
  },
  {
    titleKey: 'onboard.piece.lawsTitle',
    bodyKey: 'onboard.piece.laws',
    visual: { kind: 'laws' },
  },
  {
    titleKey: 'onboard.piece.checkTitle',
    bodyKey: 'onboard.piece.check',
    visual: { kind: 'check' },
  },
] as const;

export const INTRO_SLIDE_COUNT = INTRO_SLIDES.length;

/** Piece sting on this page. Tracker ticks live on the marks as they fill. */
export type IntroSlideEffect =
  | 'onboard-roles'
  | 'onboard-boards'
  | 'onboard-offices'
  | 'onboard-vote'
  | 'onboard-deck'
  | 'onboard-laws';

export function effectForIntroVisual(visual: IntroVisual): IntroSlideEffect | null {
  switch (visual.kind) {
    case 'images':
      if (visual.layout === 'trio') return 'onboard-roles';
      if (visual.layout === 'row') return 'onboard-vote';
      if (visual.layout === 'stack') return 'onboard-boards';
      return null;
    case 'government':
      return 'onboard-offices';
    case 'deck':
      return 'onboard-deck';
    case 'laws':
      return 'onboard-laws';
    default:
      return null;
  }
}
