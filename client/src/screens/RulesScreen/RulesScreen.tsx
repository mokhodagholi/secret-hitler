import { For } from 'solid-js';
import { useApp } from '../../services/AppContext';
import type { FormatMessage, MessageKey } from '../../i18n';
import { APP_NAV } from '../../components/BottomNav/BottomNav';
import { Icon, type IconName } from '../../components/Icon/Icon';
import { Screen } from '../../components/Screen/Screen';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { SectionTitle } from '../../components/SectionTitle/SectionTitle';
import { ComponentCard, type ComponentCardProps } from './ComponentCard';
import { RuleStep, type RuleStepProps } from './RuleStep';
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

export function RulesScreen() {
  const { formatMessage } = useApp().i18n;
  const paragraph = (key: MessageKey) => <p class={styles.lead}>{formatMessage(key)}</p>;
  return (
    <Screen nav={APP_NAV}>
      <ScreenHeader title={formatMessage('rules.title')} />

      <SectionTitle centered>{formatMessage('rules.overview')}</SectionTitle>
      <div class={styles.overview}>
        <Icon name="capitol" size={56} class={styles.capitol} />
        <p>{formatMessage('rules.overviewBody')}</p>
      </div>

      <SectionTitle centered>{formatMessage('rules.components')}</SectionTitle>
      <div class={styles.componentGrid}>
        <For each={buildComponentCards(formatMessage)}>
          {(componentCard) => <ComponentCard {...componentCard} />}
        </For>
      </div>

      <SectionTitle centered>{formatMessage('rules.setup')}</SectionTitle>
      {paragraph('rules.setupBody')}
      <BulletList items={buildSetupPoints(formatMessage)} />

      <SectionTitle centered>{formatMessage('rules.roundTitle')}</SectionTitle>
      <ol class={styles.steps}>
        <For each={buildRoundSteps(formatMessage)}>
          {(roundStep) => <RuleStep {...roundStep} />}
        </For>
      </ol>

      <SectionTitle centered>{formatMessage('rules.failTitle')}</SectionTitle>
      {paragraph('rules.failBody')}

      <SectionTitle centered>{formatMessage('rules.powersTitle')}</SectionTitle>
      <ul class={styles.steps}>
        <For each={buildPowers(formatMessage)}>
          {(power) => <RuleStep {...power} />}
        </For>
      </ul>

      <SectionTitle centered>{formatMessage('rules.winningTitle')}</SectionTitle>
      <BulletList items={buildWinning(formatMessage)} />

      <SectionTitle centered>{formatMessage('rules.remember')}</SectionTitle>
      <p class={styles.remember}>
        {formatMessage('rules.rememberBody')}
        <br />
        <strong>{formatMessage('rules.trustNoOne')}</strong>
      </p>
    </Screen>
  );
}
