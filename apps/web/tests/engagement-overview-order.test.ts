import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { EngagementOverview } from "../src/features/modules/engagement/EngagementOverview";

vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: () => ({ loading: false, data: undefined, reload: vi.fn() }),
}));
afterEach(() => vi.restoreAllMocks());
it("chooses the earliest future meeting instant across different UTC offsets", () => {
  vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-19T00:00:00Z"));
  const meeting = {
    id: "51000000-0000-4000-8000-000000000001",
    subject: "Later instant",
    startsAt: "2026-10-20T09:00:00-07:00",
    endsAt: "2026-10-20T10:00:00-07:00",
    status: "scheduled",
    location: null,
    description: null,
    client: {
      id: "30000000-0000-4000-8000-000000000001",
      name: "Synthetic client",
    },
  };
  const html = renderToStaticMarkup(
    createElement(EngagementOverview, {
      clientId: "",
      onView: vi.fn(),
      onClientOutreach: vi.fn(),
      meetings: {
        loading: false,
        reload: vi.fn(),
        data: [
          meeting,
          {
            ...meeting,
            id: "51000000-0000-4000-8000-000000000002",
            subject: "Earlier instant",
            startsAt: "2026-10-20T15:00:00Z",
            endsAt: "2026-10-20T16:00:00Z",
          },
        ],
      },
    }),
  );
  expect(html).toContain("Earlier instant");
  expect(html).not.toContain("Later instant");
});
