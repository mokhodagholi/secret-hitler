import { For, Match, Switch } from 'solid-js';
import { useApp } from '../../services/AppContext';
import type { FormatMessage, MessageKey } from '../../i18n';
import { Screen } from '../../components/Screen/Screen';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { SectionTitle } from '../../components/SectionTitle/SectionTitle';
import {
  PARTY_FACE,
  POLICY_FACE,
  ROLE_FACES,
  VOTE_FACE,
} from '../../assets/cards';
import liberalBoard from '../../assets/boards/liberal.png';
import fascistBoard from '../../assets/boards/fascist.png';
import { KitPiece, type KitPieceProps } from './KitPiece';
import { RuleStep, type RuleStepProps } from './RuleStep';
import { SetupMix } from './SetupMix';
import { RoundRoad } from './RoundRoad';
import { FailTracker } from './FailTracker';
import { WhatIsThisLesson } from './WhatIsThisLesson';
import { LawsLesson } from './LawsLesson';
import {
  TOPIC_ORDER,
  TOPICS,
  screenForTopic,
  type TopicId,
} from './topics';
import styles from './RulesScreen.module.scss';

function buildKit(formatMessage: FormatMessage): KitPieceProps[] {
  return [
    {
      title: formatMessage('rules.kit.policy.title'),
      body: formatMessage('rules.kit.policy.body'),
      images: [POLICY_FACE.liberal, POLICY_FACE.fascist],
      kind: 'portrait',
    },
    {
      title: formatMessage('rules.kit.role.title'),
      body: formatMessage('rules.kit.role.body'),
      images: [
        ...ROLE_FACES.liberal,
        ...ROLE_FACES.fascist,
        ...ROLE_FACES.hitler,
      ],
      kind: 'portrait',
    },
    {
      title: formatMessage('rules.kit.party.title'),
      body: formatMessage('rules.kit.party.body'),
      images: [PARTY_FACE.liberal, PARTY_FACE.fascist],
      kind: 'portrait',
    },
    {
      title: formatMessage('rules.kit.vote.title'),
      body: formatMessage('rules.kit.vote.body'),
      images: [VOTE_FACE.ja, VOTE_FACE.nein],
      kind: 'landscape',
    },
    {
      title: formatMessage('rules.kit.office.title'),
      body: formatMessage('rules.kit.office.body'),
      kind: 'office',
      badges: [
        {
          label: formatMessage('game.president'),
          tone: 'president',
        },
        {
          label: formatMessage('game.chancellor'),
          tone: 'chancellor',
        },
      ],
    },
    {
      title: formatMessage('rules.kit.boards.title'),
      body: formatMessage('rules.kit.boards.body'),
      images: [liberalBoard, fascistBoard],
      kind: 'board',
    },
  ];
}

function buildRoundSteps(formatMessage: FormatMessage): RuleStepProps[] {
  return [
    { number: 1, title: formatMessage('rules.steps.nominate.title'), body: formatMessage('rules.steps.nominate.body') },
    { number: 2, title: formatMessage('rules.steps.elect.title'), body: formatMessage('rules.steps.elect.body') },
    { number: 3, title: formatMessage('rules.steps.enact.title'), body: formatMessage('rules.steps.enact.body') },
    { number: 4, title: formatMessage('rules.steps.executive.title'), body: formatMessage('rules.steps.executive.body') },
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

function buildWinningSides(formatMessage: FormatMessage): RuleStepProps[] {
  return [
    {
      icon: 'capitol',
      title: formatMessage('rules.winning.liberals'),
      body: formatMessage('rules.winning.liberalBody'),
    },
    {
      icon: 'skull',
      title: formatMessage('rules.winning.fascists'),
      body: formatMessage('rules.winning.fascistBody'),
    },
  ];
}

function buildWinningScenarios(formatMessage: FormatMessage): RuleStepProps[] {
  return [
    {
      icon: 'crown',
      title: formatMessage('rules.winning.hitlerChancellor.title'),
      body: formatMessage('rules.winning.hitlerChancellor.body'),
    },
    {
      icon: 'fist',
      title: formatMessage('rules.winning.execution.title'),
      body: formatMessage('rules.winning.execution.body'),
    },
    {
      icon: 'masks',
      title: formatMessage('rules.winning.trustedHitler.title'),
      body: formatMessage('rules.winning.trustedHitler.body'),
    },
    {
      icon: 'cards',
      title: formatMessage('rules.winning.chaos.title'),
      body: formatMessage('rules.winning.chaos.body'),
    },
  ];
}

function buildOnlineDiffs(formatMessage: FormatMessage): RuleStepProps[] {
  return [
    {
      icon: 'people',
      title: formatMessage('rules.online.vote.title'),
      body: formatMessage('rules.online.vote.body'),
    },
    {
      icon: 'crown',
      title: formatMessage('rules.online.office.title'),
      body: formatMessage('rules.online.office.body'),
    },
    {
      icon: 'door',
      title: formatMessage('rules.online.leave.title'),
      body: formatMessage('rules.online.leave.body'),
    },
    {
      icon: 'clock',
      title: formatMessage('rules.online.clocks.title'),
      body: formatMessage('rules.online.clocks.body'),
      items: [
        formatMessage('rules.online.clocks.vote'),
        formatMessage('rules.online.clocks.veto'),
        formatMessage('rules.online.clocks.law'),
        formatMessage('rules.online.clocks.why'),
      ],
    },
  ];
}

function RoundLesson(props: { formatMessage: FormatMessage }) {
  const roundSteps = () => buildRoundSteps(props.formatMessage);
  return (
    <>
      <RoundRoad
        stops={roundSteps().map((step) => ({
          number: step.number ?? 0,
          title: step.title,
        }))}
      />
      <ol class={styles.steps}>
        <For each={roundSteps()}>
          {(roundStep) => <RuleStep {...roundStep} />}
        </For>
      </ol>
    </>
  );
}

function LessonBody(props: { topicId: TopicId; formatMessage: FormatMessage }) {
  const paragraph = (key: MessageKey) => (
    <p class={styles.lead}>{props.formatMessage(key)}</p>
  );

  return (
    <Switch>
      <Match when={props.topicId === 'whatIsThis'}>
        <WhatIsThisLesson formatMessage={props.formatMessage} />
      </Match>
      <Match when={props.topicId === 'contents'}>
        <div class={styles.kit}>
          <For each={buildKit(props.formatMessage)}>
            {(piece) => <KitPiece {...piece} />}
          </For>
        </div>
      </Match>
      <Match when={props.topicId === 'laws'}>
        <LawsLesson formatMessage={props.formatMessage} />
      </Match>
      <Match when={props.topicId === 'roles'}>
        {paragraph('rules.setupBody')}
        <SetupMix formatMessage={props.formatMessage} />
      </Match>
      <Match when={props.topicId === 'eachRound'}>
        <RoundLesson formatMessage={props.formatMessage} />
      </Match>
      <Match when={props.topicId === 'failedGovernment'}>
        <FailTracker formatMessage={props.formatMessage} />
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
      <Match when={props.topicId === 'howToWin'}>
        {paragraph('rules.winning.lead')}
        <ul class={styles.steps}>
          <For each={buildWinningSides(props.formatMessage)}>
            {(side) => <RuleStep {...side} />}
          </For>
        </ul>
        <SectionTitle centered>{props.formatMessage('rules.winning.scenarios')}</SectionTitle>
        <ul class={styles.steps}>
          <For each={buildWinningScenarios(props.formatMessage)}>
            {(scenario) => <RuleStep {...scenario} />}
          </For>
        </ul>
        <SectionTitle centered>{props.formatMessage('rules.remember')}</SectionTitle>
        <p class={styles.remember}>
          {props.formatMessage('rules.rememberBody')}
          <br />
          <strong>{props.formatMessage('rules.trustNoOne')}</strong>
        </p>
      </Match>
      <Match when={props.topicId === 'online'}>
        {paragraph('rules.online.lead')}
        <ul class={styles.steps}>
          <For each={buildOnlineDiffs(props.formatMessage)}>
            {(diff) => <RuleStep {...diff} />}
          </For>
        </ul>
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
        </div>
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
    </Screen>
  );
}
