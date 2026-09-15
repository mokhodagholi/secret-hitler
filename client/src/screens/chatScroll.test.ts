import { describe, expect, it } from '@rstest/core';
import { CHAT_STICK_BOTTOM_PX, isChatNearBottom } from './chatScroll';

function scroller(scrollTop: number, scrollHeight = 500, clientHeight = 100): HTMLElement {
  const element = document.createElement('div');
  Object.defineProperty(element, 'scrollHeight', { value: scrollHeight });
  Object.defineProperty(element, 'clientHeight', { value: clientHeight });
  element.scrollTop = scrollTop;
  return element;
}

describe('isChatNearBottom', () => {
  it('Should treat the latest line as pinned', () => {
    expect(isChatNearBottom(scroller(400))).toBe(true);
  });

  it('Should still pin within the slack', () => {
    expect(isChatNearBottom(scroller(400 - CHAT_STICK_BOTTOM_PX))).toBe(true);
  });

  it('Should let go once the reader has scrolled further up', () => {
    expect(isChatNearBottom(scroller(400 - CHAT_STICK_BOTTOM_PX - 1))).toBe(false);
  });
});
