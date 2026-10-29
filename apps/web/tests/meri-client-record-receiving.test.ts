import { expect, it } from "vitest";
import type { ClientItem } from "./meri-client-record-fixture";

// Real bounded receiving test for the client-record review surface.
//
// The network is replaced BEFORE any module under test is imported. `createIntentsAccess` takes
// its fetcher as a lazily-resolved default, so the stub installed here is the only transport the
// receiving layer can reach: a live call would be recorded and served by this stub instead. No
// request leaves this process, and every assertion below reads what the real layer actually
// dispatched and then admitted through the public receiver.
const dispatched: { url: string; init: RequestInit }[] = [];
let answer: { status: number; body: string } = { status: 200, body: "{}" };
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  dispatched.push({ url: String(input), init: init ?? {} });
  return new Response(answer.body, {
    status: answer.status,
    headers: { "content-type": "application/json" },
  });
}) as typeof fetch;

const { createIntentsAccess } =
  await import("../src/shared/meri-intents/access");
const { clientRecordRow } =
  await import("../src/features/meri/conversation/intents/client-record-view");
const { clientRecordFixture, withHostilePreflight, withPreflight } =
  await import("./meri-client-record-fixture");
const { conversationId, viewer } = await import("./meri-legiwatch-fixture");

// Synthetic, never a real session value: the layer only requires a non-empty credential.
const credential = `action_session_${"A".repeat(43)}`;

const valueOf = (row: ReturnType<typeof clientRecordRow>, label: string) =>
  row.fields.find((field) => field.label === label)?.value;

/** One real receive: reply with a synthetic page and return what the surface admitted. */
async function receiveList(items: unknown[]) {
  answer = {
    status: 200,
    body: JSON.stringify({ conversationId, intents: items, next: null }),
  };
  dispatched.length = 0;
  const access = createIntentsAccess(credential, new AbortController().signal);
  const reply = await access.list(
    { conversationId },
    new AbortController().signal,
  );
  if (reply.kind !== "ok")
    throw Error(`Synthetic page was not admitted: ${reply.kind}`);
  return (reply.value as unknown as { intents: ClientItem[] }).intents;
}

it("receives the version-2 reading over the real transport and shows it", async () => {
  const [admitted] = await receiveList([
    withPreflight(clientRecordFixture("proposed", true), {
      duplicate: "possible",
      capacity: "allowed",
    }),
  ]);
  const row = clientRecordRow(admitted!, Date.now(), viewer);
  expect(valueOf(row, "Preflight duplicate")).toMatch(
    /^Possible in this answer/,
  );
  expect(valueOf(row, "Preflight capacity")).toMatch(/^Allowed in this answer/);
  // Exactly one fixed-route exchange: the review surface never writes or retries on its own.
  expect(dispatched).toHaveLength(1);
  expect(dispatched[0]!.url).toBe("/api/conversations/intents/list");
  expect(dispatched[0]!.init).toMatchObject({
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
  });
  expect(JSON.parse(String(dispatched[0]!.init.body))).toEqual({
    conversationId,
  });
  expect(
    (dispatched[0]!.init.headers as Record<string, string>)[
      "X-Meri-Action-Session"
    ],
  ).toBe(credential);
});

it("refuses a key-less answer as version parity, then shows the omission truthfully", async () => {
  // The canonical receiver admits only an answer carrying the declared nullable preflight, so a
  // key-less answer never becomes a page: the surface must say so rather than invent a reading.
  const keyless = withHostilePreflight(
    clientRecordFixture("proposed", true),
    undefined,
  );
  const body = JSON.stringify({
    conversationId,
    intents: [keyless],
    next: null,
  });
  // Omitting the key is exactly what the retained key-less answer looks like on the wire.
  expect(body).not.toContain("preflight");
  answer = { status: 200, body };
  dispatched.length = 0;
  const access = createIntentsAccess(credential, new AbortController().signal);
  const reply = await access.list(
    { conversationId },
    new AbortController().signal,
  );
  expect(reply).toEqual({ kind: "unavailable", dispatched: true });
  expect(dispatched).toHaveLength(1);
  // Projecting the refused shape directly is what proves the display invents no reading.
  const row = clientRecordRow(keyless, Date.now(), viewer);
  expect(valueOf(row, "Preflight duplicate")).toBeUndefined();
  expect(valueOf(row, "Preflight capacity")).toBeUndefined();
  expect(valueOf(row, "Preflight check")).toMatch(
    /^An unbounded value from the owner/,
  );
});

it("distinguishes a null reading on a create from an update that never has one", async () => {
  const [created] = await receiveList([
    withPreflight(clientRecordFixture("proposed", true), null),
  ]);
  expect(
    valueOf(clientRecordRow(created!, Date.now(), viewer), "Preflight check"),
  ).toMatch(/recorded no current duplicate or capacity reading/);
  const [updated] = await receiveList([
    withPreflight(clientRecordFixture("proposed", false), null),
  ]);
  expect(
    valueOf(clientRecordRow(updated!, Date.now(), viewer), "Preflight check"),
  ).toMatch(/Not applicable to this action/);
});

it("treats an answer the public receiver does not admit as unavailable, not as a reading", async () => {
  answer = { status: 502, body: JSON.stringify({ unexpected: true }) };
  dispatched.length = 0;
  const access = createIntentsAccess(credential, new AbortController().signal);
  const reply = await access.list(
    { conversationId },
    new AbortController().signal,
  );
  // Dispatched but unreadable: the surface must say unavailable rather than claim a reading.
  expect(reply).toEqual({ kind: "unavailable", dispatched: true });
  expect(dispatched).toHaveLength(1);
});

it("keeps an uncredentialed surface from reaching the network at all", async () => {
  answer = { status: 200, body: "{}" };
  dispatched.length = 0;
  const access = createIntentsAccess("", new AbortController().signal);
  expect(
    await access.list({ conversationId }, new AbortController().signal),
  ).toEqual({ kind: "unavailable", dispatched: false });
  expect(dispatched).toHaveLength(0);
});
