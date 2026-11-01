CREATE TABLE "instrument_coverage" (
	"symbol" text NOT NULL,
	"provider" text NOT NULL,
	"vendor_symbol" text,
	"state" text NOT NULL,
	"reason" text,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instrument_coverage_symbol_provider_pk" PRIMARY KEY("symbol","provider")
);
--> statement-breakpoint
CREATE TABLE "user_market_prefs" (
	"user_id" text PRIMARY KEY NOT NULL,
	"desk" text[] DEFAULT '{XAUUSD,DXY,XAGUSD}'::text[] NOT NULL,
	"favorites" text[] DEFAULT '{}'::text[] NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_market_prefs" ADD CONSTRAINT "user_market_prefs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;