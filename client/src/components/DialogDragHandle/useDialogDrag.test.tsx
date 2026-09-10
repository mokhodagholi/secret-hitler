import { describe, expect, it } from '@rstest/core';
import { fireEvent, render, screen } from '@solidjs/testing-library';
import { DialogDragHandle } from './DialogDragHandle';
import { useDialogDrag } from './useDialogDrag';

function DragDemo() {
  const drag = useDialogDrag();
  return (
    <div data-testid="shell" style={drag.style()}>
      <DialogDragHandle
        label="Move panel"
        dragging={drag.dragging()}
        handleProps={drag.handleProps}
      />
    </div>
  );
}

describe('useDialogDrag', () => {
  it('Should translate the shell when the handle is dragged', () => {
    render(() => <DragDemo />);

    const handle = screen.getByRole('separator', { name: 'Move panel' });
    fireEvent.pointerDown(handle, {
      button: 0,
      clientX: 20,
      clientY: 10,
      pointerId: 1,
    });
    fireEvent.pointerMove(handle, { clientX: 70, clientY: 40, pointerId: 1 });

    expect(screen.getByTestId('shell').style.transform).toBe(
      'translate(50px, 30px)',
    );
    expect(handle.className).toMatch(/dragging/);
  });

  it('Should ignore non-primary pointer buttons', () => {
    render(() => <DragDemo />);
    const handle = screen.getByRole('separator', { name: 'Move panel' });
    fireEvent.pointerDown(handle, {
      button: 2,
      clientX: 0,
      clientY: 0,
      pointerId: 1,
    });
    fireEvent.pointerMove(handle, { clientX: 80, clientY: 80, pointerId: 1 });
    expect(screen.getByTestId('shell').style.transform).toBe(
      'translate(0px, 0px)',
    );
  });
});
