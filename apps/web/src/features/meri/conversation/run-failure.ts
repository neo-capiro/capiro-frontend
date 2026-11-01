/**
 * Plain language for the reason a failed `run.status` carries. The wire field is a free string;
 * the worker's own vocabulary is written out here, and anything else keeps the generic sentence
 * with the code shown small so support can still read it.
 */
const reasons: Readonly<Record<string, string>> = {
  EXECUTION_FAILED:
    "Meri couldn't finish this request. Try sending it again; if you applied a skill, try without it.",
  HOLD_CHECKPOINT_FAILED:
    "Meri couldn't save this run's progress, so it stopped. Send the request again.",
  ATTEMPT_LOST:
    "Meri lost contact with this run before it finished. Send the request again.",
};
const fallback = "Meri couldn't finish this request. Try sending it again.";

export function describeRunFailure(reasonCode: string | null) {
  if (!reasonCode) return null;
  const message = reasons[reasonCode];
  return message
    ? { message, code: null }
    : { message: fallback, code: reasonCode };
}
