import { Show, type JSX } from 'solid-js';
import { Icon, type IconName } from '../Icon/Icon';
import { Toggle } from '../Toggle/Toggle';
import styles from './SettingRow.module.scss';

interface BaseProps {
  icon: IconName;
  label: string;
}

type ControlProps =
  | { kind: 'toggle'; checked: boolean; onChange: (value: boolean) => void }
  | { kind: 'value'; value: string; onClick?: () => void }
  | { kind: 'link'; onClick?: () => void };

export type SettingRowProps = BaseProps & ControlProps;

/**
 * One card row on the Settings screen. Renders a gold icon, label, and a
 * trailing control that is either a toggle, a value (chevron only when the
 * row can cycle or open), or a chevron.
 */
export function SettingRow(props: SettingRowProps) {
  const interactive = () =>
    props.kind === 'link' || (props.kind === 'value' && props.onClick != null);
  return (
    <div
      classList={{ [styles.row]: true, [styles.tappable]: interactive() }}
      role={interactive() ? 'button' : undefined}
      tabindex={interactive() ? 0 : undefined}
      onClick={() => {
        if (props.kind === 'value' || props.kind === 'link') props.onClick?.();
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
      return (
        <Toggle
          checked={props.checked}
          onChange={props.onChange}
          label={props.label}
        />
      );
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
