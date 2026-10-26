import { workspaceId } from "../../../shared/capiro/operations/workspace-schemas";

const views = [
  "documents",
  "workflows",
  "shares",
  "templates",
  "document-templates",
  "hillday",
  "newsletter",
  "rich-newsletter",
] as const;
export type WorkspaceView = (typeof views)[number];
type Query = Pick<URLSearchParams, "get" | "getAll" | "has">;
type Scope = { clientId?: string };
export const hillDayPhases = [
  "template",
  "sponsor",
  "meetings",
  "resolution",
  "context",
  "generate",
] as const;
export type HillDayPhase = (typeof hillDayPhases)[number];
type Destination =
  | { kind: "newsletter-review"; newsletterId: string }
  | { kind: "view"; view: WorkspaceView }
  | { kind: "draft"; draftId: string; prospectId?: string }
  | { kind: "hillday"; hilldayId: string; phase?: HillDayPhase }
  | { kind: "prospect"; prospectId: string };
export type WorkspaceRoute =
  | (Destination & Scope)
  | { kind: "brief-copy" }
  | { kind: "invalid" };

/** URL hints choose a receiver; each existing service still checks current access. */
export function readWorkspaceRoute(query: Query): WorkspaceRoute {
  const identityKeys = [
    "clientId",
    "draftId",
    "prospectId",
    "hilldayId",
    "newsletterId",
  ];
  if (
    [
      ...identityKeys,
      "view",
      "briefSource",
      "copyDocumentId",
      "hilldayPhase",
    ].some((key) => query.getAll(key).length > 1) ||
    identityKeys.some(
      (key) => query.has(key) && !workspaceId.safeParse(query.get(key)).success,
    )
  )
    return { kind: "invalid" };
  const rawView = query.get("view") ?? "documents";
  const view = views.find((candidate) => candidate === rawView);
  if (!view) return { kind: "invalid" };
  const clientId = query.get("clientId") ?? undefined;
  const draftId = query.get("draftId") ?? undefined;
  const prospectId = query.get("prospectId") ?? undefined;
  const hilldayId = query.get("hilldayId") ?? undefined;
  const newsletterId = query.get("newsletterId") ?? undefined;
  const phase = hillDayPhases.find(
    (value) => value === query.get("hilldayPhase"),
  );
  if (query.has("hilldayPhase") && (!phase || !hilldayId || view !== "hillday"))
    return { kind: "invalid" };
  if (newsletterId)
    return view === "rich-newsletter" &&
      !hilldayId &&
      !draftId &&
      !prospectId &&
      !query.has("briefSource") &&
      !query.has("copyDocumentId")
      ? { kind: "newsletter-review", newsletterId, clientId }
      : { kind: "invalid" };
  if (query.has("briefSource") || query.has("copyDocumentId"))
    return view === "documents" && !hilldayId
      ? { kind: "brief-copy" }
      : { kind: "invalid" };
  if (hilldayId)
    return view === "hillday" && !draftId && !prospectId
      ? { kind: "hillday", hilldayId, clientId, phase }
      : { kind: "invalid" };
  if (draftId || prospectId) {
    if (view !== "documents") return { kind: "invalid" };
    return draftId
      ? { kind: "draft", draftId, prospectId, clientId }
      : { kind: "prospect", prospectId: prospectId!, clientId };
  }
  return { kind: "view", view, clientId };
}

/** Build only native Workspace routes; never navigate a returned arbitrary URL. */
export function workspaceHref(destination: Destination & Scope) {
  const query = new URLSearchParams();
  if (destination.clientId) query.set("clientId", destination.clientId);
  if (destination.kind === "view" && destination.view !== "documents")
    query.set("view", destination.view);
  if (destination.kind === "draft") {
    query.set("draftId", destination.draftId);
    if (destination.prospectId) query.set("prospectId", destination.prospectId);
  }
  if (destination.kind === "prospect")
    query.set("prospectId", destination.prospectId);
  if (destination.kind === "hillday") {
    query.set("view", "hillday");
    query.set("hilldayId", destination.hilldayId);
    if (destination.phase) query.set("hilldayPhase", destination.phase);
  }
  if (destination.kind === "newsletter-review") {
    query.set("view", "rich-newsletter");
    query.set("newsletterId", destination.newsletterId);
  }
  const suffix = query.toString();
  return `/modules/workspace${suffix ? `?${suffix}` : ""}`;
}
