import {
  objectiveGenerationStartMetadata,
  requireObjectiveGenerationStartRequest,
  receiveObjectiveGenerationStartResponse,
} from "@capiro/meri-contracts/objective-generation";
import {
  boundedJsonText,
  withActionDeadline,
} from "@/shared/meri-actions/bounded-json";

/** Starts only the already reserved Core job. A 202 acknowledges dispatch, not a generated output. */
export async function startObjectiveGeneration(
  generationJobId: string,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  const body = requireObjectiveGenerationStartRequest({ generationJobId });
  return withActionDeadline([signal], async (requestSignal) => {
    const response = await fetcher(
      "/api/action-followthrough/objective-start",
      {
        method: objectiveGenerationStartMetadata.method,
        credentials: "same-origin",
        cache: "no-store",
        signal: requestSignal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const text = await boundedJsonText(
      response,
      requestSignal,
      objectiveGenerationStartMetadata.responseBytes,
    );
    const receipt = receiveObjectiveGenerationStartResponse(
      response.status,
      text,
      generationJobId,
    );
    requestSignal.throwIfAborted();
    if ("error" in receipt)
      throw new Error(
        receipt.error.code === "OBJECTIVE_GENERATION_UNKNOWN"
          ? "Generation start is unconfirmed. Retry the same saved job to check its dispatch."
          : "Generation could not start with current access. Refresh access before retrying the same saved job.",
      );
    return receipt;
  });
}
