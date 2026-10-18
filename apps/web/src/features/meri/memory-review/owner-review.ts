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

export type OwnerMemoryCandidatePage = Readonly<{
  version: 1;
  candidates: OwnerMemoryCandidate[];
  nextCursor: string | null;
}>;

export type OwnerMemoryCandidateStatus = Readonly<{
  version: 1;
  id: string;
  status:
    | "pending"
    | "approved"
    | "rejected"
    | "auto_committed"
    | "withdrawn"
    | "superseded"
    | "changes_needed";
  terminal: boolean;
  decidedAt: string | null;
  committedMemoryId: string | null;
  committedMemoryItemId: string | null;
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

/** Opaque Core cursors are forwarded unchanged and never interpreted by the browser. */
export function receiveOwnerCandidatePage(
  value: unknown,
): OwnerMemoryCandidatePage {
  if (!value || typeof value !== "object")
    throw new Error("Invalid memory candidate page");
  const page = value as Record<string, unknown>;
  if (
    page.version !== 1 ||
    !(
      page.nextCursor === null ||
      (typeof page.nextCursor === "string" &&
        page.nextCursor.length > 0 &&
        page.nextCursor.length <= 4_096 &&
        !/[\u0000-\u001f\u007f]/.test(page.nextCursor))
    )
  )
    throw new Error("Invalid memory candidate page");
  const candidates = receiveOwnerCandidates(value);
  if (
    new Set(candidates.map((candidate) => candidate.id)).size !==
    candidates.length
  )
    throw new Error("Repeated memory candidate");
  return {
    version: 1,
    candidates,
    nextCursor: page.nextCursor,
  };
}

const terminalStatuses = new Set([
  "approved",
  "rejected",
  "auto_committed",
  "withdrawn",
  "superseded",
]);
const pendingStatuses = new Set(["pending", "changes_needed"]);

/** Only an exact owner-scoped terminal receipt may release an uncertain POST. */
export function receiveOwnerCandidateStatus(
  value: unknown,
  id: string,
): OwnerMemoryCandidateStatus {
  if (!value || typeof value !== "object")
    throw new Error("Invalid memory candidate status");
  const receipt = value as Record<string, unknown>;
  const terminal = terminalStatuses.has(String(receipt.status));
  if (
    receipt.version !== 1 ||
    receipt.id !== id ||
    !uuid.test(id) ||
    (!terminal && !pendingStatuses.has(String(receipt.status))) ||
    receipt.terminal !== terminal ||
    !(
      receipt.decidedAt === null ||
      (typeof receipt.decidedAt === "string" &&
        Number.isFinite(Date.parse(receipt.decidedAt)))
    ) ||
    !(
      receipt.committedMemoryId === null ||
      (typeof receipt.committedMemoryId === "string" &&
        uuid.test(receipt.committedMemoryId))
    ) ||
    !(
      receipt.committedMemoryItemId === null ||
      (typeof receipt.committedMemoryItemId === "string" &&
        uuid.test(receipt.committedMemoryItemId))
    )
  )
    throw new Error("Invalid memory candidate status");
  return receipt as OwnerMemoryCandidateStatus;
}

export const ownerReviewPaths = Object.freeze({
  list: "/api/memory/owner/candidates",
  status: (id: string) => `/api/memory/owner/candidates/${id}/status`,
  decision: (id: string) => `/api/memory/owner/candidates/${id}/decision`,
  versionDecision: (id: string) =>
    `/api/memory/owner/candidates/${id}/version-decision`,
  correction: (id: string) => `/api/memory/owner/items/${id}/corrections`,
});

/** Core uses an internal key for unkeyed Meri submissions; keep it out of the heading. */
export function ownerCandidateTitle(candidate: OwnerMemoryCandidate): string {
  return candidate.sourceType === "meri" &&
    candidate.key === `meri:${candidate.id}`
    ? "Unkeyed memory proposal"
    : candidate.key;
}
