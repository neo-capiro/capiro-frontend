import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SavedDebriefContext } from "../src/features/portfolio/calendar/debrief/SavedDebriefContext";

const state = vi.hoisted(() => ({
  open: false,
  fetching: false,
  invalidated: false,
  pending: false,
  error: null as Error | null,
  summary: null as unknown,
  options: null as Record<string, unknown> | null,
}));
vi.mock("react", async () => ({
  ...(await vi.importActual<typeof import("react")>("react")),
  useState: () => [state.open, vi.fn()],
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: Record<string, unknown>) => {
    state.options = options;
    return {
      isSuccess: !state.pending && !state.error,
      isFetching: state.fetching,
      isPending: state.pending,
      error: state.error,
      data: { generatedFrom: state.summary },
      refetch: vi.fn(),
    };
  },
  useQueryClient: () => ({
    getQueryState: () => ({ isInvalidated: state.invalidated }),
  }),
}));
vi.mock("../src/shared/portfolio/api/provider", () => ({ useApi: () => ({}) }));
const binding = {
  id: "d1",
  meetingId: "m1",
  clientId: "c1",
  revision: "2026-11-01T00:00:00.000Z",
};
const actor = { tenantId: "t1", userId: "u1" };
const render = (allowed = true) =>
  renderToStaticMarkup(
    createElement(SavedDebriefContext, { binding, actor, allowed }),
  );

beforeEach(() => {
  Object.assign(state, {
    open: false,
    fetching: false,
    invalidated: false,
    pending: false,
    error: null,
    options: null,
    summary: {
      version: "d2-debrief-context-v1",
      boundTokens: 8000,
      totalTokens: 123,
      sourceTruncated: true,
      sections: [{ name: "source", tokens: 123, state: "shortened" }],
    },
  });
});

describe("saved generation context disclosure", () => {
  it("is discoverable without fetching or exposing context on mount", () => {
    const html = render();
    expect(html).toContain("Generation context");
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain("Saved generation summary");
    expect(state.options?.enabled).toBe(false);
  });
  it("binds the lazy read to actor, client, artifact and displayed revision", () => {
    state.open = true;
    const html = render();
    expect(state.options?.enabled).toBe(true);
    expect(state.options?.queryKey).toEqual([
      "meeting",
      "m1",
      "debrief-context",
      "t1",
      "u1",
      "c1",
      "d1",
      binding.revision,
    ]);
    expect(html).toContain("123 estimated input tokens");
    expect(html).toContain("The source was shortened");
    expect(html).toContain(
      "does not reproduce the source text or certify later edits",
    );
    expect(html).toContain("shortened");
  });
  it("distinguishes legacy absent context", () => {
    state.open = true;
    state.summary = null;
    expect(render()).toContain("No generation context was saved");
  });
  it.each(["fetching", "invalidated", "pending"] as const)(
    "hides a retained summary while %s",
    (key) => {
      state.open = true;
      state[key] = true;
      expect(render()).not.toContain("Saved generation summary");
    },
  );
  it("hides cached context on read failure and offers retry", () => {
    state.open = true;
    state.error = new Error("Current context unavailable");
    const html = render();
    expect(html).not.toContain("Saved generation summary");
    expect(html).toContain("Current context unavailable");
    expect(html).toContain("Retry");
  });
  it("denies dispatch and display after permission loss", () => {
    state.open = true;
    const html = render(false);
    expect(state.options?.enabled).toBe(false);
    expect(html).not.toContain("Saved generation summary");
    expect(html).toContain("disabled");
  });
});
