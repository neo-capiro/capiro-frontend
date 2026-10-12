import { test, expect, type Page, type Request } from "@playwright/test";
import { sendingMailbox } from "./fixtures";

const clientId = "10000000-0000-4000-8000-000000000001";
const original = "Original draft for review.";
type RewriteResult = { bodyHtml: string; verified: boolean };

async function setupRewrite(page: Page) {
  let actor = "actor-a";
  let sends = 0;
  const aborted = new Set<Request>();
  const requests: {
    body: unknown;
    release: (result: RewriteResult) => Promise<void>;
  }[] = [];
  page.on("requestfailed", (request) => {
    if (request.url().endsWith("/engagement/mail/rewrite"))
      aborted.add(request);
  });
  await page.route("**/api/backend/core/**", async (route) => {
    const path = new URL(route.request().url()).pathname.split(
      "/api/backend/core/",
    )[1];
    if (path === "me")
      return route.fulfill({
        json: {
          user: { id: actor, email: "actor@example.test" },
          tenant: { id: "tenant-a", name: "Synthetic" },
          role: "standard_user",
        },
      });
    if (path === "me/email-signature")
      return route.fulfill({ json: { html: null, enabled: false } });
    if (path === "engagement/mail/mailboxes")
      return route.fulfill({ json: [sendingMailbox] });
    if (path === `clients/${clientId}/people`)
      return route.fulfill({ json: [] });
    if (path === "engagement/mail/rewrite") {
      requests.push({
        body: route.request().postDataJSON(),
        release: async (result) => {
          try {
            await route.fulfill({ json: result });
          } catch (error) {
            if (!aborted.has(route.request())) throw error;
          }
        },
      });
      return;
    }
    if (path === "engagement/mail/send") sends++;
    return route.fulfill({
      status: 500,
      json: { message: `Unexpected synthetic route: ${path}` },
    });
  });
  await page.goto("/__test/email-compose");
  await openCompose(page);
  return {
    requests,
    attempt: (index: number) => {
      const request = requests[index];
      if (!request)
        throw new Error(`Rewrite attempt ${index} was not dispatched.`);
      return request;
    },
    aborted,
    sends: () => sends,
    changeActor: () => {
      actor = "actor-b";
    },
  };
}

async function openCompose(page: Page) {
  await page.getByRole("button", { name: "Mail contact", exact: true }).click();
  await page.getByLabel("Subject", { exact: true }).fill("Synthetic review");
  await page.getByLabel("Message", { exact: true }).fill(original);
  await page.getByLabel("From mailbox").selectOption(sendingMailbox.id);
  await expect(
    page.getByRole("button", { name: "Rewrite with Meri", exact: true }),
  ).toBeEnabled();
}

async function startRewrite(
  page: Page,
  state: Awaited<ReturnType<typeof setupRewrite>>,
  count = 1,
) {
  await page
    .getByRole("button", { name: "Rewrite with Meri", exact: true })
    .click();
  await expect.poll(() => state.requests.length).toBe(count);
  await expect(
    page.getByRole("button", { name: "Rewriting…", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Review email", exact: true }),
  ).toBeDisabled();
}

test("a current verified rewrite preserves the native payload and plain-text review", async ({
  page,
}) => {
  const state = await setupRewrite(page);
  await startRewrite(page, state);
  expect(state.attempt(0).body).toEqual({
    rawText: original,
    recipientName: "Taylor Test",
    recipientTitle: "Director",
  });
  await state.attempt(0).release({
    bodyHtml:
      "<style>hidden</style><script>hidden</script><p>Reviewed first.</p><p>Reviewed second.</p>",
    verified: true,
  });
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
    "Reviewed first.\nReviewed second.",
  );
  await expect(
    page.getByRole("button", { name: "Review email", exact: true }),
  ).toBeEnabled();
  expect(state.sends()).toBe(0);
});

test("an unverified rewrite preserves the original draft", async ({ page }) => {
  const state = await setupRewrite(page);
  await startRewrite(page, state);
  await state.attempt(0).release({
    bodyHtml: "<p>Unverified replacement.</p>",
    verified: false,
  });
  await expect(
    page.getByText(
      "Meri could not verify the rewrite. Your original content was retained.",
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
    original,
  );
  expect(state.sends()).toBe(0);
});

test("editing a pending draft discards the old result without clearing a newer attempt", async ({
  page,
}) => {
  const state = await setupRewrite(page);
  await startRewrite(page, state);
  await page.getByLabel("Message", { exact: true }).fill("New manual draft.");
  await expect.poll(() => state.aborted.size).toBe(1);
  await startRewrite(page, state, 2);
  await state.attempt(0).release({
    bodyHtml: "<p>Late stale result.</p>",
    verified: true,
  });
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
    "New manual draft.",
  );
  await expect(
    page.getByRole("button", { name: "Rewriting…", exact: true }),
  ).toBeDisabled();
  expect(state.attempt(1).body).toMatchObject({
    rawText: "New manual draft.",
  });
  await state.attempt(1).release({
    bodyHtml: "<p>Current reviewed draft.</p>",
    verified: true,
  });
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
    "Current reviewed draft.",
  );
  expect(state.sends()).toBe(0);
});

test("editing back to the original text still invalidates its earlier rewrite", async ({
  page,
}) => {
  const state = await setupRewrite(page);
  await startRewrite(page, state);
  await page.getByLabel("Message", { exact: true }).fill("Intermediate edit.");
  await page.getByLabel("Message", { exact: true }).fill(original);
  await expect.poll(() => state.aborted.size).toBe(1);
  await state.attempt(0).release({
    bodyHtml: "<p>Late stale result.</p>",
    verified: true,
  });
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
    original,
  );
  await expect(
    page.getByRole("button", { name: "Rewrite with Meri", exact: true }),
  ).toBeEnabled();
  expect(state.sends()).toBe(0);
});

test("closing and reopening the composer cannot accept an earlier response", async ({
  page,
}) => {
  const state = await setupRewrite(page);
  await startRewrite(page, state);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "New email", exact: true }),
  ).not.toBeVisible();
  await expect.poll(() => state.aborted.size).toBe(1);
  await openCompose(page);
  await page
    .getByLabel("Message", { exact: true })
    .fill("Reopened manual draft.");
  await state.attempt(0).release({
    bodyHtml: "<p>Closed composer result.</p>",
    verified: true,
  });
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
    "Reopened manual draft.",
  );
  expect(state.sends()).toBe(0);
});

test("changing and restoring recipients discards the old source without leaving pending status", async ({
  page,
}) => {
  const state = await setupRewrite(page);
  await startRewrite(page, state);
  await page.getByRole("button", { name: "Cc", exact: true }).click();
  await page.getByLabel("Cc", { exact: true }).fill("copied@example.test");
  await expect.poll(() => state.aborted.size).toBe(1);
  await page.getByLabel("Cc", { exact: true }).fill("");
  await state.attempt(0).release({
    bodyHtml: "<p>Old recipient context.</p>",
    verified: true,
  });
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
    original,
  );
  await expect(
    page.getByRole("button", { name: "Rewrite with Meri", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Review email", exact: true }),
  ).toBeEnabled();
  expect(state.sends()).toBe(0);
});

for (const change of ["invalidated", "actor"] as const) {
  test(`${change} mailbox identity discards an in-flight rewrite`, async ({
    page,
  }) => {
    const state = await setupRewrite(page);
    await startRewrite(page, state);
    if (change === "actor") {
      state.changeActor();
      await page.evaluate(() => window.__mailRecheck?.());
    } else {
      expect(await page.evaluate(() => window.__mailInvalidate?.())).toEqual({
        status: "success",
        fetchStatus: "idle",
        isInvalidated: true,
      });
    }
    await expect.poll(() => state.aborted.size).toBe(1);
    await state.attempt(0).release({
      bodyHtml: "<p>Revoked session result.</p>",
      verified: true,
    });
    await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
      original,
    );
    await expect(
      page
        .getByRole("group", { name: "Draft rewrite status" })
        .getByText(/mailbox session changed or is unverified/),
    ).toBeVisible();
    expect(state.sends()).toBe(0);
  });
}

test("invalidated idle authority refuses rewrite before dispatch", async ({
  page,
}) => {
  const state = await setupRewrite(page);
  await page.evaluate(() => window.__mailInvalidate?.());
  await page
    .getByRole("button", { name: "Rewrite with Meri", exact: true })
    .click();
  await expect(
    page.getByText(/mailbox session changed or is unverified/),
  ).toBeVisible();
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
    original,
  );
  expect(state.requests).toHaveLength(0);
  expect(state.sends()).toBe(0);
});
