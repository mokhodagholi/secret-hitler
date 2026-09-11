import { For, Match, Switch } from 'solid-js';
import { useApp } from '../../services/AppContext';
import type { FormatMessage, MessageKey } from '../../i18n';
import { Icon, type IconName } from '../../components/Icon/Icon';
import { Screen } from '../../components/Screen/Screen';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { SectionTitle } from '../../components/SectionTitle/SectionTitle';
import { ComponentCard, type ComponentCardProps } from './ComponentCard';
import { RuleStep, type RuleStepProps } from './RuleStep';
import {
  TOPIC_ORDER,
  TOPICS,
  screenForTopic,
  type TopicId,
} from './topics';
import styles from './RulesScreen.module.scss';

interface Bullet {
  icon: IconName;
  text: string;
}

function buildComponentCards(formatMessage: FormatMessage): ComponentCardProps[] {
  return [
    { icon: 'cards', label: formatMessage('rules.componentCards.policyTiles'), tone: 'fascist' },
    { icon: 'people', label: formatMessage('rules.componentCards.roleCards'), tone: 'gold' },
    { icon: 'scroll', label: formatMessage('rules.componentCards.boards'), tone: 'liberal' },
    { icon: 'envelope', label: formatMessage('rules.componentCards.envelope'), tone: 'neutral' },
  ];
}

function buildSetupPoints(formatMessage: FormatMessage): Bullet[] {
  return [
    { icon: 'masks', text: formatMessage('rules.setupPoints.small') },
    { icon: 'people', text: formatMessage('rules.setupPoints.large') },
    { icon: 'star', text: formatMessage('rules.setupPoints.liberals') },
  ];
}

function buildRoundSteps(formatMessage: FormatMessage): RuleStepProps[] {
  return [
    { number: 1, icon: 'crown', title: formatMessage('rules.steps.nominate.title'), body: formatMessage('rules.steps.nominate.body') },
    { number: 2, icon: 'people', title: formatMessage('rules.steps.elect.title'), body: formatMessage('rules.steps.elect.body') },
    { number: 3, icon: 'scroll', title: formatMessage('rules.steps.enact.title'), body: formatMessage('rules.steps.enact.body') },
    { number: 4, icon: 'star', title: formatMessage('rules.steps.executive.title'), body: formatMessage('rules.steps.executive.body') },
  ];
}

function buildPowers(formatMessage: FormatMessage): RuleStepProps[] {
  return [
    { icon: 'question', title: formatMessage('rules.powers.investigate.title'), body: formatMessage('rules.powers.investigate.body') },
    { icon: 'refresh', title: formatMessage('rules.powers.special.title'), body: formatMessage('rules.powers.special.body') },
    { icon: 'cards', title: formatMessage('rules.powers.peek.title'), body: formatMessage('rules.powers.peek.body') },
    { icon: 'skull', title: formatMessage('rules.powers.execute.title'), body: formatMessage('rules.powers.execute.body') },
    { icon: 'close', title: formatMessage('rules.powers.veto.title'), body: formatMessage('rules.powers.veto.body') },
  ];
}

function buildWinning(formatMessage: FormatMessage): Bullet[] {
  return [
    { icon: 'capitol', text: formatMessage('rules.winning.liberal') },
    { icon: 'skull', text: formatMessage('rules.winning.fascist') },
  ];
}

function BulletList(props: { items: Bullet[] }) {
  return (
    <ul class={styles.bullets}>
      <For each={props.items}>
        {(bullet) => (
          <li class={styles.bullet}>
            <Icon name={bullet.icon} size={18} class={styles.bulletIcon} />
            <span>{bullet.text}</span>
          </li>
        )}
      </For>
    </ul>
  );
}

function LessonBody(props: { topicId: TopicId; formatMessage: FormatMessage }) {
  const paragraph = (key: MessageKey) => (
    <p class={styles.lead}>{props.formatMessage(key)}</p>
  );

  return (
    <Switch>
      <Match when={props.topicId === 'overview'}>
        <div class={styles.overview}>
          <Icon name="capitol" size={56} class={styles.capitol} />
          <p>{props.formatMessage('rules.overviewBody')}</p>
        </div>
        <SectionTitle centered>{props.formatMessage('rules.components')}</SectionTitle>
        <div class={styles.componentGrid}>
          <For each={buildComponentCards(props.formatMessage)}>
            {(componentCard) => <ComponentCard {...componentCard} />}
          </For>
        </div>
      </Match>
      <Match when={props.topicId === 'setup'}>
        {paragraph('rules.setupBody')}
        <BulletList items={buildSetupPoints(props.formatMessage)} />
      </Match>
      <Match when={props.topicId === 'round'}>
        <ol class={styles.steps}>
          <For each={buildRoundSteps(props.formatMessage)}>
            {(roundStep) => <RuleStep {...roundStep} />}
          </For>
        </ol>
      </Match>
      <Match when={props.topicId === 'fail'}>
        {paragraph('rules.failBody')}
      </Match>
      <Match when={props.topicId === 'powers'}>
        {paragraph('rules.powersBody')}
        <ul class={styles.steps}>
          <For each={buildPowers(props.formatMessage)}>
            {(power) => <RuleStep {...power} />}
          </For>
        </ul>
      </Match>
      <Match when={props.topicId === 'winning'}>
        <BulletList items={buildWinning(props.formatMessage)} />
        <SectionTitle centered>{props.formatMessage('rules.remember')}</SectionTitle>
        <p class={styles.remember}>
          {props.formatMessage('rules.rememberBody')}
          <br />
          <strong>{props.formatMessage('rules.trustNoOne')}</strong>
        </p>
      </Match>
    </Switch>
  );
}

export interface RulesLessonScreenProps {
  topicId: TopicId;
}

/**
 * One rules topic as its own screen so navigation remounts the shell and
 * plays screen-enter. Prev/next replace this screen so back still hits the hub.
 */
export function RulesLessonScreen(props: RulesLessonScreenProps) {
  const { i18n, nav } = useApp();
  const { formatMessage } = i18n;
  const topic = () => TOPICS.find((entry) => entry.id === props.topicId)!;
  const index = () => TOPIC_ORDER.indexOf(props.topicId);

  const goRelative = (delta: number) => {
    const next = TOPIC_ORDER[index() + delta];
    if (next) nav.replace(screenForTopic(next));
  };

  return (
    <Screen fill>
      <div class={styles.page}>
        <ScreenHeader title={formatMessage(topic().titleKey)} />
        <div class={styles.body}>
          <LessonBody topicId={props.topicId} formatMessage={formatMessage} />
          <div class={styles.pager}>
            <button
              type="button"
              class={styles.pagerBtn}
              disabled={index() <= 0}
              onClick={() => goRelative(-1)}
            >
              {formatMessage('common.previous')}
            </button>
            <span class={styles.pagerProgress}>
              {formatMessage('rules.progress', {
                current: index() + 1,
                total: TOPIC_ORDER.length,
              })}
            </span>
            <button
              type="button"
              class={styles.pagerBtn}
              disabled={index() >= TOPIC_ORDER.length - 1}
              onClick={() => goRelative(1)}
            >
              {formatMessage('common.next')}
            </button>
          </div>
        </div>
      </div>
    </Screen>
  );
}
