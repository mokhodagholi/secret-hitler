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
