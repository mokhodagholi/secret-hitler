CREATE TABLE "product_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"platform" text,
	"user_key" text,
	"room_code" text,
	"payload" jsonb
);
--> statement-breakpoint
CREATE INDEX "product_events_name_at" ON "product_events" ("name","at");
--> statement-breakpoint
CREATE TABLE "product_lobbies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_code" text NOT NULL,
	"source" text NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"hour_iran" integer NOT NULL,
	"peak_seats" integer DEFAULT 0 NOT NULL,
	"reached_5_at" timestamp with time zone,
	"dealt_at" timestamp with time zone,
	"died_at" timestamp with time zone,
	"death_reason" text,
	"afk_kicks" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX "product_lobbies_room_code" ON "product_lobbies" ("room_code");
--> statement-breakpoint
CREATE TABLE "product_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_code" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"outcome" text,
	"disconnects" integer DEFAULT 0 NOT NULL,
	"kick_votes" integer DEFAULT 0 NOT NULL,
	"afk_kicks" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX "product_matches_room_code" ON "product_matches" ("room_code");
--> statement-breakpoint
CREATE TABLE "product_blasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reached" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_blast_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blast_id" uuid NOT NULL,
	"chat_id" text NOT NULL,
	"opened_at" timestamp with time zone,
	"sat_at" timestamp with time zone,
	CONSTRAINT "product_blast_recipients_blast_chat" UNIQUE("blast_id","chat_id")
);
--> statement-breakpoint
ALTER TABLE "product_blast_recipients" ADD CONSTRAINT "product_blast_recipients_blast_id_product_blasts_id_fk" FOREIGN KEY ("blast_id") REFERENCES "public"."product_blasts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "product_blast_recipients_chat_id" ON "product_blast_recipients" ("chat_id");
