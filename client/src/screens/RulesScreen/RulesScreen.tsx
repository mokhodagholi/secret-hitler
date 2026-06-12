import { For } from 'solid-js';
import { useApp } from '../../services/AppContext';
import type { FormatMessage } from '../../i18n';
import { APP_NAV } from '../../components/BottomNav/BottomNav';
import { Icon } from '../../components/Icon/Icon';
import { Screen } from '../../components/Screen/Screen';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { SectionTitle } from '../../components/SectionTitle/SectionTitle';
import { ComponentCard, type ComponentCardProps } from './ComponentCard';
import { RuleStep, type RuleStepProps } from './RuleStep';
import styles from './RulesScreen.module.scss';

function buildComponentCards(formatMessage: FormatMessage): ComponentCardProps[] {
  return [
    { icon: 'people', label: formatMessage('rules.componentCards.roleCards'), tone: 'gold' },
    { icon: 'cards', label: formatMessage('rules.componentCards.policyDeck'), tone: 'fascist' },
    { icon: 'scroll', label: formatMessage('rules.componentCards.policyTracker'), tone: 'liberal' },
    { icon: 'envelope', label: formatMessage('rules.componentCards.envelope'), tone: 'neutral' },
  ];
}

function buildRuleSteps(formatMessage: FormatMessage): RuleStepProps[] {
  return [
    { number: 1, icon: 'people', title: formatMessage('rules.steps.deal.title'), body: formatMessage('rules.steps.deal.body') },
    { number: 2, icon: 'star', title: formatMessage('rules.steps.elect.title'), body: formatMessage('rules.steps.elect.body') },
    { number: 3, icon: 'scroll', title: formatMessage('rules.steps.enact.title'), body: formatMessage('rules.steps.enact.body') },
    { number: 4, icon: 'skull', title: formatMessage('rules.steps.agenda.title'), body: formatMessage('rules.steps.agenda.body') },
  ];
}

export function RulesScreen() {
  const { formatMessage } = useApp().i18n;
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

      <SectionTitle centered>{formatMessage('rules.howToPlay')}</SectionTitle>
      <ol class={styles.steps}>
        <For each={buildRuleSteps(formatMessage)}>
          {(ruleStep) => <RuleStep {...ruleStep} />}
        </For>
      </ol>

      <SectionTitle centered>{formatMessage('rules.remember')}</SectionTitle>
      <p class={styles.remember}>
        {formatMessage('rules.rememberBody')}
        <br />
        <strong>{formatMessage('rules.trustNoOne')}</strong>
      </p>
    </Screen>
  );
}
