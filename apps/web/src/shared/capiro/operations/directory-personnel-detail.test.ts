import { expect, it } from "vitest";
import { personnelDetail } from "./directory-schemas";

const coreDetail = {
  id: "00000000-0000-4000-8000-000000000001",
  fullName: "Example Person",
  nameKey: "example-person",
  service: "Army",
  organization: "Example Office",
  title: "Director",
  role: "Program Manager",
  programOfRecord: "Example Program",
  pePrimary: "0603270A",
  peSecondary: ["0603270B"],
  emailDomain: "example.gov",
  email: "person@example.gov",
  phone: "202-555-0100",
  parentOffice: "Example Directorate",
  department: "Department of War",
  publicProfileUrl: "https://example.gov/person",
  confidence: 0.9,
  status: "active",
  firstSeenAt: "2026-01-01T00:00:00.000Z",
  lastSeenAt: "2026-10-17T00:00:00.000Z",
  metadata: { uploadedDirectoryContact: { privateNote: "do not render" } },
  sources: [
    {
      id: "00000000-0000-4000-8000-000000000002",
      source: "public_directory",
      sourceUrl: "https://example.gov/roster",
      snippet: "raw source text",
      observedAt: "2026-10-17T00:00:00.000Z",
      confidence: 0.9,
      metadata: { arbitrary: "do not render" },
    },
  ],
};

it("receives only vetted Personnel detail fields and source attribution", () => {
  const detail = personnelDetail.parse(coreDetail);
  expect(detail).toEqual({
    id: coreDetail.id,
    fullName: coreDetail.fullName,
    service: coreDetail.service,
    organization: coreDetail.organization,
    title: coreDetail.title,
    role: coreDetail.role,
    programOfRecord: coreDetail.programOfRecord,
    pePrimary: coreDetail.pePrimary,
    peSecondary: coreDetail.peSecondary,
    emailDomain: coreDetail.emailDomain,
    email: coreDetail.email,
    phone: coreDetail.phone,
    parentOffice: coreDetail.parentOffice,
    department: coreDetail.department,
    publicProfileUrl: coreDetail.publicProfileUrl,
    confidence: coreDetail.confidence,
    status: coreDetail.status,
    firstSeenAt: coreDetail.firstSeenAt,
    lastSeenAt: coreDetail.lastSeenAt,
    sources: [
      {
        id: coreDetail.sources[0].id,
        source: coreDetail.sources[0].source,
        sourceUrl: coreDetail.sources[0].sourceUrl,
        observedAt: coreDetail.sources[0].observedAt,
        confidence: coreDetail.sources[0].confidence,
      },
    ],
  });
});

it("preserves Core's null contact redactions for non-admin callers", () => {
  const detail = personnelDetail.parse({
    ...coreDetail,
    email: null,
    phone: null,
    parentOffice: null,
    department: null,
    metadata: { headshotUrl: "https://example.gov/portrait" },
  });
  expect(detail.email).toBeNull();
  expect(detail.phone).toBeNull();
  expect(detail.parentOffice).toBeNull();
  expect(detail.department).toBeNull();
  expect(detail.emailDomain).toBe("example.gov");
  expect(detail).not.toHaveProperty("metadata");
  expect(detail.sources[0]).not.toHaveProperty("snippet");
  expect(detail.sources[0]).not.toHaveProperty("metadata");
});
