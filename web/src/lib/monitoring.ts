/**
 * Error reporting hook. Every server error and every client error boundary ends up here.
 * Today it writes one structured JSON line (picked up by the host's log drain) and, if ERROR_WEBHOOK_URL is set,
 * forwards the same payload. To use Sentry instead, install @sentry/nextjs and call it from this one function.
 */
export interface ErrorContext { where: string; digest?: string; path?: string; userId?: string; extra?: Record<string, unknown> }

export function reportError(error: unknown, ctx: ErrorContext) {
  const e = error instanceof Error ? error : new Error(String(error));
  const payload = {
    level: "error", at: new Date().toISOString(), where: ctx.where, message: e.message.slice(0, 500),
    stack: e.stack?.split("\n").slice(0, 8).join("\n"), digest: ctx.digest, path: ctx.path, userId: ctx.userId, extra: ctx.extra,
    release: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.RELEASE ?? null,
  };
  console.error(JSON.stringify(payload));
  const hook = typeof window === "undefined" ? process.env.ERROR_WEBHOOK_URL : undefined;
  if (hook) void fetch(hook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }).catch(() => {});
}
