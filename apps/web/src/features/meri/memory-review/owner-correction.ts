/**
 * Display projection of Core's personal, controlling-item picker. Core owns
 * the wire contract; this narrow decoder holds the feature closed on drift.
 */
export type OwnerCorrectionItem = Readonly<{
  id: string;
  title: string;
  value: string;
  scope: "user_private";
  clientId: string | null;
  updatedAt: string;
}>;

export type OwnerCorrectionPage = Readonly<{
  items: OwnerCorrectionItem[];
  nextCursor: string | null;
}>;

export const ownerCorrectionPaths = Object.freeze({
  items: "/api/memory/owner/items",
});

export function ownerCorrectionHoldKey(
  userId: string | null | undefined,
  orgId: string | null | undefined,
): string | null {
  return userId
    ? `capiro:meri-memory-owner-correction-unknown:v1:${encodeURIComponent(userId)}:${encodeURIComponent(orgId ?? "")}`
    : null;
}

const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const microsecondUtc = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/;

export function receiveOwnerCorrectionPage(
  value: unknown,
): OwnerCorrectionPage {
  if (!value || typeof value !== "object")
    throw new Error("Invalid memory item response");
  const page = value as Record<string, unknown>;
  if (
    page.schemaVersion !== 1 ||
    !Array.isArray(page.items) ||
    page.items.length > 25 ||
    (page.nextCursor !== null &&
      (typeof page.nextCursor !== "string" ||
        !page.nextCursor ||
        page.nextCursor.length > 512 ||
        !/^[A-Za-z0-9_-]+$/.test(page.nextCursor)))
  )
    throw new Error("Invalid memory item page");
  const ids = new Set<string>();
  const items = page.items.map((raw: unknown) => {
    if (!raw || typeof raw !== "object") throw new Error("Invalid memory item");
    const item = raw as Record<string, unknown>;
    if (
      typeof item.id !== "string" ||
      !uuid.test(item.id) ||
      ids.has(item.id) ||
      typeof item.title !== "string" ||
      !item.title.trim() ||
      typeof item.value !== "string" ||
      item.scope !== "user_private" ||
      (item.clientId !== null &&
        (typeof item.clientId !== "string" || !uuid.test(item.clientId))) ||
      typeof item.updatedAt !== "string" ||
      !microsecondUtc.test(item.updatedAt) ||
      !Number.isFinite(Date.parse(item.updatedAt))
    )
      throw new Error("Invalid memory item");
    ids.add(item.id);
    return {
      id: item.id,
      title: item.title,
      value: item.value,
      scope: "user_private" as const,
      clientId: item.clientId,
      updatedAt: item.updatedAt,
    } as OwnerCorrectionItem;
  });
  if (items.length === 0 && page.nextCursor !== null)
    throw new Error("Empty memory item page cannot continue");
  return { items, nextCursor: page.nextCursor };
}

export function receiveCorrectionReceipt(value: unknown): string {
  if (!value || typeof value !== "object")
    throw new Error("Invalid correction receipt");
  const receipt = value as Record<string, unknown>;
  if (
    receipt.status !== "pending_review" ||
    receipt.activeItemUnchanged !== true ||
    typeof receipt.candidateId !== "string" ||
    !uuid.test(receipt.candidateId)
  )
    throw new Error("Correction was not confirmed pending");
  return receipt.candidateId;
}
