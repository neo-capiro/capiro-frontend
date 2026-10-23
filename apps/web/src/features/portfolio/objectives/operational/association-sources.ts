import { z } from "zod";
import { queryString, type ApiClient } from "@/shared/portfolio/api/http";
import { plannerTaskOperations } from "@/shared/capiro/operations/planner-tasks";
import { strategiesPlanOperations } from "@/shared/capiro/operations/strategies-plan";
import { engagementSessionOperations } from "@/shared/capiro/operations/engagement-sessions";
import { meetingSchema } from "../../calendar/public";
import {
  associationKinds,
  associationSourceSchema,
  type AssociationKind,
  type AssociationSource,
} from "./association-command";

export type AssociationChoices = {
  items: { id: string; title: string }[];
  nextCursor: string | null;
};
export type MeetingWindow = { from: string; to: string };
function sameClient(actual: string | null, expected: string) {
  return actual?.toLowerCase() === expected.toLowerCase();
}
function timestamp(value: string) {
  return z.iso.datetime({ offset: true }).parse(value);
}
function choices(
  items: AssociationChoices["items"],
  nextCursor: string | null = null,
) {
  const rows = z
    .array(z.object({ id: z.uuid(), title: z.string() }).strict())
    .parse(items.map(({ id, title }) => ({ id, title })));
  if (new Set(rows.map((row) => row.id)).size !== rows.length)
    throw new Error(
      "The source list contains conflicting identities. Refresh it.",
    );
  return { items: rows, nextCursor };
}

export async function loadAssociationChoices(
  api: ApiClient,
  kind: AssociationKind,
  clientId: string,
  cursor: string | null,
  window: MeetingWindow,
  signal: AbortSignal,
): Promise<AssociationChoices> {
  z.enum(associationKinds).parse(kind);
  if (kind === "strategy") {
    const rows = await api.request(
      "strategy",
      "strategies",
      strategiesPlanOperations["strategies.list"].response,
      { signal },
    );
    return choices(rows.filter((row) => sameClient(row.clientId, clientId)));
  }
  if (kind === "planner_project") {
    const rows = await api.request(
      "strategy",
      "planner/bootstrap",
      plannerTaskOperations["planner.bootstrap"].response,
      { signal },
    );
    return choices(
      rows.projects
        .filter((row) => !row.archived && sameClient(row.clientId, clientId))
        .map((row) => ({ id: row.id, title: row.name })),
    );
  }
  if (kind === "planner_task") {
    const page = await api.request(
      "strategy",
      `planner/tasks?${queryString({ archived: "false", cursor: cursor ?? undefined })}`,
      plannerTaskOperations["planner.tasks"].response,
      { signal },
    );
    if (page.nextCursor && page.nextCursor === cursor)
      throw new Error("The task page did not advance.");
    return choices(
      page.items
        .filter((row) => !row.archived && sameClient(row.clientId, clientId))
        .map((row) => ({ id: row.id, title: row.name })),
      page.nextCursor,
    );
  }
  if (kind === "outreach_session") {
    const offset =
      cursor === null ? 0 : z.coerce.number().int().nonnegative().parse(cursor);
    const rows = await api.request(
      "core",
      `engagement/outreach-v3/sessions?${queryString({ offset, limit: 50 })}`,
      engagementSessionOperations["engagement.sessions"].response,
      { signal },
    );
    return choices(
      rows
        .filter((row) => row.status === "active" && !row.archivedAt)
        .map((row) => ({ id: row.id, title: row.title ?? "Untitled session" })),
      rows.length === 50 ? String(offset + 50) : null,
    );
  }
  const from = timestamp(window.from),
    to = timestamp(window.to);
  if (
    Date.parse(to) <= Date.parse(from) ||
    Date.parse(to) - Date.parse(from) > 93 * 86400000
  )
    throw new Error("Choose a meeting range of at most 93 days.");
  const rows = await api.request(
    "core",
    `engagement/meetings?${queryString({ clientId, from, to })}`,
    z.array(meetingSchema),
    { signal },
  );
  return choices(
    rows
      .filter(
        (row) =>
          (!row.client || sameClient(row.client.id, clientId)) &&
          !["deleted", "cancelled", "canceled"].includes(row.status),
      )
      .map((row) => ({ id: row.id, title: row.subject })),
  );
}

async function readPlannerSource(
  api: ApiClient,
  kind: "planner_project" | "planner_task",
  id: string,
  clientId: string,
  signal: AbortSignal,
) {
  const projects =
    kind === "planner_project"
      ? (
          await api.request(
            "strategy",
            "planner/bootstrap",
            plannerTaskOperations["planner.bootstrap"].response,
            { signal },
          )
        ).projects.filter((item) => item.id === id)
      : [];
  if (kind === "planner_project" && projects.length !== 1)
    throw new Error("Planner project identity is unavailable or inconsistent.");
  const row =
    kind === "planner_task"
      ? await api.request(
          "strategy",
          `planner/tasks/${encodeURIComponent(id)}`,
          plannerTaskOperations["planner.task"].response,
          { signal },
        )
      : projects[0];
  if (
    !row ||
    row.id !== id ||
    row.archived ||
    !sameClient(row.clientId, clientId)
  )
    throw new Error("Planner work is unavailable for this client.");
  return { title: row.name, revision: String(row.version) };
}

export async function readAssociationSource(
  api: ApiClient,
  kind: AssociationKind,
  id: string,
  clientId: string,
  signal: AbortSignal,
): Promise<AssociationSource> {
  z.enum(associationKinds).parse(kind);
  const safeId = encodeURIComponent(z.uuid().parse(id));
  let title: string, revision: string;
  if (kind === "strategy") {
    const row = await api.request(
      "strategy",
      `strategies/${safeId}`,
      strategiesPlanOperations["strategies.detail"].response,
      { signal },
    );
    if (row.id !== id || !sameClient(row.clientId, clientId))
      throw new Error("Strategy is unavailable for this client.");
    title = row.title;
    revision = timestamp(row.lastEditedAt);
  } else if (kind === "planner_project" || kind === "planner_task") {
    ({ title, revision } = await readPlannerSource(
      api,
      kind,
      id,
      clientId,
      signal,
    ));
  } else if (kind === "outreach_session") {
    const row = await api.request(
      "core",
      `engagement/outreach-v3/sessions/${safeId}`,
      engagementSessionOperations["engagement.session"].response,
      { signal },
    );
    if (
      row.session.id !== id ||
      row.session.status !== "active" ||
      row.session.archivedAt ||
      row.spec.sponsor.kind !== "client" ||
      row.spec.sponsor.clientRefs.length !== 1 ||
      !sameClient(row.spec.sponsor.clientRefs[0]!.clientId, clientId) ||
      row.session.currentStateVersion !== row.currentStateVersion
    )
      throw new Error(
        "This session does not have this client as its sole sponsor.",
      );
    title = row.session.title ?? "Untitled session";
    revision = `${row.currentStateVersion}:${row.specHash}`;
  } else {
    const row = await api.request(
      "core",
      `engagement/meetings/${safeId}?${queryString({ clientId })}`,
      meetingSchema,
      { signal },
    );
    if (
      row.id !== id ||
      (row.client && !sameClient(row.client.id, clientId)) ||
      ["deleted", "cancelled", "canceled"].includes(row.status) ||
      !row.updatedAt
    )
      throw new Error(
        "The current meeting assignment or revision is unavailable.",
      );
    title = row.subject;
    revision = `${timestamp(row.updatedAt)}:${row.client?.id ?? "inferred"}:${row.visibility}`;
  }
  signal.throwIfAborted();
  return associationSourceSchema.parse({ clientId, kind, id, title, revision });
}
