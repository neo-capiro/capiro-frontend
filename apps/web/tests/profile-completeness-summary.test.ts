import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { ProfileCompletenessSummary } from "../src/features/portfolio/profile-build/ProfileCompleteness";
const state = vi.hoisted(() => ({
  isPending: false,
  data: undefined as
    | { completeness: { completed: number; total: number } }
    | undefined,
  error: null as Error | null,
}));
vi.mock("../src/features/portfolio/profile-build/profile-queries", () => ({
  useProfileSnapshot: () => state,
}));
const render = () =>
  renderToStaticMarkup(
    createElement(ProfileCompletenessSummary, {
      subject: { kind: "client", id: "10000000-0000-4000-8000-000000000001" },
    }),
  );
beforeEach(() =>
  Object.assign(state, {
    isPending: false,
    data: { completeness: { completed: 5, total: 6 } },
    error: null,
  }),
);
it("shows the service's completion count and accessible progress", () => {
  const html = render();
  expect(html).toContain("5 of 6 details complete");
  expect(html).toContain(
    'value="5" max="6" aria-label="Completed profile details"',
  );
});
it("preserves a legitimate zero and server-provided total", () => {
  state.data = { completeness: { completed: 0, total: 4 } };
  const html = render();
  expect(html).toContain("0 of 4 details complete");
  expect(html).toContain('value="0" max="4"');
});
it("does not invent missing details while loading", () => {
  state.data = undefined;
  state.isPending = true;
  const html = render();
  expect(html).toContain("Loading profile completeness");
  expect(html).not.toContain("<progress");
});
it("does not present stale completion after an unavailable read", () => {
  state.error = new Error("Read denied");
  state.isPending = true;
  const html = render();
  expect(html).toContain("Profile completeness unavailable");
  expect(html).not.toContain("5 of 6");
  expect(html).not.toContain("<progress");
});
