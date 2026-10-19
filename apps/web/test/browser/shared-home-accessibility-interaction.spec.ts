import { test, expect } from "@playwright/test";
import {
  tabTo,
  expectFocusEvidence,
  observeHomeIsolation,
} from "../accessibility-interaction";
import {
  actionHostFixture,
  actionClient,
  actionUrl,
  expectActionIsolation,
} from "./meri-action-host-fixtures";
import { operationFixtures, testIdentity } from "./fixtures";

const homeUrl = `/meri/fixture/home?clientId=${actionClient.id}`;
const notices = {
  conversations:
    "Disconnected synthetic fixture. Jordan, Anduril, recent titles, answer, citations and approval counts are samples. Drafts stay in this page only.",
  actions: "Recommendation actions require a verified action connection.",
};
for (const width of [1440, 390]) {
  for (const mode of ["conversations", "actions"] as const) {
    test(`Meri semantic correction: ${width}px ${mode} footer exposes its scoped notice within contentinfo`, async ({
      page,
    }, testInfo) => {
      const fixture = await actionHostFixture(page);
      const assertIsolation = await observeHomeIsolation(page, testInfo);
      await page.setViewportSize({
        width,
        height: width === 1440 ? 1040 : 844,
      });
      await page.goto(mode === "conversations" ? homeUrl : actionUrl());
      if (mode === "conversations")
        await expect(
          page.getByLabel("Message draft", { exact: true }),
        ).toBeVisible();
      else
        await expect(
          page.getByRole("button", {
            name: "Connect action service",
            exact: true,
          }),
        ).toBeEnabled();
      const footer = page.getByRole("contentinfo");
      await expect(footer).toHaveCount(1);
      const note = footer.getByRole("note");
      await expect(note).toHaveCount(1);
      await note.scrollIntoViewIfNeeded();
      await expect(note).toBeVisible();
      await expect(note).toBeInViewport();
      await expect(note).toHaveText(notices[mode]);
      expect(
        await note.evaluate((element) =>
          Boolean(element.closest('[aria-hidden="true"], [hidden], [inert]')),
        ),
      ).toBe(false);
      await testInfo.attach("footer-in-view", {
        body: await page.screenshot(),
        contentType: "image/png",
      });
      expect(fixture.actions()).toEqual([]);
      expectActionIsolation(fixture);
      assertIsolation();
    });
  }
}

test("Meri positive control: phone suggestion remains reachable by keyboard and creates only a local draft", async ({
  page,
}, testInfo) => {
  const fixture = await actionHostFixture(page);
  const assertIsolation = await observeHomeIsolation(page, testInfo);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(homeUrl);
  const start = page.getByRole("button", {
    name: "Start research draft",
    exact: true,
  });
  await tabTo(page, start);
  await expectFocusEvidence(start, testInfo);
  await page.keyboard.press("Enter");
  const draft = page.getByLabel("Message draft", { exact: true });
  await expect(draft).toHaveValue("Help me research a question about ");
  await expect(draft).toBeFocused();
  expect(fixture.actions()).toEqual([]);
  expectActionIsolation(fixture);
  assertIsolation();
});

test("Meri semantic correction: named suggestions group preserves three Start controls without becoming a focus stop", async ({
  page,
}, testInfo) => {
  const fixture = await actionHostFixture(page);
  const assertIsolation = await observeHomeIsolation(page, testInfo);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(homeUrl);
  const group = page.getByRole("group", {
    name: "Draft suggestions",
    exact: true,
  });
  await expect(group).toBeVisible();
  const starts = group.getByRole("button", { name: /^Start .+ draft$/ });
  await expect(starts).toHaveCount(3);
  expect(
    await group.evaluate((element) => (element as HTMLElement).tabIndex),
  ).toBe(-1);
  expect(fixture.actions()).toEqual([]);
  expectActionIsolation(fixture);
  assertIsolation();
});

test("Modules semantic correction: fixture warning remains visible in a named complementary landmark", async ({
  page,
}, testInfo) => {
  await operationFixtures(page, {
    "me.read": testIdentity,
    "clients.list": [],
  });
  const assertIsolation = await observeHomeIsolation(page, testInfo);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/modules");
  await expect(
    page.getByLabel("Client profile scope", { exact: true }),
  ).toBeEnabled();
  const notice = page.getByRole("complementary", {
    name: "Local test fixture",
    exact: true,
  });
  await expect(notice).toHaveCount(1);
  await expect(notice).toBeVisible();
  await expect(notice).toHaveText(
    "Explicit local test fixture · synthetic identity and records",
  );
  expect(
    await notice.evaluate((element) => (element as HTMLElement).tabIndex),
  ).toBe(-1);
  assertIsolation();
});
