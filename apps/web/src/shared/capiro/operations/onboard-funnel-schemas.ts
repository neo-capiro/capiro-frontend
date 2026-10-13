import { z } from "zod";

/** Existing HTTP contract: capirov2@7b5a9644, apps/onboard-api/src/funnel. */
export const funnelStateSchema = z.enum([
  "registered",
  "verified",
  "plan_selected",
  "legal_accepted",
  "payment_on_file",
  "roles_designated",
  "import_pref",
  "org_setup",
  "provisioning",
  "provisioned",
  "failed",
]);
export const planChoiceSchema = z.enum(["trial", "paid"]);
export const payMethodSchema = z.enum(["card", "ach", "wire"]);
export const roleModeSchema = z.enum(["self", "invite"]);
export const importModeSchema = z.enum(["self", "managed"]);
export const roleDesignationSchema = z
  .object({
    email: z.email(),
    role: z.enum(["super", "admin"]),
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
  })
  .strict();
export const orgProfileSchema = z
  .object({
    legalName: z.string().min(2).max(200),
    vertical: z.string().min(1).max(100).optional(),
    teamSize: z.string().min(1).max(50).optional(),
    timezone: z.string().min(1).max(64).optional(),
    locale: z.string().min(1).max(32).optional(),
    address: z
      .object({
        street: z.string().min(1).max(200),
        city: z.string().min(1).max(100),
        state: z.string().min(1).max(50),
        zip: z.string().min(1).max(20),
      })
      .strict()
      .optional(),
  })
  .strict();
// New sessions persist {}, before the organization step has supplied its DTO.
// Stored JSON may retain fields outside this form; request strictness is separate.
export const storedOrgProfileSchema = orgProfileSchema
  .partial()
  .extend({
    // The service trims after DTO validation, so persisted names can be short/empty.
    legalName: z.string().optional(),
  })
  .strip();
export const funnelSessionSchema = z.object({
  sessionId: z.string(),
  state: funnelStateSchema,
  plan: planChoiceSchema.nullable(),
  payMethod: payMethodSchema.nullable(),
  profiles: z.number().nullable(),
  roleMode: roleModeSchema.nullable(),
  roleDesignations: z.array(roleDesignationSchema.strip()).nullable(),
  importMode: importModeSchema.nullable(),
  itAdminEmails: z.array(z.string()),
  orgProfile: storedOrgProfileSchema.nullable(),
  slugFinal: z.string().nullable(),
  tenantId: z.string().nullable(),
  failureReason: z.string().nullable(),
  email: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  orgName: z.string().nullable(),
  stripe: z.object({
    setupIntentStatus: z.string().optional(),
    subscriptionStatus: z.string().optional(),
  }),
});
export const legalDocSchema = z.object({
  docType: z.enum(["tos", "sa"]),
  version: z.string(),
  html: z.string(),
  pdfS3Key: z.string().optional(),
});
export const funnelStatusSchema = z.object({
  state: funnelStateSchema,
  tenantId: z.string().nullable(),
  slug: z.string().nullable(),
  failureReason: z.string().nullable(),
});
export const funnelRegisterBodySchema = z
  .object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    orgName: z.string().min(2).max(200),
  })
  .strict();
export const legalAcceptBodySchema = z
  .object({
    tosVersion: z.string().min(1).max(64),
    saVersion: z.string().min(1).max(64),
    signerName: z.string().min(1).max(120),
    signerTitle: z.string().min(1).max(120),
    signatureName: z.string().min(1).max(120),
    emailCopy: z.boolean().optional(),
  })
  .strict();
export const trialCompleteBodySchema = z
  .object({
    method: payMethodSchema,
    billingContact: z.email().optional(),
    setupIntentId: z.string().min(1).max(128).optional(),
  })
  .strict();
export const subscribeBodySchema = z
  .object({
    profiles: z.number().int().min(1).max(100000),
    method: payMethodSchema,
    billingContact: z.email().optional(),
  })
  .strict();
export const subscribeResultSchema = z.object({
  subscriptionId: z.string(),
  status: z.string(),
  clientSecret: z.string().nullable().optional(),
  // Receiving a URL does not authorize navigation; the adapter owns that policy.
  hostedInvoiceUrl: z.string().nullable().optional(),
});
export const onboardOkSchema = z.object({ ok: z.literal(true) });
