import { For } from 'solid-js';
import { buildRoleBag } from '@secret-hitler/shared';
import type { FormatMessage } from '../../i18n';
import styles from './RulesScreen.module.scss';

const TABLE_SIZES = [5, 6, 7, 8, 9, 10] as const;

function mixFor(playerCount: number) {
  const bag = buildRoleBag(playerCount);
  return {
    liberals: bag.filter((role) => role === 'liberal').length,
    fascists: bag.filter((role) => role === 'fascist').length,
    /** 5–6: Hitler opens eyes with the Fascists. 7–10: he does not. */
    hitlerSeesTeam: playerCount <= 6,
  };
}

export interface SetupMixProps {
  formatMessage: FormatMessage;
}

/** One coloured row per table size so the mix is a picture, not a paragraph. */
export function SetupMix(props: SetupMixProps) {
  const { formatMessage } = props;
  return (
    <ul class={styles.mix}>
      <For each={[...TABLE_SIZES]}>
        {(playerCount) => {
          const mix = mixFor(playerCount);
          return (
            <li class={styles.mixRow}>
              <span class={styles.mixCount}>
                {formatMessage('rules.setupMix.players', { count: playerCount })}
              </span>
              <span class={styles.mixBadges}>
                <span class={`${styles.mixBadge} ${styles.mixLiberal}`}>
                  <strong>
                    {formatMessage('rules.stepNumber', { number: mix.liberals })}
                  </strong>
                  {formatMessage('rules.setupMix.liberal')}
                </span>
                <span class={`${styles.mixBadge} ${styles.mixFascist}`}>
                  <strong>
                    {formatMessage('rules.stepNumber', { number: mix.fascists })}
                  </strong>
                  {formatMessage('rules.setupMix.fascist')}
                </span>
                <span class={`${styles.mixBadge} ${styles.mixHitler}`}>
                  <strong>{formatMessage('rules.stepNumber', { number: 1 })}</strong>
                  {formatMessage('rules.setupMix.hitler')}
                </span>
              </span>
              <span
                classList={{
                  [styles.mixNight]: true,
                  [styles.mixNightTogether]: mix.hitlerSeesTeam,
                  [styles.mixNightBlind]: !mix.hitlerSeesTeam,
                }}
              >
                {formatMessage(
                  mix.hitlerSeesTeam
                    ? 'rules.setupMix.nightSmall'
                    : 'rules.setupMix.nightLarge',
                )}
              </span>
            </li>
          );
        }}
      </For>
    </ul>
  );
}
