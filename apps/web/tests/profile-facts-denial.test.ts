import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";
import { ProfileFacts } from "../src/features/portfolio/profile-build/ProfileFacts";
import { ApiError } from "../src/shared/portfolio/api/http";
import { profileBuildKey } from "../src/features/portfolio/profile-build/subject";
const state = vi.hoisted(() => ({
  error: null as Error | null,
  onError: undefined as ((error: Error) => Promise<void>) | undefined,
}));
vi.mock("@tanstack/react-query", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  useQueryClient: () => cache,
  useMutation: (options: { onError: (error: Error) => Promise<void> }) => {
    state.onError = options.onError;
    return {
      error: state.error,
      isPending: false,
      isError: Boolean(state.error),
      reset: () => {
        state.error = null;
      },
    };
  },
}));
vi.mock("../src/shared/portfolio/api/provider", () => ({
  useApi: () => ({ request: vi.fn() }),
}));
vi.mock("../src/features/portfolio/profile-build/profile-queries", () => ({
  useProfileSnapshot: () => ({
    data: profile,
    isSuccess: true,
    isFetching: false,
    isPending: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock(
  "../src/features/portfolio/profile-build/queries",
  async (original) => ({
    ...(await original<Record<string, unknown>>()),
    useProfileBuildAccess: () => ({
      canRead: true,
      canEdit: true,
      identity: {
        data: { user: { id: "reviewer" }, tenant: { id: "tenant" } },
      },
    }),
  }),
);
const cache = new QueryClient();
const subject = {
  kind: "client" as const,
  id: "10000000-0000-4000-8000-000000000001",
};
const profile = {
  facts: [
    {
      id: "10000000-0000-4000-8000-000000000002",
      fieldKey: "description",
      value: "Restricted approved fact",
      origin: "research",
      sourceType: "document",
      sourceUrl: null,
      attachmentId: null,
      evidence: [
        { label: "Restricted source", excerpt: "Restricted source excerpt" },
      ],
      observedAt: null,
      confidence: null,
      status: "approved",
      approvedBy: null,
      approvedAt: null,
      version: 1,
      isCurrent: true,
    },
  ],
  conflicts: [],
};
const html = () =>
  renderToStaticMarkup(createElement(ProfileFacts, { subject }));
beforeEach(() => {
  state.error = null;
  cache.clear();
});
it("hides cached facts immediately after a denied conflict decision and resets sibling reads", async () => {
  const key = [...profileBuildKey(subject), "profile", "tenant", "reviewer"];
  cache.setQueryData(key, profile);
  expect(html()).toContain("Restricted source excerpt");
  state.error = new ApiError(403, "Profile access denied");
  const denied = html();
  expect(denied).not.toContain("Restricted approved fact");
  expect(denied).not.toContain("Restricted source excerpt");
  expect(denied).toContain("You do not have permission for this operation.");
  await state.onError!(state.error);
  expect(cache.getQueryData(key)).toBeUndefined();
});
it("an uncertain server failure does not discard the currently authorized snapshot", async () => {
  const key = [...profileBuildKey(subject), "profile", "tenant", "reviewer"];
  cache.setQueryData(key, profile);
  state.error = new ApiError(503, "Decision result unavailable");
  expect(html()).toContain("Restricted source excerpt");
  await state.onError!(state.error);
  expect(cache.getQueryData(key)).toEqual(profile);
});
