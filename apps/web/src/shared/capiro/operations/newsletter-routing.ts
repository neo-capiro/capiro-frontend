import { z } from "zod";
import { parseNewsletterReservedMetadata } from "@capiro/shared/newsletter";

// capirov2@38fec5c8 public newsletter receiving contract:
// these reserved hints are not origin stamps or authorization grants.
export const richNewsletterId = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
export const newsletterRoutingMetadata = z.unknown().transform((value, ctx) => {
  const parsed = parseNewsletterReservedMetadata(value);
  if (!parsed.ok) {
    ctx.addIssue({
      code: "custom",
      message: `Invalid newsletter metadata: ${parsed.error.code}`,
    });
    return z.NEVER;
  }
  return parsed.value;
});
