import { describe, expect, it } from "vitest";
import {
  keywordBody,
  keywordScan,
} from "./operations/legiwatch-keyword-schemas";
import {
  recordRule,
  scheduleTime,
  staffRecipient,
} from "./operations/legiwatch-monitor-schemas";
import { workflowAction } from "./operations/legiwatch-workflows";
import { capiroOperations as operations } from "./registry";

const tenantId = "20000000-0000-4000-8000-000000000001",
  key = "30000000-0000-4000-8000-000000000001";
const scope = { folderIds: ["folder"], jurisdiction: "FL", sessionKey: "2026" };
describe("reviewed source and authority boundaries", () => {
  it("keeps retained search pagination independent of matched rows and preserves incomplete coverage", () => {
    const data = operations["legiwatch.research.search"].response.parse({
      items: [],
      scanned: 100,
      cursor: "next-retained-page",
      versionPolicy: "current_extractions",
      searchedKinds: "all",
      message: "Retained source subset",
      coverage: {
        complete: false,
        reason: "SOURCE_INVENTORY_NOT_QUALIFIED",
        manifestId: null,
        billIds: [],
        retainedVersionsOnly: true,
      },
    });
    expect(data.items).toEqual([]);
    expect(data.cursor).toBe("next-retained-page");
    expect(data.coverage.complete).toBe(false);
  });
  it("requires exact distinct retained revisions for comparison", () => {
    const request = {
      body: {
        leftId: "a",
        rightId: "b",
        leftRevision: "r1",
        rightRevision: "r2",
        allowCrossBill: false,
      },
    };
    expect(
      operations["legiwatch.research.compare"].request.safeParse(request)
        .success,
    ).toBe(true);
    expect(
      operations["legiwatch.research.compare"].request.safeParse({
        body: { ...request.body, rightRevision: undefined },
      }).success,
    ).toBe(false);
    expect(
      operations["legiwatch.research.compare"].request.safeParse({
        body: { ...request.body, rightId: "a" },
      }).success,
    ).toBe(false);
  });
  it("keeps unknown analytics coverage null and rejects inverted windows", () => {
    const data = operations["legiwatch.analytics.coverage"].response.parse({
      freshnessAt: "2026-10-12",
      sources: [
        {
          family: "Florida law",
          coveragePct: null,
          total: 7,
          lastSyncedAt: null,
        },
      ],
    });
    expect(data.sources[0]?.coveragePct).toBeNull();
    expect(
      operations["legiwatch.analytics.exposure"].request.safeParse({
        query: { from: "2026-10-12T00:00:00Z", to: "2026-10-01T00:00:00Z" },
      }).success,
    ).toBe(false);
  });
  it("requires preview and current version before activating internal workflows", () => {
    const activation = operations["legiwatch.workflow.activation"].request;
    expect(
      activation.safeParse({
        params: { id: "workflow" },
        body: { expectedVersion: 3, enabled: true },
      }).success,
    ).toBe(false);
    expect(
      activation.safeParse({
        params: { id: "workflow" },
        body: {
          expectedVersion: 3,
          enabled: true,
          reviewed: true,
          baseline: "from_now",
        },
      }).success,
    ).toBe(true);
    const enqueue = operations["legiwatch.workflow.enqueue"].request;
    const input = { ...scope, template: "added_bill_review", billId: "bill" };
    expect(
      enqueue.safeParse({
        body: { input, inputHash: "reviewed-hash", requestKey: key },
      }).success,
    ).toBe(true);
    for (const extra of [
      { tenantId },
      { ownerId: "other" },
      { contextHash: "forged" },
    ])
      expect(
        enqueue.safeParse({
          body: {
            input: { ...input, ...extra },
            inputHash: "reviewed-hash",
            requestKey: key,
          },
        }).success,
      ).toBe(false);
  });
  it("projects held workflow history without exposing worker leases, prefill or old-app review URLs", () => {
    const data = workflowAction.parse({
      id: "action",
      workflow_id: "workflow",
      template: "added_bill_review",
      input_hash: "hash",
      input: { ...scope, template: "added_bill_review", billId: "bill" },
      state: "held",
      reason: "SOURCE_OR_SCOPE_REVIEW_REQUIRED",
      attempts: 0,
      lease_token: "secret",
      steps: {
        prefill: { tenantId },
        reviewUrl: "https://old.example.test/private",
        draftId: "draft",
      },
    });
    expect(data.state).toBe("held");
    expect(data.steps).toEqual({ draftId: "draft" });
    expect(data).not.toHaveProperty("lease_token");
  });
  it("projects captured recipient metadata while keeping write recipients strict", () => {
    const recipient = {
      userId: "current-user",
      email: true,
      inApp: false,
      sourceUserId: "legacy-user",
    };
    const row = recordRule.parse({
      id: "rule",
      name: "Bill activity",
      ownerClerkId: "current-user",
      family: "bill_record",
      folderIds: ["folder"],
      recipients: [recipient],
      cadence: "realtime",
      timezone: null,
      localMinutes: null,
      state: "needs_review",
      issues: [],
      version: 1,
    });
    expect(row.recipients).toEqual([
      { userId: "current-user", email: true, inApp: false },
    ]);
    expect(staffRecipient.safeParse(recipient).success).toBe(false);
  });
  it("uses source-supported timezone names", () => {
    expect(scheduleTime.timezone.safeParse("America/New_York").success).toBe(
      true,
    );
    expect(scheduleTime.timezone.safeParse("UTC").success).toBe(true);
    expect(scheduleTime.timezone.safeParse("EST").success).toBe(false);
  });
  it("does not accept captured keyword ownership as editable configuration", () => {
    const config = {
      scope: { jurisdiction: "FL", sessionKey: "2026", fields: ["title"] },
      folderIds: ["folder"],
      definitions: [{ id: "query", raw: '"water quality"' }],
      aggregation: "any-v1",
      semanticsReviewed: true,
      mode: "suggest",
      cadence: "realtime",
      timezone: null,
      localMinutes: null,
    };
    expect(keywordBody.safeParse({ name: "Water", config }).success).toBe(true);
    expect(
      keywordBody.safeParse({
        name: "Water",
        config: { ...config, source: { ownerMapping: "reviewed" } },
      }).success,
    ).toBe(false);
    const scan = keywordScan.parse({
      id: "scan",
      rule_id: "rule",
      rule_version: 2,
      state: "partial",
      cursor: "cursor",
      counts: { evaluated: 100, matched: 0, incomplete: 100, suggestions: 0 },
      source_boundary: "boundary",
      reason: "PARTIAL_TEXT",
      attempts: 1,
      input: { mode: "preview", tenantId },
      lease_token: "secret",
    });
    expect(scan.counts.incomplete).toBe(100);
    expect(scan.input).toEqual({ mode: "preview" });
    expect(scan).not.toHaveProperty("lease_token");
  });
});
