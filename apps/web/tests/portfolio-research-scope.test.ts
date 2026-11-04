import { expect, it, vi } from "vitest";
import {
  researchInputSchema,
  researchCommandSchema,
  validateResearchSelection,
  matchesResearchScope,
} from "../src/features/portfolio/profile-build/research-contracts";
import { initialResearchInput } from "../src/features/portfolio/profile-build/ResearchRequest";
import { runSchema } from "../src/features/portfolio/profile-build/contracts";
import { sendResearch } from "../src/features/portfolio/profile-build/research-api";
import { createApiClient } from "../src/shared/portfolio/api/http";

const clientId = "10000000-0000-4000-8000-000000000001";
const capabilityId = "10000000-0000-4000-8000-000000000002";
const unitId = "10000000-0000-4000-8000-000000000003";
const requestId = "10000000-0000-4000-8000-000000000004";
const input = {
  sources: ["public_web" as const],
  attachmentIds: [],
  ldaClientIds: [],
  website: "https://example.test",
};
const setup = {
  subject: { kind: "client" as const, id: clientId },
  clientId,
  clientName: "Synthetic company",
  website: null,
  selectedIdentities: [],
  suggestedIdentities: [],
  taskPreview: [],
};
const run = (scope = { purpose: "alignment" as const, capabilityId }) =>
  runSchema.parse({
    id: requestId,
    subject: setup.subject,
    clientId,
    status: "running",
    requestedSources: ["public_web", "lda"],
    sourceStates: {},
    summary: {},
    error: null,
    startedAt: "2026-01-01T00:00:00Z",
    completedAt: null,
    findings: [],
    setup: { ...scope, businessUnit: { id: unitId } },
    attachmentIds: [],
    selectedLdaIds: [12],
  });

it("requires a capability and public/document sources for alignment research", () => {
  expect(
    researchInputSchema.safeParse({ ...input, purpose: "alignment" }).success,
  ).toBe(false);
  expect(
    researchInputSchema.safeParse({
      ...input,
      purpose: "alignment",
      capabilityId,
      sources: ["lda"],
    }).success,
  ).toBe(false);
  expect(
    researchInputSchema.parse({ ...input, purpose: "alignment", capabilityId }),
  ).toMatchObject({ purpose: "alignment", capabilityId });
});
it("keeps document-only producer requests and exact scope in durable commands", () => {
  const command = researchCommandSchema.parse({
    requestId,
    input: {
      ...input,
      sources: [],
      attachmentIds: [unitId],
      purpose: "capabilities",
      capabilityId,
    },
  });
  expect(command.input).toMatchObject({
    purpose: "capabilities",
    capabilityId,
    sources: [],
    attachmentIds: [unitId],
  });
});
it("never starts client capability research against a prospect", () => {
  expect(() =>
    validateResearchSelection(
      { ...input, purpose: "business_units" },
      { ...setup, subject: { kind: "prospect", id: clientId } },
      [],
    ),
  ).toThrow("client profile");
});
it("a newly selected research purpose does not inherit another capability or business unit", () => {
  const next = initialResearchInput(setup, run(), {
    purpose: "business_units",
  });
  expect(next).toMatchObject({
    purpose: "business_units",
    sources: ["public_web"],
    ldaClientIds: [],
  });
  expect(next).not.toHaveProperty("capabilityId");
  expect(next).not.toHaveProperty("businessUnitId");
});
it("rerunning a saved scoped study preserves its capability and approved unit", () => {
  const next = initialResearchInput(setup, run());
  expect(next).toMatchObject({
    purpose: "alignment",
    capabilityId,
    businessUnitId: unitId,
    sources: ["public_web"],
  });
  expect(
    matchesResearchScope(next, { ...run(), requestedSources: ["public_web"] }),
  ).toBe(true);
  expect(matchesResearchScope(next, run())).toBe(false);
  expect(matchesResearchScope({ ...next, capabilityId: unitId }, run())).toBe(
    false,
  );
});
it("does not acknowledge a same-ID result returned for another capability", async () => {
  const received = vi.fn();
  const command = researchCommandSchema.parse({
    requestId,
    input: { ...input, purpose: "alignment", capabilityId },
  });
  const api = createApiClient(async () =>
    Response.json(run({ purpose: "alignment", capabilityId: unitId })),
  );
  await expect(
    sendResearch(
      api,
      setup.subject,
      command,
      () => {},
      new AbortController().signal,
      received,
    ),
  ).rejects.toThrow("unexpected response");
  expect(received).not.toHaveBeenCalled();
});
