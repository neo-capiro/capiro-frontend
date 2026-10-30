import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ResearchDetail } from "@/shared/capiro/operations/research-schemas";
import type { ResearchBillMatch } from "@/shared/capiro/operations/research-bills";
import { CapiroApiError } from "@/shared/capiro/http";

/**
 * Reproduced defect: BillDetailPanel rendered only the DETAIL query error, so a
 * refused "Add to portfolio" (revision conflict, permission, network) made the
 * button usable again with no explanation and never said "Added" either — the
 * failure was invisible. These assertions pin the failure surface: a rejected
 * add shows its message, and success is the only path that reads "Added".
 */

type MutationState = { pending: boolean; error?: Error; run: () => Promise<unknown> };
const state = vi.hoisted(() => ({
  mutation: { pending: false, run: async () => ({}) } as MutationState,
  query: {
    loading: false,
    error: null as Error | null,
    data: undefined as unknown,
    reload: () => {},
  },
}));

vi.mock("@/shared/capiro/queries", () => ({
  useCapiroMutation: () => state.mutation,
  useCapiroQuery: () => state.query,
}));

const { BillDetailPanel } = await import(
  "@/features/modules/research-portfolios/members/BillDetailPanel"
);

const bill = {
  targetKind: "state_bill",
  targetId: "CA-20252026-HB123",
  identifier: "HB 123",
  title: "Privacy rights",
  jurisdiction: "CA",
  session: "2025-2026",
  status: "introduced",
  latestActionDate: "2026-02-03",
  latestActionText: "Referred to committee.",
  sourceUrl: null,
  matchReason: "exact_identifier",
} as unknown as ResearchBillMatch;

const detail = {
  targetKind: "state_bill",
  targetId: "CA-20252026-HB123",
  identifier: "HB 123",
  title: "Privacy rights",
  jurisdiction: "CA",
  session: "2025-2026",
  status: "introduced",
  statusAt: "2026-02-03",
  latestActionText: "Referred to committee.",
  latestActionDate: "2026-02-03",
  sourceUrl: null,
  sourceRevision: "rev-1",
  refreshedAt: "2026-05-01T00:00:00.000Z",
  refreshStatus: "ok",
  refreshFailed: false,
  sponsors: [],
  committees: [],
  textVersions: [],
  votes: [],
  relatedBills: [],
  unavailable: ["amendments"],
  coverage: {
    source: "legiscan",
    note: "State bills are read from the ingested LegiScan dataset only.",
    available: true,
  },
} as unknown as ResearchDetail;

const portfolio = {
  id: "portfolio-1",
  revision: 3,
  lifecycle: "active",
  myRole: "owner",
  members: [],
} as unknown as ResearchDetail;

function render() {
  return renderToStaticMarkup(
    createElement(BillDetailPanel, { bill, portfolio, onReload: () => {} }),
  );
}

beforeEach(() => {
  state.mutation = { pending: false, run: async () => ({}) };
  state.query.error = null;
  state.query.data = detail;
});

describe("bill detail: add failure is visible and never looks added", () => {
  it("renders the rejected add's message and keeps success distinct", () => {
    state.mutation = {
      pending: false,
      error: new CapiroApiError(409, "Refresh the portfolio before adding this bill."),
      run: async () => ({}),
    };

    const markup = render();

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Refresh the portfolio before adding this bill.");
    expect(markup).toContain("The bill was not added.");
    expect(markup).not.toContain("The outcome is uncertain");
    expect(markup).toContain("Reload portfolio");
    expect(markup).not.toMatch(/>\s*Added\s*</);
    expect(markup).toContain("Add to portfolio");
  });

  it("does not claim a transport failure had no effect", () => {
    // No HTTP status: the request may have committed and the reply been lost.
    state.mutation = {
      pending: false,
      error: new TypeError("Failed to fetch"),
      run: async () => ({}),
    };

    const markup = render();

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Failed to fetch");
    expect(markup).toContain("The outcome is uncertain");
    expect(markup).not.toContain("The bill was not added.");
    expect(markup).not.toMatch(/>\s*Added\s*</);
    expect(markup).toContain("Reload portfolio");
  });

  it("shows no failure state when the add has not failed", () => {
    const markup = render();

    expect(markup).not.toContain("The bill was not added.");
    expect(markup).toContain("Add to portfolio");
  });
});
