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
] as const;

export type TopicId = (typeof TOPIC_ORDER)[number];

/** One hue per hub card so the tiles never share a fill. */
export type TopicHue =
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
];

export function topicFromScreen(screen: ScreenName): TopicId | null {
  return TOPICS.find((topic) => topic.screen === screen)?.id ?? null;
}

export function screenForTopic(topicId: TopicId): TopicDef['screen'] {
  return TOPICS.find((topic) => topic.id === topicId)!.screen;
}
