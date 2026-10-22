import { z } from "zod";
import { defineOperation } from "../../contracts";
import {
  maskedCredentialSchema,
  usageSummarySchema,
} from "../settings-schemas";
import {
  customerSchema,
  empty,
  invitationSchema,
  range,
  tenantDetailSchema,
  tenantListSchema,
  tenantParams,
  tenantSchema,
  tenantUsageSchema,
} from "./schemas";

const source =
  "apps/api/src/capiro-admin/capiro-admin.controller.ts + capiro-admin.service.ts@4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
export const hqOperations = {
  "settings.hq.tenants.list": defineOperation({
    service: "core",
    method: "GET",
    path: "/capiro-admin/tenants",
    request: empty,
    response: z.array(tenantListSchema),
    source,
  }),
  "settings.hq.tenants.detail": defineOperation({
    service: "core",
    method: "GET",
    path: "/capiro-admin/tenants/:tenantId",
    request: z.object({ params: tenantParams }).strict(),
    response: tenantDetailSchema,
    source,
  }),
  "settings.hq.tenants.create": defineOperation({
    service: "core",
    method: "POST",
    path: "/capiro-admin/tenants",
    request: z
      .object({
        body: z
          .object({
            slug: z
              .string()
              .min(2)
              .max(63)
              .regex(/^[a-z0-9][a-z0-9-]*$/),
            name: z.string().min(2).max(200),
            adminEmail: z.email(),
            adminFirstName: z.string().min(1).max(100).optional(),
            adminLastName: z.string().min(1).max(100).optional(),
            redirectUrl: z.url().optional(),
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      tenant: tenantSchema,
      invitation: invitationSchema,
      clerkOrgId: z.string(),
    }),
    source,
  }),
  "settings.hq.tenants.delete": defineOperation({
    service: "core",
    method: "DELETE",
    path: "/capiro-admin/tenants/:tenantId",
    request: z.object({ params: tenantParams }).strict(),
    response: z.object({
      ok: z.literal(true),
      deletedTenantId: z.string(),
      slug: z.string(),
    }),
    source,
  }),
  "settings.hq.tenants.resendInvitation": defineOperation({
    service: "core",
    method: "POST",
    path: "/capiro-admin/tenants/:tenantId/admins/resend",
    request: z
      .object({
        params: tenantParams,
        body: z
          .object({ email: z.email(), redirectUrl: z.url().optional() })
          .strict(),
      })
      .strict(),
    response: z.object({
      invitationId: z.string().min(1),
      tenantId: z.string(),
      email: z.email(),
      role: z.literal("user_admin"),
    }),
    source,
  }),
  "settings.hq.customers.list": defineOperation({
    service: "core",
    method: "GET",
    path: "/capiro-admin/billing/customers",
    request: empty,
    response: z.array(customerSchema),
    source: "apps/api/src/billing/billing.service.ts:140 " + source,
  }),
  "settings.hq.customers.comp": defineOperation({
    service: "onboard",
    method: "POST",
    path: "/admin/billing/tenants/:tenantId/comp",
    request: z
      .object({
        params: tenantParams,
        body: z.object({ comped: z.boolean() }).strict(),
      })
      .strict(),
    response: z.object({ status: z.enum(["comped", "none"]) }),
    source:
      "apps/onboard-api/src/billing/billing.controller.ts:65 + billing.service.ts:289@4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace",
  }),
  "settings.hq.ai.usage": defineOperation({
    service: "core",
    method: "GET",
    path: "/capiro-admin/ai-usage",
    request: z.object({ query: range.optional() }).strict(),
    response: z.array(tenantUsageSchema),
    source,
  }),
  "settings.hq.ai.tenantUsage": defineOperation({
    service: "core",
    method: "GET",
    path: "/capiro-admin/tenants/:tenantId/ai-usage",
    request: z
      .object({ params: tenantParams, query: range.optional() })
      .strict(),
    response: usageSummarySchema,
    source,
  }),
  "settings.hq.ai.credentials": defineOperation({
    service: "core",
    method: "GET",
    path: "/capiro-admin/tenants/:tenantId/ai-credential",
    request: z.object({ params: tenantParams }).strict(),
    response: z.array(maskedCredentialSchema),
    source,
  }),
  "settings.hq.ai.setCredential": defineOperation({
    service: "core",
    method: "POST",
    path: "/capiro-admin/tenants/:tenantId/ai-credential",
    request: z
      .object({
        params: tenantParams,
        body: z
          .object({
            provider: z.enum(["openai", "anthropic"]),
            apiKey: z.string().min(8).max(400),
            modelOverride: z.string().min(1).max(80).optional(),
          })
          .strict(),
      })
      .strict(),
    response: maskedCredentialSchema,
    source,
  }),
  "settings.hq.ai.removeCredential": defineOperation({
    service: "core",
    method: "DELETE",
    path: "/capiro-admin/tenants/:tenantId/ai-credential/:provider",
    request: z
      .object({
        params: tenantParams
          .extend({ provider: z.enum(["openai", "anthropic"]) })
          .strict(),
      })
      .strict(),
    response: z.object({ removed: z.boolean() }),
    source,
  }),
  "settings.hq.ai.updateModel": defineOperation({
    service: "core",
    method: "POST",
    path: "/capiro-admin/tenants/:tenantId/ai-credential/model",
    request: z
      .object({
        params: tenantParams,
        body: z
          .object({
            provider: z.literal("openai"),
            modelOverride: z.literal("gpt-6.1-sol").optional(),
            restoreDefault: z.boolean().optional(),
            expectedModelOverride: z.string().min(1).max(80).nullable(),
            expectedUpdatedAt: z.iso
              .datetime()
              .refine(
                (value) =>
                  Number.isFinite(Date.parse(value)) &&
                  new Date(value).toISOString() === value,
              ),
          })
          .strict()
          .refine((body) =>
            body.restoreDefault === true
              ? body.modelOverride === undefined
              : body.modelOverride === "gpt-6.1-sol",
          ),
      })
      .strict(),
    response: maskedCredentialSchema,
    source,
  }),
} as const;

// Impersonation is not registered: the gateway does not yet bind an audited admin
// scope to subsequent requests. Starting a backend session alone would misstate access.
