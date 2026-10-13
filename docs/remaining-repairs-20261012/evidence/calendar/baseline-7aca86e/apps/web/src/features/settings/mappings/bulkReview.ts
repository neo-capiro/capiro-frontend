import type { z } from "zod";
import type { mappingSchema } from "../../../shared/capiro/operations/settings-admin/mappings";

const allowedSources = new Set([
  "lda",
  "fec_employer",
  "sec",
  "fara",
  "lobby_intel",
]);
/** Current Figma policy: award-bearing and PAC records always receive individual review. */
export function eligibleForBulkReview(mapping: z.infer<typeof mappingSchema>) {
  return (
    !mapping.confirmed &&
    mapping.reviewStatus === "candidate" &&
    mapping.confidence >= 0.6 &&
    allowedSources.has(mapping.source)
  );
}
