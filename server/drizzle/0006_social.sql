ALTER TABLE "game_players" ADD COLUMN "join_key" text;

CREATE TABLE "friendships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_low" text NOT NULL,
	"account_high" text NOT NULL,
	"low_name" text NOT NULL,
	"low_avatar" integer NOT NULL,
	"high_name" text NOT NULL,
	"high_avatar" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "friendships_pair" UNIQUE("account_low","account_high")
);

CREATE TABLE "friend_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_account" text NOT NULL,
	"to_account" text NOT NULL,
	"from_name" text NOT NULL,
	"from_avatar" integer NOT NULL,
	"to_name" text NOT NULL,
	"to_avatar" integer NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"cooldown_until" timestamp with time zone
);

CREATE UNIQUE INDEX "friend_requests_pending" ON "friend_requests" ("from_account", "to_account") WHERE "status" = 'pending';

CREATE TABLE "table_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_account" text NOT NULL,
	"to_account" text NOT NULL,
	"from_name" text NOT NULL,
	"from_avatar" integer NOT NULL,
	"to_name" text NOT NULL,
	"to_avatar" integer NOT NULL,
	"note_id" text NOT NULL,
	"room_id" text NOT NULL,
	"room_code" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"cooldown_until" timestamp with time zone
);

CREATE UNIQUE INDEX "table_invites_pending" ON "table_invites" ("from_account", "to_account") WHERE "status" = 'pending';

CREATE TABLE "social_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker" text NOT NULL,
	"blocked" text NOT NULL,
	"blocked_name" text NOT NULL,
	"blocked_avatar" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "social_blocks_pair" UNIQUE("blocker","blocked")
);
