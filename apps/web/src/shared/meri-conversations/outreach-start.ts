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

/** The plain states a start failure is shown as; a wire code never reaches the person. */
export const OUTREACH_START_NOT_CONFIRMED =
  "Generation outcome is not confirmed. Check the existing job; do not start it again.";
export const OUTREACH_START_REFUSED =
  "Generation could not start. Check your session and selected sources.";
export const OUTREACH_START_SIGNED_OUT =
  "Your session ended before generation started. Sign in again, then start it.";

/**
 * An answer the outreach receiver does not admit, read as the frontend's own proxy envelope
 * (`{ error: { code, outcome? } }`). Its UNAUTHENTICATED (401) means nothing was dispatched and the person signs in
 * again; its INVALID_REQUEST (400) refused the request before Core; a gateway answer, an `outcome: UNKNOWN`, or any
 * other unreadable answer may have started a job, so it is reported as not confirmed and never retried here.
 */
function unadmittedAnswer(status: number, text: string) {
  let code: unknown, outcome: unknown;
  try {
    const error = (
      JSON.parse(text) as { error?: { code?: unknown; outcome?: unknown } }
    ).error;
    code = error?.code;
    outcome = error?.outcome;
  } catch {
    code = undefined;
  }
  if (outcome !== "UNKNOWN" && status === 401 && code === "UNAUTHENTICATED")
    return OUTREACH_START_SIGNED_OUT;
  if (outcome !== "UNKNOWN" && status === 400 && code === "INVALID_REQUEST")
    return OUTREACH_START_REFUSED;
  return OUTREACH_START_NOT_CONFIRMED;
}

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
    let result: ReturnType<typeof receiveOutreachGenerationStartResponse>;
    try {
      result = receiveOutreachGenerationStartResponse(
        response.status,
        text,
        captured,
        Date.now(),
      );
    } catch {
      current.throwIfAborted();
      throw new Error(unadmittedAnswer(response.status, text));
    }
    current.throwIfAborted();
    if ("error" in result)
      throw new Error(
        result.error.code === "OUTREACH_GENERATION_UNKNOWN"
          ? OUTREACH_START_NOT_CONFIRMED
          : OUTREACH_START_REFUSED,
      );
    return result;
  });
}
