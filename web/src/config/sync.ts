/**
 * One refresh policy for MetaTrader account data (balance, equity, positions, closed-trade history).
 * Routine sync runs once an hour per account, shared by every tab and device through the server-side timestamps on
 * provider_connection (last_live_at, last_sync_at). Opening or navigating the app never triggers a broker call by
 * itself; it reads the stored state. A person can ask for a manual refresh, rate-limited per account.
 * Market data (prices, candles) has its own freshness policy in server/market and is not affected.
 */
export const ACCOUNT_REFRESH_INTERVAL = 60 * 60 * 1000;
/** Shortest gap between two manual refreshes of the same account. */
export const MANUAL_REFRESH_MIN_MS = 2 * 60 * 1000;
/** A connection still finishing its first sync (pending, synchronizing, error) is retried sooner than an hour. */
export const SETUP_SYNC_RETRY_MS = 5 * 60 * 1000;
/** Figures older than this are shown as stale (the hour plus a grace period for a slow broker). */
export const ACCOUNT_STALE_AFTER_MS = ACCOUNT_REFRESH_INTERVAL + 15 * 60 * 1000;
