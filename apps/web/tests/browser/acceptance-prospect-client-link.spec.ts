import { test, expect, type Page } from "@playwright/test";
import { clientId } from "./fixtures";
import {
  failureText,
  installProspectRead,
  prepareProspectRead,
  prospectDetail,
} from "./acceptance-prospect-fixtures";

const choice = {
  id: clientId,
  name: "Synthetic accessible client",
  canonicalEntityId: null,
};
const path = "**/business-development/search/clients?**";

async function selectClient(page: Page) {
  await page.goto(prospectDetail);
  await page
    .getByRole("button", { name: "Link existing client", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: /Link Test Prospect/ });
  await dialog.getByRole("radio", { name: choice.name, exact: true }).check();
  await dialog.getByRole("checkbox", { name: /Link this prospect/ }).check();
  await expect(
    dialog.getByRole("button", { name: "Confirm link", exact: true }),
  ).toBeEnabled();
  return dialog;
}

for (const status of [403, 503] as const) {
  test(`existing-client ${status} current read revokes old selection and requires fresh confirmation after held recovery`, async ({
    page,
    baseURL,
  }) => {
    const session = await prepareProspectRead(page, baseURL);
    const read = await installProspectRead(page, path, { results: [choice] });
    const dialog = await selectClient(page);
    read.fail(status);
    await session.reread();
    await expect(dialog.getByRole("alert")).toContainText(failureText(status));
    await expect(dialog.getByRole("radio")).toHaveCount(0);
    await expect(dialog.getByRole("checkbox")).toHaveCount(0);
    await expect(
      dialog.getByRole("button", { name: "Confirm link", exact: true }),
    ).toBeDisabled();
    const recovered = { ...choice, name: "Currently accessible client" };
    const release = read.holdRecovery({ results: [recovered] });
    const before = read.reads();
    await dialog.getByRole("button", { name: "Retry", exact: true }).click();
    await expect.poll(read.reads).toBeGreaterThan(before);
    await expect(dialog.getByRole("radio")).toHaveCount(0);
    await expect(
      dialog.getByRole("button", { name: "Confirm link", exact: true }),
    ).toBeDisabled();
    release();
    const currentChoice = dialog.getByRole("radio", {
      name: recovered.name,
      exact: true,
    });
    await expect(currentChoice).toBeVisible();
    await expect(currentChoice).not.toBeChecked();
    await expect(dialog.getByRole("checkbox")).toHaveCount(0);
    await expect(
      dialog.getByRole("button", { name: "Confirm link", exact: true }),
    ).toBeDisabled();
    await currentChoice.check();
    await expect(dialog.getByRole("checkbox")).not.toBeChecked();
    await dialog.getByRole("checkbox", { name: /Link this prospect/ }).check();
    await expect(
      dialog.getByRole("button", { name: "Confirm link", exact: true }),
    ).toBeEnabled();
    session.assertNoEffects();
  });
}

test("changing client search cannot dispatch a confirmation from a previous result set", async ({
  page,
  baseURL,
}) => {
  const session = await prepareProspectRead(page, baseURL);
  const read = await installProspectRead(page, path, { results: [choice] });
  const dialog = await selectClient(page);
  const release = read.holdRecovery({ results: [] });
  const before = read.reads();
  await dialog
    .getByLabel("Find an existing client", { exact: true })
    .fill("No current matches");
  await expect.poll(read.reads).toBeGreaterThan(before);
  await expect(dialog.getByRole("checkbox")).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: "Confirm link", exact: true }),
  ).toBeDisabled();
  release();
  await expect(
    dialog.getByText("No matching accessible clients.", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Confirm link", exact: true }),
  ).toBeDisabled();
  await expect(dialog.getByRole("radio")).toHaveCount(0);
  session.assertNoEffects();
});
