CREATE TABLE "bot_blast_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" text NOT NULL,
	"chat_id" text NOT NULL,
	"message_id" integer NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
