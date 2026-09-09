import { For, Show, createSignal } from 'solid-js';
import type { Policy } from '@secret-hitler/shared';
import type { FormatMessage } from '../../i18n';
import { useApp } from '../../services/AppContext';
import { POLICY_FACE } from '../../assets/cards';
import { Icon } from '../../components/Icon/Icon';
import styles from './LegislativeModal.module.scss';

export interface LegislativeModalProps {
  /** Discard one of three (President) or enact one of two (Chancellor). */
  mode: 'discard' | 'enact';
  policies: Policy[];
  secondsLeft: number;
  canVeto: boolean;
  onPick: (index: number) => void;
  onVeto: () => void;
  formatMessage: FormatMessage;
}

/** Reveal between stagger so the cards flip in one after another. */
const REVEAL_STEP_MS = 110;

/**
 * The legislator's hand, centre stage: cards flip in on open, the chosen one
 * animates away (discard) or flies to the board (enact) before the choice is
 * sent. A 20-second timer counts down to the engine's random pick.
 */
export function LegislativeModal(props: LegislativeModalProps) {
  const { formatMessage } = props;
  const { animation } = useApp();
  const [picking, setPicking] = createSignal(false);
  const cards: (HTMLButtonElement | undefined)[] = [];

  async function pick(index: number): Promise<void> {
    if (picking()) return;
    setPicking(true);
    const exit = props.mode === 'enact' ? 'card-to-board' : 'policy-exit';
    await animation.play(cards[index], exit);
    props.onPick(index);
  }

  return (
    <div
      class={styles.backdrop}
      ref={(element) => void animation.play(element, 'fade-in')}
    >
      <div
        class={styles.dialog}
        role="dialog"
        aria-modal="true"
        ref={(element) => void animation.play(element, 'pop-in')}
      >
        <span class={styles.title}>
          {formatMessage(
            props.mode === 'discard'
              ? 'game.presidentDiscardHint'
              : 'game.chancellorEnactHint',
          )}
        </span>

        <span
          classList={{
            [styles.timer]: true,
            [styles.urgent]: props.secondsLeft <= 4,
            [styles.pulse]: props.secondsLeft <= 4 && animation.motionEnabled(),
          }}
        >
          <Icon name="clock" size={14} />
          {formatMessage('game.secondsLeft', { seconds: props.secondsLeft })}
        </span>

        <div class={styles.cards}>
          <For each={props.policies}>
            {(policy, index) => (
              <button
                type="button"
                class={styles.card}
                disabled={picking()}
                ref={(element) => {
                  cards[index()] = element;
                  void animation.play(element, 'card-flip-in', {
                    delay: index() * REVEAL_STEP_MS,
                    fill: 'backwards',
                  });
                }}
                onClick={() => void pick(index())}
              >
                <img
                  class={styles.cardImage}
                  src={POLICY_FACE[policy]}
                  alt={formatMessage(`game.${policy}`)}
                />
              </button>
            )}
          </For>
        </div>

        <Show when={props.canVeto}>
          <button
            type="button"
            class={styles.veto}
            disabled={picking()}
            onClick={() => props.onVeto()}
          >
            {formatMessage('game.veto.propose')}
          </button>
        </Show>
      </div>
    </div>
  );
}
