/**
 * Minimal typed event emitter — no Node `events` dependency so it runs in the
 * browser too. `T` maps event names to their payload type.
 */
export class TypedEmitter<T extends Record<string, unknown>> {
  private listeners: { [K in keyof T]?: Set<(payload: T[K]) => void> } = {};

  on<K extends keyof T>(event: K, fn: (payload: T[K]) => void): () => void {
    (this.listeners[event] ??= new Set()).add(fn);
    return () => this.off(event, fn);
  }

  off<K extends keyof T>(event: K, fn: (payload: T[K]) => void): void {
    this.listeners[event]?.delete(fn);
  }

  emit<K extends keyof T>(event: K, payload: T[K]): void {
    this.listeners[event]?.forEach((fn) => fn(payload));
  }
}
