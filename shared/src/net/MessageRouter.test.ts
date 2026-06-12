import { describe, expect, it, rs } from '@rstest/core';
import { MessageRouter } from './MessageRouter';

type TestMessage =
  | { type: 'greet'; name: string }
  | { type: 'leave' };

describe('MessageRouter', () => {
  it('Should dispatch a message to the handler registered for its type', () => {
    const greeted = rs.fn();
    const router = new MessageRouter<TestMessage, string>().on('greet', greeted);

    const handled = router.dispatch({ type: 'greet', name: 'Ana' }, 'ctx');
    expect(handled).toBe(true);
    expect(greeted).toHaveBeenCalledWith({ type: 'greet', name: 'Ana' }, 'ctx');
  });

  it('Should report unhandled message types instead of throwing', () => {
    const router = new MessageRouter<TestMessage, void>();
    expect(router.dispatch({ type: 'leave' }, undefined)).toBe(false);
  });
});
