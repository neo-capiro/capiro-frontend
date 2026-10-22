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

/** Freeze the reviewed batch and stop before the next dispatch when its scope expires. */
export async function confirmReviewedMappings(
  mappings: readonly { id: string }[],
  signal: AbortSignal,
  confirm: (
    id: string,
    signal: AbortSignal,
  ) => Promise<{ id: string; confirmed: boolean }>,
) {
  const ids = mappings.map((mapping) => mapping.id);
  let completed = 0;
  try {
    for (const id of ids) {
      signal.throwIfAborted();
      const receipt = await confirm(id, signal);
      if (receipt.id !== id || !receipt.confirmed)
        throw new Error("The service did not confirm this record.");
      completed++;
    }
    return completed;
  } catch (cause) {
    throw new Error(
      `${completed} mappings confirmed before the request stopped. ${cause instanceof Error ? cause.message : "Review the remaining candidates."}`,
    );
  }
}
