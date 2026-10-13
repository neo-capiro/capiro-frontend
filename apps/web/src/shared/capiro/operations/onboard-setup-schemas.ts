import { z } from "zod";
import { importModeSchema, planChoiceSchema } from "./onboard-funnel-schemas";

/** Existing HTTP contract: capirov2@7b5a9644, onboard-api setup/IT/public. */
export const setupTaskKeySchema = z.enum([
  "it_email",
  "import",
  "firm_ai",
  "invites",
]);
export const setupTransitionStatusSchema = z.enum([
  "none",
  "waiting",
  "verifying",
  "done",
]);
export const setupTaskStatusSchema = z.enum([
  ...setupTransitionStatusSchema.options,
  "skipped",
]);
export const setupItInviteSchema = z.object({
  id: z.string(),
  email: z.string(),
  status: z.string(),
  provider: z.string().nullable(),
  expiresAt: z.string(),
});
export const setupStateSchema = z.object({
  complete: z.boolean(),
  legacyTenant: z.boolean(),
  importMode: importModeSchema,
  tasks: z.object({
    it_email: setupTaskStatusSchema,
    import: setupTaskStatusSchema,
    firm_ai: setupTaskStatusSchema,
    invites: setupTaskStatusSchema,
  }),
  orgName: z.string(),
  slug: z.string(),
  plan: planChoiceSchema,
  imported: z.number(),
  cap: z.number(),
  trialEndsAt: z.string().nullable(),
  itInvites: z.array(setupItInviteSchema),
});
export const itInviteTokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const itProviderSchema = z.enum(["microsoft", "google"]);
export const itInviteViewSchema = z.object({
  orgName: z.string(),
  email: z.string(),
  status: z.string(),
  provider: z.string().nullable(),
  providers: z.object({ microsoft: z.boolean(), google: z.boolean() }),
  googleClientId: z.string().nullable(),
});
export const itConsentUrlSchema = z.url().refine((value) => {
  const url = new URL(value);
  if (url.username || url.password || url.hash) return false;
  return (
    (url.origin === "https://accounts.google.com" &&
      url.pathname === "/o/oauth2/v2/auth") ||
    (url.origin === "https://login.microsoftonline.com" &&
      url.pathname === "/organizations/adminconsent")
  );
}, "The IT service returned an unrecognized provider destination.");
export const onboardConfigSchema = z.object({
  clerkPublishableKey: z.string().nullable(),
  stripePublishableKey: z.string().nullable(),
  appBaseUrl: z.url(),
  apiBaseUrl: z.url(),
  onboardingBaseUrl: z.url(),
  funnelEnabled: z.boolean(),
  environment: z.string(),
});
