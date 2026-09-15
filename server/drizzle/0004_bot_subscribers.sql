CREATE TABLE "bot_subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" text NOT NULL,
	"chat_id" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bot_subscribers_platform_chat_id" UNIQUE("platform","chat_id")
);
--> statement-breakpoint
INSERT INTO "bot_subscribers" ("platform", "chat_id")
SELECT 'bale', "bale_user_id" FROM "profiles" WHERE "bale_user_id" IS NOT NULL
ON CONFLICT ("platform", "chat_id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "bot_subscribers" ("platform", "chat_id")
SELECT 'telegram', "telegram_user_id" FROM "profiles" WHERE "telegram_user_id" IS NOT NULL
ON CONFLICT ("platform", "chat_id") DO NOTHING;
