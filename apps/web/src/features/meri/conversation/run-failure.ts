/**
 * Plain language for the reason a failed `run.status` carries, saying only what the code knows.
 * The wire field is a free string; the worker's own vocabulary is written out here, and anything
 * else keeps the generic sentence with the code shown small so support can still read it.
 */
const lost = "Meri lost this answer before it finished. Send it again.";
const reasons: Readonly<Record<string, string>> = {
  EXECUTION_FAILED:
    "Meri could not finish this answer. Send it again, or rephrase.",
  HOLD_CHECKPOINT_FAILED: lost,
  ATTEMPT_LOST: lost,
};
const fallback = "Meri could not finish this answer. Send it again.";

export function describeRunFailure(reasonCode: string | null) {
  if (!reasonCode) return null;
  const message = reasons[reasonCode];
  return message
    ? { message, code: null }
    : { message: fallback, code: reasonCode };
}
