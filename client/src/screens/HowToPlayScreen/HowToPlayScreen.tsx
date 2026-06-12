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
      icon: 'people',
      title: formatMessage('howToPlay.steps.deal.title'),
      subtitle: formatMessage('howToPlay.steps.deal.subtitle'),
      art: ['masks', 'people', 'skull'],
      points: [
        { icon: 'masks', text: formatMessage('howToPlay.steps.deal.points.fascists') },
        { icon: 'people', text: formatMessage('howToPlay.steps.deal.points.liberals') },
      ],
    },
    {
      number: 2,
      icon: 'crown',
      title: formatMessage('howToPlay.steps.elect.title'),
      subtitle: formatMessage('howToPlay.steps.elect.subtitle'),
      art: ['crown', 'people', 'star'],
      points: [
        { icon: 'crown', text: formatMessage('howToPlay.steps.elect.points.nominate') },
        { icon: 'people', text: formatMessage('howToPlay.steps.elect.points.vote') },
      ],
    },
    {
      number: 3,
      icon: 'scroll',
      title: formatMessage('howToPlay.steps.enact.title'),
      subtitle: formatMessage('howToPlay.steps.enact.subtitle'),
      art: ['cards', 'scroll', 'capitol'],
      points: [
        { icon: 'cards', text: formatMessage('howToPlay.steps.enact.points.president') },
        { icon: 'scroll', text: formatMessage('howToPlay.steps.enact.points.chancellor') },
      ],
    },
    {
      number: 4,
      icon: 'star',
      title: formatMessage('howToPlay.steps.agenda.title'),
      subtitle: formatMessage('howToPlay.steps.agenda.subtitle'),
      art: ['capitol', 'star', 'skull'],
      points: [
        { icon: 'capitol', text: formatMessage('howToPlay.steps.agenda.points.liberal') },
        { icon: 'skull', text: formatMessage('howToPlay.steps.agenda.points.fascist') },
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
        prevLabel={formatMessage('common.previous')}
        nextLabel={formatMessage('common.next')}
      >
        {(step) => <TutorialStep {...step} />}
      </Swiper>
    </Screen>
  );
}
