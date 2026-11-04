import { expect, it, vi } from "vitest";
import { createApiClient } from "../src/shared/portfolio/api/http";
import {
  requestRegistrationSuggestions,
  registrationSuggestionsSchema,
} from "../src/features/portfolio/profile-build/registration-suggestions";
import { personProfileInput } from "../src/features/portfolio/client-intake/person-profile";
import { clientToIntake } from "../src/features/portfolio/client-intake/form";
const requestId = "10000000-0000-4000-8000-000000000001";
const evidence = [
  {
    label: "Person-provided company context",
    excerpt: "Synthetic engineering services company",
    source: "person_context",
    observedAt: "2026-01-01T00:00:00Z",
  },
];
const suggestion = {
  code: "541330",
  label: "Engineering Services",
  reason: "Matches the described engineering services.",
  confidence: 0.85,
  evidence,
};
const response = {
  requestId,
  field: "naicsCodes",
  status: "complete",
  message: "Review a sourced suggestion.",
  suggestions: [suggestion],
  sourceGaps: [],
};
it("requests bounded draft suggestions without creating a profile or applying a value", async () => {
  const fetcher = vi.fn<typeof fetch>(async () => Response.json(response));
  const result = await requestRegistrationSuggestions(
    createApiClient(fetcher),
    {
      requestId,
      field: "naicsCodes",
      identity: {
        name: "Synthetic Company",
        description: "Synthetic engineering services company",
      },
      currentValue: [],
    },
  );
  expect(result.suggestions).toEqual([suggestion]);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0]?.[0]).toBe(
    "/api/backend/core/clients/profile-build/registration-suggestions",
  );
  expect(
    JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)),
  ).not.toHaveProperty("subject");
});
it.each([
  { ...response, requestId: "10000000-0000-4000-8000-000000000002" },
  {
    ...response,
    field: "pscCodes",
    suggestions: [{ ...suggestion, code: "R425" }],
  },
  { ...response, suggestions: [{ ...suggestion, evidence: [] }] },
])("rejects mismatched or unsupported suggestion receipts", async (invalid) => {
  await expect(
    requestRegistrationSuggestions(
      createApiClient(async () => Response.json(invalid)),
      {
        requestId,
        field: "naicsCodes",
        identity: { name: "Synthetic Company" },
      },
    ),
  ).rejects.toThrow("unexpected response");
});
it("keeps source-unavailable and empty results honest", () => {
  expect(
    registrationSuggestionsSchema.parse({
      ...response,
      status: "unavailable",
      suggestions: [],
      sourceGaps: ["No source text was available"],
    }).suggestions,
  ).toEqual([]);
  expect(
    registrationSuggestionsSchema.safeParse({
      ...response,
      status: "unavailable",
    }).success,
  ).toBe(false);
});
it("carries only explicitly selected code evidence into the approved person command", () => {
  const initial = { ...clientToIntake(), name: "Synthetic Company" };
  expect(personProfileInput(initial)).not.toHaveProperty("fieldEvidence");
  const selected = { ...initial, naicsCodes: [suggestion.code] };
  const accepted = { naicsCodes: [{ code: suggestion.code, evidence }] };
  expect(personProfileInput(selected, initial, accepted)).toEqual({
    fields: { naicsCodes: [suggestion.code] },
    fieldEvidence: accepted,
  });
  expect(personProfileInput(initial, undefined, accepted)).not.toHaveProperty(
    "fieldEvidence",
  );
  expect(personProfileInput(selected, selected, accepted)).not.toHaveProperty(
    "fieldEvidence",
  );
});
