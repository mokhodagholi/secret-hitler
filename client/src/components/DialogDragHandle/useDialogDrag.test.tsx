import { describe, expect, it } from '@rstest/core';
import { fireEvent, render, screen } from '@solidjs/testing-library';
import { DialogDragHandle } from './DialogDragHandle';
import { useDialogDrag } from './useDialogDrag';

function DragDemo() {
  const drag = useDialogDrag();
  return (
    <div data-testid="shell" style={drag.style()} {...drag.surfaceProps}>
      <DialogDragHandle
        label="Move panel"
        dragging={drag.dragging()}
        handleProps={drag.handleProps}
      />
      <button type="button">Keep working</button>
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

  it('Should translate the shell when the panel surface is dragged', () => {
    render(() => <DragDemo />);
    const shell = screen.getByTestId('shell');
    fireEvent.pointerDown(shell, {
      button: 0,
      clientX: 10,
      clientY: 10,
      pointerId: 2,
    });
    fireEvent.pointerMove(shell, { clientX: 40, clientY: 25, pointerId: 2 });
    expect(shell.style.transform).toBe('translate(30px, 15px)');
  });

  it('Should leave buttons on the panel clickable', () => {
    let clicks = 0;
    function Demo() {
      const drag = useDialogDrag();
      return (
        <div data-testid="shell" style={drag.style()} {...drag.surfaceProps}>
          <button type="button" onClick={() => (clicks += 1)}>
            Keep working
          </button>
        </div>
      );
    }
    render(() => <Demo />);
    const action = screen.getByRole('button', { name: 'Keep working' });
    fireEvent.pointerDown(action, {
      button: 0,
      clientX: 0,
      clientY: 0,
      pointerId: 3,
    });
    fireEvent.pointerMove(action, { clientX: 80, clientY: 80, pointerId: 3 });
    fireEvent.click(action);
    expect(screen.getByTestId('shell').style.transform).toBe('translate(0px, 0px)');
    expect(clicks).toBe(1);
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
