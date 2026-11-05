import { z } from "zod";

export const manualLocationSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name each site.").max(200),
  role: z.enum([
    "headquarters",
    "manufacturing",
    "research",
    "engineering",
    "testing",
    "office",
    "other",
  ]),
  status: z.enum([
    "unknown",
    "proposed",
    "operating",
    "announced",
    "under_construction",
    "closed",
  ]),
  country: z
    .string()
    .trim()
    .refine(
      (value) => !value || /^[A-Za-z]{2}$/.test(value),
      "Use a two-letter country code, or leave it empty.",
    ),
  addressLine: z.string().max(500),
  city: z.string().max(200),
  state: z.string().max(100),
  zip: z.string().max(20),
});
export const manualLeaderSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name each leadership contact.").max(200),
  title: z.string().max(200),
  email: z.union([z.email("Enter a valid leadership email."), z.literal("")]),
});
export const manualCapabilitySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name each capability.").max(300),
  type: z.enum(["product", "platform", "service", "program", "component"]),
  description: z
    .string()
    .max(600, "Capability description is limited to 600 characters."),
});
export type ManualLocation = z.infer<typeof manualLocationSchema>;
export type ManualLeader = z.infer<typeof manualLeaderSchema>;
export type ManualCapability = z.infer<typeof manualCapabilitySchema>;

export const codeFormat = (kind: "naics" | "psc" | "lda", code: string) =>
  kind === "naics"
    ? /^\d{2,6}$/.test(code)
    : kind === "psc"
      ? /^[A-Z0-9]{4}$/.test(code)
      : /^[A-Z]{3}$/.test(code);
