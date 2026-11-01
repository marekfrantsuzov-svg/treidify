/**
 * Treidify database schema (PostgreSQL). Migrations are generated from this file with drizzle-kit
 * into web/drizzle/. Auth tables match Better Auth's expected models (checked in tests).
 *
 * Conventions: money and prices are NUMERIC (exact). Every user-owned row carries user_id and
 * every query in server code filters by it. Verified figures are only ever written by server jobs.
 */
import { sql } from "drizzle-orm";
import {
  boolean, index, integer, jsonb, numeric, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const created = () => ts("created_at").notNull().defaultNow();
const updated = () => ts("updated_at").notNull().defaultNow().$onUpdate(() => new Date());
const money = (name: string) => numeric(name, { precision: 24, scale: 8, mode: "number" });

/* ───────────────────────── Auth (Better Auth models) ───────────────────────── */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: created(),
  updatedAt: updated(),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  role: text("role").default("user"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: ts("ban_expires"),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: ts("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: created(),
  updatedAt: updated(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  impersonatedBy: text("impersonated_by"),
}, (t) => [index("session_user_idx").on(t.userId)]);

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: ts("access_token_expires_at"),
  refreshTokenExpiresAt: ts("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("account_user_idx").on(t.userId)]);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: ts("expires_at").notNull(),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("verification_identifier_idx").on(t.identifier)]);

export const twoFactor = pgTable("two_factor", {
  id: text("id").primaryKey(),
  secret: text("secret").notNull(),
  backupCodes: text("backup_codes").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  verified: boolean("verified").default(true),
  failedVerificationCount: integer("failed_verification_count").default(0),
  lockedUntil: ts("locked_until"),
});

/* ───────────────────────── Profiles and preferences ───────────────────────── */

export const experienceLevel = pgEnum("experience_level", ["beginner", "intermediate", "advanced", "professional"]);

export const profile = pgTable("profile", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  bio: text("bio"),
  country: text("country"),
  experience: experienceLevel("experience"),
  instruments: text("instruments").array().notNull().default(sql`'{}'::text[]`),
  timezone: text("timezone").notNull().default("UTC"),
  dashboardPrefs: jsonb("dashboard_prefs").$type<DashboardPrefs>().notNull().default({ density: "comfortable", defaultTimeframe: "4H", showSessions: true, startPage: "dashboard" }),
  onboardingStep: integer("onboarding_step").notNull().default(0),
  onboardedAt: ts("onboarded_at"),
  aiConsentAt: ts("ai_consent_at"),
  riskAcknowledgedAt: ts("risk_acknowledged_at"),
  avatar: text("avatar"), // data URL of a re-encoded 256px WebP, or null
  createdAt: created(),
  updatedAt: updated(),
});

export interface DashboardPrefs {
  density: "comfortable" | "compact";
  defaultTimeframe: "4H" | "1H" | "15M";
  showSessions: boolean;
  startPage: "dashboard" | "markets" | "journal";
}

/** Public-visibility toggles. Everything sensitive defaults to private. Separate from verification. */
export const privacySettings = pgTable("privacy_settings", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  profilePublic: boolean("profile_public").notNull().default(false),
  showMonthlyPnl: boolean("show_monthly_pnl").notNull().default(false),
  showWinRate: boolean("show_win_rate").notNull().default(false),
  showHistory: boolean("show_history").notNull().default(false),
  showOpenPositions: boolean("show_open_positions").notNull().default(false),
  showEntryPrices: boolean("show_entry_prices").notNull().default(false),
  showPositionSizes: boolean("show_position_sizes").notNull().default(false),
  showBalance: boolean("show_balance").notNull().default(false),
  positionDelayMinutes: integer("position_delay_minutes").notNull().default(60),
  updatedAt: updated(),
});

/* ───────────────────────── Trading accounts and sync ───────────────────────── */

export const platform = pgEnum("platform", ["mt4", "mt5"]);
export const connectionStatus = pgEnum("connection_status", ["pending", "connected", "synchronizing", "reconnection_required", "error", "disconnected"]);

export const tradingAccount = pgTable("trading_account", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  platform: platform("platform").notNull(),
  login: text("login").notNull(),
  server: text("server").notNull(),
  broker: text("broker"),
  currency: text("currency"),
  nickname: text("nickname"),
  source: text("source").notNull().default("provider"), // provider | manual | import  (only "provider" can be verified)
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("trading_account_user_idx").on(t.userId), index("trading_account_login_idx").on(t.platform, t.server, t.login)]);

export const providerConnection = pgTable("provider_connection", {
  id: uuid("id").primaryKey().defaultRandom(),
  tradingAccountId: uuid("trading_account_id").notNull().references(() => tradingAccount.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // e.g. "metaapi"
  externalId: text("external_id"),
  status: connectionStatus("status").notNull().default("pending"),
  lastSyncAt: ts("last_sync_at"),
  lastErrorAt: ts("last_error_at"),
  lastError: text("last_error"),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  historyFrom: ts("history_from"),
  /** AES-256-GCM ciphertext of the investor password, only if the provider requires us to hold it. */
  secretCiphertext: text("secret_ciphertext"),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [uniqueIndex("provider_connection_account_uq").on(t.tradingAccountId, t.provider), index("provider_connection_status_idx").on(t.status)]);

export const syncRun = pgTable("sync_run", {
  id: uuid("id").primaryKey().defaultRandom(),
  connectionId: uuid("connection_id").notNull().references(() => providerConnection.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // backfill | incremental | snapshot
  startedAt: ts("started_at").notNull().defaultNow(),
  finishedAt: ts("finished_at"),
  ok: boolean("ok"),
  dealsImported: integer("deals_imported").notNull().default(0),
  error: text("error"),
}, (t) => [index("sync_run_conn_idx").on(t.connectionId, t.startedAt)]);

export const accountSnapshot = pgTable("account_snapshot", {
  id: uuid("id").primaryKey().defaultRandom(),
  tradingAccountId: uuid("trading_account_id").notNull().references(() => tradingAccount.id, { onDelete: "cascade" }),
  at: ts("at").notNull(),
  balance: money("balance").notNull(),
  equity: money("equity").notNull(),
  margin: money("margin"),
  freeMargin: money("free_margin"),
  floatingPnl: money("floating_pnl"),
}, (t) => [index("snapshot_account_at_idx").on(t.tradingAccountId, t.at)]);

export const dealType = pgEnum("deal_type", ["buy", "sell", "balance", "credit", "commission", "swap", "bonus", "correction", "other"]);
export const dealEntry = pgEnum("deal_entry", ["in", "out", "inout", "out_by", "none"]);

/** Raw deals as reported by the platform. The source of truth for every calculation. */
export const deal = pgTable("deal", {
  id: uuid("id").primaryKey().defaultRandom(),
  tradingAccountId: uuid("trading_account_id").notNull().references(() => tradingAccount.id, { onDelete: "cascade" }),
  externalId: text("external_id").notNull(),
  positionId: text("position_id"),
  orderId: text("order_id"),
  symbol: text("symbol"),
  type: dealType("type").notNull(),
  entry: dealEntry("entry").notNull().default("none"),
  volume: numeric("volume", { precision: 18, scale: 4, mode: "number" }),
  price: money("price"),
  profit: money("profit").notNull().default(0),
  commission: money("commission").notNull().default(0),
  swap: money("swap").notNull().default(0),
  fee: money("fee").notNull().default(0),
  stopLoss: money("stop_loss"),
  takeProfit: money("take_profit"),
  time: ts("time").notNull(),
  comment: text("comment"),
  importedAt: created(),
}, (t) => [uniqueIndex("deal_dedupe_uq").on(t.tradingAccountId, t.externalId), index("deal_account_time_idx").on(t.tradingAccountId, t.time), index("deal_position_idx").on(t.tradingAccountId, t.positionId)]);

export const position = pgTable("position", {
  id: uuid("id").primaryKey().defaultRandom(),
  tradingAccountId: uuid("trading_account_id").notNull().references(() => tradingAccount.id, { onDelete: "cascade" }),
  externalId: text("external_id").notNull(),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(),
  volume: numeric("volume", { precision: 18, scale: 4, mode: "number" }).notNull(),
  openPrice: money("open_price").notNull(),
  currentPrice: money("current_price"),
  stopLoss: money("stop_loss"),
  takeProfit: money("take_profit"),
  floatingPnl: money("floating_pnl"),
  swap: money("swap"),
  openedAt: ts("opened_at").notNull(),
  updatedAt: updated(),
}, (t) => [uniqueIndex("position_uq").on(t.tradingAccountId, t.externalId)]);

export const pendingOrder = pgTable("pending_order", {
  id: uuid("id").primaryKey().defaultRandom(),
  tradingAccountId: uuid("trading_account_id").notNull().references(() => tradingAccount.id, { onDelete: "cascade" }),
  externalId: text("external_id").notNull(),
  symbol: text("symbol").notNull(),
  type: text("type").notNull(),
  volume: numeric("volume", { precision: 18, scale: 4, mode: "number" }).notNull(),
  price: money("price").notNull(),
  stopLoss: money("stop_loss"),
  takeProfit: money("take_profit"),
  placedAt: ts("placed_at").notNull(),
  updatedAt: updated(),
}, (t) => [uniqueIndex("pending_order_uq").on(t.tradingAccountId, t.externalId)]);

/** A closed position reconstructed from deals; what the journal and analytics read. */
export const closedTrade = pgTable("closed_trade", {
  id: uuid("id").primaryKey().defaultRandom(),
  tradingAccountId: uuid("trading_account_id").notNull().references(() => tradingAccount.id, { onDelete: "cascade" }),
  positionId: text("position_id").notNull(),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(),
  volume: numeric("volume", { precision: 18, scale: 4, mode: "number" }).notNull(),
  openPrice: money("open_price").notNull(),
  closePrice: money("close_price").notNull(),
  stopLoss: money("stop_loss"),
  takeProfit: money("take_profit"),
  openTime: ts("open_time").notNull(),
  closeTime: ts("close_time").notNull(),
  profit: money("profit").notNull(),
  commission: money("commission").notNull().default(0),
  swap: money("swap").notNull().default(0),
  fee: money("fee").notNull().default(0),
  netUsd: money("net_usd"),
  fxRateToUsd: numeric("fx_rate_to_usd", { precision: 18, scale: 8, mode: "number" }),
}, (t) => [uniqueIndex("closed_trade_uq").on(t.tradingAccountId, t.positionId), index("closed_trade_close_idx").on(t.tradingAccountId, t.closeTime)]);

export const cashFlow = pgTable("cash_flow", {
  id: uuid("id").primaryKey().defaultRandom(),
  tradingAccountId: uuid("trading_account_id").notNull().references(() => tradingAccount.id, { onDelete: "cascade" }),
  dealId: uuid("deal_id").references(() => deal.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // deposit | withdrawal | credit | bonus | transfer_in | transfer_out | correction
  amount: money("amount").notNull(),
  at: ts("at").notNull(),
}, (t) => [index("cash_flow_account_idx").on(t.tradingAccountId, t.at)]);

export const journalEntry = pgTable("journal_entry", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  closedTradeId: uuid("closed_trade_id").references(() => closedTrade.id, { onDelete: "cascade" }),
  notes: text("notes"),
  setupTags: text("setup_tags").array().notNull().default(sql`'{}'::text[]`),
  mistakeTags: text("mistake_tags").array().notNull().default(sql`'{}'::text[]`),
  lessons: text("lessons"),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("journal_user_idx").on(t.userId), uniqueIndex("journal_trade_uq").on(t.userId, t.closedTradeId)]);

export const rulebook = pgTable("rulebook", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  maxTradesPerDay: integer("max_trades_per_day"),
  maxVolumePerTrade: numeric("max_volume_per_trade", { precision: 18, scale: 4, mode: "number" }),
  allowedSymbols: text("allowed_symbols").array(),
  updatedAt: updated(),
});

/** Monthly verified aggregates, written only by the server from provider data. */
export const monthlyPerformance = pgTable("monthly_performance", {
  tradingAccountId: uuid("trading_account_id").notNull().references(() => tradingAccount.id, { onDelete: "cascade" }),
  month: text("month").notNull(), // YYYY-MM
  netRealizedUsd: money("net_realized_usd").notNull(),
  trades: integer("trades").notNull(),
  complete: boolean("complete").notNull(), // history covers the full month
  computedAt: ts("computed_at").notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.tradingAccountId, t.month] })]);

export const aiReport = pgTable("ai_report", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // daily | weekly | monthly | chart | macro_answer
  periodStart: ts("period_start"),
  periodEnd: ts("period_end"),
  input: jsonb("input").notNull(), // computed facts the model saw
  output: jsonb("output").notNull(),
  model: text("model"),
  createdAt: created(),
}, (t) => [index("ai_report_user_idx").on(t.userId, t.createdAt)]);

export const chartUpload = pgTable("chart_upload", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull(),
  mime: text("mime").notNull(),
  bytes: integer("bytes").notNull(),
  analysisId: uuid("analysis_id").references(() => aiReport.id, { onDelete: "set null" }),
  createdAt: created(),
});

/* ───────────────────────── Market data and intelligence ───────────────────────── */

export const instrument = pgTable("instrument", {
  symbol: text("symbol").primaryKey(),
  name: text("name").notNull(),
  digits: integer("digits").notNull(),
  kind: text("kind").notNull(), // metal | index | fx | yield
});

export const candle = pgTable("candle", {
  symbol: text("symbol").notNull().references(() => instrument.symbol),
  timeframe: text("timeframe").notNull(),
  t: ts("t").notNull(),
  o: money("o").notNull(),
  h: money("h").notNull(),
  l: money("l").notNull(),
  c: money("c").notNull(),
  source: text("source").notNull(),
}, (t) => [primaryKey({ columns: [t.symbol, t.timeframe, t.t] })]);

export const marketAnalysis = pgTable("market_analysis", {
  id: uuid("id").primaryKey().defaultRandom(),
  symbol: text("symbol").notNull().references(() => instrument.symbol),
  timeframe: text("timeframe").notNull(),
  algorithm: text("algorithm").notNull(),
  asOf: ts("as_of").notNull(),
  result: jsonb("result").notNull(),
}, (t) => [index("market_analysis_idx").on(t.symbol, t.timeframe, t.asOf)]);

export const priceZone = pgTable("price_zone", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisId: uuid("analysis_id").notNull().references(() => marketAnalysis.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  lower: money("lower").notNull(),
  upper: money("upper").notNull(),
  touches: integer("touches").notNull(),
  explanation: jsonb("explanation"),
});

export const newsEvent = pgTable("news_event", {
  id: uuid("id").primaryKey().defaultRandom(),
  headline: text("headline").notNull(),
  category: text("category").notNull(),
  region: text("region"),
  severity: integer("severity"),
  publishedAt: ts("published_at").notNull(),
  updatedAt: ts("updated_at").notNull(),
  scheduledFor: ts("scheduled_for"),
  summary: text("summary"),
  dedupeKey: text("dedupe_key").notNull().unique(),
}, (t) => [index("news_published_idx").on(t.publishedAt)]);

export const eventSource = pgTable("event_source", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => newsEvent.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  url: text("url").notNull(),
  title: text("title"),
  publishedAt: ts("published_at").notNull(),
});

export const eventImpact = pgTable("event_impact", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => newsEvent.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  direction: text("direction").notNull(), // strong_bullish … strong_bearish | mixed
  horizon: text("horizon").notNull(),
  status: text("status").notNull(), // conditional | confirmed | invalidated
  uncertainty: text("uncertainty").notNull(),
  scenarios: jsonb("scenarios").notNull(),
  model: text("model"),
  assessedAt: ts("assessed_at").notNull().defaultNow(),
}, (t) => [index("event_impact_event_idx").on(t.eventId)]);

/* ───────────────────────── Community ───────────────────────── */

export const communityTier = pgEnum("community_tier", ["general", "pro", "whale"]);

export const verificationRecord = pgTable("verification_record", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  tier: communityTier("tier").notNull(),
  months: jsonb("months").$type<{ month: string; netUsd: number; complete: boolean }[]>().notNull(),
  algorithm: text("algorithm").notNull(),
  computedAt: ts("computed_at").notNull().defaultNow(),
  validUntil: ts("valid_until"),
  flags: jsonb("flags").$type<string[]>().notNull().default([]),
}, (t) => [index("verification_user_idx").on(t.userId, t.computedAt)]);

export const communityMembership = pgTable("community_membership", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  tier: communityTier("tier").notNull().default("general"),
  verificationId: uuid("verification_id").references(() => verificationRecord.id, { onDelete: "set null" }),
  updatedAt: updated(),
});

export const post = pgTable("post", {
  id: uuid("id").primaryKey().defaultRandom(),
  authorId: text("author_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  room: communityTier("room").notNull().default("general"),
  body: text("body").notNull(),
  instruments: text("instruments").array().notNull().default(sql`'{}'::text[]`),
  imageKey: text("image_key"),
  status: text("status").notNull().default("visible"), // visible | hidden | removed
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("post_room_idx").on(t.room, t.createdAt)]);

export const comment = pgTable("comment", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => post.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"),
  authorId: text("author_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  status: text("status").notNull().default("visible"),
  createdAt: created(),
}, (t) => [index("comment_post_idx").on(t.postId, t.createdAt)]);

export const reaction = pgTable("reaction", {
  postId: uuid("post_id").notNull().references(() => post.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  kind: text("kind").notNull().default("like"),
  createdAt: created(),
}, (t) => [primaryKey({ columns: [t.postId, t.userId, t.kind] })]);

export const follow = pgTable("follow", {
  followerId: text("follower_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  followeeId: text("followee_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt: created(),
}, (t) => [primaryKey({ columns: [t.followerId, t.followeeId] })]);

export const savedPost = pgTable("saved_post", {
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  postId: uuid("post_id").notNull().references(() => post.id, { onDelete: "cascade" }),
  createdAt: created(),
}, (t) => [primaryKey({ columns: [t.userId, t.postId] })]);

export const report = pgTable("report", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterId: text("reporter_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  targetType: text("target_type").notNull(), // post | comment | user
  targetId: text("target_id").notNull(),
  reason: text("reason").notNull(),
  details: text("details"),
  status: text("status").notNull().default("open"),
  createdAt: created(),
});

export const moderationAction = pgTable("moderation_action", {
  id: uuid("id").primaryKey().defaultRandom(),
  moderatorId: text("moderator_id").references(() => user.id, { onDelete: "set null" }),
  targetUserId: text("target_user_id").references(() => user.id, { onDelete: "cascade" }),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  action: text("action").notNull(), // hide | remove | warn | suspend | ban | restore
  reason: text("reason").notNull(),
  automated: boolean("automated").notNull().default(false),
  appealStatus: text("appeal_status"), // null | open | upheld | overturned
  appealText: text("appeal_text"),
  createdAt: created(),
});

/* ───────────────────────── Notifications, billing, admin ───────────────────────── */

export const notification = pgTable("notification", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  href: text("href"),
  readAt: ts("read_at"),
  createdAt: created(),
}, (t) => [index("notification_user_idx").on(t.userId, t.createdAt)]);

export const notificationPref = pgTable("notification_pref", {
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  inApp: boolean("in_app").notNull().default(true),
  push: boolean("push").notNull().default(false),
  email: boolean("email").notNull().default(false),
  frequency: text("frequency").notNull().default("realtime"), // realtime | daily | off
}, (t) => [primaryKey({ columns: [t.userId, t.category] })]);

export const entitlement = pgTable("entitlement", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  plan: text("plan").notNull().default("free"), // free | premium
  source: text("source").notNull().default("none"), // none | trial | stripe | grant
  trialStartedAt: ts("trial_started_at"),
  trialEndsAt: ts("trial_ends_at"),
  premiumUntil: ts("premium_until"),
  updatedAt: updated(),
});

export const subscription = pgTable("subscription", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  status: text("status").notNull(),
  interval: text("interval"),
  currentPeriodEnd: ts("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  createdAt: created(),
  updatedAt: updated(),
});

export const payment = pgTable("payment", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  stripeInvoiceId: text("stripe_invoice_id").unique(),
  amount: money("amount").notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull(),
  hostedInvoiceUrl: text("hosted_invoice_url"),
  createdAt: created(),
});

export const supportTicket = pgTable("support_ticket", {
  id: uuid("id").primaryKey().defaultRandom(),
  reference: text("reference").notNull().unique(),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  topic: text("topic").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: created(),
});

export const featureFlag = pgTable("feature_flag", {
  key: text("key").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  description: text("description"),
  updatedAt: updated(),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  meta: jsonb("meta"),
  ip: text("ip"),
  createdAt: created(),
}, (t) => [index("audit_created_idx").on(t.createdAt), index("audit_actor_idx").on(t.actorId)]);

/* ───────────────────────── Multi-asset: user market preferences and provider coverage ───────────────────────── */

/**
 * The user's three Macro Desk instruments (slot order) and their favourite instruments. Symbols are canonical registry
 * symbols (src/lib/markets/registry.ts); the server repairs unknown ones on read, so a removed instrument never breaks a page.
 */
export const userMarketPrefs = pgTable("user_market_prefs", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  desk: text("desk").array().notNull().default(sql`'{XAUUSD,DXY,XAGUSD}'::text[]`),
  favorites: text("favorites").array().notNull().default(sql`'{}'::text[]`),
  updatedAt: updated(),
});

/**
 * Which instruments the configured market-data plan actually serves. Written by the coverage probe and by every bar
 * request; never assumed. state: verified (bars returned), unavailable (provider refused or has no such symbol).
 */
export const instrumentCoverage = pgTable("instrument_coverage", {
  symbol: text("symbol").notNull(),
  provider: text("provider").notNull(),
  vendorSymbol: text("vendor_symbol"),
  state: text("state").$type<"verified" | "unavailable">().notNull(),
  reason: text("reason"),
  checkedAt: ts("checked_at").notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.symbol, t.provider] })]);
