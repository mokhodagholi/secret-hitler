/** Firewall block. Messenger accounts are never stored here. */
export interface CreateBan {
  kind: 'ip' | 'user';
  value: string;
}

/** Drop the extra room. `bans` is empty unless this address is spamming. */
export interface RoomClaimDrop {
  bans: CreateBan[];
}

/** A second tap is not spam. The third create in this window is. */
const SPAM_CREATES = 3;
const SPAM_WINDOW_MS = 10 * 60 * 1000;
/** Shared lines get their address back the same evening. */
export const BAN_DURATION_MS = 2 * 60 * 60 * 1000;

/** A stored ban. `bannedAt` is epoch ms. */
export interface StoredCreateBan extends CreateBan {
  bannedAt: number;
}

function isMessengerAccount(userKey: string | null): boolean {
  return userKey?.startsWith('bale:') === true || userKey?.startsWith('telegram:') === true;
}

/**
 * One open hosted table. The second is dropped and nobody is banned.
 * The third create in ten minutes is spam: an anonymous address is blocked
 * for two hours, and a Bale or Telegram account that did it is blocked too.
 * Other messenger accounts on that address are not.
 */
export class HostedRoomQuota {
  private readonly openRoomByIp = new Map<string, string>();
  private readonly openRoomByUser = new Map<string, string>();
  private readonly ipByRoom = new Map<string, string>();
  private readonly userByRoom = new Map<string, string>();
  private readonly attemptsByIp = new Map<string, number[]>();
  private readonly attemptsByUser = new Map<string, number[]>();
  /** Epoch ms when the block ends. */
  private readonly bannedIps = new Map<string, number>();
  private readonly bannedUsers = new Map<string, number>();

  /** Persist and firewall newly banned addresses. Set before the server listens. */
  onBanned: ((bans: CreateBan[]) => Promise<void>) | null = null;

  constructor(private readonly now: () => number = Date.now) {}

  restore(bans: readonly StoredCreateBan[]): void {
    for (const ban of bans) {
      const until = ban.bannedAt + BAN_DURATION_MS;
      if (until <= this.now()) continue;
      const book = ban.kind === 'ip' ? this.bannedIps : this.bannedUsers;
      book.set(ban.value, until);
    }
  }

  /** Bans whose two hours are up. The caller drops the firewall rule. */
  expire(): CreateBan[] {
    const lifted: CreateBan[] = [];
    const now = this.now();
    for (const [ip, until] of this.bannedIps) {
      if (until > now) continue;
      this.bannedIps.delete(ip);
      lifted.push({ kind: 'ip', value: ip });
    }
    for (const [user, until] of this.bannedUsers) {
      if (until > now) continue;
      this.bannedUsers.delete(user);
      lifted.push({ kind: 'user', value: user });
    }
    return lifted;
  }

  /**
   * A banned messenger account stays out. Other Bale or Telegram accounts
   * on a banned address do not — that address was someone else's spam.
   */
  isBlocked(ip: string, userKey: string | null): boolean {
    if (userKey != null && this.stillBanned(this.bannedUsers, userKey)) return true;
    if (isMessengerAccount(userKey)) return false;
    return this.stillBanned(this.bannedIps, ip);
  }

  /**
   * Remember this room, or drop it. `null` means the room may stay.
   * A drop with an empty `bans` is just "you already have a table".
   */
  claim(ip: string, userKey: string | null, roomId: string): RoomClaimDrop | null {
    if (this.isBlocked(ip, userKey)) return { bans: [] };

    if (!isMessengerAccount(userKey)) {
      const attempts = this.noteAttempt(ip);
      if (attempts >= SPAM_CREATES) {
        if (this.stillBanned(this.bannedIps, ip)) return { bans: [] };
        this.bannedIps.set(ip, this.now() + BAN_DURATION_MS);
        return { bans: [{ kind: 'ip', value: ip }] };
      }
    }

    const alreadyOpen = isMessengerAccount(userKey)
      ? userKey != null && this.openRoomByUser.has(userKey)
      : this.openRoomByIp.has(ip);
    if (alreadyOpen) return { bans: [] };

    if (!isMessengerAccount(userKey)) {
      this.openRoomByIp.set(ip, roomId);
      this.ipByRoom.set(roomId, ip);
    }
    if (userKey != null) {
      this.openRoomByUser.set(userKey, roomId);
      this.userByRoom.set(roomId, userKey);
    }
    return null;
  }

  private stillBanned(book: Map<string, number>, key: string): boolean {
    const until = book.get(key);
    return until != null && until > this.now();
  }

  private noteAttempt(ip: string): number {
    const cutoff = this.now() - SPAM_WINDOW_MS;
    const recent = (this.attemptsByIp.get(ip) ?? []).filter((at) => at > cutoff);
    recent.push(this.now());
    this.attemptsByIp.set(ip, recent);
    return recent.length;
  }

  /** The table is gone, so a host who was not banned may open another. */
  forget(roomId: string): void {
    const ip = this.ipByRoom.get(roomId);
    if (ip != null && this.openRoomByIp.get(ip) === roomId) this.openRoomByIp.delete(ip);
    this.ipByRoom.delete(roomId);
    const userKey = this.userByRoom.get(roomId);
    if (userKey != null && this.openRoomByUser.get(userKey) === roomId) {
      this.openRoomByUser.delete(userKey);
    }
    this.userByRoom.delete(roomId);
  }
}
