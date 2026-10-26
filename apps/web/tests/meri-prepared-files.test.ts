import { expect, it } from "vitest";
import {
  receiveIntentsResponse,
  type IntentsItem,
} from "@capiro/meri-client/intents";
import { conversationFiles } from "../src/features/meri/conversation/intents/prepared-files";
import { intentRow } from "../src/features/meri/conversation/intents/intent-view";
import { ids, session } from "./meri-document-public-fixtures";

const base = {
  deliveryId: `sdk:${"d".repeat(64)}`,
  createdAt: "2026-10-26T00:00:00.000Z",
  operation: { id: "create_word", version: "0.2.0" },
} as const;
const draft: IntentsItem = {
  ...base,
  state: "prepared",
  kind: "draft",
  versionId: ids.version,
};

it("uses an admitted retained draft version without a publication event", async () => {
  const request = { conversationId: ids.conversation, limit: 50 };
  const received = await receiveIntentsResponse(
    "list",
    200,
    JSON.stringify({
      conversationId: ids.conversation,
      intents: [draft],
      next: null,
    }),
    { request },
  );
  if ("error" in received) throw new Error(received.error.code);
  expect(conversationFiles([], received.intents)).toEqual([
    { versionId: ids.version, prepared: true },
  ]);
});

it("excludes withheld, pending, unknown and instruction-only receipts and deduplicates exact versions", () => {
  const items: IntentsItem[] = [
    { ...base, state: "prepared", kind: "draft", withheld: true },
    { ...base, state: "pending" },
    { ...base, state: "unknown" },
    { ...base, state: "prepared", kind: "schedule_proposal", proposalId: null },
  ];
  expect(conversationFiles([], items)).toEqual([]);
  expect(
    conversationFiles([{ versionId: ids.version }], [...items, draft, draft]),
  ).toEqual([{ versionId: ids.version }]);
  expect(conversationFiles([], [draft, draft])).toHaveLength(1);
});

it("does not label a non-schedule preparation as a schedule or infer a file", () => {
  const item: IntentsItem = {
    ...base,
    state: "prepared",
    kind: "schedule_proposal",
    proposalId: null,
  };
  const row = intentRow(item, Date.now(), session.context);
  expect(row).toMatchObject({
    title: "Prepare a document",
    status: "Prepared",
    decision: "closed",
    proposal: null,
  });
  expect(row.detail).toContain("does not confirm a file");
  expect(row.detail).not.toMatch(/schedule/i);
  const schedule = intentRow(
    { ...item, operation: { id: "schedule_task", version: "0.2.0" } },
    Date.now(),
    session.context,
  );
  expect(schedule.detail).toContain("schedule proposal");
});
