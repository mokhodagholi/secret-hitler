import { describe, expect, it } from '@rstest/core';
import {
  CHAT_STICK_BOTTOM_PX,
  isChatNearBottom,
  scrollChatToBottom,
  stickAfterFeedScroll,
} from './chatScroll';

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

describe('scrollChatToBottom', () => {
  it('Should jump the scroller to the latest line', () => {
    const feed = scroller(0);
    scrollChatToBottom(feed);
    expect(feed.scrollTop).toBe(500);
  });
});

describe('stickAfterFeedScroll', () => {
  it('Should ignore scroll while the feed is collapsed', () => {
    expect(stickAfterFeedScroll(false, false, true)).toBe(true);
    expect(stickAfterFeedScroll(false, true, false)).toBe(false);
  });

  it('Should follow the latest line while the open feed is near the bottom', () => {
    expect(stickAfterFeedScroll(true, true, false)).toBe(true);
  });

  it('Should unpin when the reader scrolls up in an open feed', () => {
    expect(stickAfterFeedScroll(true, false, true)).toBe(false);
  });
});
