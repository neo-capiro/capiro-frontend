import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { FactSource } from "../src/features/portfolio/profile-build/ProfileFacts";
import { profileFactSchema } from "../src/features/portfolio/profile-build/fact-contracts";
import { ProspectProfileSections } from "../src/features/portfolio/prospects/ProspectProfileSections";
import { profileSnapshotSchema } from "../src/features/portfolio/profile-build/fact-contracts";
const state = vi.hoisted(() => ({ data: undefined as unknown }));
vi.mock("../src/features/portfolio/profile-build/public", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  useProfileSnapshot: () => ({
    data: state.data,
    isPending: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
it("renders six prospect sections, approved sources and truthful missing states without internal metadata", () => {
  const id = "10000000-0000-4000-8000-000000000001";
  state.data = profileSnapshotSchema.parse({
    subject: { kind: "prospect", id },
    version: "a".repeat(64),
    fields: {},
    facts: [
      {
        id,
        fieldKey: "name",
        value: "Sourced prospect",
        origin: "person",
        sourceType: "person_entry",
        sourceUrl: null,
        attachmentId: null,
        evidence: [{ label: "Entered in profile" }],
        observedAt: null,
        confidence: null,
        status: "approved",
        approvedBy: id,
        approvedAt: "2026-01-01",
        version: 1,
        isCurrent: true,
      },
    ],
    conflicts: [],
    completeness: {
      completed: 1,
      total: 6,
      missing: [],
      sections: [
        {
          key: "company",
          status: "partial",
          researched: false,
          reviewCount: 0,
        },
        { key: "news", status: "missing", researched: true, reviewCount: 1 },
      ],
    },
    sections: {
      company: [
        {
          name: "Sourced prospect",
          internalDiagnostics: "Never render this field",
        },
      ],
      registration: [{ uei: "ABC123DEF456" }],
      leadership: [{ name: "Company leader", title: "Chief executive" }],
      lobbying: [],
      federal_footprint: [],
      news: [],
      notes: [],
      documents: [],
    },
  });
  const html = renderToStaticMarkup(
    createElement(ProspectProfileSections, { id }),
  );
  for (const label of [
    "Company basics",
    "Federal registration",
    "Leadership",
    "Lobbying history",
    "Federal footprint",
    "News",
    "Sourced prospect",
    "ABC123DEF456",
    "Company leader",
    "Entered in profile",
    "not been researched",
    "No approved information",
    "Review 1 proposed detail",
  ])
    expect(html).toContain(label);
  expect(html).not.toContain("Never render this field");
  expect(html).not.toContain("Capabilities");
});

it("labels federal references separately from approved facts", () => {
  const previous = profileSnapshotSchema.parse(state.data);
  state.data = profileSnapshotSchema.parse({
    ...previous,
    referenceCoverage: {
      federal_footprint: {
        status: "reference_only",
        statusText: "Reference coverage only",
      },
    },
    sections: {
      ...previous.sections,
      federal_footprint: [
        {
          title: "Federal award reference",
          url: "https://usaspending.gov/award/123",
          summary: "A public award record",
          referenceOnly: true,
        },
      ],
    },
  });
  const html = renderToStaticMarkup(
    createElement(ProspectProfileSections, { id: previous.subject.id }),
  );
  expect(html).toContain("Federal award reference");
  expect(html).toContain("Reference coverage only");
  expect(html).toContain("not approved profile facts");
});
it("preserves an approved fact while hiding evidence marked no longer shared", () => {
  const profile = profileSnapshotSchema.parse(state.data);
  const fact = profileFactSchema.parse({
    ...profile.facts[0],
    sourceUnavailable: true,
    sourceUrl: "https://private.example/source",
    evidence: [{ label: "Private document", excerpt: "Restricted excerpt" }],
  });
  const html = renderToStaticMarkup(createElement(FactSource, { fact }));
  expect(html).toContain("Original source is no longer shared");
  expect(html).not.toContain("Private document");
  expect(html).not.toContain("Restricted excerpt");
  expect(html).not.toContain("private.example");
});
