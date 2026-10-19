import { expect, type Page } from "@playwright/test";
import type { Activity } from "../../src/features/portfolio/client-profile/contracts";
import { clientId, installFixtures, json } from "./fixtures";

export const acceptanceNote: Activity = {
  id: "90000000-0000-4000-8000-000000000031",
  kind: "note",
  title: "Activity requiring deliberate review",
  body: "Synthetic activity uncertainty control",
  occurredAt: "2026-10-11T12:00:00Z",
  origin: "recorded",
  sourceType: null,
  sourceId: null,
  dueAt: null,
  settledAt: null,
  pinned: false,
};
const filterControl: Activity = {
  ...acceptanceNote,
  id: "90000000-0000-4000-8000-000000000032",
  kind: "call",
  title: "Visible filter control",
};
export const activityPath = `/api/backend/core/clients/${clientId}/activity`;
export const activityWrite = (pinned: boolean) => ({
  method: "PATCH",
  path: `${activityPath}/${acceptanceNote.id}`,
  body: { pinned },
});
export const activityTimeline = (page: Page) =>
  page.getByRole("region", { name: "Activity timeline", exact: true });
export const activityAction = (page: Page) =>
  activityTimeline(page).getByRole("button", {
    name: `Activity actions: ${acceptanceNote.title}`,
    exact: true,
  });
export const activityReview = (page: Page) =>
  activityTimeline(page).getByRole("button", {
    name: "Review latest activity",
    exact: true,
  });

export async function installAcceptanceActivity(
  page: Page,
  first: {
    status: number;
    applied?: boolean;
    receiptOverride?: Record<string, unknown>;
    held?: Promise<void>;
  },
) {
  const unexpected = await installFixtures(page);
  const writes: ReturnType<typeof activityWrite>[] = [];
  const reads: string[] = [];
  let current = { ...acceptanceNote };
  await page.route(
    "**/api/backend/core/clients/*/activity**",
    async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (request.method() === "GET" && url.pathname === activityPath) {
        reads.push(`${url.pathname}${url.search}`);
        return json(route, [current, filterControl]);
      }
      if (
        request.method() !== "PATCH" ||
        url.pathname !== `${activityPath}/${acceptanceNote.id}`
      ) {
        unexpected.push(`${request.method()} ${url.pathname}`);
        return json(
          route,
          { message: "Unexpected synthetic activity request" },
          400,
        );
      }
      writes.push({
        method: request.method(),
        path: url.pathname,
        body: request.postDataJSON(),
      });
      if (writes.length === 1) {
        if (first.applied) current = { ...current, pinned: true };
        await first.held;
        return json(
          route,
          first.status === 200
            ? {
                ...current,
                pinned: true,
                clientId,
                tenantId: "tenant-test",
                ...first.receiptOverride,
              }
            : { message: "Synthetic first activity response" },
          first.status,
        );
      }
      current = { ...current, pinned: request.postDataJSON().pinned };
      return json(route, { ...current, clientId, tenantId: "tenant-test" });
    },
  );
  return { unexpected, writes, reads };
}

export async function chooseActivityPin(page: Page, pinned = true) {
  await activityAction(page).click();
  await page
    .getByRole("menuitem", {
      name: pinned ? "Pin note" : "Unpin note",
      exact: true,
    })
    .click();
}

export async function filterActivityOutAndBack(page: Page) {
  const timeline = activityTimeline(page);
  const search = timeline.getByRole("searchbox", {
    name: "Search activity",
    exact: true,
  });
  await search.fill(filterControl.title);
  await expect(activityAction(page)).toHaveCount(0);
  await expect(
    timeline.getByText(filterControl.title, { exact: true }),
  ).toBeVisible();
  await search.fill("");
  await expect(activityAction(page)).toBeVisible();
}
