import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import { serviceErrorResponse } from "../../src/shared/capiro/gateway-errors";
import { newsletterStagingOperations } from "../../src/shared/capiro/operations/workspace-newsletter-staging";
import {
  stagingScope,
  type StagingIntent,
} from "../../src/features/modules/workspace/newsletter/staging-model";
import {
  draft,
  revision,
  emptyRevision,
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
    // Current editor authority read; this synthetic state is never saved here.
    "workspace.draft.state": {
      schemaVersion: 1,
      tenantId: testIdentity.tenant.id,
      draftId: draft.id,
      clientId: draft.clientId,
      stateHash: "a".repeat(64),
      hashFormat: "workspace-ordinary-draft-state-v1",
      draft: {
        ...draft,
        documents: draft.documents.map((document) => ({
          ...document,
          body: {
            ...document.body,
            newsletter: revision.snapshot.documents[0]!.body.newsletter,
          },
        })),
      },
    },
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
  await expect(page.getByRole("dialog")).toBeVisible();
}
async function select(page: Page) {
  await page.getByRole("combobox", { name: "Saved version" }).click();
  await page.getByRole("option", { name: /Saved policy revision/ }).click();
  await page.getByRole("combobox", { name: "Outreach session" }).click();
  await page
    .getByRole("option", { name: /Synthetic template campaign/ })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByText(revision.contentSkeleton.body, { exact: true }),
  ).toBeVisible();
}
async function review(page: Page) {
  await page
    .getByRole("checkbox", {
      name: /I (reviewed this saved version|want to retry the exact original)/,
    })
    .check();
}
async function refresh(page: Page) {
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "Stage in Outreach", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

// Figma sample copy is a layout fixture only; producer qualification remains in
// the unchanged non-ASCII fixtures and accepted WS13 evidence.
async function designFixture(page: Page) {
  const observed = await setup(page);
  const savedAt = "2026-10-26T09:30:00.000Z";
  const title = "Weekly policy briefing";
  const content = {
    subject: title,
    body: "This week’s briefing brings together the latest policy developments and the next steps for our team.\n\nPlease review the update before sharing it.",
    slots: [],
  };
  await page.route("**/api/capiro/workspace.draft.versions?*", (r) =>
    r.fulfill({ json: [{ ...version, label: title, createdAt: savedAt }] }),
  );
  await page.route("**/api/capiro/workspace.newsletter.revision?*", (r) =>
    r.fulfill({ json: { ...revision, savedAt, contentSkeleton: content } }),
  );
  await page.route("**/api/capiro/engagement.sessions?*", (r) =>
    r.fulfill({
      json: [
        {
          ...session.session,
          title: "Client briefing · Anduril",
          topic: null,
          goal: null,
          targetCount: 0,
          recordStatus: null,
          sentAt: null,
        },
      ],
    }),
  );
  await page.route("**/api/capiro/engagement.session?*", (r) =>
    r.fulfill({
      json: {
        ...session,
        session: { ...session.session, title: "Client briefing · Anduril" },
      },
    }),
  );
  return { ...observed, savedAt, content };
}

async function captureDialog(page: Page, info: TestInfo, name: string) {
  const dialog = page.getByRole("dialog");
  await page.evaluate(() => document.fonts.ready);
  await expect(dialog).toHaveCSS("font-family", "TestGeist, Arial, sans-serif");
  expect(
    await page.evaluate(() => document.fonts.check("13px TestGeist")),
  ).toBe(true);
  const text = await dialog.innerText();
  expect(text).not.toMatch(/[a-f0-9]{8}-[a-f0-9-]{27,}|\b[a-f0-9]{64}\b/i);
  await expect(dialog).toHaveAccessibleName(
    /Stage in Outreach|Review needs refreshing|Retry original staging|Saved version staged/,
  );
  await expect(dialog).not.toHaveAccessibleDescription("");
  await dialog.screenshot({ path: info.outputPath(`${name}.png`) });
}

test("Figma review and refresh states require renewed consent without writing", async ({
  page,
}, info) => {
  const { writes, errors } = await designFixture(page);
  await open(page);
  await page.getByRole("combobox", { name: "Saved version" }).click();
  await page.getByRole("option", { name: /Weekly policy briefing/ }).click();
  await page.getByRole("combobox", { name: "Outreach session" }).click();
  await page.getByRole("option", { name: "Client briefing · Anduril" }).click();
  const primary = page.getByRole("button", {
    name: "Stage saved version",
    exact: true,
  });
  await expect(
    page.getByText("Please review the update before sharing it.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(primary).toBeDisabled();
  const geometry = await page.getByRole("dialog").evaluate((node) => ({
    width: node.getBoundingClientRect().width,
    header: getComputedStyle(node.querySelector("header")!).padding,
    body: getComputedStyle(node.querySelector('[data-slot="modal-body"]')!)
      .padding,
    footer: getComputedStyle(node.querySelector("footer")!).padding,
    title: getComputedStyle(node.querySelector('[data-slot="dialog-title"]')!)
      .fontSize,
  }));
  expect(geometry).toEqual({
    width: 760,
    header: "24px",
    body: "24px",
    footer: "20px",
    title: "24px",
  });
  await captureDialog(page, info, "figma-review");
  await review(page);
  await page.route("**/api/capiro/workspace.newsletter.revision?*", (r) =>
    r.fulfill({
      status: 403,
      json: { message: "Saved version access needs refreshing." },
    }),
  );
  await primary.click();
  await expect(
    page.getByRole("heading", { name: "Review needs refreshing" }),
  ).toBeVisible();
  await captureDialog(page, info, "figma-refresh-required");
  expect(writes).toEqual([]);
  await page.unroute("**/api/capiro/workspace.newsletter.revision?*");
  await page.getByRole("button", { name: "Refresh review" }).click();
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await expect(primary).toBeDisabled();
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
});

test("Figma original and confirmed states retain the original request across dismissal", async ({
  page,
}, info) => {
  const { writes, errors, savedAt } = await designFixture(page);
  const original = {
    sessionId,
    body: {
      requestId: "b0000000-0000-4000-8000-000000000001",
      draftId: draft.id,
      versionId: revision.versionId,
      snapshotHash: revision.snapshotHash,
      projectionVersion: revision.projectionVersion,
      projectionHash: revision.projectionHash,
      expectedStateVersion: 3,
    },
  };
  await page.goto(route);
  await seedHistoricalRequest(page, original);
  await page.route("**/api/capiro/workspace.newsletter.stage", (r) => {
    const result = receipt(r.request().postDataJSON().body, true);
    result.staged.savedAt = savedAt;
    return r.fulfill({ json: result });
  });
  await open(page);
  const retry = page.getByRole("button", {
    name: "Retry original staging",
    exact: true,
  });
  await expect(page.getByRole("checkbox")).toBeEnabled();
  await expect(retry).toBeDisabled();
  await captureDialog(page, info, "figma-original-request");
  await review(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const opener = page.getByRole("button", {
    name: "Stage in Outreach",
    exact: true,
  });
  await expect(opener).toBeFocused();
  await opener.click();
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await expect(retry).toBeDisabled();
  expect(writes).toEqual([]);
  await review(page);
  await retry.click();
  await expect(
    page.getByRole("heading", { name: "Saved version staged" }),
  ).toBeVisible();
  await captureDialog(page, info, "figma-confirmed");
  await page.keyboard.press("Escape");
  await opener.click();
  await expect(
    page.getByRole("heading", { name: "Saved version staged" }),
  ).toBeVisible();
  expect(writes).toEqual([
    {
      key: "workspace.newsletter.stage",
      body: { params: { sessionId }, body: original.body },
    },
  ]);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(opener).toBeFocused();
  await opener.click();
  await expect(
    page.getByRole("heading", { name: "Stage in Outreach", exact: true }),
  ).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(errors).toEqual([]);
});

test("modal dismissal and mobile scrolling preserve unsaved content and trap keyboard focus", async ({
  page,
}, info) => {
  const { writes, errors } = await setup(page);
  await page.goto(route);
  await page
    .getByRole("textbox", { name: "Subject", exact: true })
    .fill("Unsaved editor subject");
  const opener = page.getByRole("button", {
    name: "Stage in Outreach",
    exact: true,
  });
  await opener.click();
  await select(page);
  await review(page);
  const first = page.getByRole("combobox", { name: "Saved version" });
  await first.focus();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Stage saved version", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(first).toBeFocused();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(opener).toBeFocused();
  await expect(
    page.getByRole("textbox", { name: "Subject", exact: true }),
  ).toHaveValue("Unsaved editor subject");
  await opener.click();
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await page
    .locator('[data-slot="dialog-overlay"]')
    .click({ position: { x: 5, y: 5 } });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(opener).toBeFocused();
  await page.setViewportSize({ width: 390, height: 620 });
  await page.route("**/api/capiro/workspace.newsletter.revision?*", (r) =>
    r.fulfill({
      json: {
        ...revision,
        contentSkeleton: {
          ...revision.contentSkeleton,
          body: "Long saved paragraph.\n\n".repeat(40),
        },
      },
    }),
  );
  await opener.click();
  await expect(page.getByText(/Long saved paragraph/)).toBeVisible();
  const body = page.getByRole("dialog").locator('[data-slot="modal-body"]');
  expect(
    await body.evaluate((node) => node.scrollHeight > node.clientHeight),
  ).toBe(true);
  const footer = await page.getByRole("dialog").locator("footer").boundingBox();
  expect(footer!.y + footer!.height).toBeLessThanOrEqual(620);
  await page.getByRole("checkbox").focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("checkbox")).toBeChecked();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await captureDialog(page, info, "figma-mobile-long-content");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("textbox", { name: "Subject", exact: true }),
  ).toHaveValue("Unsaved editor subject");
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
});

test("explicit saved revision review stages only its exact references and opens the selected session", async ({
  page,
}, info) => {
  const { writes, errors } = await setup(page);
  await page.route("**/api/capiro/workspace.newsletter.stage", (r) =>
    r.fulfill({ json: receipt(r.request().postDataJSON().body) }),
  );
  await open(page);
  await expect(
    page.getByRole("button", { name: "Stage saved version", exact: true }),
  ).toBeDisabled();
  await select(page);
  await expect(
    page
      .getByRole("dialog")
      .getByText(revision.contentSkeleton.subject, { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("dialog")
      .getByText(revision.snapshot.docTitle, { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Stage saved version", exact: true }),
  ).toBeDisabled();
  await review(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: info.outputPath("newsletter-staging-desktop.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Stage saved version", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Saved version staged" }),
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
          projectionVersion: revision.projectionVersion,
          projectionHash: revision.projectionHash,
          expectedStateVersion: 3,
        },
      },
    },
  ]);
  await expect(
    page.getByRole("link", { name: "Open Outreach" }),
  ).toHaveAttribute(
    "href",
    `/modules/engagement?view=outreach&session=${sessionId}`,
  );
  await page.getByRole("button", { name: "Done" }).click();
  await expect(
    page.getByRole("heading", { name: "Saved version staged" }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("empty authored subject stays empty and carries the producer projection pins", async ({
  page,
}) => {
  const { writes } = await setup(page);
  await page.route("**/api/capiro/workspace.newsletter.revision?*", (r) =>
    r.fulfill({ json: emptyRevision }),
  );
  await page.route("**/api/capiro/workspace.newsletter.stage", (r) =>
    r.fulfill({ json: receipt(r.request().postDataJSON().body) }),
  );
  await open(page);
  await select(page);
  await expect(
    page.getByText("Empty subject (staged unchanged)", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("dialog")
      .getByText(revision.snapshot.docTitle, { exact: true }),
  ).toHaveCount(0);
  await review(page);
  await page
    .getByRole("button", { name: "Stage saved version", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Saved version staged" }),
  ).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(writes[0]!.body).toEqual({
    params: { sessionId },
    body: {
      requestId: expect.any(String),
      draftId: draft.id,
      versionId: revision.versionId,
      snapshotHash: emptyRevision.snapshotHash,
      projectionVersion: emptyRevision.projectionVersion,
      projectionHash: emptyRevision.projectionHash,
      expectedStateVersion: 3,
    },
  });
});

test("changed projection between review and dispatch fences staging without a POST", async ({
  page,
}) => {
  const { writes } = await setup(page);
  await open(page);
  await select(page);
  await review(page);
  await page.route("**/api/capiro/workspace.newsletter.revision?*", (r) =>
    r.fulfill({ json: { ...revision, projectionHash: "e".repeat(64) } }),
  );
  await page
    .getByRole("button", { name: "Stage saved version", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "saved projection changed",
  );
  await expect(
    page.getByRole("button", { name: "Refresh review" }),
  ).toBeVisible();
  expect(writes).toEqual([]);
});

test("wrong returned projection stays unknown and reload replays the identical pinned request", async ({
  page,
}) => {
  const { writes } = await setup(page);
  await page.route("**/api/capiro/workspace.newsletter.stage", (r) => {
    const result = receipt(r.request().postDataJSON().body);
    result.staged.projectionHash = "e".repeat(64);
    return r.fulfill({ json: result });
  });
  await open(page);
  await select(page);
  await review(page);
  await page
    .getByRole("button", { name: "Stage saved version", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("receipt does not match");
  await expect(
    page.getByRole("heading", { name: "Saved version staged" }),
  ).toHaveCount(0);
  await page.route("**/api/capiro/workspace.newsletter.stage", (r) =>
    r.fulfill({ json: receipt(r.request().postDataJSON().body, true) }),
  );
  await open(page);
  await review(page);
  await page.getByRole("button", { name: "Retry original staging" }).click();
  await expect(
    page.getByRole("heading", { name: "Saved version staged" }),
  ).toBeVisible();
  expect(writes).toHaveLength(2);
  expect(writes[1]).toEqual(writes[0]);
});

test("changed saved revision, refreshed projection and incompatible scope all require new review", async ({
  page,
}) => {
  const { writes } = await setup(page);
  const otherVersion = {
    ...version,
    id: "90000000-0000-4000-8000-000000000002",
    label: "Second saved revision",
  };
  await page.route("**/api/capiro/workspace.draft.versions?*", (r) =>
    r.fulfill({ json: [version, otherVersion] }),
  );
  let projectionHash = revision.projectionHash;
  await page.route("**/api/capiro/workspace.newsletter.revision?*", (r) => {
    const input = JSON.parse(
      new URL(r.request().url()).searchParams.get("input")!,
    );
    return r.fulfill({
      json: { ...revision, versionId: input.params.versionId, projectionHash },
    });
  });
  await open(page);
  await select(page);
  await review(page);
  for (const label of [/Second saved revision/, /Saved policy revision/]) {
    await page.getByRole("combobox", { name: "Saved version" }).click();
    await page.getByRole("option", { name: label }).click();
    await expect(
      page.getByRole("checkbox", {
        name: /I (reviewed this saved version|want to retry the exact original)/,
      }),
    ).not.toBeChecked();
  }
  await review(page);
  projectionHash = "e".repeat(64);
  await refresh(page);
  await expect(
    page.getByRole("checkbox", {
      name: /I (reviewed this saved version|want to retry the exact original)/,
    }),
  ).not.toBeChecked();
  await review(page);
  await page.route("**/api/capiro/engagement.session?*", (r) =>
    r.fulfill({
      json: {
        ...session,
        spec: {
          ...session.spec,
          sponsor: {
            kind: "client",
            label: "Other client",
            clientRefs: [{ clientId: sessionId }],
          },
        },
      },
    }),
  );
  await refresh(page);
  await expect(page.getByRole("alert")).toContainText(
    "exact saved client sponsor",
  );
  await expect(
    page.getByRole("button", { name: "Stage saved version", exact: true }),
  ).toHaveCount(0);
  await page.route("**/api/capiro/engagement.session?*", (r) =>
    r.fulfill({ json: session }),
  );
  await refresh(page);
  await expect(
    page.getByRole("checkbox", {
      name: /I (reviewed this saved version|want to retry the exact original)/,
    }),
  ).not.toBeChecked();
  expect(writes).toEqual([]);
});

for (const refusal of [
  "overlength",
  "image-only",
  "invalid body",
  "missing body",
])
  test(`producer ${refusal} refusal uses the existing unavailable boundary without staging`, async ({
    page,
  }) => {
    const { writes } = await setup(page);
    await page.route("**/api/capiro/workspace.newsletter.revision?*", (r) =>
      r.fulfill({
        status: 404,
        json: {
          message: `Saved Newsletter ${refusal} is unavailable for staging`,
        },
      }),
    );
    await open(page);
    await page.getByRole("combobox", { name: "Saved version" }).click();
    await page.getByRole("option", { name: /Saved policy revision/ }).click();
    await expect(
      page.getByText(
        "Staging stays unavailable until the refreshed review is confirmed.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Stage saved version", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Content to stage" }),
    ).toHaveCount(0);
    expect(writes).toEqual([]);
  });

// Persist a pre-pin v1 journal fixture as an older app did, then let the mounted
// production recovery owner read/decrypt/validate it. No production test hook.
async function seedHistoricalRequest(page: Page, original: StagingIntent) {
  const scope = stagingScope(
    {
      tenantId: testIdentity.tenant.id,
      userId: testIdentity.user.id,
      clerkUserId: testIdentity.user.clerkUserId,
    },
    draft.id,
  );
  await page.evaluate(
    async ({ scope, original }) => {
      const requestId = original.body.requestId;
      const key = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
      );
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv,
          additionalData: new TextEncoder().encode(scope),
        },
        key,
        new TextEncoder().encode(
          JSON.stringify({
            version: 1,
            scope,
            requestId,
            state: "pending",
            data: original,
          }),
        ),
      );
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("capiro-command-recovery-v1", 1);
        request.onupgradeneeded = () =>
          request.result.createObjectStore("records");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("records", "readwrite");
          tx.objectStore("records").put(
            { version: 1, requestId, key, iv, ciphertext },
            scope,
          );
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onabort = () => {
            db.close();
            reject(tx.error);
          };
        };
      });
      localStorage.setItem(
        `capiro-command-fence-v1:${scope}`,
        JSON.stringify({ version: 1, requestId }),
      );
    },
    { scope, original },
  );
}

test("historical unpinned recovery holds on missing current client before recovering without a v2 projection", async ({
  page,
}) => {
  const { writes, errors } = await setup(page);
  let projectionReads = 0;
  await page.route("**/api/capiro/workspace.newsletter.revision?*", (r) => {
    projectionReads++;
    return r.fulfill({
      status: 404,
      json: { message: "Historical Newsletter cannot project v2" },
    });
  });
  const original = {
    sessionId,
    body: {
      requestId: "b0000000-0000-4000-8000-000000000001",
      draftId: draft.id,
      versionId: revision.versionId,
      snapshotHash: revision.snapshotHash,
      expectedStateVersion: 3,
    },
  };
  await page.goto(route);
  await seedHistoricalRequest(page, original);
  await page.route("**/api/capiro/workspace.newsletter.stage", (r) =>
    r.fulfill({ json: receipt(r.request().postDataJSON().body, true) }),
  );
  await open(page);
  await expect(
    page.getByRole("heading", { name: "Retry original staging" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("dialog")
      .getByText(revision.contentSkeleton.body, { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Retry original staging" }),
  ).toBeDisabled();
  await page
    .getByRole("checkbox", {
      name: "I want to retry the exact original staging action.",
    })
    .check();
  await page.route("**/api/capiro/workspace.draft?*", (r) =>
    r.fulfill({ json: { ...draft, clientId: undefined } }),
  );
  await page.getByRole("button", { name: "Retry original staging" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "no verified current client association",
  );
  expect(writes).toEqual([]);
  await page.route("**/api/capiro/workspace.draft?*", (r) =>
    r.fulfill({ json: draft }),
  );
  await page.getByRole("button", { name: "Refresh review" }).click();
  await page
    .getByRole("checkbox", {
      name: "I want to retry the exact original staging action.",
    })
    .check();
  await page.getByRole("button", { name: "Retry original staging" }).click();
  await expect(
    page.getByRole("heading", { name: "Saved version staged" }),
  ).toBeVisible();
  expect(writes).toEqual([
    {
      key: "workspace.newsletter.stage",
      body: { params: { sessionId }, body: original.body },
    },
  ]);
  await page.getByRole("button", { name: "Done" }).click();
  await expect(
    page.getByRole("heading", { name: "Saved version staged" }),
  ).toHaveCount(0);
  expect(projectionReads).toBe(0);
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
    .getByRole("button", { name: "Stage saved version", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Retry original staging" }),
  ).toBeDisabled();
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
    page.getByText(/The original request is preserved/),
  ).toBeVisible();
  expect(writes).toHaveLength(1);
  await expect(
    page.getByRole("combobox", { name: "Saved version" }),
  ).toHaveCount(0);
  await review(page);
  await page.getByRole("button", { name: "Retry original staging" }).click();
  await expect(
    page.getByRole("heading", { name: "Saved version staged" }),
  ).toBeVisible();
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
  await page.getByRole("combobox", { name: "Saved version" }).click();
  await page.getByRole("option", { name: /Saved policy revision/ }).click();
  await page.getByRole("combobox", { name: "Outreach session" }).click();
  await page
    .getByRole("option", { name: /Synthetic template campaign/ })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "exact saved client sponsor",
  );
  await expect(
    page.getByRole("button", { name: "Stage saved version", exact: true }),
  ).toHaveCount(0);
  await page.route("**/api/capiro/workspace.newsletter.revision?*", (r) =>
    r.fulfill({
      status: 404,
      json: { message: "Saved revision unavailable for staging" },
    }),
  );
  await refresh(page);
  await expect(
    page.getByText(
      "Staging stays unavailable until the refreshed review is confirmed.",
      { exact: true },
    ),
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
  // The newer base now fences the ordinary editor before staging can open.
  await expect(page.getByRole("alert")).toContainText(
    "recovery is unavailable",
  );
  await expect(
    page.getByRole("button", { name: "Stage in Outreach", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Stage saved version", exact: true }),
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
    .getByRole("button", { name: "Stage saved version", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Retry original staging" }),
  ).toBeDisabled();
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
    page.getByRole("combobox", { name: "Saved version" }),
  ).toBeVisible();
  await expect(page.getByText(/The original request is preserved/)).toHaveCount(
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
    .getByRole("button", { name: "Stage saved version", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("session state changed");
  await review(page);
  await page.getByRole("button", { name: "Retry original staging" }).click();
  await expect(page.getByRole("alert")).toContainText("receipt does not match");
  expect(writes).toHaveLength(2);
  expect(writes[0]).toEqual(writes[1]);
  await expect(page.getByRole("link", { name: "Open Outreach" })).toHaveCount(
    0,
  );
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
    .getByRole("button", { name: "Stage saved version", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Current source access unavailable",
  );
  await expect(
    page
      .getByRole("dialog")
      .getByText(revision.contentSkeleton.body, { exact: true }),
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
  await refresh(page);
  await expect(
    page.getByRole("checkbox", {
      name: /I (reviewed this saved version|want to retry the exact original)/,
    }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("button", { name: "Stage saved version", exact: true }),
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
    name: /I (reviewed this saved version|want to retry the exact original)/,
  });
  await checkbox.focus();
  await page.keyboard.press("Space");
  await expect(checkbox).toBeChecked();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Cancel", exact: true }),
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

for (const key of [
  "workspace.newsletter.revision",
  "workspace.newsletter.stage",
] as const)
  test(`missing ${key} never confirms staging or automatically replays it`, async ({
    page,
  }) => {
    const { writes, errors } = await setup(page);
    await page.route(`**/api/capiro/${key}**`, async (route) => {
      const response = await serviceErrorResponse(
        Response.json(
          { message: "Cannot access candidate endpoint" },
          { status: 404 },
        ),
        newsletterStagingOperations[key],
        new AbortController().signal,
        false,
      );
      await route.fulfill({
        status: response.status,
        json: await response.json(),
      });
    });
    await open(page);
    if (key === "workspace.newsletter.stage") {
      await select(page);
      await review(page);
      await page
        .getByRole("button", { name: "Stage saved version", exact: true })
        .click();
    } else {
      await page.getByRole("combobox", { name: "Saved version" }).click();
      await page.getByRole("option", { name: /Saved policy revision/ }).click();
      await expect(
        page.getByRole("button", { name: "Stage saved version", exact: true }),
      ).toHaveCount(0);
    }
    await expect(page.getByRole("alert")).toContainText(
      "The requested action or record is unavailable from the current service.",
    );
    await expect(
      page.getByRole("heading", { name: "Saved version staged" }),
    ).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Open Outreach" })).toHaveCount(
      0,
    );
    expect(writes).toHaveLength(key === "workspace.newsletter.stage" ? 1 : 0);
    if (key === "workspace.newsletter.stage") {
      await open(page);
      await expect(
        page.getByText(/The original request is preserved/),
      ).toBeVisible();
      expect(writes).toHaveLength(1);
    }
    expect(errors).toEqual([]);
  });
