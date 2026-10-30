import {
  outreachGenerationStartMetadata,
  requireOutreachGenerationStartRequest,
  receiveOutreachGenerationStartResponse,
  type OutreachGenerationStartRequest,
} from "@capiro/meri-contracts/outreach-generation";
import {
  boundedJsonText,
  withActionDeadline,
} from "../meri-actions/bounded-json";
import type { CurrentReadOperation } from "./current-reads";

export const outreachStartOperation: CurrentReadOperation<unknown> = {
  ...outreachGenerationStartMetadata,
  admit(bytes) {
    const input = requireOutreachGenerationStartRequest(
      JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
    );
    return (status, body) =>
      receiveOutreachGenerationStartResponse(
        status,
        new TextDecoder("utf-8", { fatal: true }).decode(body),
        input,
        Date.now(),
      );
  },
};
/** A user-started exact Core unit; failures never trigger an automatic redispatch. */
export async function startOutreachGeneration(
  input: OutreachGenerationStartRequest,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  const captured = requireOutreachGenerationStartRequest(input);
  return withActionDeadline([signal], async (current) => {
    const response = await fetcher(outreachGenerationStartMetadata.path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(captured),
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      signal: current,
    });
    const text = await boundedJsonText(
      response,
      current,
      outreachGenerationStartMetadata.responseBytes,
    );
    const result = receiveOutreachGenerationStartResponse(
      response.status,
      text,
      captured,
      Date.now(),
    );
    current.throwIfAborted();
    if ("error" in result)
      throw new Error(
        result.error.code === "OUTREACH_GENERATION_UNKNOWN"
          ? "Generation outcome is not confirmed. Check the existing job; do not start it again."
          : "Generation could not start. Check your session and selected sources.",
      );
    return result;
  });
}
