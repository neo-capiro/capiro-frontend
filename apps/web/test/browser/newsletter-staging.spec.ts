import { test, expect, type Page } from "@playwright/test";
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
    page.getByText(revision.contentSkeleton.subject, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(revision.snapshot.docTitle, { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Stage saved revision", exact: true }),
  ).toBeDisabled();
  await review(page);
  await page.evaluate(() => window.scrollTo(0, 0));
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
          projectionVersion: revision.projectionVersion,
          projectionHash: revision.projectionHash,
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
    page.getByText(revision.snapshot.docTitle, { exact: true }),
  ).toHaveCount(0);
  await review(page);
  await page
    .getByRole("button", { name: "Stage saved revision", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Saved revision staged" }),
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
    .getByRole("button", { name: "Stage saved revision", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "saved projection changed",
  );
  await expect(
    page.getByRole("button", { name: "Retry staging recovery" }),
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
    .getByRole("button", { name: "Stage saved revision", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("receipt does not match");
  await expect(
    page.getByRole("heading", { name: "Saved revision staged" }),
  ).toHaveCount(0);
  await page.route("**/api/capiro/workspace.newsletter.stage", (r) =>
    r.fulfill({ json: receipt(r.request().postDataJSON().body, true) }),
  );
  await open(page);
  await review(page);
  await page.getByRole("button", { name: "Recover original staging" }).click();
  await expect(page.getByText(/recovered original receipt/)).toBeVisible();
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
    await page
      .getByRole("combobox", { name: "Saved Newsletter revision" })
      .click();
    await page.getByRole("option", { name: label }).click();
    await expect(
      page.getByRole("checkbox", { name: /I reviewed this saved text/ }),
    ).not.toBeChecked();
  }
  await review(page);
  projectionHash = "e".repeat(64);
  await page
    .getByRole("button", { name: "Refresh saved revision and session" })
    .click();
  await expect(
    page.getByRole("checkbox", { name: /I reviewed this saved text/ }),
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
  await page
    .getByRole("button", { name: "Refresh saved revision and session" })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "exact saved client sponsor",
  );
  await expect(
    page.getByRole("button", { name: "Stage saved revision", exact: true }),
  ).toBeDisabled();
  await page.route("**/api/capiro/engagement.session?*", (r) =>
    r.fulfill({ json: session }),
  );
  await page
    .getByRole("button", { name: "Refresh saved revision and session" })
    .click();
  await expect(
    page.getByRole("checkbox", { name: /I reviewed this saved text/ }),
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
    await page
      .getByRole("combobox", { name: "Saved Newsletter revision" })
      .click();
    await page.getByRole("option", { name: /Saved policy revision/ }).click();
    await expect(
      page.getByText(/Saved revision staging is unavailable until/),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Stage saved revision", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("heading", { name: "Review saved content for Outreach" }),
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
    page.getByRole("heading", { name: "Recover historical staging receipt" }),
  ).toBeVisible();
  await expect(
    page.getByText(revision.contentSkeleton.body, { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Recover original staging" }),
  ).toBeDisabled();
  await page
    .getByRole("checkbox", {
      name: "I want to recover this original staging request.",
    })
    .check();
  await page.route("**/api/capiro/workspace.draft?*", (r) =>
    r.fulfill({ json: { ...draft, clientId: undefined } }),
  );
  await page.getByRole("button", { name: "Recover original staging" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "no verified current client association",
  );
  expect(writes).toEqual([]);
  await page.route("**/api/capiro/workspace.draft?*", (r) =>
    r.fulfill({ json: draft }),
  );
  await page.getByRole("button", { name: "Retry staging recovery" }).click();
  await page
    .getByRole("checkbox", {
      name: "I want to recover this original staging request.",
    })
    .check();
  await page.getByRole("button", { name: "Recover original staging" }).click();
  await expect(page.getByText(/recovered original receipt/)).toBeVisible();
  expect(writes).toEqual([
    {
      key: "workspace.newsletter.stage",
      body: { params: { sessionId }, body: original.body },
    },
  ]);
  await page
    .getByRole("button", { name: "Acknowledge staging receipt" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Saved revision staged" }),
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
        .getByRole("button", { name: "Stage saved revision", exact: true })
        .click();
    } else {
      await page
        .getByRole("combobox", { name: "Saved Newsletter revision" })
        .click();
      await page.getByRole("option", { name: /Saved policy revision/ }).click();
      await expect(
        page.getByRole("button", { name: "Stage saved revision", exact: true }),
      ).toBeDisabled();
    }
    await expect(page.getByRole("alert")).toContainText(
      "The requested action or record is unavailable from the current service.",
    );
    await expect(
      page.getByRole("heading", { name: "Saved revision staged" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Open selected Outreach session" }),
    ).toHaveCount(0);
    expect(writes).toHaveLength(key === "workspace.newsletter.stage" ? 1 : 0);
    if (key === "workspace.newsletter.stage") {
      await open(page);
      await expect(
        page.getByText(/Original staging request retained/),
      ).toBeVisible();
      expect(writes).toHaveLength(1);
    }
    expect(errors).toEqual([]);
  });
