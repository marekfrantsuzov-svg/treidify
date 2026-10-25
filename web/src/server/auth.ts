import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, multiSession, twoFactor, username } from "better-auth/plugins";
import { site } from "@/config/site";
import { audit } from "./audit";
import { db, schema } from "./db";
import { actionEmail, sendEmail } from "./email";

const google = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  ? { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET } : undefined;
const apple = process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET
  ? { clientId: process.env.APPLE_CLIENT_ID, clientSecret: process.env.APPLE_CLIENT_SECRET, appBundleIdentifier: process.env.APPLE_APP_BUNDLE_ID } : undefined;

export const enabledProviders = { google: Boolean(google), apple: Boolean(apple) };

export const auth = betterAuth({
  appName: "Treidify",
  baseURL: process.env.BETTER_AUTH_URL ?? site.url,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [site.url, ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []), ...(apple ? ["https://appleid.apple.com"] : [])],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification, twoFactor: schema.twoFactor },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      const m = actionEmail("Reset your password", "We received a request to reset your Treidify password. This link expires in one hour.", url, "Reset password");
      await sendEmail({ to: user.email, subject: "Reset your Treidify password", ...m });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url }) => {
      const m = actionEmail("Confirm your email", "Welcome to Treidify. Confirm your email address to finish creating your account.", url, "Confirm email");
      await sendEmail({ to: user.email, subject: "Confirm your Treidify email", ...m });
    },
  },
  user: {
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async ({ user, url }) => {
        const m = actionEmail("Confirm account deletion", "You asked to delete your Treidify account. This permanently removes your profile, synced trading data, journal and community content. This link expires in 24 hours.", url, "Delete my account");
        await sendEmail({ to: user.email, subject: "Confirm deleting your Treidify account", ...m });
      },
      beforeDelete: async (user) => { await audit("user.deleted", { actorId: user.id, targetType: "user", targetId: user.id }); },
    },
  },
  socialProviders: { ...(google ? { google } : {}), ...(apple ? { apple } : {}) },
  account: { accountLinking: { enabled: true, trustedProviders: ["google", "apple"] } },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: { "/sign-in/email": { window: 60, max: 8 }, "/sign-up/email": { window: 3600, max: 10 }, "/request-password-reset": { window: 3600, max: 5 }, "/two-factor/*": { window: 60, max: 10 } },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    // Share the session between treidify.com and app.treidify.com, e.g. AUTH_COOKIE_DOMAIN=treidify.com.
    ...(process.env.AUTH_COOKIE_DOMAIN ? { crossSubDomainCookies: { enabled: true, domain: process.env.AUTH_COOKIE_DOMAIN } } : {}),
    ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (u) => {
          await db.insert(schema.profile).values({ userId: u.id }).onConflictDoNothing();
          await db.insert(schema.privacySettings).values({ userId: u.id }).onConflictDoNothing();
          await db.insert(schema.entitlement).values({ userId: u.id }).onConflictDoNothing();
          await db.insert(schema.communityMembership).values({ userId: u.id }).onConflictDoNothing();
          await audit("user.created", { actorId: u.id, targetType: "user", targetId: u.id });
        },
      },
    },
    session: {
      create: { after: async (s) => { await audit("session.created", { actorId: s.userId, targetType: "session", targetId: s.id, ip: s.ipAddress, meta: { userAgent: s.userAgent } }); } },
    },
  },
  plugins: [
    twoFactor({ issuer: "Treidify" }),
    username({ minUsernameLength: 3, maxUsernameLength: 24 }),
    admin({ defaultRole: "user", adminRoles: ["admin"] }),
    multiSession({ maximumSessions: 5 }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
