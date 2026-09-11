import type { Policy } from '@secret-hitler/shared';
import { POLICY_FACE } from '../../assets/cards';
import styles from './PolicyRevealOverlay.module.scss';

export interface PolicyRevealOverlayProps {
  policy: Policy;
  /** Already-formatted "A … Policy was enacted" line. */
  label: string;
  /** The animated card element — GameScreen drives its reveal/exit beats. */
  cardRef: (element: HTMLDivElement) => void;
}

/** Centre-stage card shown while the enacted law flies into its well. */
export function PolicyRevealOverlay(props: PolicyRevealOverlayProps) {
  return (
    <div class={styles.stage} aria-live="polite">
      <div class={styles.stack}>
        <div ref={props.cardRef} class={styles.card}>
          <img
            class={styles.face}
            src={POLICY_FACE[props.policy]}
            alt=""
          />
        </div>
        <span class={styles.label}>{props.label}</span>
      </div>
    </div>
  );
}
