import { describe, expect, it } from '@rstest/core';
import { PUBLIC_TABLE_MAX_PLAYERS } from '@secret-hitler/shared';
import { MatchQueue } from './MatchQueue';

function fakeSocket(): { readyState: number } {
  return { readyState: 1 };
}

describe('MatchQueue', () => {
  it('Should reuse the same seat when the same sit identity queues again', () => {
    const queue = new MatchQueue();
    const first = queue.enqueue({ name: 'Ana', joinKey: 'client:aaaa' });
    const second = queue.enqueue({ name: 'Ana', joinKey: 'client:aaaa' });
    expect(second.id).toBe(first.id);
    expect(queue.size).toBe(1);
  });

  it('Should only take waiters who have a live socket', () => {
    const queue = new MatchQueue();
    const ana = queue.enqueue({ name: 'Ana', joinKey: 'client:ana' });
    const ben = queue.enqueue({ name: 'Ben', joinKey: 'client:ben' });
    queue.bindSocket(ben.id, fakeSocket() as never);
    const taken = queue.takeConnected(PUBLIC_TABLE_MAX_PLAYERS);
    expect(taken.map((entry) => entry.id)).toEqual([ben.id]);
    expect(queue.lookup(ana.token)?.id).toBe(ana.id);
    expect(queue.size).toBe(1);
  });

  it('Should leave leftovers in the queue after a full table is taken', () => {
    const queue = new MatchQueue();
    const names = ['Ana', 'Ben', 'Cal', 'Dia', 'Eli', 'Fay', 'Gus'];
    for (const name of names) {
      const entry = queue.enqueue({
        name,
        joinKey: `client:${name.toLowerCase()}`,
      });
      queue.bindSocket(entry.id, fakeSocket() as never);
    }
    const taken = queue.takeConnected(6);
    expect(taken).toHaveLength(6);
    expect(taken[0]?.name).toBe('Ana');
    expect(queue.size).toBe(1);
    expect(queue.connectedCount()).toBe(1);
  });

  it('Should drop a cancelled waiter so the next person moves up', () => {
    const queue = new MatchQueue();
    const ana = queue.enqueue({ name: 'Ana', joinKey: 'client:ana' });
    queue.enqueue({ name: 'Ben', joinKey: 'client:ben' });
    queue.remove(ana.id);
    expect(queue.size).toBe(1);
    expect(queue.lookup(ana.token)).toBeUndefined();
  });
});
