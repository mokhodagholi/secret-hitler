import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import type { LiveRoomSnapshot } from '../rooms/LiveRoomStore';

/**
 * Chosen player card, keyed by a client-generated id and optional Bale user.
 * Rooms still snapshot the index onto each seated player.
 */
export const profiles = pgTable('profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: text('client_id').notNull().unique(),
  baleUserId: text('bale_user_id').unique(),
  telegramUserId: text('telegram_user_id').unique(),
  avatar: integer('avatar').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * One finished game. Players have no persistent identity in Phase 1, so the
 * record stands alone — name + role are snapshotted per game. This is the seed
 * for Phase 2 profile/ELO aggregation.
 */
export const games = pgTable('games', {
  id: uuid('id').defaultRandom().primaryKey(),
  roomCode: text('room_code').notNull(),
  roomName: text('room_name').notNull(),
  winner: text('winner').notNull(),
  playerCount: integer('player_count').notNull(),
  liberalPolicies: integer('liberal_policies').notNull(),
  fascistPolicies: integer('fascist_policies').notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }).defaultNow().notNull(),
});

/** A seat in a finished game, with the role it held and whether it won. */
export const gamePlayers = pgTable('game_players', {
  id: uuid('id').defaultRandom().primaryKey(),
  gameId: uuid('game_id')
    .notNull()
    .references(() => games.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  role: text('role').notNull(),
  seat: integer('seat').notNull(),
  won: boolean('won').notNull(),
  joinKey: text('join_key'),
});

/**
 * In-progress table. Wiped when the room dies. Survives process restarts so a
 * deploy does not scatter everyone who was mid-game.
 */
export const liveRooms = pgTable('live_rooms', {
  id: uuid('id').primaryKey(),
  code: text('code').notNull().unique(),
  snapshot: jsonb('snapshot').$type<LiveRoomSnapshot>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Private-chat users the bot can DM. Filled on /start (and any later private
 * message) so an admin broadcast has somewhere to go.
 */
export const botSubscribers = pgTable(
  'bot_subscribers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    platform: text('platform').notNull(),
    chatId: text('chat_id').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique('bot_subscribers_platform_chat_id').on(table.platform, table.chatId)],
);

/**
 * Last admin /broadcast or /message delivery, so /unsend can delete those DMs.
 * Replaced on every new blast.
 */
export const botBlastDeliveries = pgTable('bot_blast_deliveries', {
  id: uuid('id').defaultRandom().primaryKey(),
  platform: text('platform').notNull(),
  chatId: text('chat_id').notNull(),
  messageId: integer('message_id').notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
});

export const friendships = pgTable(
  'friendships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountLow: text('account_low').notNull(),
    accountHigh: text('account_high').notNull(),
    lowName: text('low_name').notNull(),
    lowAvatar: integer('low_avatar').notNull(),
    highName: text('high_name').notNull(),
    highAvatar: integer('high_avatar').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique('friendships_pair').on(table.accountLow, table.accountHigh)],
);

export const friendRequests = pgTable('friend_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  fromAccount: text('from_account').notNull(),
  toAccount: text('to_account').notNull(),
  fromName: text('from_name').notNull(),
  fromAvatar: integer('from_avatar').notNull(),
  toName: text('to_name').notNull(),
  toAvatar: integer('to_avatar').notNull(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  cooldownUntil: timestamp('cooldown_until', { withTimezone: true }),
});

export const tableInvites = pgTable('table_invites', {
  id: uuid('id').defaultRandom().primaryKey(),
  fromAccount: text('from_account').notNull(),
  toAccount: text('to_account').notNull(),
  fromName: text('from_name').notNull(),
  fromAvatar: integer('from_avatar').notNull(),
  toName: text('to_name').notNull(),
  toAvatar: integer('to_avatar').notNull(),
  noteId: text('note_id').notNull(),
  roomId: text('room_id').notNull(),
  roomCode: text('room_code').notNull(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  cooldownUntil: timestamp('cooldown_until', { withTimezone: true }),
});

export const socialBlocks = pgTable(
  'social_blocks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    blocker: text('blocker').notNull(),
    blocked: text('blocked').notNull(),
    blockedName: text('blocked_name').notNull(),
    blockedAvatar: integer('blocked_avatar').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique('social_blocks_pair').on(table.blocker, table.blocked)],
);

/**
 * Funnel crumbs for product decisions: bot start → mini-app → sit → deal →
 * finish. Not player-facing; no chat text.
 */
export const productEvents = pgTable('product_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  at: timestamp('at', { withTimezone: true }).defaultNow().notNull(),
  platform: text('platform'),
  userKey: text('user_key'),
  roomCode: text('room_code'),
  payload: jsonb('payload').$type<Record<string, unknown>>(),
});

/** One lobby from first sit until it deals or dies empty. */
export const productLobbies = pgTable('product_lobbies', {
  id: uuid('id').defaultRandom().primaryKey(),
  roomCode: text('room_code').notNull(),
  source: text('source').notNull(),
  openedAt: timestamp('opened_at', { withTimezone: true }).defaultNow().notNull(),
  hourIran: integer('hour_iran').notNull(),
  peakSeats: integer('peak_seats').notNull().default(0),
  reached5At: timestamp('reached_5_at', { withTimezone: true }),
  dealtAt: timestamp('dealt_at', { withTimezone: true }),
  diedAt: timestamp('died_at', { withTimezone: true }),
  deathReason: text('death_reason'),
  afkKicks: integer('afk_kicks').notNull().default(0),
});

/** Live-game health from deal until finish or abandon. */
export const productMatches = pgTable('product_matches', {
  id: uuid('id').defaultRandom().primaryKey(),
  roomCode: text('room_code').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  outcome: text('outcome'),
  disconnects: integer('disconnects').notNull().default(0),
  kickVotes: integer('kick_votes').notNull().default(0),
  afkKicks: integer('afk_kicks').notNull().default(0),
});

/** Admin /broadcast or /message, so we can tell if anyone came back. */
export const productBlasts = pgTable('product_blasts', {
  id: uuid('id').defaultRandom().primaryKey(),
  platform: text('platform').notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
  reached: integer('reached').notNull(),
});

/** Address or account blocked for opening too many tables. Kept for two hours. */
export const createBans = pgTable(
  'create_bans',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    kind: text('kind').notNull(),
    value: text('value').notNull(),
    bannedAt: timestamp('banned_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique('create_bans_kind_value').on(table.kind, table.value)],
);

export const productBlastRecipients = pgTable(
  'product_blast_recipients',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    blastId: uuid('blast_id')
      .notNull()
      .references(() => productBlasts.id, { onDelete: 'cascade' }),
    chatId: text('chat_id').notNull(),
    openedAt: timestamp('opened_at', { withTimezone: true }),
    satAt: timestamp('sat_at', { withTimezone: true }),
  },
  (table) => [unique('product_blast_recipients_blast_chat').on(table.blastId, table.chatId)],
);
