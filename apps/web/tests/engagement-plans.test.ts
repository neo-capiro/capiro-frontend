import { describe, expect, it } from "vitest";
import {
  engagementPlanCreateBody,
  engagementPlanCreationSchema,
  engagementPlanHistorySchema,
  engagementPlanListSchema,
  engagementPlanOperations,
  engagementPlanPatchBody,
  engagementPlanReviewBody,
  engagementPlanSchema,
  engagementPlanWavePatchBody,
  engagementPlanWindowSchema,
} from "../src/shared/capiro/operations/engagement-plans";
import {
  manualPlan,
  clientId,
  planId,
  otherId,
  waveId,
  planList,
  rawSnapshot,
  now,
} from "../test/browser/engagement-plans-fixtures";
import {
  acceptPlanCommand,
  matchesPlanReadOwner,
} from "../src/features/modules/engagement/plan/usePlanCommands";

const requestId = "73000000-0000-4000-8000-000000000001";
const expected = { clientId, planId, version: 3 };
const creation = {
  receipt: {
    operation: "create_plan",
    planId,
    clientId,
    planVersion: 1,
    requestId,
  },
  reconciled: true,
  aggregate: manualPlan(),
};
const history = () => ({
  planId,
  clientId,
  planVersion: 3,
  items: [
    {
      version: 2,
      operation: "edit_plan",
      actorUserId: manualPlan().createdByUserId,
      createdAt: now,
      snapshot: rawSnapshot(manualPlan(2)),
    },
  ],
  pagination: { hasMore: false, beforeVersion: null },
  completeness: "complete",
});

describe("manual Engagement Plan receiving", () => {
  it("defines only the nine reviewed fixed Core routes with published wire custody", () => {
    expect(Object.keys(engagementPlanOperations)).toHaveLength(9);
    for (const operation of Object.values(engagementPlanOperations)) {
      expect(operation.service).toBe("core");
      expect(operation.path).toMatch(/^\/engagement\/plans(?:\/|$)/);
      expect(operation.source).toContain(
        "64181558d22ccd71bf1b09f5644a2431e591567cd2b77913f9a6471b7004e8e2",
      );
    }
    expect(
      engagementPlanOperations["engagement.plans.wave.reorder"].method,
    ).toBe("POST");
  });
  it("keeps closed aggregate fields and validates the current child parent/version", () => {
    expect(engagementPlanSchema.parse(manualPlan()).version).toBe(3);
    expect(
      engagementPlanSchema.safeParse({ ...manualPlan(), planId }).success,
    ).toBe(false);
    const invalid = manualPlan();
    invalid.waves[0]!.planVersion = 2;
    expect(engagementPlanSchema.safeParse(invalid).success).toBe(false);
    const { reviewedAt: omitted, ...missing } = manualPlan();
    void omitted;
    expect(engagementPlanSchema.safeParse(missing).success).toBe(false);
  });
  it("rejects unknown authority fields, mutable client binding and string body versions", () => {
    expect(
      engagementPlanCreateBody.safeParse({
        clientId,
        requestId,
        title: "Manual draft",
      }).success,
    ).toBe(true);
    expect(
      engagementPlanCreateBody.safeParse({
        clientId,
        requestId,
        title: "Manual draft",
        actorUserId: otherId,
      }).success,
    ).toBe(false);
    expect(
      engagementPlanPatchBody.safeParse({ expectedPlanVersion: 3, clientId })
        .success,
    ).toBe(false);
    expect(
      engagementPlanPatchBody.safeParse({
        expectedPlanVersion: "3",
        title: "Changed",
      }).success,
    ).toBe(false);
  });
  it("keeps lifecycle commands separate from edits for both parent and child", () => {
    expect(
      engagementPlanPatchBody.safeParse({
        expectedPlanVersion: 3,
        action: "archive",
        title: "Mixed",
      }).success,
    ).toBe(false);
    expect(
      engagementPlanWavePatchBody.safeParse({
        expectedPlanVersion: 3,
        action: "restore",
        window: null,
      }).success,
    ).toBe(false);
  });
  it("admits only real half-open date windows with an explicit valid timezone", () => {
    const window = {
      startDate: "2050-02-01",
      endDateExclusive: "2050-02-04",
      timeZone: "America/New_York",
    };
    expect(engagementPlanWindowSchema.safeParse(window).success).toBe(true);
    for (const value of [
      { ...window, startDate: "2050-02-30" },
      { ...window, endDateExclusive: window.startDate },
      { ...window, timeZone: "" },
      { ...window, timeZone: "Not/A_Zone" },
    ])
      expect(engagementPlanWindowSchema.safeParse(value).success).toBe(false);
  });
  it("accepts bounded decimal query strings without silently allowing exponents or arrays", () => {
    const request = engagementPlanOperations["engagement.plans.list"].request;
    expect(request.safeParse({ query: { limit: "25" } }).success).toBe(true);
    for (const limit of ["1e2", "0", "+1", "1.5", [25], "101"])
      expect(request.safeParse({ query: { limit } }).success).toBe(false);
  });
  it("distinguishes returned-client summaries from selected-client zero coverage", () => {
    expect(
      engagementPlanListSchema.safeParse(planList([], false)).success,
    ).toBe(true);
    expect(engagementPlanListSchema.safeParse(planList([], true)).success).toBe(
      true,
    );
    const invalid = planList([manualPlan()]);
    invalid.summaries[0]!.totalPlans = 0;
    expect(engagementPlanListSchema.safeParse(invalid).success).toBe(false);
    expect(
      engagementPlanListSchema.safeParse({
        ...planList([], true),
        completeness: {
          read: "complete",
          page: "complete",
          summaryCoverage: "returned_clients",
        },
      }).success,
    ).toBe(false);
  });
  it("rejects pagination that claims a partial page without its opaque cursor", () => {
    expect(
      engagementPlanListSchema.safeParse({
        ...planList([manualPlan()]),
        pagination: { hasMore: true, nextCursor: null },
      }).success,
    ).toBe(false);
    expect(
      engagementPlanHistorySchema.safeParse({
        ...history(),
        pagination: { hasMore: true, beforeVersion: 1 },
        completeness: "partial",
      }).success,
    ).toBe(false);
  });
  it("receives raw history without adding current review or derived child fields", () => {
    expect(engagementPlanHistorySchema.safeParse(history()).success).toBe(true);
    const derived = history();
    Object.assign(derived.items[0]!.snapshot.waves[0]!, {
      planVersion: 2,
      unavailableOfficeTargetIds: [],
    });
    expect(engagementPlanHistorySchema.safeParse(derived).success).toBe(false);
    const foreign = history();
    foreign.items[0]!.snapshot.clientId = otherId;
    expect(engagementPlanHistorySchema.safeParse(foreign).success).toBe(false);
  });
  it("requires exact V+1 for a real edit and exact V for a verified no-op", () => {
    expect(() =>
      acceptPlanCommand(
        { ...manualPlan(), title: "Changed" },
        { ...expected, version: 4, title: "Changed" },
      ),
    ).toThrow();
    expect(() =>
      acceptPlanCommand(
        { ...manualPlan(5), title: "Changed" },
        { ...expected, version: 4, title: "Changed" },
      ),
    ).toThrow();
    expect(
      acceptPlanCommand(manualPlan(), {
        ...expected,
        title: "Synthetic manual plan",
      }).version,
    ).toBe(3);
    expect(() => acceptPlanCommand(manualPlan(4), expected)).toThrow();
  });
  it("binds original creation receipt1 to its request while accepting newer current aggregate3", () => {
    expect(engagementPlanCreationSchema.safeParse(creation).success).toBe(true);
    expect(
      acceptPlanCommand(creation, {
        clientId,
        creation: { operation: "create_plan", requestId, planVersion: 1 },
      }).version,
    ).toBe(3);
    expect(() =>
      acceptPlanCommand(
        { ...creation, reconciled: false },
        {
          clientId,
          creation: { operation: "create_plan", requestId, planVersion: 1 },
        },
      ),
    ).toThrow();
    for (const changes of [
      { requestId: otherId },
      { clientId: otherId },
      { planId: otherId },
      { planVersion: 3 },
    ])
      expect(() =>
        acceptPlanCommand(
          { ...creation, receipt: { ...creation.receipt, ...changes } },
          {
            clientId,
            creation: { operation: "create_plan", requestId, planVersion: 1 },
          },
        ),
      ).toThrow();
  });
  it("requires the exact target child and achieved child archive state", () => {
    expect(() =>
      acceptPlanCommand(manualPlan(4), {
        ...expected,
        version: 4,
        waveId: otherId,
      }),
    ).toThrow();
    expect(() =>
      acceptPlanCommand(manualPlan(4), {
        ...expected,
        version: 4,
        waveId,
        waveArchived: true,
      }),
    ).toThrow();
  });
  it("requires the complete requested active-wave order", () => {
    expect(() =>
      acceptPlanCommand(manualPlan(4), {
        ...expected,
        version: 4,
        waveOrder: [otherId, waveId],
      }),
    ).toThrow();
  });
  it("refuses advanced-version wave acknowledgements that omit any requested normalized field", () => {
    const patch = {
      title: "Requested title",
      formatLabel: "Requested format",
      window: {
        startDate: "2050-11-01",
        endDateExclusive: "2050-11-04",
        timeZone: "America/New_York",
      },
      officeTargetIds: [otherId],
    };
    for (const [key, value] of Object.entries(patch)) {
      expect(() =>
        acceptPlanCommand(manualPlan(4), {
          ...expected,
          version: 4,
          waveId,
          wavePatch: { [key]: value },
        }),
      ).toThrow();
    }
  });
  it("only resolves an ordinary uncertain command from its own current plan and client", () => {
    expect(matchesPlanReadOwner(manualPlan(4), { clientId, planId })).toBe(
      true,
    );
    expect(
      matchesPlanReadOwner(
        { ...manualPlan(4), id: otherId },
        { clientId, planId },
      ),
    ).toBe(false);
    expect(
      matchesPlanReadOwner(
        { ...manualPlan(4), clientId: otherId },
        { clientId, planId },
      ),
    ).toBe(false);
    expect(matchesPlanReadOwner(manualPlan(4), null)).toBe(false);
  });
  it("enforces the ordered server-checked review projection without turning invalid basis into current", () => {
    const plan = manualPlan(4);
    const reviewed = {
      ...plan,
      reviewedPlanVersion: 4,
      reviewedAt: now,
      reviewedByUserId: plan.createdByUserId,
      reviewDueAt: "2050-12-01T12:00:00.000Z",
      review: { ...plan.review, status: "current", reason: "review_current" },
    };
    expect(engagementPlanSchema.safeParse(reviewed).success).toBe(true);
    expect(
      engagementPlanSchema.safeParse({ ...plan, review: reviewed.review })
        .success,
    ).toBe(false);
    expect(
      engagementPlanSchema.safeParse({
        ...reviewed,
        review: { ...reviewed.review, reason: "plan_changed" },
      }).success,
    ).toBe(false);
    expect(
      engagementPlanSchema.safeParse({
        ...reviewed,
        reviewedPlanVersion: 5,
        review: {
          ...plan.review,
          status: "unknown",
          reason: "invalid_review_basis",
        },
      }).success,
    ).toBe(true);
    expect(
      engagementPlanSchema.safeParse({
        ...reviewed,
        reviewedPlanVersion: 3,
        review: { ...plan.review, status: "stale", reason: "plan_changed" },
      }).success,
    ).toBe(true);
    expect(
      engagementPlanSchema.safeParse({
        ...reviewed,
        review: {
          ...plan.review,
          status: "stale",
          reason: "review_expired",
          checkedAt: "2050-12-01T12:00:00.000Z",
        },
      }).success,
    ).toBe(true);
    expect(
      engagementPlanSchema.safeParse({
        ...reviewed,
        review: { ...reviewed.review, checkedAt: "2050-12-01T12:00:00.000Z" },
      }).success,
    ).toBe(false);
  });
  it("requires the reviewedV+1 basis and exact normalized explicit deadline", () => {
    const plan = manualPlan(4);
    Object.assign(plan, {
      reviewedPlanVersion: 4,
      reviewedAt: now,
      reviewedByUserId: plan.createdByUserId,
      reviewDueAt: "2050-12-01T12:00:00.000Z",
    });
    plan.review = {
      ...plan.review,
      status: "current",
      reason: "review_current",
    };
    const review = {
      ...expected,
      version: 4,
      reviewedVersion: 4,
      reviewDueAt: plan.reviewDueAt!,
    };
    expect(acceptPlanCommand(plan, review).reviewedPlanVersion).toBe(4);
    expect(() =>
      acceptPlanCommand({ ...plan, reviewedPlanVersion: 3 }, review),
    ).toThrow();
    expect(() =>
      acceptPlanCommand(
        { ...plan, reviewDueAt: "2050-12-02T12:00:00.000Z" },
        review,
      ),
    ).toThrow();
  });
  it("requires review seconds and explicit timezone, without inventing a deadline", () => {
    for (const reviewDueAt of [
      "2050-12-01",
      "2050-12-01T12:00",
      "2050-12-01T12:00:00",
      "2050-02-30T12:00:00Z",
      "2050-12-01T12:00:00.1234Z",
    ])
      expect(
        engagementPlanReviewBody.safeParse({
          expectedPlanVersion: 3,
          reviewDueAt,
        }).success,
      ).toBe(false);
  });
});
