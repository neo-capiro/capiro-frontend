import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { useProfileSnapshot } from "../src/features/portfolio/profile-build/profile-queries";
import { useResearchFiles } from "../src/features/portfolio/profile-build/research-files";
import {
  useLatestReview,
  useProfileBuildSetup,
} from "../src/features/portfolio/profile-build/queries";
const state = vi.hoisted(() => ({
  identity: {
    data: {
      user: { id: "person" },
      tenant: { id: "tenant" },
      role: "user_admin",
    },
    isPending: false,
    isFetching: false,
    isPaused: false,
    error: null as Error | null,
  },
  query: {
    data: { privateSource: "retained source excerpt" },
    isSuccess: true,
    error: null as Error | null,
  },
  options: [] as { queryKey: unknown[]; enabled: boolean }[],
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: { queryKey: unknown[]; enabled: boolean }) => {
    state.options.push(options);
    return state.query;
  },
}));
vi.mock("../src/shared/portfolio/api/provider", () => ({
  useApi: () => ({ request: vi.fn() }),
}));
vi.mock("../src/shared/portfolio/auth/identity", () => ({
  useIdentity: () => state.identity,
  canAdminister: (role: string) => role === "user_admin",
}));
const subject = {
  kind: "client" as const,
  id: "10000000-0000-4000-8000-000000000001",
};
function readHooks() {
  let results: { data: unknown }[] = [];
  function Probe() {
    results = [
      useProfileSnapshot(subject),
      useResearchFiles(subject),
      useLatestReview(subject, true),
      useProfileBuildSetup(subject, true),
    ];
    return null;
  }
  renderToStaticMarkup(createElement(Probe));
  return results;
}
beforeEach(() => {
  state.identity.error = null;
  state.identity.isFetching = false;
  state.identity.data.role = "user_admin";
  state.query.error = null;
  state.query.isSuccess = true;
  state.options = [];
});
it("scopes each successful source read to the subject and current actor", () => {
  for (const result of readHooks()) expect(result.data).toBe(state.query.data);
  for (const options of state.options) {
    expect(options.queryKey).toEqual(
      expect.arrayContaining(["client", subject.id, "tenant", "person"]),
    );
    expect(options.enabled).toBe(true);
  }
});
it("hides cached private data when a refreshed source read fails", () => {
  state.query.error = new Error("403 forbidden");
  state.query.isSuccess = false;
  for (const result of readHooks()) expect(result.data).toBeUndefined();
  expect(state.query.data.privateSource).toBe("retained source excerpt");
});
it.each(["identity_pending", "identity_denied", "role_revoked"])(
  "hides cached sources while current authority is %s",
  (reason) => {
    if (reason === "identity_pending") state.identity.isFetching = true;
    if (reason === "identity_denied")
      state.identity.error = new Error("Unauthorized");
    if (reason === "role_revoked") state.identity.data.role = "viewer";
    for (const result of readHooks()) expect(result.data).toBeUndefined();
    for (const options of state.options) expect(options.enabled).toBe(false);
  },
);
