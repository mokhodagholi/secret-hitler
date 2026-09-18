import { For, Show } from 'solid-js';
import { useApp } from '../../services/AppContext';
import { Screen } from '../../components/Screen/Screen';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { TopicCard } from './TopicCard';
import { HUB_CARDS, TABLE_HUB_CARD, type HubCardDef } from './topics';
import styles from './RulesScreen.module.scss';

/** Topic cards. Each one navigates to its own lesson screen. */
export function RulesScreen() {
  const { i18n, nav, tutorial, flags, settings } = useApp();
  const { formatMessage } = i18n;

  const hubCards = () =>
    flags.flags.onboarding ? [TABLE_HUB_CARD, ...HUB_CARDS] : HUB_CARDS;

  const leaveHub = () => {
    tutorial.dismissAnnouncement();
    nav.back();
  };

  function openCard(card: HubCardDef) {
    if (card.id === 'table') {
      tutorial.startIntro({
        name: settings.settings.profileName.trim() || formatMessage('game.you'),
        avatar: settings.settings.avatar,
      });
    }
    nav.navigate(card.screen);
  }

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
            <For each={hubCards()}>
              {(card) => (
                <TopicCard
                  icon={card.icon}
                  hue={card.hue}
                  bubbleOrigin={card.bubbleOrigin}
                  title={formatMessage(card.titleKey)}
                  onOpen={() => openCard(card)}
                />
              )}
            </For>
          </div>
        </div>
      </div>
    </Screen>
  );
}
