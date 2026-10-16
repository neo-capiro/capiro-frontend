import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../src/shared/portfolio/api/http";
import type { ClientProgramPage } from "../src/features/portfolio/client-profile/client-program-context";
import { ClientProgramContext } from "../src/features/portfolio/client-profile/ClientProgramContext";

const state = vi.hoisted(() => ({
  enabled: true,
  isPending: false,
  isFetching: false,
  error: null as Error | null,
  data: undefined as ClientProgramPage | undefined,
}));
vi.mock("../src/features/portfolio/client-profile/profile-access", () => ({
  useProfileActor: () => ({
    tenantId: "synthetic-tenant",
    userId: "synthetic-user",
    role: "standard_user",
  }),
  profileActorKey: () => "synthetic-actor",
}));
vi.mock(
  "../src/features/portfolio/client-profile/client-program-context",
  async (original) => ({
    ...(await original<
      typeof import("../src/features/portfolio/client-profile/client-program-context")
    >()),
    useClientProgramContext: () => ({ ...state, refetch: vi.fn() }),
  }),
);
const render = () =>
  renderToStaticMarkup(
    createElement(ClientProgramContext, {
      clientId: "client-a",
      enabled: true,
    }),
  );
const page = (): ClientProgramPage => ({
  page: 1,
  limit: 20,
  total: 1,
  data: [
    {
      peCode: "PE-SYNTHETIC",
      title: null,
      score: 0.8,
      paths: [
        {
          path: "prior_award",
          score: 0.8,
          evidence: ["3 prior awards (~$987.6M)"],
        },
        {
          path: "facility_district",
          score: 0.6,
          evidence: ["Facility in district(s): VA-08"],
        },
      ],
    },
  ],
});
beforeEach(() =>
  Object.assign(state, {
    enabled: true,
    isPending: false,
    isFetching: false,
    error: null,
    data: page(),
  }),
);

describe("program associations presentation", () => {
  it("shows PE identity/null title/relevance while keeping historical money out", () => {
    const html = render();
    expect(html).toContain("PE-SYNTHETIC");
    expect(html).toContain("Title unavailable");
    expect(html).toContain("Prior award match");
    expect(html).toContain("similar contractor name");
    expect(html).toContain("VA-08");
    expect(html).not.toContain("$987.6M");
    expect(html).toContain("not funding totals or verified awards");
    expect(html).toContain("not an exhaustive");
  });
  it("does not claim permission or client existence from a native empty page", () => {
    state.data = { page: 1, limit: 20, total: 0, data: [] };
    const html = render();
    expect(html).toContain("No program associations were returned");
    expect(html).not.toContain("client has no programs");
    expect(html).not.toContain("Client verified");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Next page<\/button>/);
  });
  it("shows loading independently from client award data", () => {
    state.data = undefined;
    state.isPending = true;
    state.isFetching = true;
    const html = render();
    expect(html).toContain('role="status"');
    expect(html).toContain("Loading…");
    expect(html).not.toContain("PE-SYNTHETIC");
  });
  it.each([403, 404, 500])(
    "does not render cached rows after read failure %s",
    (status) => {
      state.error = new ApiError(status, "Synthetic page failure");
      const html = render();
      expect(html).not.toContain("PE-SYNTHETIC");
      expect(html).toContain('role="alert"');
      expect(html).toContain(
        status === 403
          ? "do not have permission"
          : status === 404
            ? "Program association context is unavailable"
            : "Synthetic page failure",
      );
    },
  );
  it("suppresses cached rows when the current session/read is disabled", () => {
    state.enabled = false;
    const html = render();
    expect(html).toContain("A current session is required");
    expect(html).not.toContain("PE-SYNTHETIC");
  });
  it("preserves returned pagination metadata and exposes only manual next/previous controls", () => {
    state.data = {
      ...page(),
      total: 21,
      data: Array.from({ length: 20 }, (_, index) => ({
        ...page().data[0],
        peCode: `PE-SYNTHETIC-${index}`,
      })),
    };
    const html = render();
    const text = html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ");
    expect(text).toContain(
      "Page 1: 20 returned associations of 21 matching candidates",
    );
    expect(html).toContain('<button class="button">Next page</button>');
    expect(html).not.toContain("Load all");
  });
  it("bounds and escapes nonmonetary reason text", () => {
    state.data!.data[0].paths = [
      {
        path: "capability_keyword",
        score: 0.5,
        evidence: ["<script>synthetic</script>" + "x".repeat(400)],
      },
    ];
    const html = render();
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("(truncated)");
    expect(html).not.toContain("x".repeat(400));
  });
});
