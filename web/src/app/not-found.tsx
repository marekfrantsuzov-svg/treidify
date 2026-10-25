import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <p className="num text-sm font-semibold text-accent">404</p>
        <h1 className="text-gradient mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">This page does not exist.</h1>
        <p className="mt-4 text-ink-2">The link may be old, or the page may have moved.</p>
        <div className="mt-8 flex justify-center gap-3">
          <ButtonLink href="/">Go home</ButtonLink>
          <Link href="/help" className="inline-flex h-11 items-center px-4 text-ink-2 hover:text-ink">Help Center</Link>
        </div>
      </div>
    </main>
  );
}
