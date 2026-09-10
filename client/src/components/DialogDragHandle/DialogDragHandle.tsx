import styles from './DialogDragHandle.module.scss';
import type { useDialogDrag } from './useDialogDrag';

export interface DialogDragHandleProps {
  label: string;
  dragging: boolean;
  handleProps: ReturnType<typeof useDialogDrag>['handleProps'];
}

/** Grip bar at the top of a table panel — drag to uncover the board. */
export function DialogDragHandle(props: DialogDragHandleProps) {
  return (
    <div
      classList={{ [styles.handle]: true, [styles.dragging]: props.dragging }}
      role="separator"
      aria-orientation="horizontal"
      aria-label={props.label}
      {...props.handleProps}
    >
      <span class={styles.grip} />
    </div>
  );
}
