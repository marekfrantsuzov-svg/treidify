CREATE TYPE "public"."community_tier" AS ENUM('general', 'pro', 'whale');--> statement-breakpoint
CREATE TYPE "public"."connection_status" AS ENUM('pending', 'connected', 'synchronizing', 'reconnection_required', 'error', 'disconnected');--> statement-breakpoint
CREATE TYPE "public"."deal_entry" AS ENUM('in', 'out', 'inout', 'out_by', 'none');--> statement-breakpoint
CREATE TYPE "public"."deal_type" AS ENUM('buy', 'sell', 'balance', 'credit', 'commission', 'swap', 'bonus', 'correction', 'other');--> statement-breakpoint
CREATE TYPE "public"."experience_level" AS ENUM('beginner', 'intermediate', 'advanced', 'professional');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('mt4', 'mt5');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trading_account_id" uuid NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"balance" numeric(24, 8) NOT NULL,
	"equity" numeric(24, 8) NOT NULL,
	"margin" numeric(24, 8),
	"free_margin" numeric(24, 8),
	"floating_pnl" numeric(24, 8)
);
--> statement-breakpoint
CREATE TABLE "ai_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"input" jsonb NOT NULL,
	"output" jsonb NOT NULL,
	"model" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"meta" jsonb,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candle" (
	"symbol" text NOT NULL,
	"timeframe" text NOT NULL,
	"t" timestamp with time zone NOT NULL,
	"o" numeric(24, 8) NOT NULL,
	"h" numeric(24, 8) NOT NULL,
	"l" numeric(24, 8) NOT NULL,
	"c" numeric(24, 8) NOT NULL,
	"source" text NOT NULL,
	CONSTRAINT "candle_symbol_timeframe_t_pk" PRIMARY KEY("symbol","timeframe","t")
);
--> statement-breakpoint
CREATE TABLE "cash_flow" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trading_account_id" uuid NOT NULL,
	"deal_id" uuid,
	"kind" text NOT NULL,
	"amount" numeric(24, 8) NOT NULL,
	"at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chart_upload" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"storage_key" text NOT NULL,
	"mime" text NOT NULL,
	"bytes" integer NOT NULL,
	"analysis_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "closed_trade" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trading_account_id" uuid NOT NULL,
	"position_id" text NOT NULL,
	"symbol" text NOT NULL,
	"side" text NOT NULL,
	"volume" numeric(18, 4) NOT NULL,
	"open_price" numeric(24, 8) NOT NULL,
	"close_price" numeric(24, 8) NOT NULL,
	"stop_loss" numeric(24, 8),
	"take_profit" numeric(24, 8),
	"open_time" timestamp with time zone NOT NULL,
	"close_time" timestamp with time zone NOT NULL,
	"profit" numeric(24, 8) NOT NULL,
	"commission" numeric(24, 8) DEFAULT 0 NOT NULL,
	"swap" numeric(24, 8) DEFAULT 0 NOT NULL,
	"fee" numeric(24, 8) DEFAULT 0 NOT NULL,
	"net_usd" numeric(24, 8),
	"fx_rate_to_usd" numeric(18, 8)
);
--> statement-breakpoint
CREATE TABLE "comment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"parent_id" uuid,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'visible' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_membership" (
	"user_id" text PRIMARY KEY NOT NULL,
	"tier" "community_tier" DEFAULT 'general' NOT NULL,
	"verification_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trading_account_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"position_id" text,
	"order_id" text,
	"symbol" text,
	"type" "deal_type" NOT NULL,
	"entry" "deal_entry" DEFAULT 'none' NOT NULL,
	"volume" numeric(18, 4),
	"price" numeric(24, 8),
	"profit" numeric(24, 8) DEFAULT 0 NOT NULL,
	"commission" numeric(24, 8) DEFAULT 0 NOT NULL,
	"swap" numeric(24, 8) DEFAULT 0 NOT NULL,
	"fee" numeric(24, 8) DEFAULT 0 NOT NULL,
	"stop_loss" numeric(24, 8),
	"take_profit" numeric(24, 8),
	"time" timestamp with time zone NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entitlement" (
	"user_id" text PRIMARY KEY NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"source" text DEFAULT 'none' NOT NULL,
	"trial_started_at" timestamp with time zone,
	"trial_ends_at" timestamp with time zone,
	"premium_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_impact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"symbol" text NOT NULL,
	"direction" text NOT NULL,
	"horizon" text NOT NULL,
	"status" text NOT NULL,
	"uncertainty" text NOT NULL,
	"scenarios" jsonb NOT NULL,
	"model" text,
	"assessed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"published_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flag" (
	"key" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follow" (
	"follower_id" text NOT NULL,
	"followee_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follow_follower_id_followee_id_pk" PRIMARY KEY("follower_id","followee_id")
);
--> statement-breakpoint
CREATE TABLE "instrument" (
	"symbol" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"digits" integer NOT NULL,
	"kind" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"closed_trade_id" uuid,
	"notes" text,
	"setup_tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"mistake_tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"lessons" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol" text NOT NULL,
	"timeframe" text NOT NULL,
	"algorithm" text NOT NULL,
	"as_of" timestamp with time zone NOT NULL,
	"result" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_action" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"moderator_id" text,
	"target_user_id" text,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"action" text NOT NULL,
	"reason" text NOT NULL,
	"automated" boolean DEFAULT false NOT NULL,
	"appeal_status" text,
	"appeal_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthly_performance" (
	"trading_account_id" uuid NOT NULL,
	"month" text NOT NULL,
	"net_realized_usd" numeric(24, 8) NOT NULL,
	"trades" integer NOT NULL,
	"complete" boolean NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monthly_performance_trading_account_id_month_pk" PRIMARY KEY("trading_account_id","month")
);
--> statement-breakpoint
CREATE TABLE "news_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"headline" text NOT NULL,
	"category" text NOT NULL,
	"region" text,
	"severity" integer,
	"published_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"scheduled_for" timestamp with time zone,
	"summary" text,
	"dedupe_key" text NOT NULL,
	CONSTRAINT "news_event_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"href" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_pref" (
	"user_id" text NOT NULL,
	"category" text NOT NULL,
	"in_app" boolean DEFAULT true NOT NULL,
	"push" boolean DEFAULT false NOT NULL,
	"email" boolean DEFAULT false NOT NULL,
	"frequency" text DEFAULT 'realtime' NOT NULL,
	CONSTRAINT "notification_pref_user_id_category_pk" PRIMARY KEY("user_id","category")
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"stripe_invoice_id" text,
	"amount" numeric(24, 8) NOT NULL,
	"currency" text NOT NULL,
	"status" text NOT NULL,
	"hosted_invoice_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_stripe_invoice_id_unique" UNIQUE("stripe_invoice_id")
);
--> statement-breakpoint
CREATE TABLE "pending_order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trading_account_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"symbol" text NOT NULL,
	"type" text NOT NULL,
	"volume" numeric(18, 4) NOT NULL,
	"price" numeric(24, 8) NOT NULL,
	"stop_loss" numeric(24, 8),
	"take_profit" numeric(24, 8),
	"placed_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "position" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trading_account_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"symbol" text NOT NULL,
	"side" text NOT NULL,
	"volume" numeric(18, 4) NOT NULL,
	"open_price" numeric(24, 8) NOT NULL,
	"current_price" numeric(24, 8),
	"stop_loss" numeric(24, 8),
	"take_profit" numeric(24, 8),
	"floating_pnl" numeric(24, 8),
	"swap" numeric(24, 8),
	"opened_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" text NOT NULL,
	"room" "community_tier" DEFAULT 'general' NOT NULL,
	"body" text NOT NULL,
	"instruments" text[] DEFAULT '{}'::text[] NOT NULL,
	"image_key" text,
	"status" text DEFAULT 'visible' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_zone" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"lower" numeric(24, 8) NOT NULL,
	"upper" numeric(24, 8) NOT NULL,
	"touches" integer NOT NULL,
	"explanation" jsonb
);
--> statement-breakpoint
CREATE TABLE "privacy_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"profile_public" boolean DEFAULT false NOT NULL,
	"show_monthly_pnl" boolean DEFAULT false NOT NULL,
	"show_win_rate" boolean DEFAULT false NOT NULL,
	"show_history" boolean DEFAULT false NOT NULL,
	"show_open_positions" boolean DEFAULT false NOT NULL,
	"show_entry_prices" boolean DEFAULT false NOT NULL,
	"show_position_sizes" boolean DEFAULT false NOT NULL,
	"show_balance" boolean DEFAULT false NOT NULL,
	"position_delay_minutes" integer DEFAULT 60 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"bio" text,
	"country" text,
	"experience" "experience_level",
	"instruments" text[] DEFAULT '{}'::text[] NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"dashboard_prefs" jsonb DEFAULT '{"density":"comfortable","defaultTimeframe":"4H","showSessions":true,"startPage":"dashboard"}'::jsonb NOT NULL,
	"onboarding_step" integer DEFAULT 0 NOT NULL,
	"onboarded_at" timestamp with time zone,
	"ai_consent_at" timestamp with time zone,
	"risk_acknowledged_at" timestamp with time zone,
	"avatar" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_connection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trading_account_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"external_id" text,
	"status" "connection_status" DEFAULT 'pending' NOT NULL,
	"last_sync_at" timestamp with time zone,
	"last_error_at" timestamp with time zone,
	"last_error" text,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"history_from" timestamp with time zone,
	"secret_ciphertext" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reaction" (
	"post_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"kind" text DEFAULT 'like' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reaction_post_id_user_id_kind_pk" PRIMARY KEY("post_id","user_id","kind")
);
--> statement-breakpoint
CREATE TABLE "report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rulebook" (
	"user_id" text PRIMARY KEY NOT NULL,
	"max_trades_per_day" integer,
	"max_volume_per_trade" numeric(18, 4),
	"allowed_symbols" text[],
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_post" (
	"user_id" text NOT NULL,
	"post_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_post_user_id_post_id_pk" PRIMARY KEY("user_id","post_id")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"status" text NOT NULL,
	"interval" text,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "support_ticket" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"topic" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_ticket_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "sync_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"ok" boolean,
	"deals_imported" integer DEFAULT 0 NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "trading_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"platform" "platform" NOT NULL,
	"login" text NOT NULL,
	"server" text NOT NULL,
	"broker" text,
	"currency" text,
	"nickname" text,
	"source" text DEFAULT 'provider' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "two_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" text NOT NULL,
	"verified" boolean DEFAULT true,
	"failed_verification_count" integer DEFAULT 0,
	"locked_until" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"two_factor_enabled" boolean DEFAULT false,
	"username" text,
	"display_username" text,
	"role" text DEFAULT 'user',
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"tier" "community_tier" NOT NULL,
	"months" jsonb NOT NULL,
	"algorithm" text NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_until" timestamp with time zone,
	"flags" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_snapshot" ADD CONSTRAINT "account_snapshot_trading_account_id_trading_account_id_fk" FOREIGN KEY ("trading_account_id") REFERENCES "public"."trading_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_report" ADD CONSTRAINT "ai_report_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candle" ADD CONSTRAINT "candle_symbol_instrument_symbol_fk" FOREIGN KEY ("symbol") REFERENCES "public"."instrument"("symbol") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_flow" ADD CONSTRAINT "cash_flow_trading_account_id_trading_account_id_fk" FOREIGN KEY ("trading_account_id") REFERENCES "public"."trading_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_flow" ADD CONSTRAINT "cash_flow_deal_id_deal_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chart_upload" ADD CONSTRAINT "chart_upload_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chart_upload" ADD CONSTRAINT "chart_upload_analysis_id_ai_report_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."ai_report"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "closed_trade" ADD CONSTRAINT "closed_trade_trading_account_id_trading_account_id_fk" FOREIGN KEY ("trading_account_id") REFERENCES "public"."trading_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_membership" ADD CONSTRAINT "community_membership_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_membership" ADD CONSTRAINT "community_membership_verification_id_verification_record_id_fk" FOREIGN KEY ("verification_id") REFERENCES "public"."verification_record"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal" ADD CONSTRAINT "deal_trading_account_id_trading_account_id_fk" FOREIGN KEY ("trading_account_id") REFERENCES "public"."trading_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlement" ADD CONSTRAINT "entitlement_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_impact" ADD CONSTRAINT "event_impact_event_id_news_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."news_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_source" ADD CONSTRAINT "event_source_event_id_news_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."news_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow" ADD CONSTRAINT "follow_follower_id_user_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow" ADD CONSTRAINT "follow_followee_id_user_id_fk" FOREIGN KEY ("followee_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_closed_trade_id_closed_trade_id_fk" FOREIGN KEY ("closed_trade_id") REFERENCES "public"."closed_trade"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_analysis" ADD CONSTRAINT "market_analysis_symbol_instrument_symbol_fk" FOREIGN KEY ("symbol") REFERENCES "public"."instrument"("symbol") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_action" ADD CONSTRAINT "moderation_action_moderator_id_user_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_action" ADD CONSTRAINT "moderation_action_target_user_id_user_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_performance" ADD CONSTRAINT "monthly_performance_trading_account_id_trading_account_id_fk" FOREIGN KEY ("trading_account_id") REFERENCES "public"."trading_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_pref" ADD CONSTRAINT "notification_pref_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_order" ADD CONSTRAINT "pending_order_trading_account_id_trading_account_id_fk" FOREIGN KEY ("trading_account_id") REFERENCES "public"."trading_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position" ADD CONSTRAINT "position_trading_account_id_trading_account_id_fk" FOREIGN KEY ("trading_account_id") REFERENCES "public"."trading_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_zone" ADD CONSTRAINT "price_zone_analysis_id_market_analysis_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."market_analysis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_settings" ADD CONSTRAINT "privacy_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_connection" ADD CONSTRAINT "provider_connection_trading_account_id_trading_account_id_fk" FOREIGN KEY ("trading_account_id") REFERENCES "public"."trading_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reaction" ADD CONSTRAINT "reaction_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reaction" ADD CONSTRAINT "reaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rulebook" ADD CONSTRAINT "rulebook_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_post" ADD CONSTRAINT "saved_post_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_post" ADD CONSTRAINT "saved_post_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket" ADD CONSTRAINT "support_ticket_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_run" ADD CONSTRAINT "sync_run_connection_id_provider_connection_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."provider_connection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_account" ADD CONSTRAINT "trading_account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_record" ADD CONSTRAINT "verification_record_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "snapshot_account_at_idx" ON "account_snapshot" USING btree ("trading_account_id","at");--> statement-breakpoint
CREATE INDEX "ai_report_user_idx" ON "ai_report" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "cash_flow_account_idx" ON "cash_flow" USING btree ("trading_account_id","at");--> statement-breakpoint
CREATE UNIQUE INDEX "closed_trade_uq" ON "closed_trade" USING btree ("trading_account_id","position_id");--> statement-breakpoint
CREATE INDEX "closed_trade_close_idx" ON "closed_trade" USING btree ("trading_account_id","close_time");--> statement-breakpoint
CREATE INDEX "comment_post_idx" ON "comment" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "deal_dedupe_uq" ON "deal" USING btree ("trading_account_id","external_id");--> statement-breakpoint
CREATE INDEX "deal_account_time_idx" ON "deal" USING btree ("trading_account_id","time");--> statement-breakpoint
CREATE INDEX "deal_position_idx" ON "deal" USING btree ("trading_account_id","position_id");--> statement-breakpoint
CREATE INDEX "event_impact_event_idx" ON "event_impact" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "journal_user_idx" ON "journal_entry" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "journal_trade_uq" ON "journal_entry" USING btree ("user_id","closed_trade_id");--> statement-breakpoint
CREATE INDEX "market_analysis_idx" ON "market_analysis" USING btree ("symbol","timeframe","as_of");--> statement-breakpoint
CREATE INDEX "news_published_idx" ON "news_event" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "notification_user_idx" ON "notification" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pending_order_uq" ON "pending_order" USING btree ("trading_account_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "position_uq" ON "position" USING btree ("trading_account_id","external_id");--> statement-breakpoint
CREATE INDEX "post_room_idx" ON "post" USING btree ("room","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_connection_account_uq" ON "provider_connection" USING btree ("trading_account_id","provider");--> statement-breakpoint
CREATE INDEX "provider_connection_status_idx" ON "provider_connection" USING btree ("status");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sync_run_conn_idx" ON "sync_run" USING btree ("connection_id","started_at");--> statement-breakpoint
CREATE INDEX "trading_account_user_idx" ON "trading_account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trading_account_login_idx" ON "trading_account" USING btree ("platform","server","login");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "verification_user_idx" ON "verification_record" USING btree ("user_id","computed_at");