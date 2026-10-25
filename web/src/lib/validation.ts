import { z } from "zod";

export const usernameSchema = z.string().trim().min(3, "At least 3 characters.").max(24, "At most 24 characters.").regex(/^[a-zA-Z0-9_.]+$/, "Letters, numbers, dots and underscores only.");

export const isTimeZone = (tz: string) => { try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; } };
