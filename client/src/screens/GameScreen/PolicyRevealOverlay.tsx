import type { Policy } from '@secret-hitler/shared';
import styles from './PolicyRevealOverlay.module.scss';

export interface PolicyRevealOverlayProps {
  policy: Policy;
  /** Already-formatted "A … Policy was enacted" line. */
  label: string;
  /** The animated card element — GameScreen drives its reveal/exit beats. */
  cardRef: (element: HTMLDivElement) => void;
}

/** Centre-stage card shown while the policy-enactment sequence plays. */
export function PolicyRevealOverlay(props: PolicyRevealOverlayProps) {
  return (
    <div class={styles.stage} aria-live="polite">
      <div
        ref={props.cardRef}
        classList={{
          [styles.card]: true,
          [styles.liberal]: props.policy === 'liberal',
          [styles.fascist]: props.policy === 'fascist',
        }}
      >
        <span class={styles.label}>{props.label}</span>
      </div>
    </div>
  );
}
