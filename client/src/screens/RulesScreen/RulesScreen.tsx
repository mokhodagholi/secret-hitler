import { For } from 'solid-js';
import { useApp } from '../../services/AppContext';
import { Screen } from '../../components/Screen/Screen';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { TopicCard } from './TopicCard';
import { TOPICS, screenForTopic } from './topics';
import styles from './RulesScreen.module.scss';

/** Topic cards. Each one navigates to its own lesson screen. */
export function RulesScreen() {
  const { i18n, nav } = useApp();
  const { formatMessage } = i18n;

  return (
    <Screen fill>
      <div class={styles.page}>
        <ScreenHeader title={formatMessage('rules.title')} />
        <div class={styles.body}>
          <div class={styles.topicGrid}>
            <For each={TOPICS}>
              {(topic) => (
                <TopicCard
                  icon={topic.icon}
                  hue={topic.hue}
                  bubbleOrigin={topic.bubbleOrigin}
                  title={formatMessage(topic.titleKey)}
                  onOpen={() => nav.navigate(screenForTopic(topic.id))}
                />
              )}
            </For>
          </div>
        </div>
      </div>
    </Screen>
  );
}
