import { expect, it } from "vitest";
import { clientHandoff } from "../src/shared/meri-conversations/client-handoff";
import {
  syncMeriTabIdentity,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";
const account = { tenantId: "synthetic", actorId: "actor" };
const client = "00000001-0000-4000-8000-000000000000",
  other = "00000002-0000-4000-8000-000000000000";
function memory() {
  const values = new Map<string, string>();
  const storage: TabStorage = {
    get length() {
      return values.size;
    },
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
  syncMeriTabIdentity("session-a", storage);
  return storage;
}
it("client handoff retains reviewed text separately, and changed client retires it", () => {
  const storage = memory(),
    owner = clientHandoff(account, storage);
  const draft = { clientId: client, draft: "Reviewed initial intent" };
  owner.write(draft);
  expect(clientHandoff(account, storage).receive(client)).toEqual(draft);
  expect(clientHandoff(account, storage).receive(other)).toBeUndefined();
  expect(owner.receive(client)).toBeUndefined();
});
it("handoff cannot cross actor, tenant, or session; malformed IDs and profile blobs are refused", () => {
  const storage = memory(),
    owner = clientHandoff(account, storage);
  owner.write({ clientId: client, draft: "Unsent" });
  expect(
    clientHandoff({ ...account, actorId: "other" }, storage).receive(client),
  ).toBeUndefined();
  expect(
    clientHandoff({ ...account, tenantId: "other" }, storage).receive(client),
  ).toBeUndefined();
  expect(() =>
    owner.write({ clientId: "foreign-invalid", draft: "Unsent" }),
  ).toThrow();
  expect(() =>
    owner.write({
      clientId: client,
      draft: "Unsent",
      profile: "not allowed",
    } as never),
  ).toThrow();
  syncMeriTabIdentity("session-b", storage);
  expect(() => owner.receive(client)).toThrow();
  expect(clientHandoff(account, storage).receive(client)).toBeUndefined();
});
it("a late adoption cannot erase a newer client draft", () => {
  const storage = memory(),
    owner = clientHandoff(account, storage);
  const old = { clientId: client, draft: "Earlier" };
  owner.write(old);
  owner.write({ clientId: client, draft: "Newer" });
  owner.clear(old);
  expect(owner.receive(client)?.draft).toBe("Newer");
});
