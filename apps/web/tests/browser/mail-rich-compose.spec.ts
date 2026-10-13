import { test, expect, type Page } from "@playwright/test";
import { sendingMailbox, sendingReceipt } from "./fixtures";
import { delayMailSelectionObservation } from "./rich-mail-selection-fixture";

async function setup(page: Page) {
  const state = {
    actor: "actor-a",
    rewrites: [] as Record<string, unknown>[],
    sends: [] as Record<string, unknown>[],
    unexpected: [] as string[],
    held: false,
    release: () => {},
    verified: true,
    rewriteStatus: 200,
  };
  const localOrigin = new URL(String(test.info().project.use.baseURL)).origin;
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin === localOrigin) return route.continue();
    state.unexpected.push(url.href);
    return route.abort();
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
          role: "standard_user",
        },
      });
    if (path === "me/email-signature")
      return route.fulfill({
        json: { html: "<p>Saved synthetic signature</p>", enabled: true },
      });
    if (path === "engagement/mail/mailboxes")
      return route.fulfill({ json: [sendingMailbox] });
    if (path?.endsWith("/people")) return route.fulfill({ json: [] });
    if (path === "engagement/mail/rewrite") {
      state.rewrites.push(route.request().postDataJSON());
      if (state.held)
        await new Promise<void>((resolve) => {
          state.release = resolve;
        });
      return route
        .fulfill({
          status: state.rewriteStatus,
          json:
            state.rewriteStatus === 200
              ? {
                  bodyHtml: "<p>Verified rewrite.</p>",
                  verified: state.verified,
                }
              : { message: "Synthetic rewrite unavailable" },
        })
        .catch(() => {});
    }
    if (path === "engagement/mail/send") {
      state.sends.push(route.request().postDataJSON());
      return route.fulfill({
        json: {
          ok: true,
          threadId: "20000000-0000-4000-8000-000000000001",
          messageId: "20000000-0000-4000-8000-000000000002",
          ...sendingReceipt,
          signatureAppended: true,
        },
      });
    }
    state.unexpected.push(path ?? route.request().url());
    return route.fulfill({
      status: 500,
      json: { message: "Unexpected synthetic route" },
    });
  });
  await page.goto("/__test/email-compose");
  await page.getByRole("button", { name: "Mail contact", exact: true }).click();
  await page
    .getByLabel("Subject", { exact: true })
    .fill("Rich synthetic message");
  await page.getByLabel("From mailbox").selectOption(sendingMailbox.id);
  return state;
}
const message = (page: Page) =>
  page.getByRole("textbox", { name: "Message", exact: true });
async function format(page: Page, name: string, text = "Original rich draft.") {
  await message(page).fill(text);
  await message(page).press("ControlOrMeta+a");
  await page.getByRole("button", { name, exact: true }).click();
}
async function review(page: Page) {
  await page.getByRole("button", { name: "Review email", exact: true }).click();
  return page.getByRole("dialog", { name: "Send email", exact: true });
}

for (const [name, tag] of [
  ["Bold", "strong"],
  ["Italic", "em"],
  ["Underline", "u"],
  ["List", "ul > li"],
] as const) {
  test(`rich ${name} survives review and explicit send without signature duplication`, async ({
    page,
  }) => {
    const state = await setup(page);
    await format(page, name);
    await expect(message(page).locator(tag)).toHaveText("Original rich draft.");
    const reviewed = await review(page);
    await expect(
      reviewed.getByRole("region", { name: "Message preview" }).locator(tag),
    ).toHaveText("Original rich draft.");
    expect(state.sends).toHaveLength(0);
    await reviewed
      .getByRole("button", { name: "Send email", exact: true })
      .click();
    await expect.poll(() => state.sends.length).toBe(1);
    expect(state.sends[0]?.bodyHtml).toContain(
      name === "List"
        ? "<ul><li><p>Original rich draft.</p></li></ul>"
        : `<${tag}>Original rich draft.</${tag}>`,
    );
    expect(state.sends[0]?.appendSignature).toBe(true);
    expect(state.sends[0]?.bodyHtml).not.toContain("signature");
    expect(state.unexpected).toEqual([]);
  });
}

test("verified rewrite uses text and Undo restores the complete formatted draft", async ({
  page,
}) => {
  const state = await setup(page);
  await format(page, "Bold");
  const before = await message(page).innerHTML();
  await page
    .getByRole("button", { name: "Rewrite with Meri", exact: true })
    .click();
  await expect(message(page)).toHaveText("Verified rewrite.");
  expect(state.rewrites[0]?.rawText).toBe("Original rich draft.");
  await page
    .getByRole("button", { name: "Undo Meri rewrite", exact: true })
    .click();
  await expect(message(page)).toHaveJSProperty("innerHTML", before);
  await expect(
    page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
  ).toHaveCount(0);
});

test("formatting-only edit revokes a held rewrite without replacing current formatting", async ({
  page,
}) => {
  const state = await setup(page);
  state.held = true;
  await message(page).fill("Original rich draft.");
  await page
    .getByRole("button", { name: "Rewrite with Meri", exact: true })
    .click();
  await expect.poll(() => state.rewrites.length).toBe(1);
  await message(page).press("ControlOrMeta+a");
  await page.getByRole("button", { name: "Italic", exact: true }).click();
  state.release();
  await expect(message(page).locator("em")).toHaveText("Original rich draft.");
  await expect(
    page.getByRole("button", { name: "Rewrite with Meri", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
  ).toHaveCount(0);
});

for (const failure of ["unverified", "unavailable"])
  test(`${failure} rewrite preserves rich content`, async ({ page }) => {
    const state = await setup(page);
    state.verified = failure !== "unverified";
    state.rewriteStatus = failure === "unavailable" ? 503 : 200;
    await format(page, "Underline");
    const before = await message(page).innerHTML();
    await page
      .getByRole("button", { name: "Rewrite with Meri", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Rewrite with Meri", exact: true }),
    ).toBeEnabled();
    await expect(message(page)).toHaveJSProperty("innerHTML", before);
    await expect(
      page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
    ).toHaveCount(0);
  });

test("paste keeps supported formatting while removing active markup and remote content", async ({
  page,
}) => {
  const state = await setup(page);
  await expect(
    page.getByRole("button", { name: "Bold", exact: true }),
  ).toBeVisible();
  await message(page).focus();
  await message(page).evaluate((element) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData(
      "text/html",
      '<p><strong>Safe bold</strong> <u>underlined</u><script>window.__mailPasted=true</script><img src="https://mail.example.test/pixel" onerror="window.__mailPasted=true"><a href="https://mail.example.test/link">Literal link text</a></p><ul><li>Safe item</li></ul><style>body{display:none}</style><iframe src="https://mail.example.test/frame"></iframe>',
    );
    element.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  await expect(message(page).locator("strong")).toHaveText("Safe bold");
  await expect(message(page).locator("li")).toHaveText("Safe item");
  await expect(
    message(page).locator("script,style,img[src],a,iframe,[onerror],[href]"),
  ).toHaveCount(0);
  const reviewed = await review(page);
  await expect(
    reviewed.getByRole("region", { name: "Message preview" }).locator("strong"),
  ).toHaveText("Safe bold");
  expect(
    await page.evaluate(
      () => (window as unknown as { __mailPasted?: boolean }).__mailPasted,
    ),
  ).toBeUndefined();
  await expect(
    reviewed
      .getByRole("region", { name: "Message preview" })
      .locator("img,script,style,a,iframe,[onerror],[href]"),
  ).toHaveCount(0);
  await reviewed
    .getByRole("button", { name: "Send email", exact: true })
    .click();
  await expect.poll(() => state.sends.length).toBe(1);
  expect(state.sends[0]?.bodyHtml).not.toMatch(
    /<(?:img|script|style|a|iframe)\b|onerror=|href=/,
  );
  expect(state.unexpected).toEqual([]);
});

test("empty and oversized rich bodies cannot be reviewed, and typed text is retained", async ({
  page,
}) => {
  const state = await setup(page);
  await expect(
    page.getByRole("button", { name: "Bold", exact: true }),
  ).toBeVisible();
  await review(page);
  await expect(
    page.getByRole("dialog", { name: "Send email", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Enter a message.", { exact: true }),
  ).toBeVisible();
  const long = "a".repeat(8001);
  await message(page).fill(long);
  await review(page);
  await expect(
    page.getByText("Keep the message to 8,000 characters.", { exact: true }),
  ).toBeVisible();
  await expect(message(page)).toHaveText(long);
  expect(state.sends).toHaveLength(0);
});

test("keyboard formatting and mobile toolbar remain reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await setup(page);
  await expect(
    page.getByRole("button", { name: "Bold", exact: true }),
  ).toBeVisible();
  await message(page).fill("Keyboard rich draft.");
  await message(page).press("ControlOrMeta+a");
  await message(page).press("ControlOrMeta+b");
  await expect(message(page).locator("strong")).toHaveText(
    "Keyboard rich draft.",
  );
  for (const name of ["Bold", "Italic", "Underline", "List"]) {
    const button = page.getByRole("button", { name, exact: true });
    await button.focus();
    await expect(button).toBeFocused();
    const box = await button.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  }
  await page.screenshot({
    path: test.info().outputPath("mobile-rich.png"),
  });
  expect(state.unexpected).toEqual([]);
});

test("identity invalidation revokes rich Undo without provider effects", async ({
  page,
}) => {
  const state = await setup(page);
  await format(page, "Bold");
  await page
    .getByRole("button", { name: "Rewrite with Meri", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
  ).toBeVisible();
  await page.evaluate(() =>
    (
      window as unknown as { __mailInvalidate: () => Promise<unknown> }
    ).__mailInvalidate(),
  );
  await expect(
    page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
  ).toHaveCount(0);
  await expect(message(page)).toHaveText("Verified rewrite.");
  await message(page).press("ControlOrMeta+z");
  await expect(message(page)).toHaveText("Verified rewrite.");
  expect(state.sends).toHaveLength(0);
});

test("source replacement retires editor history and rich Meri Undo", async ({
  page,
}) => {
  const state = await setup(page);
  await format(page, "Bold");
  await page
    .getByRole("button", { name: "Rewrite with Meri", exact: true })
    .click();
  await expect(message(page)).toHaveText("Verified rewrite.");
  await page.evaluate(() =>
    window.__mailChangeClient?.("10000000-0000-4000-8000-000000000099"),
  );
  await expect(
    page.getByRole("button", { name: "Undo Meri rewrite", exact: true }),
  ).toHaveCount(0);
  await message(page).press("ControlOrMeta+z");
  await expect(message(page)).toHaveText("Verified rewrite.");
  expect(state.sends).toHaveLength(0);
});

test("toolbar Attach file opens the existing attachment picker with no extra request", async ({
  page,
}) => {
  const state = await setup(page);
  await format(page, "Bold");
  const chooserPromise = page.waitForEvent("filechooser");
  await page
    .getByRole("group", { name: "Message formatting" })
    .getByRole("button", { name: "Attach file", exact: true })
    .click();
  const chooser = await chooserPromise;
  expect(await chooser.element().getAttribute("type")).toBe("file");
  expect(
    await chooser
      .element()
      .evaluate(
        (element) =>
          element ===
          document.querySelector(
            'section[aria-label="Email attachments"] input[type="file"]',
          ),
      ),
  ).toBe(true);
  await chooser.setFiles([]);
  expect(state.sends).toHaveLength(0);
  expect(state.rewrites).toHaveLength(0);
  expect(state.unexpected).toEqual([]);
  await page
    .getByRole("group", { name: "Message formatting" })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath("desktop-rich.png") });
});

for (const delayed of [false, true]) {
  test(`ordinary formatting and typing keep native Undo after a verified rewrite${delayed ? " with delayed selection observation" : ""}`, async ({
    page,
  }) => {
    if (delayed) await delayMailSelectionObservation(page);
    const state = await setup(page);
    await format(page, "Bold");
    await page
      .getByRole("button", { name: "Rewrite with Meri", exact: true })
      .click();
    await expect(message(page)).toHaveText("Verified rewrite.");
    await message(page).press("ControlOrMeta+a");
    await message(page).press("ControlOrMeta+b");
    await expect(message(page).locator("strong")).toHaveText(
      "Verified rewrite.",
    );
    await message(page).press("ControlOrMeta+z");
    await expect(message(page).locator("strong")).toHaveCount(0);
    await expect(message(page)).toHaveText("Verified rewrite.");
    await message(page).press("End");
    await message(page).pressSequentially(" Added locally.");
    await expect(message(page)).toHaveText("Verified rewrite. Added locally.");
    await message(page).press("ControlOrMeta+z");
    await expect(message(page)).toHaveText("Verified rewrite.");
    if (delayed)
      await expect(page.locator("html")).toHaveAttribute(
        "data-delayed-mail-selection",
        "observed",
      );
    expect(state.rewrites).toHaveLength(1);
    expect(state.sends).toHaveLength(0);
  });
}

for (const selection of ["all", "partial"] as const) {
  test(`intentional ${selection} selection still replaces text and supports Undo`, async ({
    page,
  }) => {
    const state = await setup(page);
    await format(page, "Bold");
    await page
      .getByRole("button", { name: "Rewrite with Meri", exact: true })
      .click();
    await expect(message(page)).toHaveText("Verified rewrite.");
    if (selection === "all") await message(page).press("ControlOrMeta+a");
    else {
      await message(page).press("End");
      for (let index = 0; index < 8; index++)
        await message(page).press("Shift+ArrowLeft");
    }
    await message(page).pressSequentially("replacement");
    await expect(message(page)).toHaveText(
      selection === "all" ? "replacement" : "Verified replacement",
    );
    await message(page).press("ControlOrMeta+z");
    await expect(message(page)).toHaveText("Verified rewrite.");
    expect(state.rewrites).toHaveLength(1);
    expect(state.sends).toHaveLength(0);
    expect(state.unexpected).toEqual([]);
  });
}
