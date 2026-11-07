ALTER TABLE "subscription" ADD COLUMN "tier" text;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "trial_end" timestamp with time zone;