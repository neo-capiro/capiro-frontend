import type {
  SavedVersion,
  SavedVersionDocument,
  SavedVersionSnapshot,
  WorkspaceDraftDocument,
} from "../../../../shared/capiro/operations/workspace-documents";

/**
 * Read-only saved-version history. These helpers admit exactly the versions the
 * producer (apps/workspace VersionsService.list) returns for this draft, keep
 * unknown JSON intact, and diff two saved snapshots. Nothing here reads the
 * live working copy and nothing here writes.
 */

/** Snapshot keys that read-only history knows how to project. */
const SNAPSHOT_KEYS = new Set(["docTitle", "config", "ask", "documents"]);
const CONFIG_KEYS = new Set(["clientId", "sections", "sectionContent"]);
const DOCUMENT_KEYS = new Set([
  "id",
  "name",
  "ordinal",
  "body",
  "sourceBriefVersion",
]);

/** The snapshot's client association — the same value restore checks as parent identity. */
export function versionParentClient(
  snapshot: SavedVersionSnapshot | undefined,
): string | null {
  return snapshot?.config?.clientId ?? null;
}

/** Deterministic JSON with sorted object keys, for change detection only. */
export function canonicalJson(value: unknown): string {
  try {
    return JSON.stringify(sortValue(value)) ?? "undefined";
  } catch {
    return String(value);
  }
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([left], [right]) => (left < right ? -1 : left > right ? 1 : 0),
    );
    return entries.reduce<Record<string, unknown>>((sorted, [key, entry]) => {
      sorted[key] = sortValue(entry);
      return sorted;
    }, {});
  }
  return value;
}

/**
 * The plain text lines of a saved document body that history can render. Returns
 * null when the body is any shape other than the recognised `blocks` projection,
 * so an unrecognised body is explained rather than rendered.
 */
export function safeDocumentLines(body: unknown): string[] | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const blocks = (body as { blocks?: unknown }).blocks;
  if (!Array.isArray(blocks)) return null;
  const lines: string[] = [];
  for (const block of blocks) {
    if (!block || typeof block !== "object" || Array.isArray(block))
      return null;
    const record = block as {
      content?: unknown;
      title?: unknown;
      type?: unknown;
    };
    const line =
      typeof record.content === "string" && record.content.length
        ? record.content
        : typeof record.title === "string" && record.title.length
          ? record.title
          : typeof record.type === "string" && record.type.length
            ? record.type
            : null;
    if (line === null) return null;
    lines.push(line);
  }
  return lines;
}

export type UnknownContent = { label: string; detail: string };

/**
 * Saved JSON that history does not render — extra snapshot/config/document keys
 * and the ask value — kept as ordered read-only explanations, never executed.
 */
export function unknownContentExplanations(
  version: SavedVersion,
): UnknownContent[] {
  const found = new Map<string, string>();
  const snapshot = (version.snapshot ?? {}) as Record<string, unknown>;
  for (const key of Object.keys(snapshot))
    if (!SNAPSHOT_KEYS.has(key))
      found.set(
        `snapshot.${key}`,
        `Saved field "${key}" is preserved read-only and is not rendered.`,
      );
  const config = snapshot.config;
  if (config && typeof config === "object" && !Array.isArray(config))
    for (const key of Object.keys(config as Record<string, unknown>))
      if (!CONFIG_KEYS.has(key))
        found.set(
          `config.${key}`,
          `Saved configuration "${key}" is preserved read-only and is not rendered.`,
        );
  for (const document of version.snapshot?.documents ?? []) {
    const record = document as unknown as Record<string, unknown>;
    for (const key of Object.keys(record))
      if (!DOCUMENT_KEYS.has(key))
        found.set(
          `document ${document.id}.${key}`,
          `Saved document field "${key}" is preserved read-only and is not rendered.`,
        );
  }
  if (snapshot.ask !== undefined && snapshot.ask !== null)
    found.set("ask", "The saved ask value is preserved read-only.");
  return [...found].map(([label, detail]) => ({ label, detail }));
}

export type AdmittedVersions = {
  versions: SavedVersion[];
  refusal?: string;
};

/**
 * Admit the returned version rows for this draft. A row without its saved
 * snapshot, or whose parent draft or snapshot client association does not match
 * the document under view, is an unusable/mismatched receipt: display is refused
 * rather than inventing empty content or showing foreign history. The shared
 * response schema stays optional for existing metadata/write consumers; the
 * saved-detail shape is enforced here, at this view's boundary.
 */
export function admitSavedVersions(
  rows: readonly SavedVersion[],
  draft: WorkspaceDraftDocument,
): AdmittedVersions {
  const currentClient = draft.clientId ?? null;
  for (const row of rows) {
    if (!row.snapshot)
      return {
        versions: [],
        refusal:
          "A saved version is missing its saved content; display is refused.",
      };
    if (row.draftId.toLowerCase() !== draft.id.toLowerCase())
      return { versions: [], refusal: "History belongs to another document." };
    if (versionParentClient(row.snapshot) !== currentClient)
      return {
        versions: [],
        refusal: "Saved versions belong to a different client association.",
      };
  }
  return { versions: [...rows] };
}

export type TabRef = { id: string; name: string };
export type TabRename = { id: string; from: string; to: string };
export type SavedVersionDiff = {
  titleChanged: boolean;
  tabsAdded: TabRef[];
  tabsRemoved: TabRef[];
  tabsReordered: TabRef[];
  tabsRenamed: TabRename[];
  bodiesChanged: string[];
  sectionsAdded: string[];
  sectionsRemoved: string[];
  sectionsChanged: string[];
  /**
   * True when the shown fields match but other saved content still differs —
   * e.g. the saved ask, config.sections ordering, or any other preserved JSON
   * the read-only comparison does not project. Guards against claiming equality
   * of two materially different saved revisions.
   */
  otherContentChanged: boolean;
};

/** Whether the shown comparison found any difference. */
export function hasShownChanges(diff: SavedVersionDiff): boolean {
  return (
    diff.titleChanged ||
    diff.tabsAdded.length > 0 ||
    diff.tabsRemoved.length > 0 ||
    diff.tabsReordered.length > 0 ||
    diff.tabsRenamed.length > 0 ||
    diff.bodiesChanged.length > 0 ||
    diff.sectionsAdded.length > 0 ||
    diff.sectionsRemoved.length > 0 ||
    diff.sectionsChanged.length > 0
  );
}

const tabName = (document: SavedVersionDocument) =>
  document.name ?? "Untitled tab";

/** Order two saved versions oldest-first using the immutable createdAt stamp. */
export function chronologicalPair(
  left: SavedVersion,
  right: SavedVersion,
): [SavedVersion, SavedVersion] {
  if (left.createdAt < right.createdAt) return [left, right];
  if (right.createdAt < left.createdAt) return [right, left];
  return left.id <= right.id ? [left, right] : [right, left];
}

/** Diff two exact saved snapshots — tabs (documents) and known section content. */
export function compareSavedVersions(
  before: SavedVersion,
  after: SavedVersion,
): SavedVersionDiff {
  const beforeDocuments = before.snapshot?.documents ?? [];
  const afterDocuments = after.snapshot?.documents ?? [];
  const beforeById = new Map(beforeDocuments.map((d) => [d.id, d]));
  const afterById = new Map(afterDocuments.map((d) => [d.id, d]));
  const tabsAdded = afterDocuments
    .filter((d) => !beforeById.has(d.id))
    .map((d) => ({ id: d.id, name: tabName(d) }));
  const tabsRemoved = beforeDocuments
    .filter((d) => !afterById.has(d.id))
    .map((d) => ({ id: d.id, name: tabName(d) }));
  const tabsRenamed = afterDocuments.flatMap((d) => {
    const previous = beforeById.get(d.id);
    if (!previous) return [];
    const from = tabName(previous);
    const to = tabName(d);
    return from === to ? [] : [{ id: d.id, from, to }];
  });
  const bodiesChanged = afterDocuments.flatMap((d) => {
    const previous = beforeById.get(d.id);
    if (!previous) return [];
    return canonicalJson(previous.body) === canonicalJson(d.body)
      ? []
      : [tabName(d)];
  });
  const commonBefore = beforeDocuments
    .map((d) => d.id)
    .filter((id) => afterById.has(id));
  const commonAfter = afterDocuments
    .map((d) => d.id)
    .filter((id) => beforeById.has(id));
  const reordered = commonBefore.some((id, index) => id !== commonAfter[index]);
  const tabsReordered = reordered
    ? commonAfter.map((id) => ({
        id,
        name: afterById.get(id) ? tabName(afterById.get(id)!) : "Untitled tab",
      }))
    : [];
  const beforeSections = before.snapshot?.config?.sectionContent ?? {};
  const afterSections = after.snapshot?.config?.sectionContent ?? {};
  const titleChanged =
    (before.snapshot?.docTitle ?? "") !== (after.snapshot?.docTitle ?? "");
  const sectionsAdded = Object.keys(afterSections).filter(
    (name) => !(name in beforeSections),
  );
  const sectionsRemoved = Object.keys(beforeSections).filter(
    (name) => !(name in afterSections),
  );
  const sectionsChanged = Object.keys(afterSections).filter(
    (name) =>
      name in beforeSections && beforeSections[name] !== afterSections[name],
  );
  const shownChanged =
    titleChanged ||
    tabsAdded.length > 0 ||
    tabsRemoved.length > 0 ||
    tabsReordered.length > 0 ||
    tabsRenamed.length > 0 ||
    bodiesChanged.length > 0 ||
    sectionsAdded.length > 0 ||
    sectionsRemoved.length > 0 ||
    sectionsChanged.length > 0;
  // Whole-snapshot equality is claimed only when nothing is left unchecked: the
  // shown comparison omits the saved ask, config.sections ordering and any other
  // preserved JSON, so an unshown difference must still be reported.
  const otherContentChanged =
    !shownChanged &&
    canonicalJson(before.snapshot ?? null) !==
      canonicalJson(after.snapshot ?? null);
  return {
    titleChanged,
    tabsAdded,
    tabsRemoved,
    tabsReordered,
    tabsRenamed,
    bodiesChanged,
    sectionsAdded,
    sectionsRemoved,
    sectionsChanged,
    otherContentChanged,
  };
}
