export type OutreachAudience = "all" | "to-clients" | "on-behalf";

export function audienceSelection(
  audience: OutreachAudience,
  version: 1 | undefined,
) {
  return {
    blocked: audience !== "all" && version !== 1,
    query: audience !== "all" && version === 1 ? { direction: audience } : {},
    sessionsInScope: audience === "all",
  };
}
