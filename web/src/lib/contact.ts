import { z } from "zod";

export const contactTopics = ["General question", "Account or sign-in", "Connecting MT4/MT5", "Billing", "Privacy or data request", "Report a problem", "Press or partnership"] as const;

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(120),
  email: z.email("Please enter a valid email address").max(254),
  topic: z.enum(contactTopics),
  message: z.string().trim().min(10, "Please write at least 10 characters").max(5000),
  /** Honeypot: real people leave this empty. */
  website: z.string().max(0).optional().default(""),
});

export type ContactInput = z.infer<typeof contactSchema>;
