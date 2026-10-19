import { test, expect } from "@playwright/test";
import { prospectId } from "./fixtures";
import {
  failureText,
  installProspectRead,
  prepareProspectRead,
  prospectDetail,
  replaceProspectRoute,
} from "./acceptance-prospect-fixtures";

const contact = {
  id: "80000000-0000-4000-8000-000000000091",
  prospectId,
  requestId: "90000000-0000-4000-8000-000000000091",
  name: "Synthetic current contact",
  title: "Original role",
  email: "current-contact@example.test",
  phone: null,
  notes: "Synthetic original source",
  version: 1,
  createdAt: "2026-10-13T12:00:00Z",
  updatedAt: "2026-10-13T12:00:00Z",
};
const contacts = (name = contact.name) => ({
  prospectId,
  readOnly: false,
  contacts: [{ ...contact, name }],
  nextCursor: null,
});
const path = `**/business-development/prospects/${prospectId}/contacts`;

for (const status of [403, 503] as const) {
  test(`contacts ${status} current read removes cached contacts and editor through held recovery`, async ({
    page,
    baseURL,
  }) => {
    const session = await prepareProspectRead(page, baseURL);
    const read = await installProspectRead(page, path, contacts());
    await page.goto(prospectDetail);
    const card = page.locator('section[aria-label="Prospect contacts"]');
    await card
      .getByRole("button", { name: /Synthetic current contact/ })
      .click();
    const editor = page.getByRole("dialog", {
      name: contact.name,
      exact: true,
    });
    await editor
      .getByLabel("Title", { exact: true })
      .fill("Obsolete local edit");
    read.fail(status);
    await session.reread();
    await expect(card.locator('[role="alert"]')).toContainText(
      failureText(status),
    );
    await expect(editor).toHaveCount(0);
    await expect(
      card.getByRole("button", { name: /Synthetic current contact/ }),
    ).toHaveCount(0);
    await expect(
      card.getByRole("button", { name: "+ Add", exact: true }),
    ).toBeDisabled();
    const release = read.holdRecovery(contacts("Recovered current contact"));
    const before = read.reads();
    await card.getByRole("button", { name: "Retry", exact: true }).click();
    await expect.poll(read.reads).toBeGreaterThan(before);
    await expect(editor).toHaveCount(0);
    await expect(card.getByText(contact.name, { exact: true })).toHaveCount(0);
    await expect(
      card.getByRole("button", { name: "+ Add", exact: true }),
    ).toBeDisabled();
    release();
    await card
      .getByRole("button", { name: /Recovered current contact/ })
      .click();
    const currentEditor = page.getByRole("dialog", {
      name: "Recovered current contact",
      exact: true,
    });
    await expect(
      currentEditor.getByLabel("Title", { exact: true }),
    ).toHaveValue("Original role");
    await expect(
      currentEditor.getByRole("button", { name: "Save contact", exact: true }),
    ).toBeEnabled();
    session.assertNoEffects();
  });
}

test("held contact recovery cannot resurrect an old editor after route replacement", async ({
  page,
  baseURL,
}) => {
  const session = await prepareProspectRead(page, baseURL);
  const read = await installProspectRead(page, path, contacts());
  await page.goto(prospectDetail);
  const card = page.locator('section[aria-label="Prospect contacts"]');
  await card.getByRole("button", { name: /Synthetic current contact/ }).click();
  await page.getByLabel("Title", { exact: true }).fill("Former route draft");
  read.fail(403);
  await session.reread();
  await expect(card.locator('[role="alert"]')).toContainText(failureText(403));
  await expect(page.getByRole("dialog", { name: contact.name })).toHaveCount(0);
  const release = read.holdRecovery(contacts("Later current contact"));
  const before = read.reads();
  await card.getByRole("button", { name: "Retry", exact: true }).click();
  await expect.poll(read.reads).toBeGreaterThan(before);
  await replaceProspectRoute(page, "/portfolio/prospects");
  await expect(
    page.getByRole("heading", { name: "Prospects 1", exact: true, level: 1 }),
  ).toBeVisible();
  release();
  await replaceProspectRoute(page, prospectDetail);
  await expect(
    card.getByRole("button", { name: /Later current contact/ }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await card.getByRole("button", { name: "+ Add", exact: true }).click();
  await expect(page.getByLabel("Name *", { exact: true })).toHaveValue("");
  session.assertNoEffects();
});
