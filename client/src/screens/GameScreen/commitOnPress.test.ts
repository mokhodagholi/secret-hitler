import { describe, expect, it } from '@rstest/core';
import { commitOnPress } from './commitOnPress';

describe('commitOnPress', () => {
  it('Should commit on pointer down and ignore the following click', () => {
    let count = 0;
    const handlers = commitOnPress(() => {
      count += 1;
    });
    const button = document.createElement('button');

    handlers.onPointerDown?.({
      button: 0,
      currentTarget: button,
    } as unknown as PointerEvent);
    handlers.onClick?.({ currentTarget: button } as unknown as MouseEvent);

    expect(count).toBe(1);
  });

  it('Should commit on click when no pointer down happened', () => {
    let count = 0;
    const handlers = commitOnPress(() => {
      count += 1;
    });
    const button = document.createElement('button');

    handlers.onClick?.({ currentTarget: button } as unknown as MouseEvent);

    expect(count).toBe(1);
  });
});
