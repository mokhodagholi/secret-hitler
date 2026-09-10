import type { LiveRoomSnapshot, LiveRoomStore } from './LiveRoomStore';

/** RAM stand-in so tests can restart a server without Postgres. */
export class InMemoryLiveRoomStore implements LiveRoomStore {
  private readonly byId = new Map<string, { code: string; snapshot: LiveRoomSnapshot }>();

  async save(id: string, code: string, snapshot: LiveRoomSnapshot): Promise<void> {
    this.byId.set(id, { code, snapshot: structuredClone(snapshot) });
  }

  async remove(id: string): Promise<void> {
    this.byId.delete(id);
  }

  async loadAll(): Promise<LiveRoomSnapshot[]> {
    return [...this.byId.values()].map((row) => structuredClone(row.snapshot));
  }
}
