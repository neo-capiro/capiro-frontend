import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { LegacyReportLibrary } from "../src/features/meri/files/LegacyReportLibrary";

/**
 * VQA-022: an explicit "Load more reports" that admits an empty continuation window must leave a
 * durable, accessible acknowledgement of the check it completed. The count is a local check count
 * for this view, never a report total, a backend page number or a cursor position.
 */
const scene = vi.hoisted(() => ({
  state: {} as Record<string, unknown>,
  load: vi.fn(),
  open: vi.fn(),
  clear: vi.fn(),
}));

vi.mock("../src/shared/capiro/CapiroBoundary", () => ({
  useCapiro: () => ({ request: vi.fn() }),
}));
vi.mock("../src/shared/meri-reports/client", () => ({
  createLegacyReportClient: () => ({ list: vi.fn(), read: vi.fn() }),
}));
vi.mock("../src/shared/meri-reports/state", () => ({
  LegacyReportController: class {
    snapshot = () => scene.state;
    subscribe = () => () => {};
    mount = () => () => {};
    load = scene.load;
    open = scene.open;
    clear = scene.clear;
  },
}));

const summary = {
  id: "11111111-1111-4111-8111-111111111111",
  artifactId: "33333333-3333-4333-8333-333333333333",
  title: "Synthetic retained report",
  kind: "research",
  clientId: null,
  createdAt: "2026-10-27T10:00:00.000Z",
  updatedAt: "2026-10-27T10:00:00.000Z",
};

const base = {
  reports: [] as (typeof summary)[],
  cursor: null as string | null,
  loaded: false,
  busy: false,
  selected: null,
  problem: null as string | null,
  lastCheck: null as { ordinal: number; added: number } | null,
};

const render = (patch: Partial<typeof base> = {}) => {
  scene.state = { ...base, ...patch };
  return renderToStaticMarkup(createElement(LegacyReportLibrary, {}));
};

it("renders no completion claim and starts no check before an explicit request", () => {
  const html = render();
  expect(html).toContain("Load reports");
  expect(html).not.toContain("Checked");
  expect(html).not.toContain("No available reports on this page");
  expect(scene.load).not.toHaveBeenCalled();
});

it("acknowledges an admitted empty continuation window and keeps the page-qualified empty copy", () => {
  const html = render({
    loaded: true,
    cursor: "synthetic-cursor",
    lastCheck: { ordinal: 2, added: 0 },
  });
  expect(html).toContain('role="status"');
  expect(html).toContain(
    "Checked 2 times in this view. This check added no reports.",
  );
  expect(html).toContain(
    "No available reports on this page. More saved reports can be checked.",
  );
  expect(html).toContain("Load more reports");
  expect(html).toContain("Refresh reports");
  // The cursor-null end claim must not appear while a continuation is still offered.
  expect(html).not.toContain(
    "No currently available completed reports were returned.",
  );
});

it("reports newly visible results and the cursor-null end state", () => {
  const html = render({
    reports: [summary],
    loaded: true,
    lastCheck: { ordinal: 3, added: 1 },
  });
  expect(html).toContain(
    "Checked 3 times in this view. This check added 1 report.",
  );
  expect(html).toContain("Synthetic retained report");
  expect(html).not.toContain("Load more reports");
  expect(html).not.toContain("No available reports on this page");
});

it("shows the in-flight check instead of a stale completion claim", () => {
  const html = render({
    loaded: true,
    busy: true,
    cursor: "synthetic-cursor",
    lastCheck: { ordinal: 2, added: 0 },
  });
  expect(html).toContain("Checking current report access…");
  expect(html).not.toContain("Checked 2 times");
});

it("keeps a refusal distinct from a completed check", () => {
  const html = render({
    problem:
      "Completed reports could not be verified. Refresh to check current access.",
  });
  expect(html).toContain('role="alert"');
  expect(html).toContain("Refresh to check current access.");
  expect(html).not.toContain("Checked");
  expect(html).not.toContain("No available reports on this page");
});
