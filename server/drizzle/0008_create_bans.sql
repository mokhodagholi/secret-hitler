CREATE TABLE "create_bans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"value" text NOT NULL,
	"banned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "create_bans_kind_value" UNIQUE("kind","value")
);
