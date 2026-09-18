import type { MessageKey } from '../../i18n';
import type { IconName } from '../../components/Icon/Icon';
import type { ScreenName } from '../../services/NavigationService';

export const TOPIC_ORDER = [
  'whatIsThis',
  'contents',
  'laws',
  'roles',
  'eachRound',
  'failedGovernment',
  'powers',
  'howToWin',
  'online',
] as const;

export type TopicId = (typeof TOPIC_ORDER)[number];

export const APARAT_VIDEO_HASH = 'uawafm2';
export const APARAT_WATCH_URL = `https://www.aparat.com/v/${APARAT_VIDEO_HASH}`;

/** One hue per hub card so the tiles never share a fill. */
export type TopicHue =
  | 'ember'
  | 'slate'
  | 'brass'
  | 'teal'
  | 'moss'
  | 'crimson'
  | 'azure'
  | 'amber'
  | 'violet'
  | 'wine';

/** Corner the remaining glow bubble grows from. */
export type BubbleOrigin = 'topStart' | 'topEnd' | 'bottomStart' | 'bottomEnd';

export interface TopicDef {
  id: TopicId;
  icon: IconName;
  hue: TopicHue;
  bubbleOrigin: BubbleOrigin;
  titleKey: MessageKey;
  screen: Extract<ScreenName, `rules-${string}`>;
}

export type HubCardId = 'table' | 'video' | 'text';

export interface HubCardDef {
  id: HubCardId;
  icon: IconName;
  hue: TopicHue;
  bubbleOrigin: BubbleOrigin;
  titleKey: MessageKey;
  screen: ScreenName;
}

/** Hands-on table — only when the onboarding flag is on. */
export const TABLE_HUB_CARD: HubCardDef = {
  id: 'table',
  icon: 'hand',
  hue: 'brass',
  bubbleOrigin: 'topStart',
  titleKey: 'tutorial.table',
  screen: 'onboarding',
};

/** Written lessons live behind text. The table door is prepended when the flag is on. */
export const HUB_CARDS: readonly HubCardDef[] = [
  {
    id: 'video',
    icon: 'play',
    hue: 'ember',
    bubbleOrigin: 'topStart',
    titleKey: 'tutorial.video',
    screen: 'rules-video',
  },
  {
    id: 'text',
    icon: 'book',
    hue: 'slate',
    bubbleOrigin: 'topEnd',
    titleKey: 'tutorial.text',
    screen: 'rules-text',
  },
];

export const TOPICS: readonly TopicDef[] = [
  {
    id: 'whatIsThis',
    icon: 'question',
    hue: 'brass',
    bubbleOrigin: 'topStart',
    titleKey: 'rules.overview',
    screen: 'rules-what-is-this',
  },
  {
    id: 'contents',
    icon: 'cards',
    hue: 'teal',
    bubbleOrigin: 'topEnd',
    titleKey: 'rules.kit.title',
    screen: 'rules-contents',
  },
  {
    id: 'laws',
    icon: 'scroll',
    hue: 'moss',
    bubbleOrigin: 'bottomStart',
    titleKey: 'rules.laws.title',
    screen: 'rules-laws',
  },
  {
    id: 'roles',
    icon: 'threeCards',
    hue: 'crimson',
    bubbleOrigin: 'bottomEnd',
    titleKey: 'rules.setup',
    screen: 'rules-roles',
  },
  {
    id: 'eachRound',
    icon: 'refresh',
    hue: 'azure',
    bubbleOrigin: 'topStart',
    titleKey: 'rules.roundTitle',
    screen: 'rules-each-round',
  },
  {
    id: 'failedGovernment',
    icon: 'voteFail',
    hue: 'amber',
    bubbleOrigin: 'topEnd',
    titleKey: 'rules.failTitle',
    screen: 'rules-failed-government',
  },
  {
    id: 'powers',
    icon: 'fist',
    hue: 'violet',
    bubbleOrigin: 'bottomStart',
    titleKey: 'rules.powersTitle',
    screen: 'rules-powers',
  },
  {
    id: 'howToWin',
    icon: 'trophy',
    hue: 'wine',
    bubbleOrigin: 'bottomEnd',
    titleKey: 'rules.winningTitle',
    screen: 'rules-how-to-win',
  },
  {
    id: 'online',
    icon: 'globe',
    hue: 'ember',
    bubbleOrigin: 'topStart',
    titleKey: 'rules.online.title',
    screen: 'rules-online',
  },
];

export function topicFromScreen(screen: ScreenName): TopicId | null {
  return TOPICS.find((topic) => topic.screen === screen)?.id ?? null;
}

/** Hub, video, written guide, or a lesson — anything that is not the table. */
export function isGuideScreen(screen: ScreenName): boolean {
  return (
    screen === 'rules' ||
    screen === 'rules-video' ||
    screen === 'rules-text' ||
    topicFromScreen(screen) != null
  );
}

export function screenForTopic(topicId: TopicId): TopicDef['screen'] {
  return TOPICS.find((topic) => topic.id === topicId)!.screen;
}
