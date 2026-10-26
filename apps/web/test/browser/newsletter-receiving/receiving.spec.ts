import { expect, test } from "@playwright/test";
import {
  fixture,
  stageHref,
  stageId,
  recordId,
  clientId,
  otherId,
  deferred,
} from "./fixtures";

test("navigation reads the exact stage; explicit open returns a bound record and reload reads only that record", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto(`${stageHref}&clientId=${clientId}`);
  await expect(
    page.getByRole("heading", { name: "Staged newsletter", exact: true }),
  ).toBeVisible();
  expect(state.requests.every((r) => r.method === "GET")).toBe(true);
  await expect(
    page.getByText("Saved revision 4", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("staged.png"),
    fullPage: true,
  });
  state.openGate = deferred();
  await page
    .getByRole("button", { name: "Open in Engagement", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Open in Engagement", exact: true }),
  ).toBeDisabled();
  await expect
    .poll(() => state.requests.filter((r) => r.method === "POST").length)
    .toBe(1);
  state.openGate.resolve();
  await expect(page).toHaveURL(new RegExp(`newsletter=${recordId}`));
  await expect(
    page.getByRole("heading", { name: "Engagement record", exact: true }),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.get("clientId")).toBe(clientId);
  expect(state.requests.find((r) => r.method === "POST")?.input).toEqual({
    params: { id: stageId },
  });
  await page.screenshot({
    path: test.info().outputPath("record.png"),
    fullPage: true,
  });
  state.record.status = "sent";
  await page.getByRole("button", { name: "Refresh record" }).click();
  await expect(page.getByText("Status: sent", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Status: sent", { exact: true })).toBeVisible();
  expect(state.requests.filter((r) => r.method === "POST")).toHaveLength(1);
  expect(
    state.requests
      .filter((r) => r.key.endsWith(".record"))
      .every(
        (r) =>
          JSON.stringify(r.input) ===
          JSON.stringify({ params: { id: recordId } }),
      ),
  ).toBe(true);
  expect(state.unexpected).toEqual([]);
});

test("unconfirmed open removes private preview and offers no retry or new stage", async ({
  page,
}) => {
  const state = await fixture(page);
  state.openFailure = true;
  await page.goto(stageHref);
  await page
    .getByRole("button", { name: "Open in Engagement", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Open not confirmed", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "A draft may have been created or reused, but its result was not received.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Open|Retry|Refresh|Check/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Saved stage rendering" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Weekly policy briefing" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Back to Outreach" }),
  ).toHaveAttribute("href", "/modules/engagement?view=outreach");
  await page.screenshot({
    path: test.info().outputPath("unknown.png"),
    fullPage: true,
  });
  expect(state.requests.filter((r) => r.method === "POST")).toHaveLength(1);
  expect(state.unexpected).toEqual([]);
});

test("mismatched successful open is uncertain and never navigates to the wrong record", async ({
  page,
}) => {
  const state = await fixture(page);
  state.record.stage.id = otherId;
  await page.goto(stageHref);
  await page
    .getByRole("button", { name: "Open in Engagement", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Open not confirmed", exact: true }),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.has("newsletter")).toBe(false);
  expect(state.requests.filter((r) => r.method === "POST")).toHaveLength(1);
});

test("wrong selected client and revoked record refuse current content without opening", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto(`${stageHref}&clientId=${otherId}`);
  await expect(
    page.getByText(
      "This newsletter is unavailable for your current access or does not match this link.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open in Engagement", exact: true }),
  ).toHaveCount(0);
  await page.goto(
    `/modules/engagement?newsletter=${recordId}&clientId=${clientId}`,
  );
  await expect(
    page.getByRole("heading", { name: "Engagement record", exact: true }),
  ).toBeVisible();
  state.refused = true;
  await page.getByRole("button", { name: "Refresh record" }).click();
  await expect(
    page.getByText(
      "This newsletter is unavailable for your current access or does not match this link.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Weekly policy briefing" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Saved stage rendering" }),
  ).toHaveCount(0);
  expect(state.requests.every((r) => r.method === "GET")).toBe(true);
});

test("session replacement and changed stage dispose late reads and open completions", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto(stageHref);
  await expect(
    page.getByRole("heading", { name: "Staged newsletter", exact: true }),
  ).toBeVisible();
  state.openGate = deferred();
  await page
    .getByRole("button", { name: "Open in Engagement", exact: true })
    .click();
  await expect
    .poll(() => state.requests.filter((r) => r.method === "POST").length)
    .toBe(1);
  state.refused = true;
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test:session", {
        detail: {
          userId: "other-actor",
          sessionId: "other-session",
          orgId: "other-tenant",
        },
      }),
    ),
  );
  await expect(
    page.getByText(
      "This newsletter is unavailable for your current access or does not match this link.",
      { exact: true },
    ),
  ).toBeVisible();
  state.openGate.resolve();
  await expect(
    page.getByRole("heading", { name: "Engagement record", exact: true }),
  ).toHaveCount(0);
  expect(new URL(page.url()).searchParams.has("newsletter")).toBe(false);
  expect(state.requests.filter((r) => r.method === "POST")).toHaveLength(1);
  state.refused = false;
  state.readGate = deferred();
  await page.goto(stageHref);
  await expect
    .poll(() => state.requests.filter((r) => r.key.endsWith(".stage")).length)
    .toBeGreaterThan(2);
  await page.evaluate((id) => {
    window.history.pushState(
      {},
      "",
      `/modules/engagement?newsletterStage=${id}`,
    );
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, otherId);
  state.readGate.resolve();
  await expect(
    page.getByText(
      "This newsletter is unavailable for your current access or does not match this link.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Weekly policy briefing" }),
  ).toHaveCount(0);
});

test("invalid links remain inert; narrow keyboard stage and plain text controls stay reachable", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto(`${stageHref}&newsletter=${recordId}`);
  await expect(
    page.getByRole("heading", { name: "Newsletter unavailable" }),
  ).toBeVisible();
  expect(state.requests).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(stageHref);
  await expect(
    page.getByRole("heading", { name: "Staged newsletter", exact: true }),
  ).toBeVisible();
  const open = page.getByRole("button", {
    name: "Open in Engagement",
    exact: true,
  });
  await open.focus();
  await expect(open).toBeFocused();
  const plain = page.getByRole("button", { name: "Show plain text" });
  await plain.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Newsletter plain text")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await open.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: test.info().outputPath("narrow.png"),
    fullPage: false,
  });
  expect(state.requests.every((r) => r.method === "GET")).toBe(true);
  expect(state.unexpected).toEqual([]);
});
