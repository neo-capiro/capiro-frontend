import { operationFixtures } from "./fixtures";
import { test, expect } from "@playwright/test";
import {
  installFixtures,
  json,
  clientId,
  objective,
} from "../../tests/browser/fixtures";
import { session, sessionId } from "../../tests/newsletter-staging-fixtures";
const path = `/portfolio/${clientId}/objectives?objective=${objective.id}`;
const destination = {
  kind: "outreach_session",
  resourceId: sessionId,
  clientId,
  objectiveId: objective.id,
  objectiveVersion: objective.version,
  objectiveRevisionId: "50000000-0000-4000-8000-000000000001",
  destinationStateVersion: 3,
};
async function select(page: import("@playwright/test").Page) {
  await page
    .getByRole("button", { name: "Choose existing Outreach session" })
    .click();
  await page
    .getByLabel("Existing Outreach session", { exact: true })
    .selectOption(sessionId);
}
test("Objective navigation resolves the exact saved version through Core before opening its local destination", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  const requests: URL[] = [];
  let destinationReads = 0;
  await operationFixtures(page, {
    "engagement.objectiveDestination": () => {
      destinationReads++;
      return {
        ...session,
        spec: {
          ...session.spec,
          sponsor: { kind: "client", label: null, clientRefs: [{ clientId }] },
        },
        destination,
      };
    },
  });
  await page.route("**/core/engagement/outreach-v3/sessions?*", (r) =>
    json(r, [
      {
        ...session.session,
        topic: null,
        goal: null,
        targetCount: 0,
        recordStatus: null,
        sentAt: null,
      },
    ]),
  );
  await page.route(
    "**/core/engagement/outreach-v3/sessions/*/objective-destination?*",
    (r) => {
      requests.push(new URL(r.request().url()));
      return json(r, {
        ...session,
        spec: {
          ...session.spec,
          sponsor: { kind: "client", label: null, clientRefs: [{ clientId }] },
        },
        destination,
      });
    },
  );
  await page.goto(path);
  await select(page);
  await page
    .getByRole("button", { name: "Open Objective-bound Outreach" })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/modules/engagement\\?.*objectiveId=${objective.id}`),
  );
  await expect(page.getByText(/immutable revision/)).toContainText(
    destination.objectiveRevisionId,
  );
  expect(destinationReads).toBe(1);
  expect(requests).toHaveLength(1);
  expect(Object.fromEntries(requests[0]!.searchParams)).toEqual({
    clientId,
    objectiveId: objective.id,
    objectiveVersion: String(objective.version),
  });
  expect(unexpected).toEqual([]);
});
test("unsaved edits and stale Objective resolver never navigate using old campaign text", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  await page.route("**/core/engagement/outreach-v3/sessions?*", (r) =>
    json(r, [
      {
        ...session.session,
        topic: null,
        goal: null,
        targetCount: 0,
        recordStatus: null,
        sentAt: null,
      },
    ]),
  );
  await page.route(
    "**/core/engagement/outreach-v3/sessions/*/objective-destination?*",
    (r) => json(r, { message: "OBJECTIVE_VERSION_CONFLICT" }, 409),
  );
  await page.goto(path);
  await page.getByLabel(/^Outcome/).fill("Unsaved replacement");
  await expect(
    page.getByRole("button", { name: "Choose existing Outreach session" }),
  ).toBeDisabled();
  await page.getByLabel(/^Outcome/).fill(objective.outcome);
  await select(page);
  await page
    .getByRole("button", { name: "Open Objective-bound Outreach" })
    .click();
  await expect(page.getByText("OBJECTIVE_VERSION_CONFLICT")).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(
    `/portfolio/${clientId}/objectives`,
  );
  expect(unexpected).toEqual([]);
});
