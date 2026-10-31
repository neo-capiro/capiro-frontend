export type OwnerMemoryRef = { kind: "item"; id: string };
export type OwnerReadKind = "versions" | "evidence";
export interface HistoryEntry {
  id: string;
  revision: string;
  createdAt: string;
  title: string;
  status: "current" | "superseded";
  content:
    | { availability: "available"; text: string }
    | { availability: "unavailable"; reason: "malformed" | "size_limit" };
}
export interface ConversationEvidence {
  kind: "conversation";
  reference: { kind: "conversation"; id: string; clientId: string | null };
  observedAt: string;
}
export interface HistoryPage {
  schemaVersion: 1;
  anchor: OwnerMemoryRef & { revision: string };
  availability: "available" | "unsupported" | "unavailable";
  sources?: ConversationEvidence[];
  entries: HistoryEntry[];
  nextCursor: string | null;
}
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const revision = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(value) &&
  Number.isFinite(Date.parse(value));
export function ownerHistoryPath(ref: OwnerMemoryRef, kind: OwnerReadKind) {
  if (
    ref.kind !== "item" ||
    !uuid.test(ref.id) ||
    !["versions", "evidence"].includes(kind)
  )
    throw Error("Unsupported memory reference");
  return `/api/memory/owner/items/${ref.id}/${kind}`;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Invalid memory response");
  return value as Record<string, unknown>;
}
export function receiveOwnerHistory(
  value: unknown,
  ref: OwnerMemoryRef,
  kind: OwnerReadKind,
): HistoryPage {
  const page = object(value),
    anchor = object(page.anchor);
  if (
    page.schemaVersion !== 1 ||
    anchor.kind !== "item" ||
    anchor.id !== ref.id ||
    !revision(anchor.revision) ||
    !Array.isArray(page.entries) ||
    page.entries.length > 100 ||
    (page.nextCursor !== null &&
      (typeof page.nextCursor !== "string" ||
        page.nextCursor.length > 512 ||
        !/^[A-Za-z0-9_-]+$/.test(page.nextCursor)))
  )
    throw Error("Unsupported memory response");
  const result: HistoryPage = {
    schemaVersion: 1,
    anchor: { ...ref, revision: anchor.revision },
    availability: "available",
    entries: [],
    nextCursor: page.nextCursor as string | null,
  };
  if (kind === "evidence") {
    if (page.nextCursor !== null) throw Error("Unsupported evidence cursor");
    if (
      page.availability === "unsupported" ||
      page.availability === "unavailable"
    ) {
      if (
        page.entries.length ||
        page.reason !==
          (page.availability === "unsupported"
            ? "source_reader_unbound"
            : "source_unavailable")
      )
        throw Error("Invalid unavailable evidence");
      return { ...result, availability: page.availability };
    }
    if (page.availability !== "available" || page.entries.length !== 1)
      throw Error("Unsupported evidence response");
    const entry = object(page.entries[0]),
      source = object(entry.reference);
    if (
      entry.kind !== "conversation" ||
      source.kind !== "conversation" ||
      typeof source.id !== "string" ||
      !uuid.test(source.id) ||
      (source.clientId !== null &&
        (typeof source.clientId !== "string" || !uuid.test(source.clientId))) ||
      !revision(entry.observedAt)
    )
      throw Error("Invalid evidence reference");
    return {
      ...result,
      sources: [
        {
          kind: "conversation",
          reference: {
            kind: "conversation",
            id: source.id,
            clientId: source.clientId as string | null,
          },
          observedAt: entry.observedAt,
        },
      ],
    };
  }
  if (page.availability !== "available")
    throw Error("Unavailable memory response");
  const ids = new Set<string>();
  result.entries = page.entries.map((raw) => {
    const entry = object(raw),
      content = object(entry.content);
    if (
      typeof entry.id !== "string" ||
      !uuid.test(entry.id) ||
      ids.has(entry.id) ||
      !revision(entry.revision) ||
      !revision(entry.createdAt) ||
      typeof entry.title !== "string" ||
      (entry.status !== "current" && entry.status !== "superseded")
    )
      throw Error("Invalid history entry");
    ids.add(entry.id);
    if (
      content.availability !== "available" &&
      content.availability !== "unavailable"
    )
      throw Error("Invalid history content");
    if (
      content.availability === "available"
        ? typeof content.text !== "string"
        : !["malformed", "size_limit"].includes(String(content.reason))
    )
      throw Error("Invalid history content");
    return {
      id: entry.id,
      revision: entry.revision,
      createdAt: entry.createdAt,
      title: entry.title,
      status: entry.status,
      content:
        content.availability === "available"
          ? { availability: "available", text: content.text as string }
          : {
              availability: "unavailable",
              reason: content.reason as "malformed" | "size_limit",
            },
    };
  });
  if (!result.entries.length && result.nextCursor)
    throw Error("Invalid empty continuation");
  return result;
}
