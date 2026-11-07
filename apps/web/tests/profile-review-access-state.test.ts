import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { ApiError } from "../src/shared/portfolio/api/http";
import { ProfileBuildPanel } from "../src/features/portfolio/profile-build/ProfileBuildPanel";

const access = vi.hoisted(() => ({
  identity: {
    data: {
      user: { id: "synthetic-user" },
      tenant: { id: "synthetic-tenant" },
    },
    isPending: false,
    isFetching: true,
    error: null as Error | null,
  },
  canRead: false,
  canEdit: false,
}));
vi.mock("../src/features/portfolio/profile-build/queries", () => ({
  useProfileBuildAccess: () => access,
  useLatestReview: () => ({ isPending: true }),
  useProfileBuildSetup: () => ({ isPending: true }),
  isProfileAccessDenied: () => false,
}));
vi.mock("../src/features/portfolio/profile-build/useResearchCommands", () => ({
  useResearchCommands: () => ({ blocked: true }),
}));
vi.mock("../src/features/portfolio/profile-build/useReviewAction", () => ({
  useReviewAction: () => ({ mutation: {}, recovery: {} }),
}));
const render = () =>
  renderToStaticMarkup(
    createElement(ProfileBuildPanel, {
      subject: { kind: "client", id: "10000000-0000-4000-8000-000000000001" },
    }),
  );

beforeEach(() =>
  Object.assign(access.identity, {
    isPending: false,
    isFetching: true,
    error: null,
  }),
);

it("describes an authoritative identity refresh as loading, not a denial", () => {
  const html = render();
  expect(html).toContain("Loading…");
  expect(html).not.toContain(
    "Your current session cannot access this profile review",
  );
});

it("keeps a settled unavailable role visibly denied", () => {
  access.identity.isFetching = false;
  const html = render();
  expect(html).toContain(
    "Your current session cannot access this profile review",
  );
  expect(html).not.toContain("Loading…");
});

it("does not hide an actual access refusal behind the refresh state", () => {
  access.identity.error = new ApiError(403, "Synthetic revoked session");
  const html = render();
  expect(html).toContain("You do not have permission for this operation");
  expect(html).not.toContain("Loading…");
});
