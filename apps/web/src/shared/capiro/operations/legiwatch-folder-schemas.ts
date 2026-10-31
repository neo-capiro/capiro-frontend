import { z } from "zod";

export const folderSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string().nullable(),
  archived: z.boolean(),
  ownerClerkId: z.string().nullable(),
  otherUserAccess: z.string(),
  clientId: z.string().nullable(),
  defaultSession: z.string(),
  jurisdiction: z.string(),
  version: z.number(),
  canEdit: z.boolean(),
  canManage: z.boolean(),
  count: z.number(),
});
export const folderBillSchema = z.object({
  id: z.string(),
  number: z.string(),
  title: z.string(),
  sponsor: z.string().nullable(),
  jurisdiction: z.string(),
  sessionKey: z.string(),
  status: z.string().nullable(),
  latestAction: z.string().nullable(),
  latestActionAt: z.string().nullable(),
  sourceUrl: z.string().nullable(),
});
