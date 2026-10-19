import { test, expect } from "@playwright/test";
import { json } from "./fixtures";
import {
  failureText,
  installProspectRead,
  prepareProspectRead,
} from "./acceptance-prospect-fixtures";
import {
  briefBase,
  briefRefresh,
  briefVersion,
  currentResolution,
  installSavedBrief,
  openSavedBrief,
  savedBrief,
} from "./acceptance-prospect-brief-fixtures";

for (const status of [403, 503] as const) {
  test(`brief history ${status} current read hides cached selection until held recovery succeeds`, async ({
    page,
    baseURL,
  }) => {
    const session = await prepareProspectRead(page, baseURL);
    await installSavedBrief(page);
    const history = {
      brief: savedBrief().brief,
      versions: [briefVersion(1), briefVersion(2)],
    };
    const read = await installProspectRead(
      page,
      `${briefBase}/versions`,
      history,
    );
    const dialog = await openSavedBrief(page);
    await dialog
      .getByRole("button", { name: "Version history", exact: true })
      .click();
    const panel = dialog.getByRole("region", {
      name: "Saved brief versions",
      exact: true,
    });
    await expect(
      panel.getByRole("button", { name: /^Version 1 ·/ }),
    ).toBeVisible();
    read.fail(status);
    await session.reread();
    await expect(panel.getByRole("alert")).toContainText(failureText(status));
    await expect(
      panel.getByRole("button", { name: /^Version [12] ·/ }),
    ).toHaveCount(0);
    const release = read.holdRecovery(history);
    const before = read.reads();
    await panel.getByRole("button", { name: "Retry", exact: true }).click();
    await expect.poll(read.reads).toBeGreaterThan(before);
    await expect(
      panel.getByRole("button", { name: /^Version [12] ·/ }),
    ).toHaveCount(0);
    release();
    await expect(
      panel.getByRole("button", { name: /^Version 1 ·/ }),
    ).toBeVisible();
    await expect(
      panel.getByRole("button", { name: /^Version 2 ·/ }),
    ).toBeVisible();
    session.assertNoEffects();
  });

  test(`selected brief version ${status} current read withholds its cached document through held recovery`, async ({
    page,
    baseURL,
  }) => {
    const session = await prepareProspectRead(page, baseURL);
    await installSavedBrief(page);
    await page.route(`${briefBase}/versions`, (route) =>
      json(route, {
        brief: savedBrief().brief,
        versions: [briefVersion(1), briefVersion(2)],
      }),
    );
    const immutable = briefVersion(1, "Immutable historical version text");
    const read = await installProspectRead(
      page,
      `${briefBase}/versions/1`,
      immutable,
    );
    const dialog = await openSavedBrief(page);
    await dialog
      .getByRole("button", { name: "Version history", exact: true })
      .click();
    await dialog.getByRole("button", { name: /^Version 1 ·/ }).click();
    const document = dialog.getByRole("article", {
      name: "Saved brief version 1",
      exact: true,
    });
    await expect(
      document.getByText("Immutable historical version text", { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Edit sections", exact: true }),
    ).toHaveCount(0);
    read.fail(status);
    await session.reread();
    await expect(dialog.getByRole("alert")).toContainText(failureText(status));
    await expect(document).toHaveCount(0);
    await expect(
      dialog.getByRole("button", { name: "Source 1", exact: true }),
    ).toHaveCount(0);
    const release = read.holdRecovery(immutable);
    const before = read.reads();
    await dialog.getByRole("button", { name: "Retry", exact: true }).click();
    await expect.poll(read.reads).toBeGreaterThan(before);
    await expect(document).toHaveCount(0);
    release();
    await expect(
      document.getByText("Immutable historical version text", { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Edit sections", exact: true }),
    ).toHaveCount(0);
    await dialog
      .getByRole("button", { name: "Return to current version", exact: true })
      .click();
    await expect(
      dialog.getByRole("article", {
        name: "Saved brief version 2",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Edit sections", exact: true }),
    ).toBeEnabled();
    session.assertNoEffects();
  });

  test(`brief refresh ${status} current read removes prior comparison through held recovery`, async ({
    page,
    baseURL,
  }) => {
    const session = await prepareProspectRead(page, baseURL);
    await installSavedBrief(page);
    const read = await installProspectRead(
      page,
      `${briefBase}/refresh-proposal`,
      briefRefresh("Old current dossier suggestion"),
    );
    const dialog = await openSavedBrief(page);
    await dialog
      .getByRole("button", { name: "Compare current dossier", exact: true })
      .click();
    const panel = dialog.getByRole("region", {
      name: "Refresh comparison",
      exact: true,
    });
    await expect(
      panel.getByText("Old current dossier suggestion", { exact: true }),
    ).toBeVisible();
    read.fail(status);
    await session.reread();
    await expect(panel.getByRole("alert")).toContainText(failureText(status));
    await expect(
      panel.getByText("Old current dossier suggestion", { exact: true }),
    ).toHaveCount(0);
    await expect(panel.getByText("Saved text", { exact: true })).toHaveCount(0);
    const release = read.holdRecovery(
      briefRefresh("Recovered current dossier suggestion"),
    );
    const before = read.reads();
    await panel.getByRole("button", { name: "Retry", exact: true }).click();
    await expect.poll(read.reads).toBeGreaterThan(before);
    await expect(
      panel.getByText("Old current dossier suggestion", { exact: true }),
    ).toHaveCount(0);
    release();
    await expect(
      panel.getByText("Recovered current dossier suggestion", { exact: true }),
    ).toBeVisible();
    await expect(panel).toContainText("Preview only");
    await expect(
      panel.getByRole("button", { name: /Apply|Accept|Save/i }),
    ).toHaveCount(0);
    session.assertNoEffects();
  });

  test(`brief source ${status} current read withholds current evidence while retaining immutable citation facts`, async ({
    page,
    baseURL,
  }) => {
    const session = await prepareProspectRead(page, baseURL);
    await installSavedBrief(page);
    const read = await installProspectRead(
      page,
      `${briefBase}/citations?index=0`,
      currentResolution("Old current dossier record"),
    );
    const dialog = await openSavedBrief(page);
    await dialog
      .getByRole("button", { name: "Source 1", exact: true })
      .first()
      .click();
    const source = page.getByRole("dialog", {
      name: "Brief source 1",
      exact: true,
    });
    await expect(
      source.getByText("Old current dossier record", { exact: true }),
    ).toBeVisible();
    read.fail(status);
    await session.reread();
    await expect(source.getByRole("alert")).toContainText(failureText(status));
    await expect(
      source.getByText("Old current dossier record", { exact: true }),
    ).toHaveCount(0);
    await expect(
      source.getByRole("heading", { name: "Current dossier", exact: true }),
    ).toHaveCount(0);
    await expect(
      source.getByRole("heading", {
        name: "Saved immutable source label",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      source.getByRole("link", { name: "Open original source" }),
    ).toHaveAttribute("href", "https://example.test/immutable-source");
    const release = read.holdRecovery(
      currentResolution("Recovered current dossier record"),
    );
    const before = read.reads();
    await source.getByRole("button", { name: "Retry", exact: true }).click();
    await expect.poll(read.reads).toBeGreaterThan(before);
    await expect(
      source.getByText("Old current dossier record", { exact: true }),
    ).toHaveCount(0);
    release();
    await expect(
      source.getByText("Recovered current dossier record", { exact: true }),
    ).toBeVisible();
    session.assertNoEffects();
  });
}
