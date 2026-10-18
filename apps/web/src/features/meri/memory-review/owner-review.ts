/**
 * Local display projection of Core's owner-only pending response. Before live
 * activation, the Core owner must export a versioned wire DTO for this route;
 * this decoder intentionally fails closed if the current response changes.
 */
export type OwnerMemoryCandidate = Readonly<{
  id: string;
  kind: "addition" | "correction" | "restore" | "contradiction";
  key: string;
  value: string;
  sourceType: string | null;
  createdAt: string;
}>;

const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const kinds = new Set<OwnerMemoryCandidate["kind"]>([
  "addition",
  "correction",
  "restore",
  "contradiction",
]);

/** Reject a changed upstream shape instead of turning a failed read into an empty inbox. */
export function receiveOwnerCandidates(value: unknown): OwnerMemoryCandidate[] {
  if (!value || typeof value !== "object" || !("candidates" in value))
    throw new Error("Invalid memory candidate response");
  const rows = value.candidates;
  if (!Array.isArray(rows) || rows.length > 100)
    throw new Error("Invalid memory candidate list");
  return rows.map((row: unknown) => {
    if (!row || typeof row !== "object")
      throw new Error("Invalid memory candidate");
    const item = row as Record<string, unknown>;
    if (
      typeof item.id !== "string" ||
      !uuid.test(item.id) ||
      !kinds.has(item.kind as OwnerMemoryCandidate["kind"]) ||
      typeof item.key !== "string" ||
      typeof item.value !== "string" ||
      typeof item.createdAt !== "string" ||
      !Number.isFinite(Date.parse(item.createdAt)) ||
      (item.sourceType !== null &&
        item.sourceType !== undefined &&
        typeof item.sourceType !== "string")
    )
      throw new Error("Invalid memory candidate");
    return {
      id: item.id,
      kind: item.kind as OwnerMemoryCandidate["kind"],
      key: item.key,
      value: item.value,
      sourceType: item.sourceType ?? null,
      createdAt: item.createdAt,
    } as OwnerMemoryCandidate;
  });
}

export const ownerReviewPaths = Object.freeze({
  list: "/api/memory/owner/candidates",
  decision: (id: string) => `/api/memory/owner/candidates/${id}/decision`,
  versionDecision: (id: string) =>
    `/api/memory/owner/candidates/${id}/version-decision`,
});

/** Core uses an internal key for unkeyed Meri submissions; keep it out of the heading. */
export function ownerCandidateTitle(candidate: OwnerMemoryCandidate): string {
  return candidate.sourceType === "meri" &&
    candidate.key === `meri:${candidate.id}`
    ? "Unkeyed memory proposal"
    : candidate.key;
}
