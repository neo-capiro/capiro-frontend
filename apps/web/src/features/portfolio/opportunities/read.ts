import { ApiError } from "@/shared/portfolio/api/http";

export const opportunityReadDeadlineMs = 25_000;
/** Reads are safe to retry explicitly; never extend the wait with automatic retries. */
export async function readOpportunitySource<T>(
  source: "Opportunities" | "Relevant budget programs",
  signal: AbortSignal,
  read: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const deadline = AbortSignal.timeout(opportunityReadDeadlineMs);
  try {
    return await read(AbortSignal.any([signal, deadline]));
  } catch (error) {
    if (signal.aborted) throw error;
    if (deadline.aborted)
      throw new ApiError(
        504,
        `${source} did not respond within 25 seconds. Retry this source to check again.`,
      );
    if (error instanceof ApiError && error.status < 500) throw error;
    throw new ApiError(
      503,
      `${source} could not be loaded. Retry this source; if it continues to fail, contact support.`,
    );
  }
}
