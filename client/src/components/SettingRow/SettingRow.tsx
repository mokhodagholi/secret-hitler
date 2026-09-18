import { Show, type JSX } from 'solid-js';
import { Icon, type IconName } from '../Icon/Icon';
import { Toggle } from '../Toggle/Toggle';
import styles from './SettingRow.module.scss';

interface BaseProps {
  icon: IconName;
  label: string;
  tutorialTarget?: string;
}

type ControlProps =
  | { kind: 'toggle'; checked: boolean; onChange: (value: boolean) => void }
  | { kind: 'value'; value: string; onClick?: () => void }
  | { kind: 'link'; onClick?: () => void };

export type SettingRowProps = BaseProps & ControlProps;

function isInteractive(props: SettingRowProps): boolean {
  return (
    props.kind === 'toggle' ||
    props.kind === 'link' ||
    (props.kind === 'value' && props.onClick != null)
  );
}

function activate(props: SettingRowProps) {
  if (props.kind === 'toggle') props.onChange(!props.checked);
  else props.onClick?.();
}

/**
 * One card row on the Settings screen. The whole row is the tap target —
 * not only the trailing switch or chevron.
 */
export function SettingRow(props: SettingRowProps) {
  const interactive = () => isInteractive(props);
  return (
    <div
      classList={{ [styles.row]: true, [styles.tappable]: interactive() }}
      data-tutorial-target={props.tutorialTarget}
      role={
        props.kind === 'toggle' ? 'switch' : interactive() ? 'button' : undefined
      }
      aria-checked={props.kind === 'toggle' ? props.checked : undefined}
      aria-label={interactive() ? props.label : undefined}
      tabindex={interactive() ? 0 : undefined}
      onClick={() => {
        if (interactive()) activate(props);
      }}
      onKeyDown={(event) => {
        if (!interactive()) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate(props);
        }
      }}
    >
      <span class={styles.icon}>
        <Icon name={props.icon} size={22} />
      </span>
      <span class={styles.label}>{props.label}</span>
      <span class={styles.control}>{renderControl(props)}</span>
    </div>
  );
}

function renderControl(props: SettingRowProps): JSX.Element {
  switch (props.kind) {
    case 'toggle':
      return <Toggle checked={props.checked} />;
    case 'value':
      return (
        <>
          <span class={styles.value}>{props.value}</span>
          <Show when={props.onClick}>
            <Icon name="chevronRight" size={18} class={styles.chevron} />
          </Show>
        </>
      );
    case 'link':
      return <Icon name="chevronRight" size={18} class={styles.chevron} />;
  }
}
