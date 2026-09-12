import { For } from 'solid-js';
import { useApp } from '../../services/AppContext';
import styles from './RulesScreen.module.scss';

export interface RoundRoadStop {
  number: number;
  title: string;
}

export interface RoundRoadProps {
  stops: RoundRoadStop[];
}

/** A numbered path of the four beats in a round. Details live below. */
export function RoundRoad(props: RoundRoadProps) {
  const { formatMessage } = useApp().i18n;
  return (
    <ol class={styles.road}>
      <For each={props.stops}>
        {(stop) => (
          <li class={styles.roadStop}>
            <span class={styles.roadNum}>
              {formatMessage('rules.stepNumber', { number: stop.number })}
            </span>
            <span class={styles.roadTitle}>{stop.title}</span>
          </li>
        )}
      </For>
    </ol>
  );
}
