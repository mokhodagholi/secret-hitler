import { For } from 'solid-js';
import { useApp } from '../../services/AppContext';
import { Screen } from '../../components/Screen/Screen';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { TopicCard } from './TopicCard';
import { TOPICS } from './topics';
import styles from './RulesScreen.module.scss';

/** Written guide: the lesson cards that used to sit on the rules hub. */
export function TextTutorialScreen() {
  const { i18n, nav } = useApp();
  const { formatMessage } = i18n;

  return (
    <Screen fill>
      <div class={styles.page}>
        <ScreenHeader title={formatMessage('tutorial.text')} />
        <div class={styles.body}>
          <div class={styles.topicGrid}>
            <For each={TOPICS}>
              {(topic) => (
                <TopicCard
                  icon={topic.icon}
                  hue={topic.hue}
                  bubbleOrigin={topic.bubbleOrigin}
                  title={formatMessage(topic.titleKey)}
                  onOpen={() => nav.navigate(topic.screen)}
                />
              )}
            </For>
          </div>
        </div>
      </div>
    </Screen>
  );
}
