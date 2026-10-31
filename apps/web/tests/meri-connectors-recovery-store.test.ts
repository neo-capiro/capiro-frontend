import { describe, expect, it } from "vitest";
import { connectorRecoveryStore } from "../src/shared/meri-connectors/recovery-store";

function fixture() {
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
  return {
    data,
    storage,
    store: () => connectorRecoveryStore("tenant", "actor", () => storage),
  };
}

describe("connector create recovery across same-tab remounts", () => {
  it("records before dispatch and blocks a second create after reload or an empty current read", () => {
    const { store } = fixture();
    store().begin("notion");
    const reloaded = store();
    expect(reloaded.read()).toEqual(["notion"]);
    expect(reloaded.reconcile([])).toEqual(["notion"]);
    expect(() => reloaded.begin("notion")).toThrow("unresolved");
  });

  it("reconciles only catalog entries actually present in the current read", () => {
    const { store } = fixture();
    store().begin("notion");
    store().begin("box");
    expect(store().reconcile(["notion"])).toEqual(["box"]);
    expect(store().read()).toEqual(["box"]);
  });

  it("allows retry after an acknowledged pre-create refusal", () => {
    const { store } = fixture();
    store().begin("notion");
    store().refused("notion");
    expect(() => store().begin("notion")).not.toThrow();
  });

  it("keeps actors and tenants separate and stores only catalog IDs", () => {
    const { store, data, storage } = fixture();
    store().begin("notion");
    expect(
      connectorRecoveryStore("other", "actor", () => storage).read(),
    ).toEqual([]);
    expect(
      connectorRecoveryStore("tenant", "other", () => storage).read(),
    ).toEqual([]);
    expect([...data.values()]).toEqual(['["notion"]']);
  });

  it.each(["read", "write", "corrupt"])(
    "refuses creates when recovery storage has a %s failure",
    (failure) => {
      const { storage, data, store } = fixture();
      store().begin("box");
      if (failure === "read")
        storage.getItem = () => {
          throw new Error("unavailable");
        };
      if (failure === "write")
        storage.setItem = () => {
          throw new Error("full");
        };
      if (failure === "corrupt") data.set([...data.keys()][0]!, "not json");
      expect(() => store().begin("notion")).toThrow("recovery is unavailable");
    },
  );
});
