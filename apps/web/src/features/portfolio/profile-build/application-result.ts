import { z } from "zod";
export const applicationResultSchema = z.strictObject({
  requestId: z.uuid(),
  status: z.enum(["completed", "partial", "refused"]),
  applied: z.array(z.uuid()),
  alreadyApplied: z.array(z.uuid()),
  errors: z.array(z.strictObject({ findingId: z.uuid(), message: z.string() })),
  replayed: z.boolean(),
});
export type ApplicationResult = z.infer<typeof applicationResultSchema>;
