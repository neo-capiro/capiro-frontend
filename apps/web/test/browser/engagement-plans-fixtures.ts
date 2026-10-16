import type { Page } from "@playwright/test";
import type { EngagementPlan } from "../../src/shared/capiro/operations/engagement-plans";
import { clientId, setup } from "./next-modules-fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";

export { clientId };
export const planId = "70000000-0000-4000-8000-000000000001";
export const waveId = "71000000-0000-4000-8000-000000000001";
export const actorId = "72000000-0000-4000-8000-000000000001";
export const otherId = "70000000-0000-4000-8000-000000000002";
export const now = "2026-10-08T16:00:00.000Z";
export function manualPlan(version = 3): EngagementPlan {
  return {
    id: planId,
    clientId,
    title: "Synthetic manual plan",
    lifecycle: "draft",
    version,
    officeReferences: [],
    objectiveBinding: null,
    reviewedPlanVersion: null,
    reviewedAt: null,
    reviewDueAt: null,
    reviewedByUserId: null,
    createdByUserId: actorId,
    createdAt: now,
    updatedAt: now,
    review: {
      status: "unknown",
      reason: "not_reviewed",
      checkedAt: now,
      meaning: "explicitly_reviewed_version",
    },
    waves: [
      {
        id: waveId,
        clientId,
        planId,
        title: "Synthetic discovery wave",
        position: 0,
        formatLabel: "Call or video",
        window: null,
        officeTargetIds: [],
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
        planVersion: version,
        unavailableOfficeTargetIds: [],
      },
    ],
  };
}
export function planVersion(
  plan: EngagementPlan,
  version: number,
  changes: Partial<EngagementPlan> = {},
): EngagementPlan {
  return {
    ...plan,
    ...changes,
    version,
    waves: (changes.waves ?? plan.waves).map((wave) => ({
      ...wave,
      planVersion: version,
    })),
  };
}
export function planList(items: EngagementPlan[], selected = true) {
  return {
    items,
    summaries:
      selected || items.length
        ? [
            {
              clientId,
              totalPlans: items.length,
              activePlans: items.filter((plan) => plan.lifecycle === "active")
                .length,
              draftPlans: items.filter((plan) => plan.lifecycle === "draft")
                .length,
              archivedPlans: items.filter(
                (plan) => plan.lifecycle === "archived",
              ).length,
              planIdsOnPage: items.map((plan) => plan.id),
              complete: true,
              checkedAt: now,
            },
          ]
        : [],
    pagination: { hasMore: false, nextCursor: null },
    completeness: {
      read: "complete",
      page: "complete",
      summaryCoverage: selected ? "selected_client" : "returned_clients",
    },
  };
}
export function rawSnapshot(plan: EngagementPlan) {
  const { review: omitted, waves, ...raw } = plan;
  void omitted;
  return {
    ...raw,
    waves: waves.map(
      ({ planVersion: parentVersion, unavailableOfficeTargetIds, ...wave }) => {
        void parentVersion;
        void unavailableOfficeTargetIds;
        return wave;
      },
    ),
  };
}
export async function planFixture(
  page: Page,
  initial: EngagementPlan[] = [manualPlan()],
) {
  const state = { plans: initial };
  const writes: { key: string; input: unknown }[] = [];
  await setup(page, {
    ...moduleRouteFixtures,
    "engagement.plans.list": (input) =>
      planList(
        state.plans,
        Boolean((input as { query?: { clientId?: string } }).query?.clientId),
      ),
    "engagement.plans.detail": () => state.plans[0],
  });
  return { state, writes };
}
export async function openPlan(page: Page) {
  await page.goto(`/modules/engagement?view=plan&clientId=${clientId}`);
  await page
    .getByRole("button", { name: "Synthetic manual plan", exact: true })
    .click();
}
