import type { MessengerKind } from '@secret-hitler/shared';
import {
  BLAST_RETURN_WINDOW_MS,
  type LobbyDeathReason,
  type LobbySource,
  type MatchOutcome,
  type ProductBlast,
  type ProductEvent,
  type ProductLobby,
  type ProductMatch,
  type ProductStore,
} from './ProductStore';

function makeId(): string {
  return `p${++InMemoryProductStore.sequence}`;
}

/** Non-persistent {@link ProductStore} for tests. */
export class InMemoryProductStore implements ProductStore {
  static sequence = 0;

  readonly events: ProductEvent[] = [];
  readonly lobbies: ProductLobby[] = [];
  readonly matches: ProductMatch[] = [];
  readonly blasts: ProductBlast[] = [];

  async recordEvent(event: ProductEvent): Promise<void> {
    this.events.push({
      ...event,
      payload: event.payload ? { ...event.payload } : null,
    });
  }

  async openLobby(input: {
    roomCode: string;
    source: LobbySource;
    openedAt: Date;
    hourIran: number;
    seats: number;
  }): Promise<void> {
    const open = this.openLobbyRow(input.roomCode);
    if (open) {
      await this.touchLobby(input.roomCode, input.seats, input.openedAt);
      return;
    }
    this.lobbies.push({
      roomCode: input.roomCode,
      source: input.source,
      openedAt: input.openedAt,
      hourIran: input.hourIran,
      peakSeats: input.seats,
      reached5At: input.seats >= 5 ? input.openedAt : null,
      dealtAt: null,
      diedAt: null,
      deathReason: null,
      afkKicks: 0,
    });
  }

  async touchLobby(roomCode: string, seats: number, at: Date): Promise<void> {
    const lobby = this.openLobbyRow(roomCode);
    if (!lobby) return;
    if (seats > lobby.peakSeats) lobby.peakSeats = seats;
    if (seats >= 5 && lobby.reached5At == null) lobby.reached5At = at;
  }

  async markLobbyDealt(roomCode: string, at: Date): Promise<void> {
    const lobby = this.openLobbyRow(roomCode);
    if (!lobby || lobby.dealtAt) return;
    lobby.dealtAt = at;
  }

  async closeLobby(roomCode: string, reason: LobbyDeathReason, at: Date): Promise<boolean> {
    const lobby = this.openLobbyRow(roomCode);
    if (!lobby) return false;
    lobby.diedAt = at;
    lobby.deathReason = reason;
    return true;
  }

  async incrementLobbyAfkKicks(roomCode: string, count: number): Promise<void> {
    const lobby = this.latestUndealtLobby(roomCode);
    if (!lobby) return;
    lobby.afkKicks += count;
  }

  async startMatch(roomCode: string, at: Date): Promise<void> {
    if (this.liveMatch(roomCode)) return;
    this.matches.push({
      roomCode,
      startedAt: at,
      endedAt: null,
      outcome: null,
      disconnects: 0,
      kickVotes: 0,
      afkKicks: 0,
    });
  }

  async incrementMatchDisconnects(roomCode: string): Promise<void> {
    const match = this.liveMatch(roomCode);
    if (match) match.disconnects += 1;
  }

  async incrementMatchKickVotes(roomCode: string): Promise<void> {
    const match = this.liveMatch(roomCode);
    if (match) match.kickVotes += 1;
  }

  async incrementMatchAfkKicks(roomCode: string, count: number): Promise<void> {
    const match = this.liveMatch(roomCode);
    if (match) match.afkKicks += count;
  }

  async finishMatch(roomCode: string, outcome: MatchOutcome, at: Date): Promise<void> {
    const match = this.liveMatch(roomCode);
    if (!match) return;
    match.endedAt = at;
    match.outcome = outcome;
  }

  async abandonMatch(roomCode: string, at: Date): Promise<boolean> {
    const match = this.liveMatch(roomCode);
    if (!match) return false;
    match.endedAt = at;
    match.outcome = 'abandoned';
    return true;
  }

  async recordBlast(platform: MessengerKind, chatIds: string[], sentAt: Date): Promise<void> {
    this.blasts.push({
      id: makeId(),
      platform,
      sentAt,
      reached: chatIds.length,
      recipients: chatIds.map((chatId) => ({
        chatId,
        openedAt: null,
        satAt: null,
      })),
    });
  }

  async markBlastOpened(platform: MessengerKind, chatId: string, at: Date): Promise<void> {
    const recipient = this.recentRecipient(platform, chatId, at);
    if (recipient && recipient.openedAt == null) recipient.openedAt = at;
  }

  async markBlastSat(platform: MessengerKind, chatId: string, at: Date): Promise<void> {
    const recipient = this.recentRecipient(platform, chatId, at);
    if (recipient && recipient.satAt == null) recipient.satAt = at;
  }

  async close(): Promise<void> {}

  private openLobbyRow(roomCode: string): ProductLobby | undefined {
    for (let index = this.lobbies.length - 1; index >= 0; index -= 1) {
      const lobby = this.lobbies[index];
      if (lobby.roomCode === roomCode && lobby.diedAt == null && lobby.dealtAt == null) {
        return lobby;
      }
    }
    return undefined;
  }

  private latestUndealtLobby(roomCode: string): ProductLobby | undefined {
    for (let index = this.lobbies.length - 1; index >= 0; index -= 1) {
      const lobby = this.lobbies[index];
      if (lobby.roomCode === roomCode && lobby.dealtAt == null) return lobby;
    }
    return undefined;
  }

  private liveMatch(roomCode: string): ProductMatch | undefined {
    for (let index = this.matches.length - 1; index >= 0; index -= 1) {
      const match = this.matches[index];
      if (match.roomCode === roomCode && match.endedAt == null) return match;
    }
    return undefined;
  }

  private recentRecipient(
    platform: MessengerKind,
    chatId: string,
    at: Date,
  ): ProductBlast['recipients'][number] | undefined {
    const cutoff = at.getTime() - BLAST_RETURN_WINDOW_MS;
    for (let index = this.blasts.length - 1; index >= 0; index -= 1) {
      const blast = this.blasts[index];
      if (blast.platform !== platform) continue;
      if (blast.sentAt.getTime() < cutoff) continue;
      const recipient = blast.recipients.find((row) => row.chatId === chatId);
      if (recipient) return recipient;
    }
    return undefined;
  }
}
