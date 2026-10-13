import { z } from "zod";

// capirov2 PR2427 docs/contracts/newsletter-outreach-response-routing.md:
// these reserved hints are not origin stamps or authorization grants.
export const richNewsletterId = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
export const newsletterRoutingMetadata = z
  .object({
    newsletterStageId: richNewsletterId.optional(),
    newsletterRevision: z
      .number()
      .int()
      .positive()
      .max(Number.MAX_SAFE_INTEGER)
      .optional(),
  })
  .strip();
