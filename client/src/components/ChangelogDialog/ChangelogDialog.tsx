import { Show } from 'solid-js';
import type { FormatMessage, Language } from '../../i18n';
import type { ChangelogRelease } from '../../changelog/changelog';
import { Button } from '../Button/Button';
import { ChangelogList } from '../ChangelogList/ChangelogList';
import styles from './ChangelogDialog.module.scss';

export interface ChangelogDialogProps {
  open: boolean;
  title: string;
  actionLabel: string;
  releases: readonly ChangelogRelease[];
  language: Language;
  formatMessage: FormatMessage;
  onAction: () => void;
}

/** Shared "notes + one gold button" card used by the update prompt and What's New. */
export function ChangelogDialog(props: ChangelogDialogProps) {
  return (
    <Show when={props.open}>
      <div class={styles.backdrop} role="presentation">
        <div
          class={styles.dialog}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="changelog-title"
        >
          <h2 id="changelog-title" class={styles.title}>
            {props.title}
          </h2>
          <Show when={props.releases.length > 0}>
            <div class={styles.notes}>
              <ChangelogList
                releases={props.releases}
                language={props.language}
                formatMessage={props.formatMessage}
              />
            </div>
          </Show>
          <div class={styles.action}>
            <Button onClick={() => props.onAction()}>{props.actionLabel}</Button>
          </div>
        </div>
      </div>
    </Show>
  );
}
