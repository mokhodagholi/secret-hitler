ALTER TABLE "profiles" ADD COLUMN "telegram_user_id" text;
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_telegram_user_id_unique" UNIQUE("telegram_user_id");
