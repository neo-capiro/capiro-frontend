import type { OperationRegistry } from "./contracts";

/** Release enables version 1 only after the canonical Core population filter serves. */
export function resolveOutreachAudienceVersion(
  env: Record<string, string | undefined>,
  issues: string[],
): 1 | undefined {
  const value = env.OUTREACH_AUDIENCE_FILTER_VERSION?.trim();
  if (!value) return undefined;
  if (value === "1") return 1;
  issues.push(
    "OUTREACH_AUDIENCE_FILTER_VERSION must be 1 or unset; audience filtering stays disabled.",
  );
  return undefined;
}

/** A forged or stale client selection must never reach an older strict Core list contract. */
export function outreachAudienceRegistry(
  operations: OperationRegistry,
  operation: string,
  version: 1 | undefined,
): OperationRegistry {
  if (
    version === 1 ||
    !["engagement.campaigns", "engagement.outreach.records"].includes(operation)
  )
    return operations;
  const definition = operations[operation];
  if (!definition) return operations;
  return {
    ...operations,
    [operation]: {
      ...definition,
      request: definition.request.refine(
        (input) => input.query?.direction === undefined,
        "Audience filtering requires the current Core producer. Select All audiences.",
      ),
    },
  };
}
