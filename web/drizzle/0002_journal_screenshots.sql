CREATE TABLE "journal_screenshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"closed_trade_id" uuid NOT NULL,
	"mime" text NOT NULL,
	"bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "journal_screenshot" ADD CONSTRAINT "journal_screenshot_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_screenshot" ADD CONSTRAINT "journal_screenshot_closed_trade_id_closed_trade_id_fk" FOREIGN KEY ("closed_trade_id") REFERENCES "public"."closed_trade"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "journal_screenshot_trade_idx" ON "journal_screenshot" USING btree ("user_id","closed_trade_id");