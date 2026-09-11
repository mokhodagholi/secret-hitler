import { For, onCleanup } from 'solid-js';
import { useApp } from '../../services/AppContext';
import { Screen } from '../../components/Screen/Screen';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { PORTRAITS } from '../../assets/avatars';
import styles from './PlayerCardsScreen.module.scss';

/**
 * Grid of illustrated player cards. Tapping one stores it locally; the
 * server is updated once when leaving so the same face is used in the next room.
 */
export function PlayerCardsScreen() {
  const { settings, i18n, game, bale } = useApp();
  const { formatMessage } = i18n;
  const initialAvatar = settings.settings.avatar;
  let persisted = false;

  const persist = () => {
    if (persisted) return;
    const avatar = settings.settings.avatar;
    if (avatar === initialAvatar) return;
    persisted = true;
    void game.saveProfile({
      avatar,
      clientId: settings.settings.profileId,
      initData: bale.initData(),
    });
  };

  const onPageHide = () => persist();
  window.addEventListener('pagehide', onPageHide);
  onCleanup(() => {
    window.removeEventListener('pagehide', onPageHide);
    persist();
  });

  const select = (index: number) => {
    settings.set('avatar', index);
  };

  return (
    <Screen fill>
      <div class={styles.page}>
        <ScreenHeader title={formatMessage('playerCards.title')} tone="warm" />
        <div class={styles.grid} role="list">
          <For each={PORTRAITS}>
            {(portrait, index) => (
              <button
                type="button"
                role="listitem"
                classList={{
                  [styles.card]: true,
                  [styles.selected]: settings.settings.avatar === index(),
                }}
                aria-label={portrait.persian}
                aria-pressed={settings.settings.avatar === index()}
                onClick={() => select(index())}
              >
                <span class={styles.paper}>
                  <img class={styles.face} src={portrait.src} alt="" />
                </span>
                <span class={styles.caption} dir="rtl">
                  {portrait.persian}
                </span>
              </button>
            )}
          </For>
        </div>
      </div>
    </Screen>
  );
}
