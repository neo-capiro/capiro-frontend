import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  billingStateSchema,
  billingSummarySchema,
  brandingSchema,
  brandingSyncSchema,
  clientAccountOwnersSchema,
  connectionParamsSchema,
  contactInfoSchema,
  editableTeamRoleSchema,
  emptySettingsRequest,
  integrationCapabilitiesSchema,
  integrationProviderSchema,
  integrationSchema,
  integrationSyncQuerySchema,
  integrationSyncResponseSchema,
  invitationSchema,
  inviteBodySchema,
  logoContentTypeSchema,
  maskedCredentialSchema,
  membershipStatusSchema,
  meSchema,
  oauthStartBodySchema,
  oauthStartResponseSchema,
  presignedLogoSchema,
  provisionedMemberSchema,
  signatureBodySchema,
  signatureSchema,
  teamRowSchema,
  tenantIdentitySchema,
  tenantRoleSchema,
  updateMeBodySchema,
  usageEventSchema,
  usageSummarySchema,
  userParamsSchema,
} from "./settings-schemas";

const pinned = "@4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
const usersSource = `apps/api/src/users/users.controller.ts ${pinned}`;
const adminSource = `apps/api/src/tenant-admin/tenant-admin.controller.ts ${pinned}`;
const brandingSource = `apps/api/src/branding/branding.controller.ts ${pinned}`;
const usageSource = `apps/api/src/ai-usage/ai-usage.controller.ts ${pinned}`;
const billingSource = `apps/api/src/billing/billing.controller.ts ${pinned}`;
const microsoftSource = `apps/api/src/engagement/microsoft/microsoft-oauth.controller.ts ${pinned}`;
const googleSource = `apps/api/src/engagement/google/google-oauth.controller.ts ${pinned}`;

export const settingsOperations = {
  "clients.list": defineOperation({
    service: "core",
    method: "GET",
    path: "/clients",
    request: z
      .object({
        query: z
          .object({
            profileStatus: z.string().optional(),
            sectorTag: z.string().optional(),
            includeArchived: z.boolean().optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        profileType: z.string().nullable().optional(),
        profileStatus: z.string(),
        status: z.string(),
        description: z.string().nullable().optional(),
        sectorTag: z.string().nullable().optional(),
        logoUrl: z.string().nullable().optional(),
        website: z.string().nullable().optional(),
        createdAt: z.string().optional(),
        primaryContactName: z.string().nullable().optional(),
        primaryContactEmail: z.string().nullable().optional(),
      }),
    ),
    source: `apps/api/src/clients/clients.controller.ts:329 + clients.service.ts:1095 ${pinned}`,
  }),
  "settings.profiles.accountOwners": defineOperation({
    service: "core",
    method: "GET",
    path: "/client-account-owners",
    request: emptySettingsRequest,
    response: clientAccountOwnersSchema,
    source: `apps/api/src/clients/client-account-owner.controller.ts:15 + client-account-owner.service.ts:72 ${pinned}`,
  }),
  "me.read": defineOperation({
    service: "core",
    method: "GET",
    path: "/me",
    request: emptySettingsRequest,
    response: meSchema,
    source: usersSource,
  }),
  "me.update": defineOperation({
    service: "core",
    method: "PATCH",
    path: "/me",
    request: z.object({ body: updateMeBodySchema }).strict(),
    response: meSchema,
    source: usersSource,
  }),
  "me.memberships": defineOperation({
    service: "core",
    method: "GET",
    path: "/me/memberships",
    request: emptySettingsRequest,
    response: z.array(
      z.object({
        membershipId: z.string(),
        tenant: tenantIdentitySchema,
        role: tenantRoleSchema,
        status: membershipStatusSchema,
        joinedAt: z.string().nullable(),
      }),
    ),
    source: usersSource,
  }),
  "me.emailSignature.read": defineOperation({
    service: "core",
    method: "GET",
    path: "/me/email-signature",
    request: emptySettingsRequest,
    response: signatureSchema,
    source: usersSource,
  }),
  "me.emailSignature.update": defineOperation({
    service: "core",
    method: "PUT",
    path: "/me/email-signature",
    request: z.object({ body: signatureBodySchema }).strict(),
    response: signatureSchema,
    requestLimitBytes: 24000000,
    source: usersSource,
  }),
  "settings.tenantMembers": defineOperation({
    service: "core",
    method: "GET",
    path: "/tenant-members",
    request: emptySettingsRequest,
    response: z.array(
      z.object({
        id: z.string(),
        clerkUserId: z.string(),
        email: z.string(),
        name: z.string(),
      }),
    ),
    source: usersSource,
  }),
  "settings.contact.read": defineOperation({
    service: "core",
    method: "GET",
    path: "/tenant-admin/contact-info",
    request: emptySettingsRequest,
    response: contactInfoSchema,
    source: adminSource,
  }),
  "settings.contact.update": defineOperation({
    service: "core",
    method: "PUT",
    path: "/tenant-admin/contact-info",
    request: z.object({ body: contactInfoSchema.strict() }).strict(),
    response: contactInfoSchema,
    source: adminSource,
  }),
  "settings.team.list": defineOperation({
    service: "core",
    method: "GET",
    path: "/tenant-admin/team",
    request: emptySettingsRequest,
    response: z.array(teamRowSchema),
    source: adminSource,
  }),
  "settings.team.invitations": defineOperation({
    service: "core",
    method: "GET",
    path: "/tenant-admin/team/invitations",
    request: emptySettingsRequest,
    response: z.array(invitationSchema),
    source: adminSource,
  }),
  "settings.team.invite": defineOperation({
    service: "core",
    method: "POST",
    path: "/tenant-admin/team/invite",
    request: z.object({ body: inviteBodySchema }).strict(),
    response: z.object({
      status: z.literal("invited"),
      invitation: invitationSchema,
    }),
    source: adminSource,
  }),
  "settings.team.resend": defineOperation({
    service: "core",
    method: "POST",
    path: "/tenant-admin/team/invitations/:invitationId/resend",
    request: z
      .object({
        params: z.object({ invitationId: z.string().min(1).max(256) }).strict(),
      })
      .strict(),
    response: z.object({ invitationId: z.string() }),
    source: adminSource,
  }),
  "settings.team.remove": defineOperation({
    service: "core",
    method: "DELETE",
    path: "/tenant-admin/team/:userId",
    request: z.object({ params: userParamsSchema }).strict(),
    response: z.union([
      z.object({ ok: z.literal(true) }),
      z.object({ jobId: z.string() }),
    ]),
    source: adminSource,
  }),
  "settings.team.setRole": defineOperation({
    service: "core",
    method: "PUT",
    path: "/tenant-admin/team/:userId/role",
    request: z
      .object({
        params: userParamsSchema,
        body: z.object({ role: editableTeamRoleSchema }).strict(),
      })
      .strict(),
    response: z.object({
      member: provisionedMemberSchema,
      role: editableTeamRoleSchema,
    }),
    source: adminSource,
  }),
  "settings.team.setBillingAdmin": defineOperation({
    service: "core",
    method: "PUT",
    path: "/tenant-admin/team/:userId/billing-admin",
    request: z
      .object({
        params: userParamsSchema,
        body: z.object({ billingAdmin: z.boolean() }).strict(),
      })
      .strict(),
    response: z.object({ userId: z.string(), billingAdmin: z.boolean() }),
    source: adminSource,
  }),
  "settings.auditLogs": defineOperation({
    service: "core",
    method: "GET",
    path: "/tenant-admin/audit-logs",
    request: z
      .object({
        query: z
          .object({
            action: z.string().min(1).max(200).optional(),
            entityType: z.string().min(1).max(200).optional(),
            from: z.iso.datetime({ offset: true }).optional(),
            to: z.iso.datetime({ offset: true }).optional(),
            page: z.number().int().min(1).optional(),
            limit: z.number().int().min(1).max(100).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.object({
      data: z.array(
        z.object({
          id: z.string(),
          action: z.string(),
          actorRole: z.string().nullable(),
          entityType: z.string(),
          entityId: z.string().nullable(),
          occurredAt: z.string(),
        }),
      ),
      total: z.number(),
      page: z.number(),
      limit: z.number(),
    }),
    source: adminSource,
  }),
  "settings.branding.read": defineOperation({
    service: "core",
    method: "GET",
    path: "/tenant-admin/branding",
    request: emptySettingsRequest,
    response: brandingSchema.nullable(),
    source: brandingSource,
  }),
  "settings.branding.update": defineOperation({
    service: "core",
    method: "PUT",
    path: "/tenant-admin/branding",
    request: z
      .object({
        body: z
          .object({
            name: z.string().min(2).optional(),
          })
          .strict(),
      })
      .strict(),
    response: brandingSchema.extend({ clerkSync: brandingSyncSchema }),
    source:
      "apps/api/src/tenant-admin/tenant-admin.service.ts@2262b5c2282e04dfd1a9bb7f54675769f45af71c",
  }),
  "settings.branding.sync": defineOperation({
    service: "core",
    method: "POST",
    path: "/tenant-admin/branding/sync",
    request: emptySettingsRequest,
    response: z.object({
      id: z.string(),
      name: z.string(),
      clerkSync: brandingSyncSchema,
    }),
    source:
      "apps/api/src/tenant-admin/tenant-admin.service.ts@2262b5c2282e04dfd1a9bb7f54675769f45af71c",
  }),
  "settings.branding.logoUploadUrl": defineOperation({
    service: "core",
    method: "POST",
    path: "/tenant-admin/branding/logo/upload-url",
    request: z
      .object({
        body: z
          .object({
            contentType: logoContentTypeSchema,
            contentLength: z
              .number()
              .int()
              .min(1)
              .max(2 * 1024 * 1024),
          })
          .strict(),
      })
      .strict(),
    response: presignedLogoSchema,
    source: brandingSource,
  }),
  "settings.branding.logoConfirm": defineOperation({
    service: "core",
    method: "POST",
    path: "/tenant-admin/branding/logo/confirm",
    request: z
      .object({
        body: z
          .object({
            s3Key: z.string().min(1),
            contentType: logoContentTypeSchema,
          })
          .strict(),
      })
      .strict(),
    response: brandingSchema,
    source: brandingSource,
  }),
  "settings.billing.state": defineOperation({
    service: "core",
    method: "GET",
    path: "/billing/state",
    request: emptySettingsRequest,
    response: billingStateSchema,
    source: billingSource,
  }),
  "settings.billing.summary": defineOperation({
    service: "core",
    method: "GET",
    path: "/billing/summary",
    request: emptySettingsRequest,
    response: billingSummarySchema,
    source: billingSource,
  }),
  "settings.billing.portal": defineOperation({
    service: "onboard",
    method: "POST",
    path: "/billing/portal",
    request: emptySettingsRequest,
    response: z.object({ url: z.url() }),
    source: `apps/onboard-api/src/billing/billing.controller.ts ${pinned}`,
  }),
  "settings.billing.checkout": defineOperation({
    service: "onboard",
    method: "POST",
    path: "/billing/checkout",
    request: z
      .object({
        body: z
          .object({
            quantity: z.number().int().min(10).max(100000),
            promoCode: z.string().min(1).max(64).optional(),
          })
          .strict(),
      })
      .strict(),
    response: z.object({ url: z.url() }),
    source: `apps/onboard-api/src/billing/billing.controller.ts ${pinned}`,
  }),
  "settings.aiUsage.summary": defineOperation({
    service: "core",
    method: "GET",
    path: "/ai-usage/summary",
    request: z
      .object({
        query: z
          .object({
            from: z.iso.datetime({ offset: true }).optional(),
            to: z.iso.datetime({ offset: true }).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: usageSummarySchema,
    source: usageSource,
  }),
  "settings.aiUsage.events": defineOperation({
    service: "core",
    method: "GET",
    path: "/ai-usage/events",
    request: z
      .object({
        query: z
          .object({ limit: z.number().int().min(1).max(100).optional() })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.array(usageEventSchema),
    source: usageSource,
  }),
  "settings.aiUsage.credentials": defineOperation({
    service: "core",
    method: "GET",
    path: "/ai-usage/credential",
    request: emptySettingsRequest,
    response: z.array(maskedCredentialSchema),
    source: usageSource,
  }),
  "settings.integrations.list": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/integrations",
    request: emptySettingsRequest,
    response: z.array(integrationSchema),
    source: `apps/api/src/engagement/engagement.controller.ts ${pinned}`,
  }),
  "settings.integrations.create": defineOperation({
    service: "core",
    method: "POST",
    path: "/engagement/integrations",
    request: z
      .object({
        body: z
          .object({
            provider: integrationProviderSchema,
            accountEmail: z.email().optional(),
            displayName: z.string().min(1).max(120).optional(),
          })
          .strict(),
      })
      .strict(),
    response: integrationSchema,
    source: `apps/api/src/engagement/engagement.controller.ts ${pinned}`,
  }),
  "settings.integrations.microsoftCapabilities": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/integrations/microsoft/capabilities",
    request: emptySettingsRequest,
    response: integrationCapabilitiesSchema,
    source: microsoftSource,
  }),
  "settings.integrations.googleCapabilities": defineOperation({
    service: "core",
    method: "GET",
    path: "/engagement/integrations/google/capabilities",
    request: emptySettingsRequest,
    response: integrationCapabilitiesSchema,
    source: googleSource,
  }),
  "settings.integrations.startMicrosoft": defineOperation({
    service: "core",
    method: "POST",
    path: "/engagement/integrations/microsoft/start",
    request: z.object({ body: oauthStartBodySchema }).strict(),
    response: oauthStartResponseSchema,
    source: microsoftSource,
  }),
  "settings.integrations.startGoogle": defineOperation({
    service: "core",
    method: "POST",
    path: "/engagement/integrations/google/start",
    request: z.object({ body: oauthStartBodySchema }).strict(),
    response: oauthStartResponseSchema,
    source: googleSource,
  }),
  "settings.integrations.syncMicrosoft": defineOperation({
    service: "core",
    method: "POST",
    path: "/engagement/integrations/microsoft/:connectionId/sync",
    request: z
      .object({
        params: connectionParamsSchema,
        query: integrationSyncQuerySchema
          .extend({
            from: z.iso.datetime({ offset: true }).optional(),
            to: z.iso.datetime({ offset: true }).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: integrationSyncResponseSchema,
    timeoutMs: 170000,
    source: microsoftSource,
  }),
  "settings.integrations.configureMicrosoftSubscriptions": defineOperation({
    service: "core",
    method: "POST",
    path: "/engagement/integrations/microsoft/:connectionId/subscriptions",
    request: z.object({ params: connectionParamsSchema }).strict(),
    response: z.object({ configured: z.literal(true) }),
    timeoutMs: 170000,
    source: microsoftSource,
  }),
  "settings.integrations.syncGoogle": defineOperation({
    service: "core",
    method: "POST",
    path: "/engagement/integrations/google/:connectionId/sync",
    request: z
      .object({
        params: connectionParamsSchema,
        query: integrationSyncQuerySchema.optional(),
      })
      .strict(),
    response: integrationSyncResponseSchema,
    timeoutMs: 170000,
    source: googleSource,
  }),
  "settings.integrations.disconnectMicrosoft": defineOperation({
    service: "core",
    method: "DELETE",
    path: "/engagement/integrations/microsoft/:connectionId",
    request: z.object({ params: connectionParamsSchema }).strict(),
    response: z.object({
      disconnected: z.literal(true),
      connectionId: z.string(),
      subscriptionsDeleted: z.number(),
    }),
    source: microsoftSource,
  }),
  "settings.integrations.disconnectGoogle": defineOperation({
    service: "core",
    method: "DELETE",
    path: "/engagement/integrations/google/:connectionId",
    request: z.object({ params: connectionParamsSchema }).strict(),
    response: z.object({
      disconnected: z.literal(true),
      connectionId: z.string(),
    }),
    source: googleSource,
  }),
} as const;
