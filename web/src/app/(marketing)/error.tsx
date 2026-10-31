"use client";

import { ErrorState } from "@/components/error-state";

export default function SiteError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState {...props} where="site" />;
}
