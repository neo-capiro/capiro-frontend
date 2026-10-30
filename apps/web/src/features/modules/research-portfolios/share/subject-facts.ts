/**
 * Read a frozen subject fact for the recipient dashboard.
 *
 * A published dashboard must show the legislative state that was captured with the
 * snapshot, never a live lookup: a later status change or re-referral cannot rewrite what
 * the client already received. Only string facts are rendered, so a malformed or missing
 * fact shows nothing rather than "[object Object]".
 */
export function frozenFact(facts: unknown, key: string): string | undefined {
  if (!facts || typeof facts !== "object" || Array.isArray(facts)) return undefined;
  const value = (facts as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** The one-line legislative summary a Subjects row shows for a bill, if it has one. */
export function billSubjectSummary(facts: unknown): string | undefined {
  const status = frozenFact(facts, "status");
  if (!status) return undefined;
  const actionDate = frozenFact(facts, "latestActionDate");
  return actionDate ? `${status} · action ${actionDate}` : status;
}
