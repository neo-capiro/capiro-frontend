import { expect, type Page, type Request } from "@playwright/test";
import {
  client,
  clientId,
  installFixtures,
} from "../../tests/browser/fixtures";
import { onlyLocalRequests, operationFixtures } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";

export { clientId };
export const recordId = "40000000-0000-4000-8000-000000000004";
export const otherRecordId = "50000000-0000-4000-8000-000000000005";
export const otherClientId = "10000000-0000-4000-8000-000000000002";
export const record = {
  id: recordId,
  title: "Synthetic current Classic outreach",
  type: "follow_up",
  status: "draft",
  subject: "Supplied current record subject",
  body: "Supplied current record body",
  client: { id: clientId, name: client.name },
};
export const recordRoute = "**/api/capiro/engagement.outreach.record?*";
export const destination = (scope = clientId, id = recordId) =>
  `/modules/engagement?clientId=${scope}&draft=${id}`;
export async function setupOutreach(page: Page) {
  await onlyLocalRequests(page);
  const unexpected = await installFixtures(page);
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "clients.list": [
      client,
      { ...client, id: otherClientId, name: "Other client" },
    ],
    "engagement.sessions": [],
    "engagement.outreach": [],
    "engagement.outreach.record": record,
  });
  await page.route(`**/api/backend/core/clients/${otherClientId}`, (route) =>
    route.fulfill({
      json: { ...client, id: otherClientId, name: "Other client" },
    }),
  );
  await page.route(
    `**/api/backend/core/clients/${clientId}/activity*`,
    (route) =>
      route.fulfill({
        json: [
          {
            id: `outreach:${recordId}`,
            kind: "outreach",
            title: record.title,
            body: "follow_up · draft",
            occurredAt: "2026-10-13T10:00:00Z",
            sourceType: "outreach",
            sourceId: recordId,
            origin: "derived",
            pinned: false,
            dueAt: null,
            settledAt: null,
          },
        ],
      }),
  );
  const writes: string[] = [],
    errors: string[] = [],
    reads: unknown[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/") && request.method() !== "GET")
      writes.push(`${request.method()} ${url.pathname}`);
    if (url.pathname === "/api/capiro/engagement.outreach.record")
      reads.push(JSON.parse(url.searchParams.get("input") ?? "{}"));
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return { writes, errors, unexpected, reads };
}
export function assertNoEffects(
  observed: Awaited<ReturnType<typeof setupOutreach>>,
) {
  expect(observed.writes).toEqual([]);
  expect(observed.errors).toEqual([]);
  expect(observed.unexpected).toEqual([]);
}
/** Observe the captured request settling, including real cancellation. */
export function requestCompletion(page: Page, request: Request) {
  return new Promise<string>((resolve) => {
    const finish = (current: Request) => {
      if (current !== request) return;
      page.off("requestfinished", finish);
      page.off("requestfailed", finish);
      resolve(current.failure()?.errorText ?? "finished");
    };
    page.on("requestfinished", finish);
    page.on("requestfailed", finish);
  });
}
