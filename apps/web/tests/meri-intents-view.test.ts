import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import type { IntentsItem } from "@capiro/meri-client/intents";
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
