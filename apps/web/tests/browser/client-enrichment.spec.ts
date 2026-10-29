import { test, expect, type Page } from "@playwright/test";
import { clientId, json } from "./fixtures";
import {
  advocacyId,
  findingId,
  installEnrichment,
  matterId,
} from "./client-enrichment-fixtures";
async function openReview(page: Page) {
  await page.goto(`/portfolio/${clientId}`);
  await page.getByRole("button", { name: "Meri actions", exact: true }).click();
  await page.getByRole("menuitem", { name: "Fill with Meri" }).click();
  const drawer = page.getByRole("dialog", {
    name: "Fill with Meri",
    exact: true,
  });
  await expect(drawer).toBeVisible();
  return drawer;
}
test("stale enrichment upload still loads missing Files state and opens its shared dialog", async ({
  page,
}) => {
  const { state, unexpected } = await installEnrichment(page);
  let fileReads = 0;
  page.on("request", (request) => {
    if (request.url().includes("/core/engagement/attachments?")) fileReads += 1;
  });
  // The mounted profile's durable command owners require canonical UUID actors.
  await page.route("**/api/backend/core/me", (route) =>
    json(route, {
      user: {
        id: "90000000-0000-4000-8000-000000000002",
        email: "synthetic@example.test",
      },
      tenant: {
        id: "90000000-0000-4000-8000-000000000001",
        name: "Synthetic tenant",
      },
      role: state.role,
    }),
  );
  const drawer = await openReview(page);
  const upload = drawer.getByRole("button", { name: "Upload", exact: true });
  await expect(upload).toBeEnabled();
  expect(fileReads).toBe(0);
  // Age the query cache without replacing the profile's native Intl formatters.
  await page.evaluate(() => {
    const now = Date.now;
    Date.now = () => now() + 31_000;
  });
  await upload.click();
  const dialog = page.getByRole("dialog", {
    name: "Upload files",
    exact: true,
  });
  await expect(
    dialog.getByLabel("Select files", { exact: true }),
  ).toBeEnabled();
  expect(fileReads).toBe(1);
  expect(state.posts).toEqual([]);
  expect(unexpected).toEqual([]);
});
test("saved run current/proposed, sources, selection and explicit partial apply", async ({
  page,
}) => {
  const { state, unexpected } = await installEnrichment(page);
  state.mode = "partial";
  const drawer = await openReview(page);
  await expect(drawer).toContainText("Saved company description");
  await expect(drawer).toContainText("Synthetic reviewed company description");
  await drawer
    .getByText("fact · public_web · source evidence (1)", { exact: true })
    .first()
    .click();
  await expect(
    drawer.getByRole("link", { name: "Synthetic company source" }).first(),
  ).toHaveAttribute("href", "https://example.test/source");
  await drawer.getByRole("button", { name: "Select all new" }).click();
  await expect(drawer.getByRole("checkbox").nth(2)).not.toBeChecked();
  await drawer
    .getByRole("button", { name: "Apply 2 selected", exact: true })
    .click();
  expect(state.posts).toHaveLength(0);
  await drawer
    .getByRole("button", { name: "Confirm apply", exact: true })
    .click();
  await expect(drawer).toContainText(
    "Application partial: 1 applied, 0 already applied, 1 not applied.",
  );
  expect(state.posts[0]?.body).toEqual({
    requestId: expect.any(String),
    expectedClientRevision: "a".repeat(64),
    findings: [findingId, advocacyId].map((id) => ({
      id,
      revision: "b".repeat(64),
    })),
  });
  await expect(drawer).toContainText(
    "The source evidence could not be applied.",
  );
  expect(unexpected).toEqual([]);
});
test("ignore with reason then restore uses persisted acknowledgments", async ({
  page,
}) => {
  const { state, unexpected } = await installEnrichment(page);
  const drawer = await openReview(page);
  const finding = drawer.getByRole("article", {
    name: "Finding description",
    exact: true,
  });
  await finding.getByRole("button", { name: "Ignore", exact: true }).click();
  await finding
    .getByLabel("Reason (optional)")
    .fill("Wrong source attribution");
  await finding
    .getByRole("button", { name: "Confirm ignore", exact: true })
    .click();
  await drawer
    .getByRole("button", { name: "Confirm reject", exact: true })
    .click();
  await expect(
    finding.getByRole("button", { name: "Restore", exact: true }),
  ).toBeEnabled();
  expect(state.posts[0]?.body).toEqual({ reason: "Wrong source attribution" });
  await finding.getByRole("button", { name: "Restore", exact: true }).click();
  await drawer
    .getByRole("button", { name: "Confirm restore", exact: true })
    .click();
  await expect(
    finding.getByRole("button", { name: "Ignore", exact: true }),
  ).toBeEnabled();
  expect(state.posts).toHaveLength(2);
  expect(unexpected).toEqual([]);
});
test("matter assignment explicitly applies immediately with exact receipt", async ({
  page,
}) => {
  const { state, unexpected } = await installEnrichment(page);
  const drawer = await openReview(page);
  const finding = drawer.getByRole("article", {
    name: "Finding Synthetic advocacy matter",
  });
  await finding.getByRole("button", { name: "Choose matter" }).click();
  await finding
    .getByRole("combobox", { name: "Matter", exact: true })
    .selectOption(matterId);
  await finding
    .getByRole("button", { name: "Apply finding to matter", exact: true })
    .click();
  expect(state.posts).toHaveLength(0);
  await drawer
    .getByRole("button", { name: "Confirm assign", exact: true })
    .click();
  await expect(drawer).toContainText(
    "Application completed: 1 applied, 0 already applied, 0 not applied.",
  );
  expect(state.posts[0]?.body).toEqual({
    matterId,
    requestId: expect.any(String),
    expectedClientRevision: "a".repeat(64),
    findings: [{ id: advocacyId, revision: "b".repeat(64) }],
  });
  expect(unexpected).toEqual([]);
});
test("wrong matter receipt cannot show assignment success", async ({
  page,
}) => {
  const { state } = await installEnrichment(page);
  state.mode = "wrong-assignment";
  const drawer = await openReview(page);
  const finding = drawer.getByRole("article", {
    name: "Finding Synthetic advocacy matter",
  });
  await finding.getByRole("button", { name: "Choose matter" }).click();
  await finding
    .getByRole("combobox", { name: "Matter", exact: true })
    .selectOption(matterId);
  await finding
    .getByRole("button", { name: "Apply finding to matter" })
    .click();
  await drawer
    .getByRole("button", { name: "Confirm assign", exact: true })
    .click();
  await expect(drawer).toContainText("The request may have saved changes");
  await expect(drawer).not.toContainText("Application completed");
  expect(state.posts).toHaveLength(1);
});
test("lost apply response survives reload and recovers the exact original request", async ({
  page,
}) => {
  const { state } = await installEnrichment(page);
  state.mode = "lost";
  let drawer = await openReview(page);
  await drawer.getByRole("button", { name: "Select all new" }).click();
  await drawer
    .getByRole("button", { name: "Apply 2 selected", exact: true })
    .click();
  await drawer
    .getByRole("button", { name: "Confirm apply", exact: true })
    .click();
  await expect(drawer).toContainText("The request may have saved changes");
  await drawer.getByRole("button", { name: "Close review" }).click();
  await expect(
    page.getByRole("button", { name: "Meri actions", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Meri actions", exact: true }).click();
  await page.getByRole("menuitem", { name: "Fill with Meri" }).click();
  drawer = page.getByRole("dialog", { name: "Fill with Meri", exact: true });
  await expect(drawer).toContainText("The request may have saved changes");
  await drawer.getByRole("button", { name: "Refresh saved review" }).click();
  await expect(
    drawer.getByRole("button", { name: "Select all new" }),
  ).toBeDisabled();
  expect(state.posts).toHaveLength(1);
  drawer = await openReview(page);
  await expect(drawer).toContainText("The request may have saved changes");
  await drawer
    .getByRole("button", { name: "Recover application result" })
    .click();
  await expect(drawer).toContainText("Application completed: 2 applied");
  expect(state.posts).toHaveLength(2);
  expect(state.posts[1]).toEqual(state.posts[0]);
  await expect(
    drawer.getByRole("button", { name: "Select all new" }),
  ).toBeEnabled();
});
test("changed finding preflight preserves review and prevents POST", async ({
  page,
}) => {
  const { state } = await installEnrichment(page);
  const drawer = await openReview(page);
  await drawer.getByRole("button", { name: "Select all new" }).click();
  await drawer
    .getByRole("button", { name: "Apply 2 selected", exact: true })
    .click();
  state.mode = "drift";
  await drawer
    .getByRole("button", { name: "Confirm apply", exact: true })
    .click();
  await expect(drawer).toContainText("Findings changed");
  expect(state.posts).toHaveLength(0);
});
test("closing during preflight aborts before POST", async ({ page }) => {
  const { state } = await installEnrichment(page);
  const drawer = await openReview(page);
  await drawer.getByRole("button", { name: "Select all new" }).click();
  await drawer
    .getByRole("button", { name: "Apply 2 selected", exact: true })
    .click();
  let release = () => {};
  state.runGate = new Promise<void>((r) => {
    release = r;
  });
  await drawer
    .getByRole("button", { name: "Confirm apply", exact: true })
    .click();
  await expect.poll(() => state.runGets).toBe(1);
  await drawer.getByRole("button", { name: "Close review" }).click();
  release();
  await expect(drawer).toBeHidden();
  expect(state.posts).toHaveLength(0);
});
test("standard user can read but cannot apply or ignore", async ({ page }) => {
  const { state } = await installEnrichment(page);
  state.role = "standard_user";
  const drawer = await openReview(page);
  await expect(drawer).toContainText("Applying needs an admin");
  await expect(
    drawer.getByRole("button", { name: "Select all new" }),
  ).toBeDisabled();
  await expect(
    drawer.getByRole("button", { name: "Ignore", exact: true }).first(),
  ).toBeDisabled();
  expect(state.posts).toHaveLength(0);
});
test("running review polls and cancellation is explicit and scoped", async ({
  page,
}) => {
  const { state } = await installEnrichment(page);
  if (!state.run) throw new Error("Missing test run");
  state.run.status = "running";
  state.run.stage = "research";
  state.run.completedAt = null;
  const drawer = await openReview(page);
  await expect.poll(() => state.latestGets).toBeGreaterThan(1);
  await drawer.getByRole("button", { name: "Cancel run", exact: true }).click();
  expect(state.posts).toHaveLength(0);
  await drawer
    .getByRole("button", { name: "Confirm cancel", exact: true })
    .click();
  await expect(drawer).toContainText(
    "Run is cancelled. Previously accepted changes remain saved",
  );
  expect(state.posts[0]?.path).toMatch(/\/cancel$/);
});
test("empty setup requires explicit source selection before starting research", async ({
  page,
}) => {
  const { state, unexpected } = await installEnrichment(page);
  state.run = null;
  const drawer = await openReview(page);
  await expect(drawer).toContainText("Research saves provisional findings");
  await expect(
    drawer.getByRole("button", { name: "Start selected research" }),
  ).toBeDisabled();
  await drawer
    .getByRole("checkbox", { name: "Public web", exact: true })
    .check();
  await expect(
    drawer.getByRole("button", { name: "Start selected research" }),
  ).toBeEnabled();
  expect(state.posts).toHaveLength(0);
  expect(unexpected).toEqual([]);
});

test("starting research submits only the selected sources, offered identities and ready documents", async ({
  page,
}) => {
  const { state, unexpected } = await installEnrichment(page);
  state.run = null;
  const drawer = await openReview(page);
  await drawer
    .getByLabel("Research website", { exact: true })
    .fill("https://research.example/");
  await drawer
    .getByRole("checkbox", { name: "Public web", exact: true })
    .check();
  await drawer.getByRole("checkbox", { name: "LDA", exact: true }).check();
  await drawer
    .getByRole("checkbox", { name: "Synthetic suggested identity" })
    .check();
  await expect(
    drawer.getByRole("checkbox", { name: "Synthetic imported identity" }),
  ).toBeChecked();
  await drawer
    .getByRole("checkbox", { name: "Program overview.txt · Ready" })
    .check();
  await drawer.getByRole("button", { name: "Start selected research" }).click();
  await expect(drawer).toContainText("Research is still running");
  expect(state.posts).toHaveLength(1);
  expect(state.posts[0]?.body).toEqual({
    requestId: expect.any(String),
    sources: ["public_web", "lda"],
    website: "https://research.example/",
    ldaClientIds: [73],
    attachmentIds: ["60000000-0000-4000-8000-000000000002"],
  });
  await expect(
    drawer.getByRole("button", { name: "Run again" }),
  ).toBeDisabled();
  expect(unexpected).toEqual([]);
});

test("a lost start response survives reload and recovers the same request", async ({
  page,
}) => {
  const { state } = await installEnrichment(page);
  state.run = null;
  state.dropStartOnce = true;
  let drawer = await openReview(page);
  await drawer
    .getByRole("checkbox", { name: "Public web", exact: true })
    .check();
  await drawer.getByRole("button", { name: "Start selected research" }).click();
  await expect(
    drawer.getByRole("button", { name: "Recover research request" }),
  ).toBeEnabled();
  await page.reload();
  drawer = await openReview(page);
  await expect(
    drawer.getByRole("button", { name: "Run again" }),
  ).toBeDisabled();
  await drawer
    .getByRole("button", { name: "Recover research request" })
    .click();
  await expect(
    drawer.getByRole("button", { name: "Recover research request" }),
  ).toHaveCount(0);
  expect(state.posts).toHaveLength(2);
  expect(state.posts[1]).toEqual(state.posts[0]);
  expect(state.starts.size).toBe(1);
});
test("run again opens saved choices and creates a new run only after submission", async ({
  page,
}) => {
  const { state } = await installEnrichment(page);
  const priorId = state.run!.id;
  const drawer = await openReview(page);
  await drawer.getByRole("button", { name: "Run again", exact: true }).click();
  await expect(
    drawer.getByRole("checkbox", { name: "Public web", exact: true }),
  ).toBeChecked();
  await expect(
    drawer.getByRole("checkbox", { name: "LDA", exact: true }),
  ).toBeChecked();
  expect(state.posts).toHaveLength(0);
  await drawer.getByRole("button", { name: "Start selected research" }).click();
  await expect(drawer).toContainText("Research is still running");
  expect(state.posts).toHaveLength(1);
  expect(state.posts[0]?.body.requestId).not.toBe(priorId);
});

test("closing during research preflight prevents the start POST", async ({
  page,
}) => {
  const { state } = await installEnrichment(page);
  state.run = null;
  const drawer = await openReview(page);
  await drawer
    .getByRole("checkbox", { name: "Public web", exact: true })
    .check();
  let release = () => {},
    entered = false;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/fill-with-meri/setup", async (route) => {
    entered = true;
    await gate;
    await route.fallback().catch(() => {});
  });
  await drawer.getByRole("button", { name: "Start selected research" }).click();
  await expect.poll(() => entered).toBe(true);
  await drawer.getByRole("button", { name: "Close review" }).click();
  release();
  await expect(drawer).toBeHidden();
  expect(state.posts).toHaveLength(0);
});

test("a selected failed task queues an exact retry and refreshes current progress", async ({
  page,
}) => {
  const { state } = await installEnrichment(page);
  state.run!.status = "partial";
  Object.assign(state.run!.tasks![0]!, {
    status: "failed",
    attempt: 3,
    maxAttempts: 3,
  });
  const drawer = await openReview(page);
  await drawer.getByRole("button", { name: "Retry task", exact: true }).click();
  await expect(drawer).toContainText(
    "Retry queued. The task ledger shows its current progress.",
  );
  expect(state.posts).toHaveLength(1);
  expect(state.posts[0]?.body).toEqual({
    requestId: expect.any(String),
    expectedAttempt: 3,
    expectedTaskType: "public_web",
  });
  expect(state.run!.tasks![0]!.status).toBe("queued");
  await expect(
    drawer.getByRole("button", { name: "Retry task", exact: true }),
  ).toHaveCount(0);
});

test("lost retry recovery does not restart a later failed attempt", async ({
  page,
}) => {
  const { state } = await installEnrichment(page);
  state.run!.status = "partial";
  state.dropRetryOnce = true;
  Object.assign(state.run!.tasks![0]!, {
    status: "failed",
    attempt: 3,
    maxAttempts: 3,
  });
  let drawer = await openReview(page);
  await drawer.getByRole("button", { name: "Retry task", exact: true }).click();
  await expect(
    drawer.getByRole("button", { name: "Recover task retry" }),
  ).toBeEnabled();
  Object.assign(state.run!.tasks![0]!, {
    status: "failed",
    attempt: 4,
    maxAttempts: 6,
  });
  state.run!.status = "partial";
  await page.reload();
  drawer = await openReview(page);
  await expect(
    drawer.getByRole("button", { name: "Retry task", exact: true }),
  ).toBeDisabled();
  await drawer.getByRole("button", { name: "Recover task retry" }).click();
  await expect(drawer).toContainText(
    "Retry queued. The task ledger shows its current progress.",
  );
  await expect(drawer).toContainText("Attempt 4 of 6");
  expect(state.run!.tasks![0]!.status).toBe("failed");
  expect(state.posts).toHaveLength(2);
  expect(state.posts[1]).toEqual(state.posts[0]);
  expect(state.retries.size).toBe(1);
});

test("changed task preflight refuses without a retry POST", async ({
  page,
}) => {
  const { state } = await installEnrichment(page);
  state.run!.status = "partial";
  Object.assign(state.run!.tasks![0]!, {
    status: "failed",
    attempt: 3,
    maxAttempts: 3,
  });
  const drawer = await openReview(page);
  await expect(drawer).toContainText("Attempt 3 of 3");
  state.run!.tasks![0]!.attempt = 4;
  await drawer.getByRole("button", { name: "Retry task", exact: true }).click();
  await expect(drawer).toContainText(
    "The task changed. Refresh its saved status before retrying.",
  );
  expect(state.posts).toHaveLength(0);
});

test("wrong-client response hides review; unavailable read can retry", async ({
  page,
}) => {
  const { state } = await installEnrichment(page);
  state.mode = "wrong-client";
  const drawer = await openReview(page);
  await expect(drawer).toContainText("different client");
  await expect(drawer.getByRole("article")).toHaveCount(0);
  state.mode = "normal";
  await drawer.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(drawer.getByRole("article")).toHaveCount(4);
  expect(state.posts).toHaveLength(0);
});
test("drawer follows desktop geometry and mobile dark layout", async ({
  page,
}) => {
  const { unexpected } = await installEnrichment(page);
  const drawer = await openReview(page);
  await page.evaluate(() => document.fonts.ready);
  const bounds = await drawer.boundingBox();
  expect(bounds?.x).toBe(820);
  expect(bounds?.y).toBe(0);
  expect(bounds?.width).toBe(620);
  expect(bounds?.height).toBe(1040);
  await page.screenshot({
    path: "work/enrichment-evidence/review-desktop-light.png",
    fullPage: false,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(drawer).toHaveCSS("background-color", "rgb(27, 27, 27)");
  await page.screenshot({
    path: "work/enrichment-evidence/review-mobile-dark.png",
    fullPage: false,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(
    drawer.getByRole("button", { name: "Close review" }),
  ).toBeInViewport();
  expect(unexpected).toEqual([]);
});
test("canonical upload is explicit, validates empty files and never starts research", async ({
  page,
}) => {
  const { state, unexpected } = await installEnrichment(page);
  const drawer = await openReview(page);
  await expect(drawer).toContainText(
    "Uploading saves a client file immediately",
  );
  await drawer.getByRole("button", { name: "Upload", exact: true }).click();
  const upload = page.getByRole("dialog", {
    name: "Upload files",
    exact: true,
  });
  await expect(upload).toBeVisible();
  await upload.getByLabel("Select files").setInputFiles({
    name: "empty.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.alloc(0),
  });
  await expect(upload).toContainText("Empty files cannot be uploaded");
  await expect(
    upload.getByRole("button", { name: "Upload file", exact: true }),
  ).toBeDisabled();
  await upload.getByRole("button", { name: "Done", exact: true }).click();
  await expect(drawer).toBeVisible();
  expect(state.posts).toHaveLength(0);
  expect(unexpected).toEqual([]);
});
test("unmount during upload ticket blocks storage and confirmation", async ({
  page,
}) => {
  const { state, unexpected } = await installEnrichment(page);
  let release = () => {};
  let tickets = 0;
  let storage = 0;
  let confirms = 0;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  await page.route(
    "**/api/backend/core/engagement/attachments/upload-url",
    async (route) => {
      tickets++;
      expect(route.request().postDataJSON().clientId).toBe(clientId);
      await gate;
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          url: "https://storage.example.test/upload",
          fields: { key: "synthetic-file-key" },
          s3Key: "synthetic-file-key",
        }),
      });
    },
  );
  await page.route("https://storage.example.test/**", (route) => {
    storage++;
    return route.fulfill({ status: 204 });
  });
  await page.route(
    "**/api/backend/core/engagement/attachments/confirm",
    (route) => {
      confirms++;
      return route.fulfill({ status: 500 });
    },
  );
  const drawer = await openReview(page);
  await drawer.getByRole("button", { name: "Upload", exact: true }).click();
  const upload = page.getByRole("dialog", {
    name: "Upload files",
    exact: true,
  });
  await upload.getByLabel("Select files").setInputFiles({
    name: "synthetic.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Synthetic test bytes only"),
  });
  await upload
    .getByRole("button", { name: "Upload file", exact: true })
    .click();
  await expect.poll(() => tickets).toBe(1);
  await page.evaluate(() => {
    window.history.pushState({}, "", "/portfolio");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(upload).toBeHidden();
  const ticketFinished = page.waitForEvent("requestfinished", (request) =>
    request.url().endsWith("/engagement/attachments/upload-url"),
  );
  release();
  await ticketFinished;
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  );
  await expect(
    page.getByRole("heading", { name: /^Portfolio \d+$/, level: 1 }),
  ).toBeVisible();
  expect(storage).toBe(0);
  expect(confirms).toBe(0);
  expect(state.posts).toHaveLength(0);
  expect(unexpected).toEqual([]);
});
