import { expectMailMessage } from "./mail-message-assertions";
import { test, expect, type Page } from "@playwright/test";
import { sendingMailbox, sendingReceipt } from "./fixtures";

const original = "Original local draft.";
const savedHtml =
  "<p><strong>Synthetic Sender</strong><br>Saved signature identity</p>";
async function setup(
  page: Page,
  signature = { html: savedHtml as string | null, enabled: true },
) {
  const state = {
    signature,
    signatureStatus: 200,
    signatureReads: 0,
    holdSignature: false,
    releaseSignature: () => {},
    actor: "actor-a",
    role: "standard_user",
    rewriteResult: {
      bodyHtml: "<p>Verified rewritten draft.</p>",
      verified: true,
    },
    rewriteStatus: 200,
    hold: false,
    release: () => {},
    rewrites: [] as unknown[],
    sends: [] as Record<string, unknown>[],
    remote: [] as string[],
  };
  await page.route("https://signature.example.test/**", (route) => {
    state.remote.push(route.request().url());
    return route.fulfill({ body: "Unexpected synthetic remote content" });
  });
  await page.route("**/api/backend/core/**", async (route) => {
    const path = new URL(route.request().url()).pathname.split(
      "/api/backend/core/",
    )[1];
    if (path === "me")
      return route.fulfill({
        json: {
          user: { id: state.actor, email: "actor@example.test" },
          tenant: { id: "tenant-a", name: "Synthetic" },
          role: state.role,
        },
      });
    if (path === "me/email-signature") {
      state.signatureReads += 1;
      if (state.holdSignature)
        await new Promise<void>((resolve) => {
          state.releaseSignature = resolve;
        });
      return route.fulfill({
        status: state.signatureStatus,
        json:
          state.signatureStatus === 200
            ? state.signature
            : { message: "Signature temporarily unavailable" },
      });
    }
    if (path === "engagement/mail/mailboxes")
      return route.fulfill({ json: [sendingMailbox] });
    if (path?.endsWith("/people")) return route.fulfill({ json: [] });
    if (path === "engagement/mail/rewrite") {
      state.rewrites.push(route.request().postDataJSON());
      if (state.hold)
        await new Promise<void>((resolve) => {
          state.release = resolve;
        });
      return route
        .fulfill({
          status: state.rewriteStatus,
          json:
            state.rewriteStatus === 200
              ? state.rewriteResult
              : { message: "Synthetic rewrite failure" },
        })
        .catch(() => {});
    }
    if (path === "engagement/mail/send") {
      const input = route.request().postDataJSON();
      state.sends.push(input);
      return route.fulfill({
        json: {
          ok: true,
          intentId: "20000000-0000-4000-8000-000000000003",
          requestKey: input.requestKey,
          state: "accepted",
          threadId: "20000000-0000-4000-8000-000000000001",
          messageId: "20000000-0000-4000-8000-000000000002",
          ...sendingReceipt,
          signatureAppended: input.appendSignature,
        },
      });
    }
    return route.fulfill({
      status: 500,
      json: { message: `Unexpected synthetic route: ${path}` },
    });
  });
  await page.goto("/__test/email-compose");
  return state;
}
async function open(page: Page) {
  await page.getByRole("button", { name: "Mail contact", exact: true }).click();
  await page
    .getByLabel("Subject", { exact: true })
    .fill("Synthetic local review");
  await page.getByLabel("Message", { exact: true }).fill(original);
  await page.getByLabel("From mailbox").selectOption(sendingMailbox.id);
}
async function rewrite(page: Page) {
  await page
    .getByRole("button", { name: "Rewrite with Meri", exact: true })
    .click();
  await expectMailMessage(page, "Verified rewritten draft.");
  await expect(
    page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
  ).toBeEnabled();
}

for (const enabled of [true, false])
  test(`saved signature display preserves append=${enabled} without copying HTML into the body`, async ({
    page,
  }) => {
    const state = await setup(page, { html: savedHtml, enabled });
    await open(page);
    const editor = page.getByRole("dialog", { name: "New email", exact: true });
    await expect(
      editor
        .frameLocator('iframe[title="Saved signature preview"]')
        .getByText("Synthetic Sender", { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Append my saved signature")).toBeChecked({
      checked: enabled,
    });
    await page
      .getByRole("button", { name: "Review email", exact: true })
      .click();
    const review = page.getByRole("dialog", {
      name: "Send email",
      exact: true,
    });
    await expect(
      review.locator('iframe[title="Saved signature preview"]'),
    ).toHaveCount(enabled ? 1 : 0);
    await review
      .getByRole("button", { name: "Send email", exact: true })
      .click();
    await expect.poll(() => state.sends.length).toBe(1);
    await expect(page.getByText("Email sent.", { exact: true })).toBeVisible();
    expect(state.sends[0]).toMatchObject({
      bodyHtml: `<p>${original}</p>`,
      appendSignature: enabled,
    });
    expect(state.sends[0]?.bodyHtml).not.toContain("Synthetic Sender");
    expect(state.rewrites).toHaveLength(0);
  });

test("saved signature preview blocks active markup and automatic remote content", async ({
  page,
}) => {
  const state = await setup(page, {
    enabled: true,
    html:
      savedHtml +
      '<script>window.__signatureExecuted=true</script><img src="https://signature.example.test/pixel" onerror="window.__signatureExecuted=true" alt="Remote logo">' +
      '<map name="links"><area href="https://signature.example.test/map"></map><a href="https://signature.example.test/click">Signature link</a><iframe src="https://signature.example.test/frame"></iframe>' +
      '<form action="https://signature.example.test/form"><input name="secret"></form><div style="background-image:url(https://signature.example.test/css)">Styled identity</div>' +
      '<img alt="Inline logo" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=">',
  });
  await open(page);
  const preview = page.frameLocator('iframe[title="Saved signature preview"]');
  await expect(
    preview.getByText("Synthetic Sender", { exact: true }),
  ).toBeVisible();
  await expect(preview.getByAltText("Inline logo")).toBeVisible();
  await expect(
    preview.locator("script,iframe,form,[href],img[src^='https:'],[onerror]"),
  ).toHaveCount(0);
  await expect(
    page.locator('iframe[title="Saved signature preview"]'),
  ).toHaveAttribute("sandbox", "");
  expect(state.remote).toEqual([]);
  expect(state.sends).toEqual([]);
});

for (const html of [null, ""])
  test(`empty signature ${String(html)} has no misleading preview`, async ({
    page,
  }) => {
    await setup(page, { html, enabled: false });
    await open(page);
    await expect(
      page.getByText("No saved signature is available.", { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Append my saved signature")).toBeDisabled();
    await expect(
      page.locator('iframe[title="Saved signature preview"]'),
    ).toHaveCount(0);
  });

test("signature read failure remains distinct from empty and can be retried deliberately", async ({
  page,
}) => {
  const state = await setup(page);
  state.signatureStatus = 503;
  await open(page);
  const signature = page.getByRole("region", { name: "Saved signature" });
  await expect(signature.getByRole("alert")).toContainText(
    "Signature temporarily unavailable",
  );
  await expect(
    page.getByText("No saved signature is available.", { exact: true }),
  ).toHaveCount(0);
  state.signatureStatus = 200;
  await signature.getByRole("button", { name: "Retry signature" }).click();
  await expect(
    signature
      .frameLocator('iframe[title="Saved signature preview"]')
      .getByText("Synthetic Sender", { exact: true }),
  ).toBeVisible();
  expect(state.sends).toEqual([]);
});

test("local Undo restores exactly the body preceding the latest verified rewrite with no extra requests", async ({
  page,
}) => {
  const state = await setup(page);
  await open(page);
  await rewrite(page);
  await page
    .getByRole("button", { name: "Undo Meri rewrite", exact: true })
    .click();
  await expectMailMessage(page, original);
  await expect(
    page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
  ).toHaveCount(0);
  expect(state.rewrites).toHaveLength(1);
  expect(state.sends).toEqual([]);
});

test("manual edits retire Undo and the next rewrite snapshots the new local draft", async ({
  page,
}) => {
  const state = await setup(page);
  await open(page);
  await rewrite(page);
  await page.getByLabel("Message", { exact: true }).fill("Newer manual work.");
  await expect(
    page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
  ).toHaveCount(0);
  await rewrite(page);
  await page
    .getByRole("button", { name: "Undo Meri rewrite", exact: true })
    .click();
  await expectMailMessage(page, "Newer manual work.");
  expect(state.rewrites).toHaveLength(2);
  expect(state.sends).toEqual([]);
});

test("repeated rewrites retain one latest snapshot and Undo is unavailable while another rewrite awaits", async ({
  page,
}) => {
  const state = await setup(page);
  await open(page);
  await rewrite(page);
  state.hold = true;
  state.rewriteResult.bodyHtml = "<p>Second verified revision.</p>";
  await page
    .getByRole("button", { name: "Rewrite with Meri", exact: true })
    .click();
  await expect.poll(() => state.rewrites.length).toBe(2);
  await expect(
    page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
  ).toBeDisabled();
  state.release();
  await expectMailMessage(page, "Second verified revision.");
  await page
    .getByRole("button", { name: "Undo Meri rewrite", exact: true })
    .click();
  await expectMailMessage(page, "Verified rewritten draft.");
  await expect(
    page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
  ).toHaveCount(0);
  expect(state.rewrites).toHaveLength(2);
  expect(state.sends).toEqual([]);
});

for (const failed of [false, true])
  test(`${failed ? "failed" : "unverified"} subsequent rewrite retains the prior valid Undo`, async ({
    page,
  }) => {
    const state = await setup(page);
    await open(page);
    await rewrite(page);
    state.rewriteResult.verified = false;
    state.rewriteStatus = failed ? 503 : 200;
    await page
      .getByRole("button", { name: "Rewrite with Meri", exact: true })
      .click();
    await expect.poll(() => state.rewrites.length).toBe(2);
    if (failed)
      await expect(
        page.getByRole("group", { name: "Draft rewrite status" }),
      ).toContainText("Synthetic rewrite failure");
    else await expect(page.getByText(/Meri could not verify/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Undo Meri rewrite", exact: true })
      .click();
    await expectMailMessage(page, original);
    expect(state.sends).toEqual([]);
  });

for (const change of [
  "recipients",
  "client",
  "actor",
  "invalidated",
  "close",
] as const)
  test(`${change} replacement retires an earlier Undo snapshot`, async ({
    page,
  }) => {
    const state = await setup(page);
    await open(page);
    await rewrite(page);
    if (change === "recipients") {
      await page.getByRole("button", { name: "Cc", exact: true }).click();
      await page.getByLabel("Cc", { exact: true }).fill("copy@example.test");
      await page.getByLabel("Cc", { exact: true }).fill("");
    } else if (change === "client") {
      await page.evaluate(() =>
        window.__mailChangeClient?.("10000000-0000-4000-8000-000000000002"),
      );
      await expect(
        page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
      ).toHaveCount(0);
      await page.evaluate(() =>
        window.__mailChangeClient?.("10000000-0000-4000-8000-000000000001"),
      );
    } else if (change === "actor") {
      state.actor = "actor-b";
      await page.evaluate(() => window.__mailRecheck?.());
      state.actor = "actor-a";
      await page.evaluate(() => window.__mailRecheck?.());
    } else if (change === "invalidated") {
      await page.evaluate(() => window.__mailInvalidate?.());
      await page.evaluate(() => window.__mailRecheck?.());
    } else {
      await page.keyboard.press("Escape");
      await open(page);
    }
    await expect(
      page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
    ).toHaveCount(0);
    expect(state.rewrites).toHaveLength(1);
    expect(state.sends).toEqual([]);
  });

test("append selection is local to the message and controls review inclusion", async ({
  page,
}) => {
  const state = await setup(page);
  await open(page);
  await page.getByLabel("Append my saved signature").uncheck();
  await page.getByRole("button", { name: "Review email", exact: true }).click();
  const review = page.getByRole("dialog", { name: "Send email", exact: true });
  await expect(
    review.locator('iframe[title="Saved signature preview"]'),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByLabel("Append my saved signature").check();
  await page.getByRole("button", { name: "Review email", exact: true }).click();
  await expect(
    review
      .frameLocator('iframe[title="Saved signature preview"]')
      .getByText("Synthetic Sender", { exact: true }),
  ).toBeVisible();
  expect(state.signature.enabled).toBe(true);
  expect(state.sends).toEqual([]);
});

test("saved signature and Undo remain usable in desktop and mobile dark review", async ({
  page,
}, testInfo) => {
  await setup(page);
  await open(page);
  await rewrite(page);
  await page.screenshot({
    path: testInfo.outputPath("mail-local-desktop.png"),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  const dialog = page.getByRole("dialog", { name: "New email", exact: true });
  await expect(dialog).toBeVisible();
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Undo Meri rewrite", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath("mail-local-mobile-dark.png"),
  });
  await page
    .getByRole("button", { name: "Undo Meri rewrite", exact: true })
    .click();
  await expectMailMessage(page, original);
});

for (const response of [403, 503, "loading"] as const)
  test(`cached signature ${response} refetch cannot supply a current review preview`, async ({
    page,
  }) => {
    await page.clock.install();
    const state = await setup(page);
    await open(page);
    await expect(
      page
        .frameLocator('iframe[title="Saved signature preview"]')
        .getByText("Synthetic Sender", { exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("dialog", { name: "New email", exact: true }),
    ).toHaveCount(0);
    await page.clock.fastForward(31_000);
    state.signatureStatus = response === "loading" ? 200 : response;
    state.holdSignature = response === "loading";
    await open(page);
    await expect.poll(() => state.signatureReads).toBe(2);
    const signature = page.getByRole("region", { name: "Saved signature" });
    if (response !== "loading")
      await expect(signature.getByRole("alert")).toBeVisible();
    try {
      await page
        .getByRole("button", { name: "Review email", exact: true })
        .click();
      const review = page.getByRole("dialog", {
        name: "Send email",
        exact: true,
      });
      await expect(
        review.locator('iframe[title="Saved signature preview"]'),
      ).toHaveCount(0);
      await expect(
        review.getByText(
          response === "loading"
            ? "Signature preview was still loading when this review opened. Close this review and review again after it loads."
            : "Saved signature preview is unavailable. Close this review to retry loading it.",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(
        review.getByText(
          "Your saved signature will be requested when this email is sent.",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(
        signature.locator('iframe[title="Saved signature preview"]'),
      ).toHaveCount(0);
      await review
        .getByRole("button", { name: "Send email", exact: true })
        .click();
      await expect.poll(() => state.sends.length).toBe(1);
      await expect(
        page.getByText("Email sent.", { exact: true }),
      ).toBeVisible();
      expect(state.sends[0]).toMatchObject({
        bodyHtml: `<p>${original}</p>`,
        appendSignature: true,
      });
      expect(state.sends[0]?.bodyHtml).not.toContain("Synthetic Sender");
      expect(state.rewrites).toEqual([]);
      expect(state.remote).toEqual([]);
    } finally {
      state.releaseSignature();
    }
  });
