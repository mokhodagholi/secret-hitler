import { For } from 'solid-js';
import type { FormatMessage } from '../../i18n';
import { ROLE_FACES } from '../../assets/cards';
import { WarmImg } from '../../components/WarmImg/WarmImg';
import styles from './RulesScreen.module.scss';

export interface WhatIsThisLessonProps {
  formatMessage: FormatMessage;
}

const LIBERAL_FACES = ROLE_FACES.liberal;

/** What the game is: two teams, how each wins, the three beats of a round. */
export function WhatIsThisLesson(props: WhatIsThisLessonProps) {
  const { formatMessage } = props;
  return (
    <div class={styles.overview}>
      <p class={styles.overviewPart}>{formatMessage('rules.whatIsThis.lead')}</p>

      <div class={styles.overviewPart}>
        <p class={styles.overviewLabel}>{formatMessage('rules.whatIsThis.teams')}</p>
        <div class={styles.overviewTeams}>
          <div class={`${styles.overviewTeam} ${styles.overviewTeamLiberal}`}>
            <span class={styles.overviewTeamName}>
              {formatMessage('rules.whatIsThis.liberalTeam')}
            </span>
            <div class={styles.overviewFaces}>
              <For each={[...LIBERAL_FACES]}>
                {(face) => <WarmImg class={styles.overviewFace} src={face} alt="" />}
              </For>
            </div>
          </div>
          <div class={`${styles.overviewTeam} ${styles.overviewTeamFascist}`}>
            <span class={styles.overviewTeamName}>
              {formatMessage('rules.whatIsThis.fascistTeam')}
            </span>
            <div class={styles.overviewFaces}>
              <WarmImg class={styles.overviewFace} src={ROLE_FACES.fascist[0]!} alt="" />
              <span class={styles.overviewHitler}>
                <WarmImg class={styles.overviewFace} src={ROLE_FACES.hitler[0]!} alt="" />
                <span class={styles.overviewHitlerTag}>
                  {formatMessage('rules.whatIsThis.hitler')}
                </span>
              </span>
            </div>
          </div>
        </div>
        <p class={styles.overviewNote}>{formatMessage('rules.whatIsThis.teamsBody')}</p>
      </div>

      <div class={styles.overviewPart}>
        <p class={styles.overviewLabel}>{formatMessage('rules.whatIsThis.win')}</p>
        <div class={styles.overviewWins}>
          <span class={`${styles.overviewWin} ${styles.overviewWinLiberal}`}>
            {formatMessage('rules.whatIsThis.liberalWin')}
          </span>
          <span class={`${styles.overviewWin} ${styles.overviewWinFascist}`}>
            {formatMessage('rules.whatIsThis.fascistWin')}
          </span>
        </div>
      </div>

      <div class={styles.overviewPart}>
        <ol class={styles.overviewBeats}>
          <li class={styles.overviewBeat}>
            <span class={styles.overviewBeatNum}>
              {formatMessage('rules.stepNumber', { number: 1 })}
            </span>
            {formatMessage('rules.whatIsThis.beatNominate')}
          </li>
          <li class={styles.overviewBeat}>
            <span class={styles.overviewBeatNum}>
              {formatMessage('rules.stepNumber', { number: 2 })}
            </span>
            {formatMessage('rules.whatIsThis.beatVote')}
          </li>
          <li class={styles.overviewBeat}>
            <span class={styles.overviewBeatNum}>
              {formatMessage('rules.stepNumber', { number: 3 })}
            </span>
            {formatMessage('rules.whatIsThis.beatLaw')}
          </li>
        </ol>
        <p class={styles.overviewNote}>{formatMessage('rules.whatIsThis.play')}</p>
      </div>
    </div>
  );
}
