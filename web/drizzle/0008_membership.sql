CREATE TABLE "access_grant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"plan" text DEFAULT 'premium' NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"granted_by" text,
	"note" text,
	"ended_at" timestamp with time zone,
	"ended_by" text,
	"end_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "access_grant_kind_ck" CHECK ("access_grant"."kind" in ('trial','complimentary')),
	CONSTRAINT "access_grant_plan_ck" CHECK ("access_grant"."plan" in ('essential','premium'))
);
--> statement-breakpoint
CREATE TABLE "email_notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"kind" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"to_email" text NOT NULL,
	"payload" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"provider_id" text,
	"error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	CONSTRAINT "email_notification_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"category" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"screenshot_mime" text,
	"screenshot" "bytea",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_category_ck" CHECK ("feedback"."category" in ('bug','feature','general')),
	CONSTRAINT "feedback_status_ck" CHECK ("feedback"."status" in ('new','reviewing','resolved'))
);
--> statement-breakpoint
CREATE TABLE "membership" (
	"user_id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"selected_plan" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	"approved_by" text,
	"suspended_at" timestamp with time zone,
	"suspended_by" text,
	"suspend_reason" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membership_status_ck" CHECK ("membership"."status" in ('pending','approved','suspended','revoked')),
	CONSTRAINT "membership_role_ck" CHECK ("membership"."role" in ('member','admin'))
);
--> statement-breakpoint
ALTER TABLE "access_grant" ADD CONSTRAINT "access_grant_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_notification" ADD CONSTRAINT "email_notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership" ADD CONSTRAINT "membership_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "access_grant_user_idx" ON "access_grant" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "access_grant_open_idx" ON "access_grant" USING btree ("ends_at") WHERE "access_grant"."ended_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "access_grant_one_open_uq" ON "access_grant" USING btree ("user_id") WHERE "access_grant"."ended_at" is null;--> statement-breakpoint
CREATE INDEX "email_notification_user_idx" ON "email_notification" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "email_notification_status_idx" ON "email_notification" USING btree ("status");--> statement-breakpoint
CREATE INDEX "feedback_created_idx" ON "feedback" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "membership_status_idx" ON "membership" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_target_idx" ON "audit_log" USING btree ("target_type","target_id","created_at");--> statement-breakpoint
-- Owner: if no owner is bound yet, bind the verified owner mailbox once (production is already bound, so this is a no-op there).
-- From now on the owner is only this row (or TREIDIFY_OWNER_USER_ID); the app no longer claims the role from an email.
INSERT INTO "owner_binding" ("slot", "user_id", "email")
SELECT 'owner', u."id", lower(u."email") FROM "user" u
WHERE lower(u."email") = 'marekfrantsuzov@gmail.com' AND u."email_verified" = true
ORDER BY u."created_at" LIMIT 1
ON CONFLICT DO NOTHING;--> statement-breakpoint
-- Existing complimentary grants (entitlement source 'grant') move to access_grant, unchanged in plan and end date.
INSERT INTO "access_grant" ("user_id", "kind", "plan", "starts_at", "ends_at", "granted_by", "note")
SELECT e."user_id", 'complimentary', e."plan", now(), e."premium_until", 'migration', 'Carried over from the previous grant'
FROM "entitlement" e
WHERE e."source" = 'grant' AND e."plan" IN ('essential','premium') AND e."premium_until" > now();--> statement-breakpoint
UPDATE "entitlement" SET "source" = 'none', "plan" = 'free', "premium_until" = NULL WHERE "source" = 'grant';--> statement-breakpoint
-- Every existing account gets a membership row. The owner, anyone with a carried-over grant and anyone with an active
-- paid subscription stay approved; everyone else joins the waitlist (pending). No account, journal or trade is touched.
INSERT INTO "membership" ("user_id", "status", "requested_at", "approved_at", "approved_by")
SELECT u."id",
  CASE WHEN ob."user_id" IS NOT NULL OR g."user_id" IS NOT NULL OR (e."source" = 'stripe' AND e."premium_until" > now()) THEN 'approved' ELSE 'pending' END,
  u."created_at",
  CASE WHEN ob."user_id" IS NOT NULL OR g."user_id" IS NOT NULL OR (e."source" = 'stripe' AND e."premium_until" > now()) THEN now() END,
  CASE WHEN ob."user_id" IS NOT NULL OR g."user_id" IS NOT NULL OR (e."source" = 'stripe' AND e."premium_until" > now()) THEN 'migration' END
FROM "user" u
LEFT JOIN "owner_binding" ob ON ob."user_id" = u."id"
LEFT JOIN "entitlement" e ON e."user_id" = u."id"
LEFT JOIN (SELECT DISTINCT "user_id" FROM "access_grant" WHERE "ended_at" IS NULL) g ON g."user_id" = u."id"
ON CONFLICT ("user_id") DO NOTHING;--> statement-breakpoint
INSERT INTO "audit_log" ("actor_id", "action", "target_type", "meta")
SELECT NULL, 'membership.migrated', 'system', jsonb_build_object('pending', count(*) FILTER (WHERE "status" = 'pending'), 'approved', count(*) FILTER (WHERE "status" = 'approved'))
FROM "membership";
