import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { PersonnelProfile } from "./PersonnelProfile";

const selectedId = "00000000-0000-4000-8000-000000000001";
const response = {
  id: selectedId,
  fullName: "Casey Bennett",
  service: "Army",
  organization: "Acquisition office",
  title: "Program Analyst",
  role: null,
  programOfRecord: null,
  pePrimary: "0603001A",
  peSecondary: [],
  emailDomain: "example.gov",
  email: null,
  phone: null,
  parentOffice: null,
  department: null,
  publicProfileUrl: "https://example.gov/person",
  confidence: 0.92,
  status: "active",
  firstSeenAt: "2026-01-01T00:00:00.000Z",
  lastSeenAt: "2026-10-17T00:00:00.000Z",
  sources: [
    {
      id: "00000000-0000-4000-8000-000000000002",
      source: "public_directory",
      sourceUrl: "https://example.gov/roster",
      observedAt: "2026-10-17T00:00:00.000Z",
      confidence: 0.92,
    },
  ],
};

const query = vi.hoisted(() => ({
  data: undefined as typeof response | undefined,
  error: undefined as Error | undefined,
  loading: false,
  requestedId: "",
}));
vi.mock("../../../shared/capiro/queries", () => ({
  useCapiroQuery: (_key: string, input: { params: { id: string } }) => {
    query.requestedId = input.params.id;
    return { ...query, reload: vi.fn() };
  },
}));

beforeEach(() => {
  query.data = response;
  query.error = undefined;
  query.loading = false;
  query.requestedId = "";
});

it("renders the selected Core profile and source observations without invented context", () => {
  const html = renderToStaticMarkup(
    createElement(PersonnelProfile, { id: selectedId, onBack: vi.fn() }),
  );
  expect(query.requestedId).toBe(selectedId);
  expect(html).toContain("Casey Bennett");
  expect(html).toContain("Program element references");
  expect(html).toContain("0603001A");
  expect(html).toContain("Source confidence score");
  expect(html).toContain("0.92");
  expect(html).toContain("Observed Oct 17, 2026");
  expect(html).toContain('href="https://example.gov/roster"');
  expect(html).toContain("Not provided");
  expect(html).not.toContain("PE alignment");
  expect(html).not.toContain("employment history");
});

it("does not show a profile when Core returns a different record", () => {
  query.data = { ...response, id: "00000000-0000-4000-8000-000000000003" };
  const html = renderToStaticMarkup(
    createElement(PersonnelProfile, { id: selectedId, onBack: vi.fn() }),
  );
  expect(html).toContain("did not match the returned profile");
  expect(html).toContain("Try again");
  expect(html).toContain("Directory");
  expect(html).not.toContain("Casey Bennett");
  expect(html).not.toContain("0603001A");
});

it("does not turn unsafe Core URL fields into links", () => {
  const source = response.sources[0];
  if (!source) throw new Error("Personnel profile fixture needs a source");
  query.data = {
    ...response,
    publicProfileUrl: "javascript:alert(1)",
    sources: [{ ...source, sourceUrl: "https://user:pass@example.gov/" }],
  };
  const html = renderToStaticMarkup(
    createElement(PersonnelProfile, { id: selectedId, onBack: vi.fn() }),
  );
  expect(html).not.toContain('href="javascript:');
  expect(html).not.toContain('href="https://user:pass');
  expect(html).not.toContain("View source");
  expect(html).not.toContain("mailto:");
});
