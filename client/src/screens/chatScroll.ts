/** Stay put unless the feed is already at (or this close to) the latest line. */
export const CHAT_STICK_BOTTOM_PX = 40;

export function isChatNearBottom(
  scroller: HTMLElement,
  slackPx = CHAT_STICK_BOTTOM_PX,
): boolean {
  return scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <= slackPx;
}

export function scrollChatToBottom(scroller: HTMLElement): void {
  scroller.scrollTop = scroller.scrollHeight;
}

/**
 * A collapsed feed has no height and fires scroll as if the reader left the
 * latest line. Ignore those; only unpin while the feed is actually open.
 */
export function stickAfterFeedScroll(
  feedOpen: boolean,
  nearBottom: boolean,
  previousStick: boolean,
): boolean {
  if (!feedOpen) return previousStick;
  return nearBottom;
}
