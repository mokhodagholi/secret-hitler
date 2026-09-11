import { For } from 'solid-js';
import type { FormatMessage, Language } from '../../i18n';
import type { ChangelogRelease } from '../../changelog/changelog';
import styles from './ChangelogList.module.scss';

export interface ChangelogListProps {
  releases: readonly ChangelogRelease[];
  language: Language;
  formatMessage: FormatMessage;
}

/** Newest-first list of version notes. Copy comes from the changelog file, not i18n. */
export function ChangelogList(props: ChangelogListProps) {
  return (
    <ol class={styles.list}>
      <For each={props.releases}>
        {(release) => (
          <li class={styles.release}>
            <h3 class={styles.version}>
              {props.formatMessage('changelog.version', { version: release.version })}
            </h3>
            <ul class={styles.changes}>
              <For each={release.changes}>
                {(change) => <li class={styles.change}>{change[props.language]}</li>}
              </For>
            </ul>
          </li>
        )}
      </For>
    </ol>
  );
}
