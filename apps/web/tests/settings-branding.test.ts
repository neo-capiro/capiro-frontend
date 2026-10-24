import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrandingSettings } from "../src/features/settings/BrandingSettings";
import type { BrandingSyncReceipt } from "../src/features/settings/branding-sync";
const state = vi.hoisted(() => ({
  receipt: undefined as BrandingSyncReceipt | undefined,
  name: "Saved name",
  locked: false,
  recovered: false,
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (initial: unknown) => [
    typeof initial === "string" ? initial : state.receipt,
    () => {},
  ],
}));
vi.mock("../src/shared/capiro/CapiroBoundary", () => ({
  useCapiro: () => ({}),
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: () => ({
    data: { id: "tenant", name: state.name, logoUploadedAt: null },
    loading: false,
    reload: () => {},
  }),
}));
vi.mock("../src/features/settings/useSettingsAction", () => ({
  useSettingsAction: () => ({ busy: false, run: vi.fn(), clear: vi.fn() }),
}));
vi.mock("../src/features/settings/useSettingsMutation", () => ({
  useSettingsMutation: () => ({
    api: {},
    locked: state.locked,
    action: {
      busy: state.locked,
      message: state.recovered ? "Recorded state confirmed" : undefined,
    },
  }),
}));
const render = () => renderToStaticMarkup(createElement(BrandingSettings));
beforeEach(() => {
  state.receipt = undefined;
  state.name = "Saved name";
  state.locked = false;
  state.recovered = false;
});
describe("Branding local save and sync presentation", () => {
  it("retains the provider failure notice outside the keyed form after its saved name reloads", () => {
    state.receipt = { id: "tenant", name: "Saved name", clerkSync: "failed" };
    const html = render();
    expect(html).toContain(
      "Company name saved in Capiro. Sign-in organization sync failed.",
    );
    expect(html).toContain("Retry organization sync");
  });
  it("does not claim provider convergence after local-name-only recovery", () => {
    state.recovered = true;
    expect(render()).toContain("Sign-in organization sync is not confirmed.");
  });
  it("offers a current-value retry when another save superseded the receipt", () => {
    state.receipt = {
      id: "tenant",
      name: "Earlier name",
      clerkSync: "confirmed",
    };
    expect(render()).toContain("A newer company name is saved in Capiro");
    expect(render()).toContain("Retry organization sync");
  });
  it("freezes both editable name and file input while the name result is unresolved", () => {
    state.locked = true;
    const html = render();
    expect(html).toMatch(/<input[^>]*disabled=""[^>]*value="Saved name"/);
    expect(html).toMatch(/<input[^>]*type="file"[^>]*disabled=""/);
  });
});
