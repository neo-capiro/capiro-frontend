import { describe, expect, it } from "vitest";
import {
  defaultLayout,
  emptyLayout,
} from "../src/features/modules/research-portfolios/share/dashboard-layout";
import {
  designDraftKey,
  designEditorLock,
  readDesignDraft,
  writeDesignDraft,
  type DesignDraft,
  type DesignDraftScope,
} from "../src/features/modules/research-portfolios/share/design-draft";
const scope: DesignDraftScope = {
  tenantId: "tenant-a",
  userId: "actor-a",
  portfolioId: "portfolio-a",
  clientId: "client-a",
  designId: "design-a",
  portfolioRevision: 4,
  designVersion: 2,
};
const now = 10_000_000;
const draft = (): DesignDraft => ({
  schema: 1,
  scope,
  updatedAt: now,
  name: "Private analysis",
  layout: defaultLayout(),
  pending: false,
});
function storage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}
describe("verified design draft boundaries", () => {
  it("restores exact unsaved bytes after serialization without submitting a command", () => {
    const store = storage();
    const retained = draft();
    retained.layout.widgets[0]!.settings = { title: "Draft heading" };
    retained.layout.phoneOrder.reverse();
    writeDesignDraft(store, retained);
    expect(readDesignDraft(store, { ...scope }, now)).toEqual({
      state: "ready",
      draft: retained,
    });
  });
  it.each([
    "tenantId",
    "userId",
    "portfolioId",
    "clientId",
    "designId",
  ] as const)("does not read another %s draft", (field) => {
    const store = storage();
    writeDesignDraft(store, draft());
    expect(
      readDesignDraft(store, { ...scope, [field]: "different" }, now),
    ).toEqual({ state: "empty" });
    store.setItem(
      designDraftKey({ ...scope, [field]: "different" }),
      JSON.stringify(draft()),
    );
    expect(
      readDesignDraft(store, { ...scope, [field]: "different" }, now),
    ).toEqual({ state: "stale" });
  });
  it.each(["designVersion", "portfolioRevision"] as const)(
    "refuses stale %s rather than overwriting a current revision",
    (field) => {
      const store = storage();
      writeDesignDraft(store, draft());
      expect(
        readDesignDraft(store, { ...scope, [field]: scope[field] + 1 }, now),
      ).toEqual({ state: "stale" });
    },
  );
  it("retains an uncertain save as pending, and supports an empty unsaved layout", () => {
    const store = storage();
    const pending = { ...draft(), pending: true, layout: emptyLayout() };
    writeDesignDraft(store, pending);
    expect(readDesignDraft(store, scope, now)).toEqual({
      state: "ready",
      draft: pending,
    });
  });
  it("refuses corrupt, expired, future and overlapping records; unavailable storage throws visibly to the editor", () => {
    const store = storage();
    store.setItem(designDraftKey(scope), "{bad");
    expect(readDesignDraft(store, scope, now)).toEqual({ state: "corrupt" });
    writeDesignDraft(store, draft());
    expect(readDesignDraft(store, scope, now + 86_400_001)).toEqual({
      state: "stale",
    });
    expect(readDesignDraft(store, scope, now - 60_001)).toEqual({
      state: "stale",
    });
    const overlap = draft();
    overlap.layout.widgets[1]!.y = 0;
    writeDesignDraft(store, overlap);
    expect(readDesignDraft(store, scope, now)).toEqual({ state: "corrupt" });
    expect(() =>
      readDesignDraft(
        {
          getItem: () => {
            throw new Error("denied");
          },
        },
        scope,
      ),
    ).toThrow("denied");
  });
  it("uses one editor lock across client previews and versions, with separate account and design locks", () => {
    expect(designEditorLock(scope)).toBe(
      designEditorLock({
        ...scope,
        clientId: "b",
        designVersion: 9,
        portfolioRevision: 9,
      }),
    );
    expect(designEditorLock(scope)).not.toBe(
      designEditorLock({ ...scope, designId: "b" }),
    );
    expect(designEditorLock(scope)).not.toBe(
      designEditorLock({ ...scope, userId: "b" }),
    );
  });
});
