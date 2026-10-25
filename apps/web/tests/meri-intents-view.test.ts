import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import {
  filingIntent,
  memoryReviewIntent,
  nativeTaskIntent,
} from "./meri-intents-native-fixtures";
import {
  receiveIntentsResponse,
  type IntentsItem,
} from "@capiro/meri-client/intents";
import {
  intentRow,
  intentRows,
  refusalMessage,
} from "../src/features/meri/conversation/intents/intent-view";

const wire = (name: string) =>
  JSON.parse(
    readFileSync(
      new URL(`./fixtures/meri-intents/${name}.json`, import.meta.url),
      "utf8",
    ),
  );
const context = wire("context");
const viewer = { tenantId: context.tenantId, actorId: context.actorId };
const first = (name: string): IntentsItem => wire(name).response.intents[0];
const now = context.syntheticNow as number;

it("an awaiting task.create proposal is decidable and shows the exact retained content", () => {
  const row = intentRow(first("listAwaiting"), now, viewer);
  expect(row).toMatchObject({
    decision: "approvable",
    status: "Awaiting your decision",
    title: "Create a task",
  });
  const fields = Object.fromEntries(row.fields.map((f) => [f.label, f.value]));
  const proposal = (
    first("listAwaiting") as Extract<IntentsItem, { proposal: unknown }>
  ).proposal;
  expect(fields).toMatchObject({
    Action: "Create a task",
    "Task title": "Task",
    "Command hash": proposal.commandSha256,
    Expires: proposal.expiresAt,
  });
});

it("filing completion preserves every file's partial, failed and indexing observations", async () => {
  const fixture = filingIntent();
  const received = await receiveIntentsResponse(
    "list",
    200,
    JSON.stringify(fixture.response),
    { request: fixture.request },
  );
  if ("error" in received) throw Error("Unexpected refusal");
  const row = intentRow(received.intents[0]!, now, viewer);
  expect(row).toMatchObject({
    title: "File attachments to a client",
    status: "Filing needs attention",
    tone: "warning",
    decision: "closed",
  });
  expect(row.detail).toContain("1 saved, 1 pending, 1 failed");
  expect(
    Object.fromEntries(row.result.map(({ label, value }) => [label, value])),
  ).toMatchObject({
    "File 1": "saved-1.txt",
    "File 1 status": "Saved",
    "File 1 indexing": "Pending",
    "File 2": "pending-2.txt",
    "File 2 status": "Pending",
    "File 2 indexing": "Not indexed",
    "File 2 reason": "Index registration unavailable",
    "File 3": "failed-3.txt",
    "File 3 status": "Failed",
    "File 3 reason": "File was not stored",
  });
  expect(row.result.some(({ label }) => label === "File 3 document")).toBe(
    false,
  );
  expect(row.fields).toContainEqual({
    label: "Attachment 2 version",
    value: "version-2",
  });
});

it.each(["saved", "failed"] as const)(
  "filing %s result cannot imply indexing success",
  async (status) => {
    const fixture = filingIntent([status]);
    const received = await receiveIntentsResponse(
      "list",
      200,
      JSON.stringify(fixture.response),
      { request: fixture.request },
    );
    if ("error" in received) throw Error("Unexpected refusal");
    const row = intentRow(received.intents[0]!, now, viewer);
    expect(row.status).toBe(
      status === "saved" ? "Files saved" : "Filing failed",
    );
    expect(row.result.some(({ value }) => value === "Indexed")).toBe(false);
  },
);

it("foreign filing objects and incomplete persistence facts are rejected before rendering", async () => {
  for (const changed of ["object", "document"] as const) {
    const fixture = filingIntent(["saved"]);
    const file = fixture.response.intents[0].execution.outcome.result.files[0];
    if (changed === "object")
      file.object = { ...file.object, versionId: "another-version" };
    else delete file.documentId;
    await expect(
      receiveIntentsResponse("list", 200, JSON.stringify(fixture.response), {
        request: fixture.request,
      }),
    ).rejects.toThrow();
  }
});

it("durable phases read as truthful, closed rows", () => {
  expect(intentRow(first("listCompleted"), now, viewer)).toMatchObject({
    status: "Completed",
    decision: "closed",
  });
  expect(
    intentRow(first("listCompleted"), now, viewer).result.map((f) => f.label),
  ).toEqual(["Task created", "Due date", "Completed"]);
  expect(intentRow(first("listRejected"), now, viewer)).toMatchObject({
    status: "Rejected",
    decision: "closed",
  });
  expect(intentRow(first("listExpired"), now + 50_000, viewer)).toMatchObject({
    status: "Expired",
    decision: "closed",
  });
});

it("a proposal past its expiry is never offered for a decision, even before the list says so", () => {
  const item = first("listAwaiting") as Extract<
    IntentsItem,
    { proposal: unknown }
  >;
  expect(
    intentRow(item, Date.parse(item.proposal.expiresAt), viewer),
  ).toMatchObject({ status: "Expired", decision: "closed" });
});

it("held kinds and other approvers are shown but never decidable", () => {
  const item = structuredClone(first("listAwaiting")) as Extract<
    IntentsItem,
    { proposal: unknown }
  >;
  const memory = structuredClone(item);
  (memory.proposal.command as { action: string }).action = "memory.propose";
  expect(intentRow(memory, now, viewer)).toMatchObject({
    decision: "held",
    status: "Prepared",
  });
  expect(
    intentRow(item, now, { ...viewer, actorId: "someone-else" }),
  ).toMatchObject({ decision: "held", status: "Needs another approver" });
});

it("journal states and withheld items carry no content and no decision", () => {
  const base = {
    deliveryId: `sdk:${"1".repeat(64)}`,
    createdAt: "2026-10-12T20:00:00.000Z",
    operation: { id: "save_memory", version: "0.2.0" },
  } as const;
  const rows = [
    { ...base, state: "pending" },
    { ...base, state: "unknown" },
    { ...base, state: "failed", code: "REFUSED" },
    { ...base, state: "prepared", kind: "draft", withheld: true },
    {
      ...base,
      state: "prepared",
      kind: "draft",
      versionId: "00000000-0000-4000-8000-000000000700",
    },
    { ...base, state: "prepared", kind: "schedule_proposal", proposalId: null },
    { ...base, state: "prepared", kind: "proposal", withheld: true },
  ].map((item) => intentRow(item as IntentsItem, now, viewer));
  expect(rows.map((r) => r.status)).toEqual([
    "Preparing",
    "Result uncertain",
    "Failed",
    "Withheld",
    "Draft ready",
    "Prepared",
    "Withheld",
  ]);
  for (const row of rows)
    expect(row).toMatchObject({
      decision: "closed",
      proposal: null,
      fields: [],
    });
  expect(rows[2]?.detail).toContain("REFUSED");
});

it("awaiting rows come first, then the rest newest first", () => {
  const awaiting = first("listAwaiting"),
    done = first("listCompleted");
  const second = {
    ...structuredClone(done),
    deliveryId: `sdk:${"2".repeat(64)}`,
  } as IntentsItem;
  expect(
    intentRows([done, awaiting, second], now, viewer).map((r) => r.deliveryId),
  ).toEqual([awaiting.deliveryId, second.deliveryId, done.deliveryId]);
});

it("refusal messages are plain and keep the code", () => {
  expect(refusalMessage("INTENT_EXPIRED")).toBe(
    "This proposal has expired. Nothing was executed. (INTENT_EXPIRED)",
  );
  expect(refusalMessage("SOMETHING_NEW")).toContain("(SOMETHING_NEW)");
});

it("canonical document publication renders file facts without inventing task or renderer results", async () => {
  const fixture = wire("documentPublished");
  const received = await receiveIntentsResponse(
    "list",
    200,
    JSON.stringify(fixture.response),
    { request: fixture.request },
  );
  if ("error" in received) throw Error("Unexpected refusal");
  const row = intentRow(received.intents[0]!, now, viewer);
  expect(row).toMatchObject({
    title: "Prepare a document",
    status: "Completed",
    decision: "closed",
  });
  expect(
    Object.fromEntries(row.result.map((field) => [field.label, field.value])),
  ).toEqual({
    "Document prepared": "Selected document.docx",
    Version: "00000000-0000-4000-8000-000000000201",
    Bytes: "200",
    Created: "2026-10-12T20:00:00.000Z",
  });
  expect(
    row.result.some((field) => /Task|render|qualified/i.test(field.label)),
  ).toBe(false);
  const item = fixture.response.intents[0];
  // Approval without publication stays visibly unconfirmed, with no invented result.
  item.phase = "approved";
  item.execution = null;
  const approved = await receiveIntentsResponse(
    "list",
    200,
    JSON.stringify(fixture.response),
    { request: fixture.request },
  );
  if ("error" in approved) throw Error("Unexpected refusal");
  expect(intentRow(approved.intents[0]!, now, viewer)).toMatchObject({
    status: "Approved",
    result: [],
    decision: "closed",
  });
});

it("document publication is refused before display for foreign scope, uncommitted output or false qualification", async () => {
  for (const mutate of [
    (outcome: ReturnType<typeof wire>) => {
      outcome.version.binding.actorId = "another-actor";
    },
    (outcome: ReturnType<typeof wire>) => {
      outcome.version.scopes[0].resourceId = "another-scope";
    },
    (outcome: ReturnType<typeof wire>) => {
      outcome.execution.versionCommitted = false;
    },
    (outcome: ReturnType<typeof wire>) => {
      outcome.execution.nativeQualified = true;
    },
  ]) {
    const fixture = wire("documentPublished");
    mutate(fixture.response.intents[0].execution.outcome);
    await expect(
      receiveIntentsResponse("list", 200, JSON.stringify(fixture.response), {
        request: fixture.request,
      }),
    ).rejects.toThrow();
  }
});

it.each([false, true])(
  "native task completion renders its actual result without a fabricated receipt (update=%s)",
  async (update) => {
    const fixture = nativeTaskIntent(update);
    const received = await receiveIntentsResponse(
      "list",
      200,
      JSON.stringify(fixture.response),
      { request: fixture.request },
    );
    if ("error" in received) throw Error("Unexpected refusal");
    const row = intentRow(received.intents[0]!, now, viewer);
    expect(row).toMatchObject({
      title: update ? "Update a task" : "Create a task",
      status: "Completed",
      decision: "closed",
    });
    expect(
      Object.fromEntries(row.result.map(({ label, value }) => [label, value])),
    ).toEqual({
      [update ? "Task updated" : "Task created"]: update
        ? "Updated task"
        : "Task",
      ...(update ? { "Task status": "in progress" } : {}),
      "Due date": "None",
      Completed: "2026-10-12T20:00:00.000Z",
    });
  },
);

it.each([false, true])(
  "memory review receipt has no task proposal or approval controls (withheld=%s)",
  async (withheld) => {
    const fixture = memoryReviewIntent(withheld);
    const received = await receiveIntentsResponse(
      "list",
      200,
      JSON.stringify(fixture.response),
      { request: fixture.request },
    );
    if ("error" in received) throw Error("Unexpected refusal");
    const row = intentRow(received.intents[0]!, now, viewer);
    expect(row).toMatchObject({
      title: "Memory review",
      status: withheld ? "Withheld" : "Submitted for review",
      decision: "closed",
      proposal: null,
      fields: [],
    });
    expect(row.result).toHaveLength(withheld ? 0 : 2);
    if (!withheld)
      expect(row.detail).toContain(
        "does not confirm a saved or published memory",
      );
  },
);

it("foreign native task proof and memory review scope are refused before display", async () => {
  const task = nativeTaskIntent(true);
  task.response.intents[0].execution.outcome.execution.commandSha256 =
    "f".repeat(64);
  const memory = memoryReviewIntent();
  memory.response.intents[0].review.scopes[0].resourceId = "other-actor";
  for (const fixture of [task, memory])
    await expect(
      receiveIntentsResponse("list", 200, JSON.stringify(fixture.response), {
        request: fixture.request,
      }),
    ).rejects.toThrow();
});
