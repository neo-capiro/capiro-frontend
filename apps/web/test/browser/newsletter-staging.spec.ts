import { test, expect, type Page } from "@playwright/test";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import {
  draft,
  revision,
  session,
  sessionId,
  version,
  receipt,
} from "../../tests/newsletter-staging-fixtures";
const route = `/modules/workspace?draftId=${draft.id}`;
async function setup(page: Page) {
  await onlyLocalRequests(page);
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "workspace.draft": draft,
    "workspace.clients": { items: [] },
    "workspace.draft.versions": [version],
    "workspace.newsletter.revision": revision,
    "engagement.sessions": [
      {
        ...session.session,
        topic: null,
        goal: null,
        targetCount: 0,
        recordStatus: null,
        sentAt: null,
      },
    ],
    "engagement.session": session,
  });
  const writes: { key: string; body: unknown }[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.url().includes("/api/capiro/") && request.method() !== "GET")
      writes.push({
        key: new URL(request.url()).pathname.split("/").pop()!,
        body: request.postDataJSON(),
      });
  });
  return { writes, errors };
}
async function open(page: Page) {
  await page.goto(route);
  await page
    .getByRole("button", { name: "Stage in Outreach", exact: true })
    .click();
  await expect(
    page.getByText("Choose a saved revision to stage.", { exact: false }),
  ).toBeVisible();
}
async function select(page: Page) {
  await page
    .getByRole("combobox", { name: "Saved Newsletter revision" })
    .click();
  await page.getByRole("option", { name: /Saved policy revision/ }).click();
  await page
    .getByRole("combobox", { name: "Existing Outreach session" })
    .click();
  await page
    .getByRole("option", { name: /Synthetic template campaign/ })
    .click();
  await expect(
    page.getByText(revision.contentSkeleton.body, { exact: true }),
  ).toBeVisible();
}
async function review(page: Page) {
  await page
    .getByRole("checkbox", { name: /I reviewed this saved text/ })
    .check();
}
test("explicit saved revision review stages only its exact references and opens the selected session", async ({
  page,
}, info) => {
  const { writes, errors } = await setup(page);
  await page.route("**/api/capiro/workspace.newsletter.stage", (r) =>
    r.fulfill({ json: receipt(r.request().postDataJSON().body) }),
  );
  await open(page);
  await expect(
    page.getByRole("button", { name: "Stage saved revision", exact: true }),
  ).toBeDisabled();
  await select(page);
  await expect(
    page.getByRole("button", { name: "Stage saved revision", exact: true }),
  ).toBeDisabled();
  await review(page);
  await page.screenshot({
    path: info.outputPath("newsletter-staging-desktop.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Stage saved revision", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Saved revision staged" }),
  ).toBeVisible();
  expect(writes).toEqual([
    {
      key: "workspace.newsletter.stage",
      body: {
        params: { sessionId },
        body: {
          requestId: expect.any(String),
          draftId: draft.id,
          versionId: revision.versionId,
          snapshotHash: revision.snapshotHash,
          expectedStateVersion: 3,
        },
      },
    },
  ]);
  await expect(
    page.getByRole("link", { name: "Open selected Outreach session" }),
  ).toHaveAttribute(
    "href",
    `/modules/engagement?view=outreach&session=${sessionId}`,
  );
  await page
    .getByRole("button", { name: "Acknowledge staging receipt" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Saved revision staged" }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("lost response then reload recovers original key/version without restaging later session edits", async ({
  page,
}) => {
  const { writes, errors } = await setup(page);
  let attempts = 0;
  await page.route("**/api/capiro/workspace.newsletter.stage", (r) =>
    ++attempts === 1
      ? r.abort("connectionreset")
      : r.fulfill({ json: receipt(r.request().postDataJSON().body, true) }),
  );
  await open(page);
  await select(page);
  await review(page);
  await page
    .getByRole("button", { name: "Stage saved revision", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Recover original staging" }),
  ).toBeEnabled();
  await page.route("**/api/capiro/engagement.session?*", (r) =>
    r.fulfill({
      json: {
        ...session,
        currentStateVersion: 9,
        session: { ...session.session, currentStateVersion: 9 },
      },
    }),
  );
  await open(page);
  await expect(
    page.getByText(/Original staging request retained/),
  ).toBeVisible();
  expect(writes).toHaveLength(1);
  await expect(
    page.getByRole("combobox", { name: "Saved Newsletter revision" }),
  ).toHaveCount(0);
  await review(page);
  await page.getByRole("button", { name: "Recover original staging" }).click();
  await expect(page.getByText(/recovered original receipt/)).toBeVisible();
  expect(writes).toHaveLength(2);
  expect(writes[0]).toEqual(writes[1]);
  expect(errors).toEqual([]);
});
test("incompatible destination and unavailable source make zero staging calls", async ({
  page,
}) => {
  const { writes } = await setup(page);
  await page.route("**/api/capiro/engagement.session?*", (r) =>
    r.fulfill({
      json: {
        ...session,
        spec: {
          ...session.spec,
          sponsor: { kind: "undecided", label: null, clientRefs: [] },
        },
      },
    }),
  );
  await open(page);
  await page
    .getByRole("combobox", { name: "Saved Newsletter revision" })
    .click();
  await page.getByRole("option", { name: /Saved policy revision/ }).click();
  await page
    .getByRole("combobox", { name: "Existing Outreach session" })
    .click();
  await page
    .getByRole("option", { name: /Synthetic template campaign/ })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "exact saved client sponsor",
  );
  await expect(
    page.getByRole("button", { name: "Stage saved revision", exact: true }),
  ).toBeDisabled();
  await page.route("**/api/capiro/workspace.newsletter.revision?*", (r) =>
    r.fulfill({
      status: 404,
      json: { message: "Saved revision unavailable for staging" },
    }),
  );
  await page
    .getByRole("button", { name: "Refresh saved revision and session" })
    .click();
  await expect(
    page.getByText(/Saved revision staging is unavailable until/),
  ).toBeVisible();
  expect(writes).toEqual([]);
});
test("storage refusal blocks selection and replacement writes", async ({
  page,
}) => {
  const { writes } = await setup(page);
  await page.addInitScript(() =>
    Object.defineProperty(window, "indexedDB", { value: undefined }),
  );
  await page.goto(route);
  await page
    .getByRole("button", { name: "Stage in Outreach", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "recovery is unavailable",
  );
  await expect(
    page.getByRole("button", { name: "Stage saved revision", exact: true }),
  ).toHaveCount(0);
  expect(writes).toEqual([]);
});
test("replacement Core actor cannot recover the former actor's pending staging", async ({
  page,
}) => {
  const { writes } = await setup(page);
  await page.route("**/api/capiro/workspace.newsletter.stage", (r) =>
    r.abort("connectionreset"),
  );
  await open(page);
  await select(page);
  await review(page);
  await page
    .getByRole("button", { name: "Stage saved revision", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Recover original staging" }),
  ).toBeEnabled();
  await page.route("**/api/capiro/me.read?*", (r) =>
    r.fulfill({
      json: {
        ...testIdentity,
        user: {
          ...testIdentity.user,
          id: sessionId,
          clerkUserId: "replacement",
        },
      },
    }),
  );
  await open(page);
  await expect(
    page.getByRole("combobox", { name: "Saved Newsletter revision" }),
  ).toBeVisible();
  await expect(page.getByText(/Original staging request retained/)).toHaveCount(
    0,
  );
  expect(writes).toHaveLength(1);
});

test("conflict and malformed receipt retain the same original staging request", async ({
  page,
}) => {
  const { writes } = await setup(page);
  let attempts = 0;
  await page.route("**/api/capiro/workspace.newsletter.stage", (r) => {
    if (++attempts === 1)
      return r.fulfill({
        status: 409,
        json: { message: "The session state changed" },
      });
    const result = receipt(r.request().postDataJSON().body);
    result.staged.versionId = sessionId;
    return r.fulfill({ json: result });
  });
  await open(page);
  await select(page);
  await review(page);
  await page
    .getByRole("button", { name: "Stage saved revision", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("session state changed");
  await page.getByRole("button", { name: "Recover original staging" }).click();
  await expect(page.getByRole("alert")).toContainText("receipt does not match");
  expect(writes).toHaveLength(2);
  expect(writes[0]).toEqual(writes[1]);
  await expect(
    page.getByRole("link", { name: "Open selected Outreach session" }),
  ).toHaveCount(0);
});
test("fresh source refusal before dispatch clears review and sends no staging request", async ({
  page,
}) => {
  const { writes } = await setup(page);
  await open(page);
  await select(page);
  await review(page);
  await page.route("**/api/capiro/workspace.newsletter.revision?*", (r) =>
    r.fulfill({
      status: 403,
      json: { message: "Current source access unavailable" },
    }),
  );
  await page
    .getByRole("button", { name: "Stage saved revision", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Current source access unavailable",
  );
  await expect(
    page.getByText(revision.contentSkeleton.body, { exact: true }),
  ).toHaveCount(0);
  expect(writes).toEqual([]);
});
test("a refreshed destination version requires fresh explicit review", async ({
  page,
}) => {
  const { writes } = await setup(page);
  await open(page);
  await select(page);
  await review(page);
  await page.route("**/api/capiro/engagement.session?*", (r) =>
    r.fulfill({
      json: {
        ...session,
        currentStateVersion: 4,
        session: { ...session.session, currentStateVersion: 4 },
      },
    }),
  );
  await page
    .getByRole("button", { name: "Refresh saved revision and session" })
    .click();
  await expect(
    page.getByRole("checkbox", { name: /I reviewed this saved text/ }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("button", { name: "Stage saved revision", exact: true }),
  ).toBeDisabled();
  expect(writes).toEqual([]);
});
test("mobile saved text review fits the viewport and supports keyboard acknowledgement", async ({
  page,
}, info) => {
  const { writes, errors } = await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await select(page);
  const checkbox = page.getByRole("checkbox", {
    name: /I reviewed this saved text/,
  });
  await checkbox.focus();
  await page.keyboard.press("Space");
  await expect(checkbox).toBeChecked();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Stage saved revision", exact: true }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("newsletter-staging-mobile.png"),
    fullPage: true,
  });
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
});
