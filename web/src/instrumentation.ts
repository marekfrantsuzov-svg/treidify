import { reportError } from "@/lib/monitoring";

/** Next.js calls this for every uncaught error in a server component, route handler or server action. */
export async function onRequestError(error: unknown, request: { path: string; method: string }, context: { routerKind: string; routeType: string }) {
  reportError(error, { where: `server:${context.routeType}`, path: request.path, digest: (error as { digest?: string })?.digest, extra: { method: request.method, router: context.routerKind } });
}
