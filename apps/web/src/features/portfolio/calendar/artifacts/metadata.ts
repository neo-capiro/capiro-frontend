import { z } from "zod";

// Native save/approve responses contain metadata, never the saved plaintext.
export const artifactMetadataSchema = z.object({
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
});
