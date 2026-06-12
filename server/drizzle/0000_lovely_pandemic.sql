CREATE TABLE "game_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"seat" integer NOT NULL,
	"won" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_code" text NOT NULL,
	"room_name" text NOT NULL,
	"winner" text NOT NULL,
	"player_count" integer NOT NULL,
	"liberal_policies" integer NOT NULL,
	"fascist_policies" integer NOT NULL,
	"ended_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;