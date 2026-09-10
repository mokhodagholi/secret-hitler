CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" text NOT NULL,
	"bale_user_id" text,
	"avatar" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_client_id_unique" UNIQUE("client_id"),
	CONSTRAINT "profiles_bale_user_id_unique" UNIQUE("bale_user_id")
);
