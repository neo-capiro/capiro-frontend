import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { ProfileCompleteness } from "../src/features/portfolio/profile-build/ProfileCompleteness";
const state = vi.hoisted(() => ({
  data: undefined as unknown,
  error: null as Error | null,
}));
vi.mock("../src/features/portfolio/profile-build/profile-queries", () => ({
  useProfileSnapshot: () => ({
    isPending: false,
    data: state.data,
    error: state.error,
    refetch: vi.fn(),
  }),
}));
const render = () =>
  renderToStaticMarkup(
    createElement(ProfileCompleteness, {
      subject: { kind: "prospect", id: "10000000-0000-4000-8000-000000000001" },
      onEdit: () => {},
    }),
  );
it("does not present unavailable profile data as missing saved information", () => {
  state.data = undefined;
  state.error = Error("Unavailable");
  const html = render();
  expect(html).toContain("Unavailable");
  expect(html).not.toContain("Not researched");
});
it("keeps completion, research provenance and review state distinct across six prospect sections", () => {
  state.error = null;
  state.data = {
    completeness: {
      completed: 1,
      total: 6,
      sections: [
        {
          key: "company",
          status: "complete",
          researched: false,
          reviewCount: 0,
        },
        {
          key: "registration",
          status: "partial",
          researched: true,
          reviewCount: 0,
        },
        {
          key: "leadership",
          status: "missing",
          researched: false,
          reviewCount: 0,
        },
        {
          key: "lobbying",
          status: "missing",
          researched: true,
          reviewCount: 0,
        },
        {
          key: "federal_footprint",
          status: "partial",
          researched: true,
          reviewCount: 2,
        },
        { key: "news", status: "missing", researched: false, reviewCount: 0 },
      ],
    },
  };
  const html = render();
  for (const label of [
    "Company basics",
    "Federal registration",
    "Leadership",
    "Lobbying history",
    "Federal footprint",
    "News",
    "Complete",
    "Partial",
    "Not researched",
    "Not provided",
    "2 to review",
  ])
    expect(html).toContain(label);
});
