import { For } from 'solid-js';
import { useApp } from '../../services/AppContext';
import { Screen } from '../../components/Screen/Screen';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { PAPER_FRAME, PORTRAITS } from '../../assets/avatars';
import styles from './PlayerCardsScreen.module.scss';

/**
 * Grid of illustrated player cards. Tapping one stores it locally and on
 * the server so the same face is used in the next room.
 */
export function PlayerCardsScreen() {
  const { nav, settings, i18n, game, bale } = useApp();
  const { formatMessage } = i18n;

  const select = (index: number) => {
    settings.set('avatar', index);
    void game.saveProfile({
      avatar: index,
      clientId: settings.settings.profileId,
      initData: bale.initData(),
    });
    nav.back();
  };

  return (
    <Screen>
      <div class={styles.page}>
        <ScreenHeader title={formatMessage('playerCards.title')} tone="warm" />
        <p class={styles.hint} dir="auto">
          {formatMessage('playerCards.choose')}
        </p>
        <div class={styles.grid} role="list">
          <For each={PORTRAITS}>
            {(src, index) => (
              <button
                type="button"
                role="listitem"
                classList={{
                  [styles.card]: true,
                  [styles.selected]: settings.settings.avatar === index(),
                }}
                aria-label={formatMessage('playerCards.card', { n: index() + 1 })}
                aria-pressed={settings.settings.avatar === index()}
                onClick={() => select(index())}
              >
                <span class={styles.paper}>
                  <img class={styles.frame} src={PAPER_FRAME} alt="" />
                  <img class={styles.face} src={src} alt="" />
                </span>
              </button>
            )}
          </For>
        </div>
      </div>
    </Screen>
  );
}
