import { For } from 'solid-js';
import { CARD_BACK, POLICY_FACE } from '../../assets/cards';
import { WarmImg } from '../../components/WarmImg/WarmImg';
import type { FormatMessage, MessageKey } from '../../i18n';
import styles from './RulesScreen.module.scss';

export interface LawsLessonProps {
  formatMessage: FormatMessage;
}

const PICK_STEPS: { count: number; bodyKey: MessageKey }[] = [
  { count: 3, bodyKey: 'rules.laws.draw' },
  { count: 2, bodyKey: 'rules.laws.burn' },
  { count: 1, bodyKey: 'rules.laws.enact' },
];

/** How policy cards are drawn, discarded, reshuffled, and how a full board ends the game. */
export function LawsLesson(props: LawsLessonProps) {
  const { formatMessage } = props;
  return (
    <div class={styles.laws}>
      <section class={styles.lessonBlock}>
        <p class={styles.lead}>{formatMessage('rules.laws.what')}</p>
        <div class={styles.lawCounts}>
          <span class={`${styles.lawCount} ${styles.lawCountLiberal}`}>
            <WarmImg class={styles.lawCard} src={POLICY_FACE.liberal} alt="" />
            {formatMessage('rules.laws.liberalCount')}
          </span>
          <span class={`${styles.lawCount} ${styles.lawCountFascist}`}>
            <WarmImg class={styles.lawCard} src={POLICY_FACE.fascist} alt="" />
            {formatMessage('rules.laws.fascistCount')}
          </span>
        </div>
      </section>

      <section class={styles.lessonBlock}>
        <h3 class={styles.kitTitle}>{formatMessage('rules.laws.pickTitle')}</h3>
        <ol class={styles.lawPick}>
          <For each={PICK_STEPS}>
            {(step, index) => (
              <li class={styles.lawPickStep}>
                <span class={styles.lawPickNum}>
                  {formatMessage('rules.stepNumber', { number: index() + 1 })}
                </span>
                <div class={styles.lawPickArts}>
                  <For each={Array.from({ length: step.count })}>
                    {() => <WarmImg class={styles.lawMini} src={CARD_BACK} alt="" />}
                  </For>
                </div>
                <p class={styles.kitBody}>{formatMessage(step.bodyKey)}</p>
              </li>
            )}
          </For>
        </ol>
      </section>

      <section class={styles.lessonBlock}>
        <h3 class={styles.kitTitle}>{formatMessage('rules.laws.emptyTitle')}</h3>
        <p class={styles.kitBody}>{formatMessage('rules.laws.empty')}</p>
      </section>

      <section class={styles.lessonBlock}>
        <h3 class={styles.kitTitle}>{formatMessage('rules.laws.boardTitle')}</h3>
        <p class={styles.kitBody}>{formatMessage('rules.laws.win')}</p>
      </section>
    </div>
  );
}
