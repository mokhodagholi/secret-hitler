import { For, Show } from 'solid-js';
import { useApp } from '../../services/AppContext';
import { Screen } from '../../components/Screen/Screen';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { TopicCard } from './TopicCard';
import { HUB_CARDS } from './topics';
import styles from './RulesScreen.module.scss';

/** Topic cards. Each one navigates to its own lesson screen. */
export function RulesScreen() {
  const { i18n, nav, tutorial } = useApp();
  const { formatMessage } = i18n;

  const leaveHub = () => {
    tutorial.dismissAnnouncement();
    nav.back();
  };

  return (
    <Screen fill>
      <div class={styles.page}>
        <ScreenHeader
          title={formatMessage('rules.title')}
          onBack={tutorial.announcing() ? leaveHub : undefined}
        />
        <div class={styles.body}>
          <Show when={tutorial.announcing()}>
            <div class={styles.announce} role="status">
              <p class={styles.announceBody}>{formatMessage('tutorial.announce')}</p>
              <button
                type="button"
                class={styles.announceAction}
                onClick={() => tutorial.dismissAnnouncement()}
              >
                {formatMessage('tutorial.continue')}
              </button>
            </div>
          </Show>
          <div class={styles.topicGrid}>
            <For each={HUB_CARDS}>
              {(card) => (
                <TopicCard
                  icon={card.icon}
                  hue={card.hue}
                  bubbleOrigin={card.bubbleOrigin}
                  title={formatMessage(card.titleKey)}
                  onOpen={() => nav.navigate(card.screen)}
                />
              )}
            </For>
          </div>
        </div>
      </div>
    </Screen>
  );
}
