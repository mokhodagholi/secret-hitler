import { createSignal } from 'solid-js';
import { useApp } from '../../services/AppContext';
import type { FormatMessage } from '../../i18n';
import { APP_NAV } from '../../components/BottomNav/BottomNav';
import { Screen } from '../../components/Screen/Screen';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { Swiper } from '../../components/Swiper/Swiper';
import { TutorialStep, type TutorialStepProps } from './TutorialStep';
import styles from './HowToPlayScreen.module.scss';

function buildTutorialSteps(formatMessage: FormatMessage): TutorialStepProps[] {
  return [
    {
      number: 1,
      icon: 'masks',
      title: formatMessage('howToPlay.steps.roles.title'),
      subtitle: formatMessage('howToPlay.steps.roles.subtitle'),
      art: ['people', 'masks', 'skull'],
      points: [
        { icon: 'people', text: formatMessage('howToPlay.steps.roles.points.liberals') },
        { icon: 'masks', text: formatMessage('howToPlay.steps.roles.points.fascists') },
        { icon: 'skull', text: formatMessage('howToPlay.steps.roles.points.hitler') },
      ],
    },
    {
      number: 2,
      icon: 'crown',
      title: formatMessage('howToPlay.steps.elect.title'),
      subtitle: formatMessage('howToPlay.steps.elect.subtitle'),
      art: ['crown', 'people', 'star'],
      points: [
        { icon: 'refresh', text: formatMessage('howToPlay.steps.elect.points.rotate') },
        { icon: 'crown', text: formatMessage('howToPlay.steps.elect.points.nominate') },
        { icon: 'people', text: formatMessage('howToPlay.steps.elect.points.vote') },
        { icon: 'clock', text: formatMessage('howToPlay.steps.elect.points.term') },
      ],
    },
    {
      number: 3,
      icon: 'clock',
      title: formatMessage('howToPlay.steps.fail.title'),
      subtitle: formatMessage('howToPlay.steps.fail.subtitle'),
      art: ['clock', 'scroll', 'capitol'],
      points: [
        { icon: 'clock', text: formatMessage('howToPlay.steps.fail.points.tracker') },
        { icon: 'capitol', text: formatMessage('howToPlay.steps.fail.points.chaos') },
      ],
    },
    {
      number: 4,
      icon: 'scroll',
      title: formatMessage('howToPlay.steps.enact.title'),
      subtitle: formatMessage('howToPlay.steps.enact.subtitle'),
      art: ['cards', 'scroll', 'capitol'],
      points: [
        { icon: 'cards', text: formatMessage('howToPlay.steps.enact.points.president') },
        { icon: 'scroll', text: formatMessage('howToPlay.steps.enact.points.chancellor') },
        { icon: 'close', text: formatMessage('howToPlay.steps.enact.points.silence') },
        { icon: 'question', text: formatMessage('howToPlay.steps.enact.points.veto') },
      ],
    },
    {
      number: 5,
      icon: 'star',
      title: formatMessage('howToPlay.steps.powers.title'),
      subtitle: formatMessage('howToPlay.steps.powers.subtitle'),
      art: ['question', 'refresh', 'skull'],
      points: [
        { icon: 'question', text: formatMessage('howToPlay.steps.powers.points.investigate') },
        { icon: 'refresh', text: formatMessage('howToPlay.steps.powers.points.special') },
        { icon: 'cards', text: formatMessage('howToPlay.steps.powers.points.peek') },
        { icon: 'skull', text: formatMessage('howToPlay.steps.powers.points.execute') },
      ],
    },
    {
      number: 6,
      icon: 'capitol',
      title: formatMessage('howToPlay.steps.agenda.title'),
      subtitle: formatMessage('howToPlay.steps.agenda.subtitle'),
      art: ['capitol', 'star', 'skull'],
      points: [
        { icon: 'capitol', text: formatMessage('howToPlay.steps.agenda.points.liberalPolicies') },
        { icon: 'skull', text: formatMessage('howToPlay.steps.agenda.points.liberalExecute') },
        { icon: 'cards', text: formatMessage('howToPlay.steps.agenda.points.fascistPolicies') },
        { icon: 'crown', text: formatMessage('howToPlay.steps.agenda.points.fascistHitler') },
      ],
    },
    {
      number: 7,
      icon: 'question',
      title: formatMessage('howToPlay.steps.tips.title'),
      subtitle: formatMessage('howToPlay.steps.tips.subtitle'),
      art: ['masks', 'people', 'question'],
      points: [
        { icon: 'people', text: formatMessage('howToPlay.steps.tips.points.watch') },
        { icon: 'skull', text: formatMessage('howToPlay.steps.tips.points.hitler') },
        { icon: 'masks', text: formatMessage('howToPlay.steps.tips.points.fascist') },
        { icon: 'capitol', text: formatMessage('howToPlay.steps.tips.points.liberal') },
      ],
    },
  ];
}

export function HowToPlayScreen() {
  const { formatMessage } = useApp().i18n;
  const steps = buildTutorialSteps(formatMessage);
  const [index, setIndex] = createSignal(0);

  const counter = () =>
    formatMessage('howToPlay.counter', {
      current: index() + 1,
      total: steps.length,
    });

  return (
    <Screen nav={APP_NAV}>
      <ScreenHeader
        title={formatMessage('howToPlay.title')}
        right={<span class={styles.counter}>{counter()}</span>}
      />

      <Swiper
        items={steps}
        index={index()}
        onIndexChange={setIndex}
        label={formatMessage('howToPlay.title')}
      >
        {(step) => <TutorialStep {...step} />}
      </Swiper>
    </Screen>
  );
}
