import { expect, it, vi } from "vitest";
import { profileSnapshotSchema } from "../src/features/portfolio/profile-build/fact-contracts";
import {
  personProfileInput,
  profileToIntake,
} from "../src/features/portfolio/client-intake/person-profile";
import {
  clientToIntake,
  validateIntake,
} from "../src/features/portfolio/client-intake/form";
import {
  profileBuildPath,
  researchJournalKey,
} from "../src/features/portfolio/profile-build/subject";
import {
  readProfile,
  savePersonProfile,
} from "../src/features/portfolio/profile-build/profile-api";
import { createApiClient } from "../src/shared/portfolio/api/http";
const id = "10000000-0000-4000-8000-000000000001";
const snapshot = {
  subject: { kind: "client" as const, id },
  version: "a".repeat(64),
  fields: { name: "Existing company" },
  facts: [
    {
      id,
      fieldKey: "name",
      value: "Existing company",
      origin: "legacy",
      sourceType: null,
      sourceUrl: null,
      attachmentId: null,
      evidence: [],
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
  completeness: {
    completed: 1,
    total: 6,
    missing: ["website"],
    sections: [
      { key: "company", status: "partial", researched: false, reviewCount: 0 },
    ],
  },
  sections: {
    locations: [],
    leadership: [],
    capabilities: [],
    advocacy: null,
    notes: [],
    documents: [],
  },
};
it("reads a migrated legacy fact with no source attribution without inventing provenance", () => {
  expect(profileSnapshotSchema.parse(snapshot).facts[0]).toMatchObject({
    origin: "legacy",
    sourceType: null,
    evidence: [],
  });
});
it("name-only manual entry records person fields and preserves untouched sections on edits", () => {
  const initial = { ...clientToIntake(), name: "Name only" };
  expect(validateIntake(initial)).toEqual({});
  expect(
    personProfileInput({ ...initial, description: "Updated" }, initial),
  ).toEqual({ fields: { description: "Updated" } });
});
it("separates client/prospect request and recovery identities while retaining old client journals", () => {
  expect(profileBuildPath({ kind: "prospect", id })).toBe(
    `business-development/prospects/${id}/profile-build`,
  );
  const actor = { userId: "u", tenantId: "t" };
  expect(
    JSON.parse(researchJournalKey({ kind: "client", id }, actor, "start")),
  ).toEqual(["client-enrichment-start-v1", "t", "u", id]);
  expect(
    researchJournalKey({ kind: "prospect", id }, actor, "start"),
  ).not.toEqual(researchJournalKey({ kind: "client", id }, actor, "start"));
});
it("rejects cross-subject profile receipts and preserves the exact versioned person command", async () => {
  const fetcher = vi.fn<typeof fetch>(async () => Response.json(snapshot));
  const api = createApiClient(fetcher);
  await expect(readProfile(api, { kind: "prospect", id })).rejects.toThrow(
    "unexpected response",
  );
  const command = {
    requestId: id,
    expectedVersion: snapshot.version,
    fields: { name: "Reviewed name" },
  };
  await savePersonProfile(api, snapshot.subject, command);
  await savePersonProfile(api, snapshot.subject, command);
  expect(fetcher.mock.calls[1]?.[1]?.body).toBe(
    fetcher.mock.calls[2]?.[1]?.body,
  );
});

it("preserves canonical site roles and unknown operation/country without dropping sibling sites", () => {
  const profile = profileSnapshotSchema.parse({
    ...snapshot,
    sections: {
      ...snapshot.sections,
      locations: [
        {
          id,
          name: "Research lab",
          siteRole: "research",
          siteStatus: "unknown",
          country: null,
        },
        {
          id: "10000000-0000-4000-8000-000000000002",
          name: "Engineering office",
          siteRole: "engineering",
          siteStatus: "proposed",
          country: "GB",
        },
      ],
    },
  });
  const form = profileToIntake(clientToIntake(), profile);
  expect(form.locations).toHaveLength(2);
  expect(form.locations[0]).toMatchObject({
    role: "research",
    status: "unknown",
    country: "",
  });
  expect(form.locations[1]).toMatchObject({
    role: "engineering",
    status: "proposed",
    country: "GB",
  });
  expect(personProfileInput(form).locations?.[0]).toMatchObject({
    country: undefined,
  });
});

it("prefills approved advocacy fact rows over stale flat intake values", () => {
  const base = {
    ...clientToIntake(),
    sectors: ["Legacy sector"],
    internalNotes: "Legacy note",
  };
  const profile = profileSnapshotSchema.parse({
    ...snapshot,
    sections: {
      ...snapshot.sections,
      advocacy: [
        {
          sectors: ["Approved sector"],
          internalNotes: "Approved note",
          fundingPriorities: ["Approved priority"],
        },
      ],
    },
  });
  expect(profileToIntake(base, profile)).toMatchObject({
    sectors: ["Approved sector"],
    internalNotes: "Approved note",
    fundingPriorities: ["Approved priority"],
  });
});
