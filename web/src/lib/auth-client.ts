"use client";

import { adminClient, multiSessionClient, twoFactorClient, usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [
    twoFactorClient({
      onTwoFactorRedirect: () => {
        // Keep the page the visitor was heading to; the two-factor form validates it before use.
        const next = new URLSearchParams(window.location.search).get("next");
        window.location.href = `/login/two-factor${next ? `?next=${encodeURIComponent(next)}` : ""}`;
      },
    }),
    usernameClient(),
    adminClient(),
    multiSessionClient(),
  ],
});
