import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { createApiClient } from "../src/shared/portfolio/api/http";
import { runSchema } from "../src/features/portfolio/profile-build/contracts";
import { profileFactSchema } from "../src/features/portfolio/profile-build/fact-contracts";
import {
  isAutomaticFinding,
  isAutomaticFact,
} from "../src/features/portfolio/profile-build/automatic-acceptance";
import { FindingReview } from "../src/features/portfolio/profile-build/FindingReview";
import { FactSource } from "../src/features/portfolio/profile-build/ProfileFacts";
import { executeReviewAction } from "../src/features/portfolio/profile-build/actions";
const subject = {
  kind: "client" as const,
  id: "10000000-0000-4000-8000-000000000001",
};
const runId = "10000000-0000-4000-8000-000000000002";
const findingId = "10000000-0000-4000-8000-000000000003";
const evidence = [
  {
    label: "Synthetic exact SAM record",
    url: "https://sam.gov/entity/example",
    metadata: { acceptanceMode: "exact_identifier", identifierType: "uei" },
  },
];
const automatic = () =>
  runSchema.parse({
    subject,
    id: runId,
    clientId: subject.id,
    clientRevision: "a".repeat(64),
    status: "completed",
    requestedSources: ["sam_gov"],
    sourceStates: {},
    summary: {},
    error: null,
    startedAt: "2026-01-01",
    completedAt: "2026-01-01",
    findings: [
      {
        id: findingId,
        runId,
        clientId: subject.id,
        revision: "b".repeat(64),
        kind: "profile_field",
        targetKey: "uei",
        source: "sam_gov",
        factKind: "fact",
        currentValue: null,
        proposedValue: "ABC123DEF456",
        evidence,
        confidence: 1,
        status: "accepted",
        appliedAt: "2026-01-01",
        createdAt: "2026-01-01",
      },
    ],
  });
it("labels exact identifier acceptance and offers Not right without allowing group re-approval", () => {
  const finding = automatic().findings[0]!;
  const html = renderToStaticMarkup(
    createElement(FindingReview, {
      subject,
      finding,
      checked: false,
      onSelect: vi.fn(),
      onAction: vi.fn(),
      editable: true,
      busy: false,
    }),
  );
  expect(html).toContain("Automatically accepted · exact identifier");
  expect(html).toContain("Not right");
  expect(html).toMatch(/type="checkbox"[^>]*disabled=""/);
  expect(isAutomaticFinding({ ...finding, evidence: [], confidence: 1 })).toBe(
    false,
  );
  expect(isAutomaticFinding({ ...finding, status: "pending" })).toBe(false);
});
it("preserves fact lineage and never relabels a person-approved value as automatic", () => {
  const fact = profileFactSchema.parse({
    id: findingId,
    fieldKey: "uei",
    runId,
    findingId,
    value: "ABC123DEF456",
    origin: "official",
    sourceType: "sam_gov",
    sourceUrl: null,
    attachmentId: null,
    evidence,
    observedAt: null,
    confidence: 1,
    status: "approved",
    approvedBy: null,
    approvedAt: "2026-01-01",
    version: 1,
    isCurrent: true,
  });
  expect(fact.runId).toBe(runId);
  expect(renderToStaticMarkup(createElement(FactSource, { fact }))).toContain(
    "Automatically accepted · exact identifier",
  );
  expect(
    isAutomaticFact({ ...fact, origin: "person", autoAccepted: true }),
  ).toBe(false);
});
it("rejects only a current automatic acceptance through the existing guarded action endpoint", async () => {
  const run = automatic();
  let rejected = false;
  const fetcher = vi.fn<typeof fetch>(async (url, init) => {
    const value = {
      ...run,
      findings: run.findings.map((finding) => ({
        ...finding,
        status: rejected ? "rejected" : finding.status,
      })),
    };
    if (init?.method === "POST") {
      rejected = true;
      return Response.json({ ok: true });
    }
    if (String(url).endsWith("/review"))
      return Response.json({
        subject,
        clientId: subject.id,
        runId,
        clientRevision: run.clientRevision,
        findings: value.findings,
      });
    return Response.json(value);
  });
  await executeReviewAction(
    createApiClient(fetcher),
    subject,
    run,
    { kind: "reject", findingId, reason: "Wrong entity", automatic: true },
    () => {},
    new AbortController().signal,
    vi.fn(),
  );
  const writes = fetcher.mock.calls.filter(
    ([, init]) => init?.method === "POST",
  );
  expect(writes).toHaveLength(1);
  expect(writes[0]?.[0]).toContain(`/findings/${findingId}/reject`);
  expect(JSON.parse(String(writes[0]?.[1]?.body))).toEqual({
    reason: "Wrong entity",
  });
});

it("a caller display hint cannot reject a manually approved finding", async () => {
  const run = automatic();
  run.findings[0]!.evidence = [];
  const fetcher = vi.fn<typeof fetch>(async (url) =>
    Response.json(
      String(url).endsWith("/review")
        ? {
            subject,
            clientId: subject.id,
            runId,
            clientRevision: run.clientRevision,
            findings: run.findings,
          }
        : run,
    ),
  );
  await expect(
    executeReviewAction(
      createApiClient(fetcher),
      subject,
      run,
      { kind: "reject", findingId, reason: "Not automatic", automatic: true },
      () => {},
      new AbortController().signal,
      vi.fn(),
    ),
  ).rejects.toThrow("Only pending or automatically accepted");
  expect(fetcher.mock.calls.some(([, init]) => init?.method === "POST")).toBe(
    false,
  );
});
