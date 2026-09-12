import { Show } from 'solid-js';
import { useApp } from '../../services/AppContext';
import { Icon, type IconName } from '../../components/Icon/Icon';
import styles from './RulesScreen.module.scss';

export interface RuleStepProps {
  /** Omitted for unordered reference lists (powers), shown for round steps. */
  number?: number;
  icon?: IconName;
  title: string;
  body: string;
}

/** One rule entry: optional icon or number badge, gold heading, description. */
export function RuleStep(props: RuleStepProps) {
  const { formatMessage } = useApp().i18n;
  return (
    <li class={styles.step}>
      <span class={styles.badge}>
        <Show
          when={props.icon}
          fallback={
            <span class={styles.stepIndex}>
              {formatMessage('rules.stepNumber', { number: props.number ?? 0 })}
            </span>
          }
        >
          {(icon) => (
            <>
              <Icon name={icon()} size={22} />
              <Show when={props.number !== undefined}>
                <span class={styles.num}>
                  {formatMessage('rules.stepNumber', { number: props.number ?? 0 })}
                </span>
              </Show>
            </>
          )}
        </Show>
      </span>
      <div>
        <h3 class={styles.stepTitle}>{props.title}</h3>
        <p class={styles.stepBody}>{props.body}</p>
      </div>
    </li>
  );
}
