ALTER TABLE "provider_connection" ADD COLUMN "credential" text DEFAULT 'investor' NOT NULL;--> statement-breakpoint
ALTER TABLE "provider_connection" ADD COLUMN "access_mode" text;--> statement-breakpoint
ALTER TABLE "provider_connection" ADD COLUMN "access_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "provider_connection" ADD COLUMN "last_live_at" timestamp with time zone;