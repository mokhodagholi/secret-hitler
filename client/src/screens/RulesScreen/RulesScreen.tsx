import { For } from 'solid-js';
import { APP_NAV } from '../../components/BottomNav/BottomNav';
import { Icon } from '../../components/Icon/Icon';
import { Screen } from '../../components/Screen/Screen';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { SectionTitle } from '../../components/SectionTitle/SectionTitle';
import { ComponentCard, type ComponentCardProps } from './ComponentCard';
import { RuleStep, type RuleStepProps } from './RuleStep';
import styles from './RulesScreen.module.scss';

const COMPONENTS: ComponentCardProps[] = [
  { icon: 'people', label: '17 Role Cards', tone: 'gold' },
  { icon: 'cards', label: 'Policy Deck', tone: 'fascist' },
  { icon: 'scroll', label: 'Policy Tracker', tone: 'liberal' },
  { icon: 'envelope', label: 'Envelope', tone: 'neutral' },
];

const STEPS: RuleStepProps[] = [
  {
    number: 1,
    icon: 'people',
    title: 'Deal Roles',
    body: 'Each player is secretly assigned a role.',
  },
  {
    number: 2,
    icon: 'star',
    title: 'Elect a President',
    body: 'Players elect a President and Chancellor.',
  },
  {
    number: 3,
    icon: 'scroll',
    title: 'Enact Policies',
    body: 'The government draws and enacts policies. Track the policies on the board.',
  },
  {
    number: 4,
    icon: 'skull',
    title: 'Achieve Your Agenda',
    body: 'Liberals win by passing 5 Liberal policies. Fascists win by passing 6 Fascist policies or electing Hitler as Chancellor after 3 Fascist policies.',
  },
];

export function RulesScreen() {
  return (
    <Screen nav={APP_NAV}>
      <ScreenHeader title="Rules" />

      <SectionTitle centered>Overview</SectionTitle>
      <div class={styles.overview}>
        <Icon name="capitol" size={56} class={styles.capitol} />
        <p>
          Secret Hitler is a game of hidden identities and suspicion. Liberals
          must pass policies and elect a Liberal government. Hitler and the
          Fascists must sabotage the government and pass Fascist policies.
        </p>
      </div>

      <SectionTitle centered>Components</SectionTitle>
      <div class={styles.componentGrid}>
        <For each={COMPONENTS}>{(c) => <ComponentCard {...c} />}</For>
      </div>

      <SectionTitle centered>How to Play</SectionTitle>
      <ol class={styles.steps}>
        <For each={STEPS}>{(step) => <RuleStep {...step} />}</For>
      </ol>

      <SectionTitle centered>Remember</SectionTitle>
      <p class={styles.remember}>
        Deduction, deception, and discussion are your greatest weapons.
        <br />
        <strong>Trust no one.</strong>
      </p>
    </Screen>
  );
}
