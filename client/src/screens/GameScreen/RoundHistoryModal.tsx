import { For, Show, createSignal } from 'solid-js';
import type { RoundHistoryEntry } from '@secret-hitler/shared';
import type { FormatMessage } from '../../i18n';
import { useApp } from '../../services/AppContext';
import { Icon } from '../../components/Icon/Icon';
import styles from './RoundHistoryModal.module.scss';

export interface RoundHistoryModalProps {
  open: boolean;
  rounds: RoundHistoryEntry[];
  formatMessage: FormatMessage;
  onClose: () => void;
}

/** In-match sheet: finished rounds, collapsed by default, expand for full detail. */
export function RoundHistoryModal(props: RoundHistoryModalProps) {
  const { formatMessage } = props;
  const { animation } = useApp();
  const [expanded, setExpanded] = createSignal<number | null>(null);
  const newestFirst = () => [...props.rounds].reverse();

  return (
    <Show when={props.open}>
      <div
        class={styles.backdrop}
        ref={(element) => void animation.play(element, 'fade-in')}
        onClick={(event) => {
          if (event.target === event.currentTarget) props.onClose();
        }}
      >
        <div
          class={styles.sheet}
          role="dialog"
          aria-modal="true"
          aria-label={formatMessage('game.historyTitle')}
          ref={(element) => void animation.play(element, 'pop-in')}
        >
          <header class={styles.header}>
            <span class={styles.title}>{formatMessage('game.historyTitle')}</span>
            <button
              type="button"
              class={styles.close}
              aria-label={formatMessage('common.goBack')}
              onClick={() => props.onClose()}
            >
              <Icon name="close" size={20} />
            </button>
          </header>

          <div class={styles.list}>
            <Show
              when={newestFirst().length > 0}
              fallback={
                <p class={styles.empty}>{formatMessage('game.history.empty')}</p>
              }
            >
              <For each={newestFirst()}>
                {(entry) => {
                  const open = () => expanded() === entry.round;
                  return (
                    <section class={styles.round}>
                      <button
                        type="button"
                        class={styles.roundHeader}
                        aria-expanded={open()}
                        onClick={() =>
                          setExpanded((current) =>
                            current === entry.round ? null : entry.round,
                          )
                        }
                      >
                        <span class={styles.roundTitle}>
                          {formatMessage('game.history.round', { n: entry.round })}
                        </span>
                        <span class={styles.roundSummary}>{summaryLine(entry, formatMessage)}</span>
                        <Icon
                          name={open() ? 'chevronDown' : 'chevronRight'}
                          size={16}
                        />
                      </button>
                      <Show when={open()}>
                        <div class={styles.roundBody}>
                          <p>
                            {formatMessage('game.history.president', {
                              name: entry.presidentName,
                            })}
                          </p>
                          <p>
                            {entry.chancellorName
                              ? formatMessage('game.history.chancellor', {
                                  name: entry.chancellorName,
                                })
                              : formatMessage('game.history.noChancellor')}
                          </p>
                          <Show when={entry.nominationFailed}>
                            <p>{formatMessage('game.history.nominationFailed')}</p>
                          </Show>
                          <Show when={entry.ballots != null}>
                            <>
                              <p>
                                {entry.elected
                                  ? formatMessage('game.history.votePassed', {
                                      ja: entry.ja ?? 0,
                                      nein: entry.nein ?? 0,
                                    })
                                  : formatMessage('game.history.voteFailed', {
                                      ja: entry.ja ?? 0,
                                      nein: entry.nein ?? 0,
                                    })}
                              </p>
                              <p class={styles.votesLabel}>
                                {formatMessage('game.history.votes')}
                              </p>
                              <ul class={styles.ballots}>
                                <For each={entry.ballots!}>
                                  {(ballot) => (
                                    <li>
                                      <span>{ballot.name}</span>
                                      <span class={styles.ballotVote}>
                                        {formatMessage(
                                          ballot.vote === 'ja'
                                            ? 'vote.ja'
                                            : 'vote.nein',
                                        )}
                                        <Show when={ballot.abstained}>
                                          {' '}
                                          (
                                          {formatMessage('game.history.abstained')}
                                          )
                                        </Show>
                                      </span>
                                    </li>
                                  )}
                                </For>
                              </ul>
                            </>
                          </Show>
                          <Show when={entry.vetoAgreed}>
                            <p>{formatMessage('game.history.veto')}</p>
                          </Show>
                          <Show when={entry.chaos}>
                            <p>{formatMessage('game.history.chaos')}</p>
                          </Show>
                          <Show when={entry.enacted === 'liberal'}>
                            <p>{formatMessage('game.history.enactedLiberal')}</p>
                          </Show>
                          <Show when={entry.enacted === 'fascist'}>
                            <p>{formatMessage('game.history.enactedFascist')}</p>
                          </Show>
                          <Show when={entry.power}>
                            {(power) => (
                              <p>{powerLine(power(), formatMessage)}</p>
                            )}
                          </Show>
                        </div>
                      </Show>
                    </section>
                  );
                }}
              </For>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
}

function summaryLine(entry: RoundHistoryEntry, formatMessage: FormatMessage): string {
  if (entry.nominationFailed) {
    return formatMessage('game.history.nominationFailed');
  }
  if (entry.vetoAgreed) return formatMessage('game.history.veto');
  if (entry.chaos) return formatMessage('game.history.chaos');
  if (entry.enacted === 'liberal') {
    return formatMessage('game.history.enactedLiberal');
  }
  if (entry.enacted === 'fascist') {
    return formatMessage('game.history.enactedFascist');
  }
  if (entry.elected === true) {
    return formatMessage('game.history.votePassed', {
      ja: entry.ja ?? 0,
      nein: entry.nein ?? 0,
    });
  }
  if (entry.elected === false && entry.ballots) {
    return formatMessage('game.history.voteFailed', {
      ja: entry.ja ?? 0,
      nein: entry.nein ?? 0,
    });
  }
  if (entry.chancellorName) {
    return formatMessage('game.history.chancellor', {
      name: entry.chancellorName,
    });
  }
  return '';
}

function powerLine(
  power: NonNullable<RoundHistoryEntry['power']>,
  formatMessage: FormatMessage,
): string {
  switch (power.kind) {
    case 'investigate':
      return formatMessage('game.history.powerInvestigate', {
        name: power.targetName ?? '',
      });
    case 'execution':
      return formatMessage('game.history.powerExecute', {
        name: power.targetName ?? '',
      });
    case 'policyPeek':
      return formatMessage('game.history.powerPeek');
    case 'specialElection':
      return formatMessage('game.history.powerSpecial', {
        name: power.targetName ?? '',
      });
  }
}
