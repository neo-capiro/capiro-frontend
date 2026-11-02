import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { formatDeltaPct } from "../src/features/settings/analyst/ReconciliationQueue";
import { SiteWorkflowSettings } from "../src/features/settings/site-workflows/SiteWorkflowSettings";

const list = vi.hoisted(() => ({ workflows: [] as unknown[] }));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: () => ({
    loading: false,
    error: null,
    data: list,
    reload: () => undefined,
  }),
}));
vi.mock("../src/features/settings/useSettingsMutation", () => ({
  useSettingsMutation: () => ({
    api: {},
    locked: false,
    pending: null,
    reconcile: () => undefined,
    action: { busy: false, error: null, message: null },
  }),
}));

describe("settings list display", () => {
  it("states that no site workflows exist above the create form", () => {
    const html = renderToStaticMarkup(createElement(SiteWorkflowSettings));
    expect(html).toContain("No site workflows yet. Create one below.");
    expect(html).toContain("Create a workflow");
  });

  it("formats reconciliation deltas without float noise", () => {
    expect(formatDeltaPct(0.1000000000000001)).toBe("0.1%");
    expect(formatDeltaPct(0.2472522891355052)).toBe("0.25%");
    expect(formatDeltaPct(-12.345)).toBe("-12.35%");
    expect(formatDeltaPct("1234.5")).toBe("1,234.5%");
    expect(formatDeltaPct(-0.0001)).toBe("0%");
    expect(formatDeltaPct(null)).toBe("—");
    expect(formatDeltaPct("")).toBe("—");
    expect(formatDeltaPct("not a number")).toBe("—");
    expect(formatDeltaPct(Number.NaN)).toBe("—");
  });
});
