import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RunLedger } from "../src/features/portfolio/client-profile/enrichment/RunLedger";
import { FindingReview } from "../src/features/portfolio/client-profile/enrichment/FindingReview";
import {
  runSchema,
  type Finding,
} from "../src/features/portfolio/client-profile/enrichment/contracts";

const clientId = "10000000-0000-4000-8000-000000000001";
const runId = "10000000-0000-4000-8000-000000000002";
const diagnostic =
  "Invalid prisma.$executeRawUnsafe() invocation: PostgreSQL 22001 character varying(160); synthetic-private-detail";
const savedRun = () =>
  runSchema.parse({
    id: runId,
    clientId,
    status: "partial",
    stage: "review_ready",
    requestedSources: ["lda"],
    sourceStates: {
      lda: {
        status: "completed",
        count: 4,
        totalTasks: 2,
        completedTasks: 2,
        failedTasks: 0,
      },
      advocacy_history: {
        status: "failed",
        count: 0,
        error: diagnostic,
        diagnostics: { message: diagnostic },
      },
    },
    summary: {},
    error: diagnostic,
    startedAt: "2026-09-03T17:31:41Z",
    completedAt: "2026-09-03T17:32:41Z",
    tasks: [
      {
        id: "10000000-0000-4000-8000-000000000003",
        runId,
        taskType: "advocacy_history",
        taskKey: "advocacy_history",
        status: "failed",
        attempt: 6,
        maxAttempts: 6,
        errorCode: "task_error",
        errorMessage: diagnostic,
        outputSummary: null,
        nextAttemptAt: null,
      },
    ],
    findings: [],
  });
const ledger = (run = savedRun()) =>
  renderToStaticMarkup(
    createElement(RunLedger, { run, busy: false, onCancel: vi.fn() }),
  );
const finding = (): Finding => ({
  id: "10000000-0000-4000-8000-000000000004",
  clientId,
  runId,
  kind: "profile_completion",
  targetKey: "profile-completion",
  source: "completion_audit",
  factKind: "fact",
  currentValue: null,
  proposedValue: {
    score: 54,
    completed: ["Company website", "Capabilities"],
    missing: ["Advocacy history", "Facilities"],
    calculatedAt: "2026-09-03T17:32:41Z",
    warnings: [{ task: "advocacy_history", message: diagnostic }],
    internalDetails: diagnostic,
  },
  evidence: [],
  confidence: 1,
  status: "informational",
  appliedAt: null,
  createdAt: "2026-09-03T17:32:41Z",
});
const review = (value = finding()) =>
  renderToStaticMarkup(
    createElement(FindingReview, {
      clientId,
      finding: value,
      checked: false,
      onSelect: vi.fn(),
      onAction: vi.fn(),
      editable: true,
      busy: false,
    }),
  );
function expectNoDiagnostics(html: string) {
  for (const text of [
    "prisma",
    "22001",
    "varchar",
    "varying",
    "synthetic-private-detail",
  ])
    expect(html).not.toContain(text);
}

describe("saved enrichment outcome presentation", () => {
  it("hides saved run/task/source diagnostics while retaining failed-task context", () => {
    const run = savedRun();
    const before = structuredClone(run);
    const html = ledger(run);
    expectNoDiagnostics(html);
    expect(html).toContain("Advocacy History");
    expect(html).toContain("Attempt 6 of 6");
    expect(html).toContain("failed");
    expect(html).toContain("partial");
    expect(html).toContain('dateTime="2026-09-03T17:31:41Z"');
    expect(html).toMatch(
      /<button[^>]*disabled=""[^>]*>Retry task<\/button>/,
    );
    expect(html).toContain("Contact support");
    expect(run).toEqual(before);
  });

  it("keeps explicit source outcome counts and distinguishes missing from zero", () => {
    const html = ledger();
    expect(html).toContain("Saved findings: 4");
    expect(html).toContain("Tasks: 2");
    expect(html).toContain("Completed tasks: 2");
    expect(html).toContain("Failed tasks: 0");
    expect(html).toContain("Saved findings: 0");
    const run = savedRun();
    run.sourceStates = { lda: { status: "completed" } };
    expect(ledger(run)).not.toContain("Saved findings: 0");
  });

  it("shows completion domains and affected source without diagnostic warning text", () => {
    const value = finding();
    const before = structuredClone(value);
    const html = review(value);
    expectNoDiagnostics(html);
    for (const text of [
      "54%",
      "Company website",
      "Capabilities",
      "Advocacy history",
      "Facilities",
      "Advocacy History",
    ])
      expect(html).toContain(text);
    expect(html).toContain("could not complete");
    expect(html).toContain("2026-09-03T17:32:41.000Z");
    expect(value).toEqual(before);
  });

  it("fails visibly closed for unknown diagnostic shapes without inventing success", () => {
    const run = savedRun();
    run.sourceStates = {
      lda: { status: diagnostic, count: "0", futureDiagnostic: diagnostic },
    };
    const html = ledger(run);
    expectNoDiagnostics(html);
    expect(html).toContain("Status unavailable");
    expect(html).not.toContain("Saved findings: 0");
    const value = finding();
    value.proposedValue = {
      warnings: [{ task: diagnostic, message: diagnostic }],
    };
    const completion = review(value);
    expectNoDiagnostics(completion);
    expect(completion).toContain("Unrecognized source");
    expect(completion).not.toContain("100%");
  });

  it("preserves ordinary authored finding content, including literal database terminology", () => {
    const value = finding();
    value.kind = "profile_field";
    value.source = "public_web";
    value.targetKey = "description";
    value.proposedValue = {
      description: "Our PostgreSQL service uses varchar(160).",
      message: "Authored source text",
    };
    const html = review(value);
    expect(html).toContain("Our PostgreSQL service uses varchar(160).");
    expect(html).toContain("Authored source text");
  });
});
