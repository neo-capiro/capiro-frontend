import { expect, it } from "vitest";
import {
  prepareClientEntry,
  prepareEntityEntry,
  readClientEntry,
  retireEntry,
  retireEntryForScope,
  clientEntryHref,
  meriEntry,
} from "../src/shared/meri-entry/descriptor";
import { readFirstChatIntent } from "../src/shared/meri-conversations/first-chat-intent";
import {
  syncMeriTabIdentity,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";

// Synthetic navigation and storage only; these tests grant no service access.
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const scope = { tenantId: id(1), actorId: id(2), clientId: id(3) };
const now = Date.parse("2026-10-23T00:00:00Z");
function fixture() {
  const data = new Map<string, string>();
  const storage: TabStorage = {
    get length() {
      return data.size;
    },
    key: (index) => [...data.keys()][index] ?? null,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
  syncMeriTabIdentity(JSON.stringify([scope.tenantId, scope.actorId]), storage);
  let next = 20;
  return { storage, issueId: () => id(next++) };
}

for (const target of [
  { source: "workspace-draft" as const, draftId: id(4) },
  { source: "planner-task" as const, taskId: id(5) },
]) {
  it(`${target.source}: preserves only canonical IDs and the same unsent bootstrap request on reload`, () => {
    const { storage, issueId } = fixture();
    const entry = prepareEntityEntry(scope, target, storage, now, issueId);
    expect(entry).toMatchObject({ ...target, clientId: scope.clientId });
    expect(readClientEntry(scope, entry.entryId, storage, now + 100)).toEqual(
      entry,
    );
    expect(
      prepareEntityEntry(scope, target, storage, now + 100, () => {
        throw Error("new request");
      }),
    ).toEqual(entry);
    expect(readFirstChatIntent(scope, storage)).toMatchObject({
      state: "pending",
      requestId: entry.requestId,
    });
    expect([
      ...new URL(
        clientEntryHref(entry),
        "https://synthetic.example.test",
      ).searchParams.keys(),
    ]).toEqual(["clientId", "entry"]);
    for (const extra of [
      { prompt: "send this" },
      { credential: "forged" },
      { authorized: true },
      { title: "cached private title" },
    ])
      expect(() => meriEntry.parse({ ...entry, ...extra })).toThrow();
    expect(() =>
      readClientEntry(scope, entry.entryId, storage, now + 300_000),
    ).toThrow();
  });
}

it("changing the local object retires the old Back link without replacing an unresolved Core request", () => {
  const { storage, issueId } = fixture();
  const first = prepareEntityEntry(
    scope,
    { source: "workspace-draft", draftId: id(4) },
    storage,
    now,
    issueId,
  );
  const second = prepareEntityEntry(
    scope,
    { source: "workspace-draft", draftId: id(6) },
    storage,
    now + 1,
    issueId,
  );
  expect(second.entryId).not.toBe(first.entryId);
  expect(second.requestId).toBe(first.requestId);
  expect(() =>
    readClientEntry(scope, first.entryId, storage, now + 2),
  ).toThrow();
  expect(readClientEntry(scope, second.entryId, storage, now + 2)).toEqual(
    second,
  );
});

it("entity and client-only navigation never silently reuse one another's context", () => {
  const { storage, issueId } = fixture();
  const first = prepareEntityEntry(
    scope,
    { source: "planner-task", taskId: id(5) },
    storage,
    now,
    issueId,
  );
  const client = prepareClientEntry(scope, storage, now + 1, issueId);
  expect(client.source).toBe("client-profile");
  expect(client).not.toHaveProperty("taskId");
  expect(client.requestId).toBe(first.requestId);
  expect(() =>
    readClientEntry(scope, first.entryId, storage, now + 2),
  ).toThrow();
});

it("confirmed client/General changes retire the saved reference and keep an unknown bootstrap request", () => {
  for (const clientId of [id(9), null]) {
    const { storage, issueId } = fixture();
    const entry = prepareEntityEntry(
      scope,
      { source: "planner-task", taskId: id(5) },
      storage,
      now,
      issueId,
    );
    retireEntryForScope(scope, scope.clientId, storage);
    expect(readClientEntry(scope, entry.entryId, storage, now)).toEqual(entry);
    retireEntryForScope(scope, clientId, storage);
    expect(() => readClientEntry(scope, entry.entryId, storage, now)).toThrow();
    expect(readFirstChatIntent(scope, storage)?.requestId).toBe(
      entry.requestId,
    );
  }
});

it("rejected fresh source access retires only its exact reference, never a newer one", () => {
  const { storage, issueId } = fixture();
  const first = prepareEntityEntry(
    scope,
    { source: "planner-task", taskId: id(5) },
    storage,
    now,
    issueId,
  );
  const second = prepareEntityEntry(
    scope,
    { source: "planner-task", taskId: id(6) },
    storage,
    now + 1,
    issueId,
  );
  retireEntry(scope, first.entryId, storage);
  expect(readClientEntry(scope, second.entryId, storage, now + 2)).toEqual(
    second,
  );
  retireEntry(scope, second.entryId, storage);
  expect(() =>
    readClientEntry(scope, second.entryId, storage, now + 2),
  ).toThrow();
  expect(readFirstChatIntent(scope, storage)?.requestId).toBe(second.requestId);
  const reopened = prepareEntityEntry(
    scope,
    { source: "planner-task", taskId: id(6) },
    storage,
    now + 3,
    issueId,
  );
  expect(reopened.entryId).not.toBe(second.entryId);
  expect(reopened.requestId).toBe(second.requestId);
  expect(readClientEntry(scope, reopened.entryId, storage, now + 3)).toEqual(
    reopened,
  );
});

it("foreign accounts, clients, missing identities and invalid object IDs cannot recover a handoff", () => {
  const { storage, issueId } = fixture();
  const entry = prepareEntityEntry(
    scope,
    { source: "workspace-draft", draftId: id(4) },
    storage,
    now,
    issueId,
  );
  for (const changed of [
    { ...scope, actorId: id(8) },
    { ...scope, tenantId: id(8) },
    { ...scope, clientId: id(8) },
  ])
    expect(() =>
      readClientEntry(changed, entry.entryId, storage, now),
    ).toThrow();
  for (const draftId of ["", "client-name", "../other", "javascript:alert(1)"])
    expect(() =>
      prepareEntityEntry(
        scope,
        { source: "workspace-draft", draftId },
        storage,
        now,
        issueId,
      ),
    ).toThrow();
  expect(() =>
    meriEntry.parse({
      ...entry,
      source: "mail",
      connectionEmail: "synthetic@example.test",
    }),
  ).toThrow();
  syncMeriTabIdentity(null, storage);
  expect(() => readClientEntry(scope, entry.entryId, storage, now)).toThrow();
});
