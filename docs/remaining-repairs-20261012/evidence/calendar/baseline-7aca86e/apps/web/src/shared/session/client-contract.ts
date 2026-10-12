import { z } from "zod";
// Verified boundary projection: capirov2 ClientsService / Client Prisma model.
// Extra backend fields are stripped; this app does not own or invent their semantics.
export const clientSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  website: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  productDescription: z.string().nullable().optional(),
  profileType: z.string().nullable().optional(),
  profileStatus: z.string(),
  status: z.string(),
  sectorTag: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  primaryContactName: z.string().nullable().optional(),
  primaryContactEmail: z.string().nullable().optional(),
  primaryContactPhone: z.string().nullable().optional(),
  intakeData: z
    .object({ profileNotes: z.string().optional() })
    .passthrough()
    .nullable()
    .optional(),
  submissionTracks: z.array(z.string()).optional(),
  issueCodes: z.array(z.string()).optional(),
  uei: z.string().nullable().optional(),
  cageCode: z.string().nullable().optional(),
  naicsCodes: z.array(z.string()).optional(),
  pscCodes: z.array(z.string()).optional(),
  setAsideCertifications: z.array(z.string()).optional(),
  applicantTypes: z.array(z.string()).optional(),
});
export type Client = z.infer<typeof clientSchema>;
