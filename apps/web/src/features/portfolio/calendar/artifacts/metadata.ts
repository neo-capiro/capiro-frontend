import { z } from "zod";

export const artifactActorSchema = z.object({
  id: z.string(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  email: z.string().optional(),
}).nullable();

// Native save/approve responses contain metadata, never the saved plaintext.
export const artifactMetadataSchema = z.object({
  metadataVersion: z.literal(1).optional(),
  revision: z.iso.datetime().optional(),
  sharingKnown: z.boolean().optional(),
  approvalKnown: z.boolean().optional(),
  capabilities: z.object({ edit: z.boolean(), approve: z.boolean(), share: z.boolean(), unshare: z.boolean() }).optional(),
  id: z.string().min(1),
  meetingId: z.string().min(1),
  clientId: z.string().nullable(),
  authorUserId: z.string().nullable(),
  confidential: z.boolean(),
  status: z.string(),
  sharedAt: z.iso.datetime().nullable(),
  sharedByUserId: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  approvedAt: z.iso.datetime().nullable().optional(),
  approvedByUserId: z.string().nullable().optional(),
  author: artifactActorSchema.optional(),
  approvedBy: artifactActorSchema.optional(),
  sharedBy: artifactActorSchema.optional(),
});
