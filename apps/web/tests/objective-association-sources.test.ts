import { describe, expect, it } from "vitest";
import { createApiClient } from "../src/shared/portfolio/api/http";
import {
  loadAssociationChoices,
  readAssociationSource,
} from "../src/features/portfolio/objectives/operational/association-sources";
import {
  requireUnchangedAssociationSource,
  type AssociationKind,
} from "../src/features/portfolio/objectives/operational/association-command";
const id = "10000000-0000-4000-8000-000000000001",
  clientId = "20000000-0000-4000-8000-000000000001",
  other = "30000000-0000-4000-8000-000000000001";
const at = "2026-10-23T00:00:00Z",
  signal = new AbortController().signal;
const api = (payload: unknown, status = 200) =>
  createApiClient(async () => Response.json(payload, { status }));
const strategy = {
  id,
  clientId,
  title: "Synthetic Strategy",
  type: "appropriations",
  ownerUserId: null,
  goal: null,
  meriContext: null,
  targetDate: null,
  lastEditedAt: at,
  nodes: [],
};
const basePlanner = {
  id,
  clientId,
  name: "Synthetic Planner",
  description: "",
  version: 2,
  archived: false,
  createdAt: at,
  updatedAt: at,
  ownerId: "synthetic",
  access: "editor",
};
const project = {
  ...basePlanner,
  color: "#aaaaaa",
  privacy: "private",
  defaultView: "list",
  sections: [],
  fields: [],
  members: [],
  startOn: null,
  dueOn: null,
  health: "on_track",
};
const task = {
  ...basePlanner,
  status: "todo",
  priority: "none",
  subtype: "task",
  approval: "pending",
  startOn: null,
  dueOn: null,
  assigneeId: null,
  parentId: null,
  dependencies: [],
  collaborators: [],
  tags: [],
  memberships: [],
  customValues: {},
  estimateMinutes: 0,
  recurrence: null,
  meetingId: null,
  completedAt: null,
  actualMinutes: 0,
};
const bootstrap = (projects: unknown[]) => ({
  me: { id: "synthetic", name: "Synthetic" },
  people: [],
  projects,
});
const meeting = {
  id,
  subject: "Synthetic meeting",
  updatedAt: at,
  description: null,
  location: null,
  startsAt: at,
  endsAt: at,
  status: "scheduled",
  joinLink: null,
  visibility: "private",
  isVirtual: false,
  meri: null,
  client: { id: clientId, name: "Synthetic client" },
  attendees: [],
  preps: [],
};
const session = {
  session: {
    id,
    title: "Synthetic outreach",
    status: "active",
    currentStateVersion: 2,
    createdAt: at,
    updatedAt: at,
    archivedAt: null,
  },
  currentStateVersion: 2,
  spec: {
    goal: {
      goal: null,
      objective: null,
      topic: null,
      desiredOutcome: null,
      ask: { mode: "text", text: null },
      whyNow: null,
    },
    sponsor: { kind: "client", label: null, clientRefs: [{ clientId }] },
    strategy: {
      campaignAngle: null,
      tone: null,
      length: "short",
      customLengthInstruction: null,
    },
    delivery: { pattern: "one", personalization: "none" },
    targeting: { selectedTargetRefs: [] },
  },
  specHash: "a".repeat(64),
  readiness: {
    goalReady: false,
    sponsorResolved: true,
    targetCriteriaReady: false,
    targetsReady: false,
    deliveryReady: false,
    contextReady: false,
    contextEvidenceReady: false,
    strategyReady: false,
    sampleGenerationEligible: false,
    fullGenerationEligible: false,
    sendReviewEligible: false,
    blockers: [],
  },
  pendingProposalCount: 0,
};

describe("Objective association source selection", () => {
  it.each<[AssociationKind, unknown]>([
    ["strategy", strategy],
    ["planner_project", bootstrap([project])],
    ["planner_task", task],
    ["meeting", meeting],
    ["outreach_session", session],
  ])(
    "reads an existing %s through its canonical schema",
    async (kind, value) => {
      expect(
        await readAssociationSource(api(value), kind, id, clientId, signal),
      ).toMatchObject({ kind, id, clientId });
    },
  );
  it("rejects moved, deleted and archived sources before any command", async () => {
    for (const [kind, payload] of [
      ["strategy", { ...strategy, clientId: other }],
      ["planner_task", { ...task, archived: true }],
      ["planner_project", bootstrap([])],
      ["meeting", { ...meeting, client: { id: other, name: "Other" } }],
      ["meeting", { ...meeting, status: "deleted" }],
      ["meeting", { ...meeting, updatedAt: undefined }],
    ] as const)
      await expect(
        readAssociationSource(api(payload), kind, id, clientId, signal),
      ).rejects.toThrow();
    await expect(
      readAssociationSource(api({}, 404), "strategy", id, clientId, signal),
    ).rejects.toThrow();
  });
  it("rejects multi-client, changed sponsor and inconsistent Outreach versions", async () => {
    for (const sponsor of [
      {
        kind: "multi_client",
        label: null,
        clientRefs: [{ clientId }, { clientId: other }],
      },
      { kind: "client", label: null, clientRefs: [{ clientId: other }] },
    ])
      await expect(
        readAssociationSource(
          api({ ...session, spec: { ...session.spec, sponsor } }),
          "outreach_session",
          id,
          clientId,
          signal,
        ),
      ).rejects.toThrow();
    await expect(
      readAssociationSource(
        api({ ...session, currentStateVersion: 3 }),
        "outreach_session",
        id,
        clientId,
        signal,
      ),
    ).rejects.toThrow();
  });
  it("detects a source revision or assignment change between review and dispatch", async () => {
    const reviewed = await readAssociationSource(
      api(task),
      "planner_task",
      id,
      clientId,
      signal,
    );
    const current = await readAssociationSource(
      api({ ...task, version: 3 }),
      "planner_task",
      id,
      clientId,
      signal,
    );
    expect(() => requireUnchangedAssociationSource(reviewed, current)).toThrow(
      "changed",
    );
    expect(() =>
      requireUnchangedAssociationSource(reviewed, {
        ...reviewed,
        clientId: other,
      }),
    ).toThrow("changed");
  });
  it("filters client choices, preserves paging and refuses a nonadvancing task cursor", async () => {
    const window = { from: at, to: "2026-10-24T00:00:00Z" };
    const page = {
      items: [task, { ...task, id: other, clientId: other }],
      nextCursor: other,
    };
    expect(
      await loadAssociationChoices(
        api(page),
        "planner_task",
        clientId,
        null,
        window,
        signal,
      ),
    ).toEqual({ items: [{ id, title: task.name }], nextCursor: other });
    await expect(
      loadAssociationChoices(
        api(page),
        "planner_task",
        clientId,
        other,
        window,
        signal,
      ),
    ).rejects.toThrow("advance");
    await expect(
      loadAssociationChoices(
        api([]),
        "meeting",
        clientId,
        null,
        { from: at, to: "2028-01-01T00:00:00Z" },
        signal,
      ),
    ).rejects.toThrow("93 days");
    await expect(
      loadAssociationChoices(
        api({ items: [task, task], nextCursor: null }),
        "planner_task",
        clientId,
        null,
        window,
        signal,
      ),
    ).rejects.toThrow("conflicting");
    await expect(
      readAssociationSource(
        api(bootstrap([project, project])),
        "planner_project",
        id,
        clientId,
        signal,
      ),
    ).rejects.toThrow("inconsistent");
  });
});
