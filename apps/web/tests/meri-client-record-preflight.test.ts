import { expect, it } from "vitest";
import { receiveIntentsResponse } from "@capiro/meri-client/intents";
import { intentRows } from "../src/features/meri/conversation/intents/intent-view";
import { clientRecordRow } from "../src/features/meri/conversation/intents/client-record-view";
import {
  clientRecordFixture,
  withHostilePreflight,
  withPreflight,
  type ClientItem,
} from "./meri-client-record-fixture";
import { conversationId, viewer } from "./meri-legiwatch-fixture";

// Focused retrieval-0.3 preflight coverage for the client-record review surface. Every case
// enters through the real public receiver and only then projects, so the shape under test is
// the admitted one a live surface actually receives.
//
// The public binding declares the reading as exactly one bounded nullable preflight, and the
// canonical receiver admits only an answer that carries it. A refused shape proves that here by
// error code, and clientRecordRow reads the admitted value through that declared type. Product
// source has no structural probe and no cast; the single boundary cast lives in the domain fixture
// and only builds the shapes admission refuses.

const withheld: unknown = {
  deliveryId: `sdk:${"1".repeat(64)}`,
  createdAt: new Date(Date.now() - 1000).toISOString(),
  operation: { id: "update_client_profile", version: "0.2.0" },
  state: "prepared",
  kind: "client_record_action",
  withheld: true,
};

async function admit(...items: unknown[]) {
  const page = await receiveIntentsResponse(
    "list",
    200,
    JSON.stringify({ conversationId, intents: items, next: null }),
    { request: { conversationId } },
  );
  if (!("intents" in page)) throw Error("Synthetic page refused");
  return page.intents as unknown as ClientItem[];
}

const readings = (row: ReturnType<typeof clientRecordRow>) =>
  row.fields.filter((field) => field.label.startsWith("Preflight"));
const valueOf = (row: ReturnType<typeof clientRecordRow>, label: string) =>
  row.fields.find((field) => field.label === label)?.value;

it("shows the owner's current duplicate and capacity reading as information only", async () => {
  const [admitted] = await admit(
    withPreflight(clientRecordFixture(), {
      duplicate: "possible",
      capacity: "denied",
    }),
  );
  const row = clientRecordRow(admitted!, Date.now(), viewer);
  expect(row.decision).toBe("approvable");
  expect(valueOf(row, "Preflight duplicate")).toMatch(
    /Possible in this answer/,
  );
  expect(valueOf(row, "Preflight capacity")).toMatch(/Denied in this answer/);
  expect(valueOf(row, "Preflight meaning")).toMatch(/Informational only/);
  expect(valueOf(row, "Preflight meaning")).toMatch(/not a reservation/);
});

it("carries the reading through the shared row view without disturbing retained fields", async () => {
  const admitted = await admit(
    withPreflight(clientRecordFixture(), {
      duplicate: "clear",
      capacity: "allowed",
    }),
  );
  const [row] = intentRows(admitted, Date.now(), viewer);
  expect(valueOf(row!, "Preflight duplicate")).toMatch(/Clear in this answer/);
  expect(row!.fields).toEqual(
    expect.arrayContaining([
      { label: "Description", value: "Approved description" },
    ]),
  );
});

it("refuses a key-less answer before projection and invents no reading for it", async () => {
  const item = withHostilePreflight(clientRecordFixture(), undefined);
  const page = JSON.stringify({ conversationId, intents: [item], next: null });
  // A retained key-less answer is built by omitting the key, and the canonical receiver refuses
  // that shape, so it can never become an admitted page.
  expect(page).not.toContain("preflight");
  await expect(
    receiveIntentsResponse("list", 200, page, { request: { conversationId } }),
  ).rejects.toThrow("INTENTS_SHAPE");
  // Nothing admits this shape, so projecting it directly proves the display invents no reading:
  // one fixed non-disclosing sentence and no verdict at all.
  const row = clientRecordRow(item, Date.now(), viewer);
  expect(valueOf(row, "Preflight check")).toMatch(
    /^An unbounded value from the owner/,
  );
  expect(valueOf(row, "Preflight duplicate")).toBeUndefined();
  expect(readings(row)).toHaveLength(1);
});

it("treats an explicit null reading as no answer rather than a clearance", async () => {
  const [created] = await admit(
    withPreflight(clientRecordFixture("proposed", true), null),
  );
  const createRow = clientRecordRow(created!, Date.now(), viewer);
  expect(valueOf(createRow, "Preflight check")).toMatch(
    /no current duplicate or capacity reading/,
  );
  expect(
    readings(createRow).some((field) => /Clear/.test(String(field.value))),
  ).toBe(false);
  // An update row never carries the check, so it must not borrow the create wording.
  const [updated] = await admit(withPreflight(clientRecordFixture(), null));
  expect(
    valueOf(clientRecordRow(updated!, Date.now(), viewer), "Preflight check"),
  ).toMatch(/Not applicable to this action/);
});

it("refuses a non-object reading and never renders it as a clearance", async () => {
  const item = withHostilePreflight(clientRecordFixture(), "clear");
  // Admission refuses this shape; projecting it directly is what proves the display itself cannot
  // turn an unbounded reading into a clearance, or repeat the value it was handed.
  await expect(
    receiveIntentsResponse(
      "list",
      200,
      JSON.stringify({ conversationId, intents: [item], next: null }),
      { request: { conversationId } },
    ),
  ).rejects.toThrow("INTENTS_SHAPE");
  const row = clientRecordRow(item, Date.now(), viewer);
  expect(valueOf(row, "Preflight check")).toMatch(
    /^An unbounded value from the owner/,
  );
  expect(valueOf(row, "Preflight duplicate")).toBeUndefined();
  expect(JSON.stringify(row.fields)).not.toContain("clear");
});

it("refuses an out-of-enum verdict before projection and echoes no unbounded value", async () => {
  const item = withHostilePreflight(clientRecordFixture(), {
    duplicate: "matching_client_0f8e",
    capacity: "allowed",
  });
  await expect(
    receiveIntentsResponse(
      "list",
      200,
      JSON.stringify({ conversationId, intents: [item], next: null }),
      { request: { conversationId } },
    ),
  ).rejects.toThrow("INTENTS_SHAPE");
  const row = clientRecordRow(item, Date.now(), viewer);
  // The canonical half still reads; the unbounded half renders one fixed sentence, never itself.
  expect(valueOf(row, "Preflight duplicate")).toMatch(
    /^An unbounded value from the owner/,
  );
  expect(valueOf(row, "Preflight capacity")).toMatch(/^Allowed in this answer/);
  expect(JSON.stringify(row.fields)).not.toContain("matching_client_0f8e");
});

it("never renders a hidden matching client identity, name or count", () => {
  // Projected directly: admission refuses extra preflight keys (see the shape tests above), so the
  // display must not invent detail even if such a reading reached it. Only the two bounded verdicts
  // are read, so the extra keys are never touched.
  const item = withHostilePreflight(clientRecordFixture(), {
    duplicate: "possible",
    capacity: "denied",
    matchingClientIds: ["00000000-0000-4000-8000-0000000000ff"],
    duplicateCount: 7,
    matchingClients: [{ name: "Foreign Client Inc" }],
  });
  const row = clientRecordRow(item, Date.now(), viewer);
  expect(readings(row)).toHaveLength(3);
  const rendered = JSON.stringify(row.fields);
  expect(rendered).not.toContain("00000000-0000-4000-8000-0000000000ff");
  expect(rendered).not.toContain("Foreign Client Inc");
});

it("keeps an unavailable result distinct from a reading and unapprovable", async () => {
  const item = withPreflight(clientRecordFixture(), {
    duplicate: "clear",
    capacity: "allowed",
  });
  const [admitted] = await admit({
    ...item,
    result: "unavailable",
  });
  const row = clientRecordRow(admitted!, Date.now(), viewer);
  expect(row.status).toBe("Status unavailable");
  expect(row.decision).toBe("closed");
  expect(valueOf(row, "Preflight check")).toMatch(
    /Unavailable with this response/,
  );
  expect(valueOf(row, "Preflight duplicate")).toBeUndefined();
});

it("renders no reading at all for a withheld item", async () => {
  const [admitted] = await admit(withheld);
  const row = clientRecordRow(admitted!, Date.now(), viewer);
  expect(row.status).toBe("Unavailable");
  expect(row.fields).toEqual([]);
  expect(readings(row)).toHaveLength(0);
});

it("marks a settled outcome so a changed-at-apply reading is never implied reserved", async () => {
  const [admitted] = await admit(
    withPreflight(clientRecordFixture("succeeded"), {
      duplicate: "clear",
      capacity: "allowed",
    }),
  );
  const row = clientRecordRow(admitted!, Date.now(), viewer);
  expect(row.decision).toBe("closed");
  expect(valueOf(row, "Preflight meaning")).toMatch(
    /already has a recorded outcome/,
  );
  expect(valueOf(row, "Preflight meaning")).toMatch(/reserved nothing/);
});

it("refuses a proposal whose window no longer matches its command hash", async () => {
  const item = withPreflight(clientRecordFixture(), {
    duplicate: "clear",
    capacity: "allowed",
  });
  await expect(
    receiveIntentsResponse(
      "list",
      200,
      JSON.stringify({
        conversationId,
        intents: [
          {
            ...item,
            proposal: {
              ...item.proposal,
              expiresAt: new Date(Date.now() - 60000).toISOString(),
            },
          },
        ],
        next: null,
      }),
      { request: { conversationId } },
    ),
  ).rejects.toThrow();
});
