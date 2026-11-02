CREATE TABLE "market_series_cache" (
	"symbol" text NOT NULL,
	"timeframe" text NOT NULL,
	"vendor" text NOT NULL,
	"method" text NOT NULL,
	"candles" jsonb NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "market_series_cache_symbol_timeframe_pk" PRIMARY KEY("symbol","timeframe")
);
