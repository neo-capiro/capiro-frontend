import { expect, test, type Route } from "@playwright/test";
import { expectAccessibleHome } from "../accessibility";
import { clientId, record, setupOutreach } from "./core109-outreach-fixtures";

for (const width of [1440, 390]) {
  test(`ordinary Outreach successful save preserves the exact submitted text at ${width}px`, async ({
    page,
  }, info) => {
    const observed = await setupOutreach(page);
    await page.setViewportSize({ width, height: 1000 });
    let saved = record;
    let held: Route | undefined;
    const writes: unknown[] = [];
    await page.route("**/api/capiro/engagement.outreach?*", (route) =>
      route.fulfill({ json: [saved] }),
    );
    await page.route("**/api/capiro/engagement.outreach.update", (route) => {
      writes.push(route.request().postDataJSON());
      held = route;
    });
    await page.goto(`/modules/engagement?view=outreach&clientId=${clientId}`);
    await page.getByRole("button", { name: record.title, exact: true }).click();
    await page
      .getByLabel("Body", { exact: true })
      .fill("Exact submitted synthetic body");
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect.poll(() => Boolean(held)).toBe(true);
    await expect(page.getByLabel("Body", { exact: true })).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Saving draft…", exact: true }),
    ).toBeDisabled();
    await expectAccessibleHome(page, info);
    await page.screenshot({
      path: info.outputPath(`outreach-pending-${width}.png`),
      fullPage: true,
    });
    saved = { ...record, body: "Exact submitted synthetic body" };
    await held!.fulfill({ json: saved });
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: record.title, exact: true }).click();
    await expect(page.getByLabel("Body", { exact: true })).toHaveValue(
      saved.body,
    );
    await expect(page.getByLabel("Body", { exact: true })).toBeEnabled();
    expect(writes).toEqual([
      {
        params: { id: record.id },
        body: {
          title: record.title,
          subject: record.subject,
          body: saved.body,
        },
      },
    ]);
    expect(observed.errors).toEqual([]);
    expect(observed.unexpected).toEqual([]);
  });
}

for (const existing of [false, true]) {
  test(`ordinary Outreach ${existing ? "update" : "create"} holds the submitted draft until a rejected save settles`, async ({
    page,
  }) => {
    const observed = await setupOutreach(page);
    let held: Route | undefined;
    const writes: unknown[] = [];
    const key = existing
      ? "engagement.outreach.update"
      : "engagement.outreach.create";
    await page.route(`**/api/capiro/${key}`, (route) => {
      writes.push(route.request().postDataJSON());
      held = route;
    });
    await page.route("**/api/capiro/engagement.outreach?*", (route) =>
      route.fulfill({ json: [record] }),
    );
    await page.goto(`/modules/engagement?view=outreach&clientId=${clientId}`);
    await page
      .getByRole("button", {
        name: existing ? record.title : "+ New outreach",
        exact: true,
      })
      .click();
    await page
      .getByLabel("Title", { exact: true })
      .fill("Submitted synthetic title");
    await page
      .getByLabel("Subject", { exact: true })
      .fill("Submitted synthetic subject");
    await page
      .getByLabel("Body", { exact: true })
      .fill("Submitted synthetic body");
    if (!existing)
      await page.getByLabel("Type", { exact: true }).selectOption("prep");
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect.poll(() => Boolean(held)).toBe(true);
    for (const label of ["Title", "Subject", "Body"])
      await expect(page.getByLabel(label, { exact: true })).toBeDisabled();
    if (!existing)
      await expect(page.getByLabel("Type", { exact: true })).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page
      .getByRole("button", { name: "Close dialog", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(writes).toEqual([
      existing
        ? {
            params: { id: record.id },
            body: {
              title: "Submitted synthetic title",
              subject: "Submitted synthetic subject",
              body: "Submitted synthetic body",
            },
          }
        : {
            body: {
              title: "Submitted synthetic title",
              subject: "Submitted synthetic subject",
              body: "Submitted synthetic body",
              type: "prep",
              clientId,
            },
          },
    ]);
    await held!.fulfill({
      status: 400,
      json: { message: "Synthetic rejected draft" },
    });
    await expect(page.getByRole("alert")).toContainText(
      "Synthetic rejected draft",
    );
    await expect(page.getByLabel("Title", { exact: true })).toBeEnabled();
    await expect(page.getByLabel("Subject", { exact: true })).toBeEnabled();
    if (!existing) {
      await expect(page.getByLabel("Type", { exact: true })).toBeEnabled();
      await expect(page.getByLabel("Type", { exact: true })).toHaveValue(
        "prep",
      );
    }
    await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
      "Submitted synthetic title",
    );
    await expect(page.getByLabel("Body", { exact: true })).toHaveValue(
      "Submitted synthetic body",
    );
    await expect(
      page.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeEnabled();
    expect(writes).toHaveLength(1);
    expect(observed.errors).toEqual([]);
    expect(observed.unexpected).toEqual([]);
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
}
