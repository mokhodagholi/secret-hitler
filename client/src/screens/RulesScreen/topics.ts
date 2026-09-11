import type { MessageKey } from '../../i18n';
import type { IconName } from '../../components/Icon/Icon';
import type { ScreenName } from '../../services/NavigationService';
import type { ComponentCardProps } from './ComponentCard';

export const TOPIC_ORDER = [
  'overview',
  'setup',
  'round',
  'fail',
  'powers',
  'winning',
] as const;

export type TopicId = (typeof TOPIC_ORDER)[number];

export interface TopicDef {
  id: TopicId;
  icon: IconName;
  tone: ComponentCardProps['tone'];
  titleKey: MessageKey;
  teaseKey: MessageKey;
  screen: Extract<ScreenName, `rules-${string}`>;
}

export const TOPICS: readonly TopicDef[] = [
  {
    id: 'overview',
    icon: 'capitol',
    tone: 'gold',
    titleKey: 'rules.overview',
    teaseKey: 'rules.teasers.overview',
    screen: 'rules-overview',
  },
  {
    id: 'setup',
    icon: 'masks',
    tone: 'fascist',
    titleKey: 'rules.setup',
    teaseKey: 'rules.teasers.setup',
    screen: 'rules-setup',
  },
  {
    id: 'round',
    icon: 'crown',
    tone: 'liberal',
    titleKey: 'rules.roundTitle',
    teaseKey: 'rules.teasers.round',
    screen: 'rules-round',
  },
  {
    id: 'fail',
    icon: 'question',
    tone: 'neutral',
    titleKey: 'rules.failTitle',
    teaseKey: 'rules.teasers.fail',
    screen: 'rules-fail',
  },
  {
    id: 'powers',
    icon: 'star',
    tone: 'gold',
    titleKey: 'rules.powersTitle',
    teaseKey: 'rules.teasers.powers',
    screen: 'rules-powers',
  },
  {
    id: 'winning',
    icon: 'skull',
    tone: 'fascist',
    titleKey: 'rules.winningTitle',
    teaseKey: 'rules.teasers.winning',
    screen: 'rules-winning',
  },
];

export function topicFromScreen(screen: ScreenName): TopicId | null {
  return TOPICS.find((topic) => topic.screen === screen)?.id ?? null;
}

export function screenForTopic(topicId: TopicId): TopicDef['screen'] {
  return TOPICS.find((topic) => topic.id === topicId)!.screen;
}
