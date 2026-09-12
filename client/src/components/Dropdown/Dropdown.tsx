import { For, Show, createSignal, onCleanup, onMount } from 'solid-js';
import { Icon } from '../Icon/Icon';
import styles from './Dropdown.module.scss';

export interface DropdownOption<Value extends string> {
  value: Value;
  label: string;
}

export interface DropdownProps<Value extends string> {
  label: string;
  value: Value | null;
  options: readonly DropdownOption<Value>[];
  onChange: (value: Value) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

/** Labelled picker — not a native `<select>`. */
export function Dropdown<Value extends string>(props: DropdownProps<Value>) {
  const [open, setOpen] = createSignal(false);
  let root: HTMLDivElement | undefined;

  const selected = () => props.options.find((option) => option.value === props.value);

  const close = () => setOpen(false);

  const toggle = () => {
    if (props.disabled) return;
    setOpen((wasOpen) => !wasOpen);
  };

  const pick = (value: Value) => {
    props.onChange(value);
    close();
  };

  onMount(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!root?.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    onCleanup(() => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    });
  });

  return (
    <div class={styles.field} ref={root}>
      <span class={styles.label}>{props.label}</span>
      <button
        type="button"
        classList={{
          [styles.trigger]: true,
          [styles.invalid]: !!props.error,
          [styles.open]: open(),
        }}
        disabled={props.disabled}
        aria-haspopup="listbox"
        aria-expanded={open()}
        aria-label={props.label}
        onClick={toggle}
      >
        <span
          classList={{
            [styles.value]: true,
            [styles.placeholder]: selected() == null,
          }}
        >
          {selected()?.label ?? props.placeholder}
        </span>
        <Icon name="chevronDown" size={18} class={styles.chevron} />
      </button>
      <Show when={open()}>
        <ul class={styles.list} role="listbox">
          <For each={props.options}>
            {(option) => (
              <li>
                <button
                  type="button"
                  classList={{
                    [styles.option]: true,
                    [styles.chosen]: option.value === props.value,
                  }}
                  role="option"
                  aria-selected={option.value === props.value}
                  onClick={() => pick(option.value)}
                >
                  {option.label}
                </button>
              </li>
            )}
          </For>
        </ul>
      </Show>
      <Show when={props.error}>
        <span class={styles.error}>{props.error}</span>
      </Show>
    </div>
  );
}
