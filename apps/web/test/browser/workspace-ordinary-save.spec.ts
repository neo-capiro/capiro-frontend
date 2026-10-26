import { manualSaveBody } from "../../src/shared/capiro/operations/workspace-documents";
import { expect, test } from "@playwright/test";
import {
  ordinarySaveFixture,
  openOrdinary,
  editOrdinary,
} from "./workspace-ordinary-save-fixture";

const saved =
  "Saved. The immutable version and current saved content are confirmed.";

test("one save and duplicate click emit one atomic POST; pending input is frozen and unknown fields survive", async ({
  page,
}) => {
  const f = await ordinarySaveFixture(page, { holdSave: true });
  await openOrdinary(page);
  await editOrdinary(page);
  const button = page.getByRole("button", { name: "Save draft", exact: true });
  await button.evaluate((node) => {
    (node as HTMLButtonElement).click();
    (node as HTMLButtonElement).click();
  });
  await expect
    .poll(
      () =>
        f.calls.filter((c) =>
          [
            "workspace.draft.save",
            "workspace.draft.update",
            "workspace.draft.snapshot",
          ].includes(c.key),
        ).length,
    )
    .toBeGreaterThan(0);
  expect(
    f.calls.filter((c) =>
      ["workspace.draft.update", "workspace.draft.snapshot"].includes(c.key),
    ),
  ).toEqual([]);
  await expect.poll(() => f.saves.length).toBe(1);
  await expect(
    page.getByLabel("Document title", { exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("textbox", { name: "Body content", exact: true }),
  ).toBeDisabled();
  f.release();
  await expect(page.getByText(saved, { exact: true })).toBeVisible();
  expect(f.calls.filter((c) => c.key === "workspace.draft.save")).toEqual([
    { key: "workspace.draft.save", method: "POST" },
  ]);
  expect(
    f.calls.filter((c) =>
      ["workspace.draft.update", "workspace.draft.snapshot"].includes(c.key),
    ),
  ).toEqual([]);
  expect(f.versions.size).toBe(1);
  expect(f.current().config.unknown).toEqual({ preserved: true });
  expect(f.current().documents[0]!.body.unknown).toEqual({ preserved: true });
  expect(f.saves[0]).not.toHaveProperty("documents");
});

test("stale baseline preserves edits and requires deliberate rebase before a new save", async ({
  page,
}) => {
  const f = await ordinarySaveFixture(page);
  await openOrdinary(page);
  await editOrdinary(page);
  f.changeSaved("Another editor title");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => f.saves.length).toBe(1);
  expect(f.saves[0]!.expectedStateHash).toBe(f.initialStateHash);
  await expect(page.getByText(/The saved document changed/)).toBeVisible();
  await expect(page.getByLabel("Document title", { exact: true })).toHaveValue(
    "Retained local title",
  );
  expect(f.versions.size).toBe(0);
  await page
    .getByRole("button", { name: "Read current saved content", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Another editor title", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(saved, { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Rebase retained edits", exact: true })
    .click();
  await expect(
    page.getByLabel("Document title", { exact: true }),
  ).toBeEditable();
  await expect(page.getByLabel("Document title", { exact: true })).toHaveValue(
    "Retained local title",
  );
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText(saved, { exact: true })).toBeVisible();
  expect(f.saves).toHaveLength(2);
  expect(f.saves[1]!.requestId).not.toBe(f.saves[0]!.requestId);
  expect(f.saves[1]!.expectedStateHash).not.toBe(f.saves[0]!.expectedStateHash);
});

test("definite stale conflict can adopt current content without writing retained edits", async ({
  page,
}) => {
  const f = await ordinarySaveFixture(page);
  await openOrdinary(page);
  await editOrdinary(page);
  f.changeSaved("Current title to adopt");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText(/The saved document changed/)).toBeVisible();
  await page
    .getByRole("button", { name: "Read current saved content", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Adopt current saved content", exact: true })
    .click();
  await expect(page.getByLabel("Document title", { exact: true })).toHaveValue(
    "Current title to adopt",
  );
  expect(f.saves).toHaveLength(1);
  expect(f.versions.size).toBe(0);
});

test("lost committed response survives remount; current read alone cannot settle it and exact replay creates no duplicate", async ({
  page,
}) => {
  const f = await ordinarySaveFixture(page, { loseFirstResponse: true });
  await openOrdinary(page);
  await editOrdinary(page);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText(/Save unconfirmed/)).toBeVisible();
  const original = structuredClone(f.saves[0]);
  await page.reload();
  await expect(page.getByText(/Save unconfirmed/)).toBeVisible();
  await expect(page.getByLabel("Document title", { exact: true })).toHaveValue(
    "Retained local title",
  );
  await page
    .getByRole("button", { name: "Read current saved content", exact: true })
    .click();
  await expect(page.getByText(/Save unconfirmed/)).toBeVisible();
  await expect(page.getByText(saved, { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Rebase retained edits", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: "Adopt current saved content",
      exact: true,
    }),
  ).toHaveCount(0);
  expect(f.saves).toHaveLength(1);
  await page
    .getByRole("button", { name: "Retry exact original save", exact: true })
    .click();
  await expect.poll(() => f.saves.length).toBe(2);
  expect(f.saves).toEqual([original, original]);
  await expect(page.getByText(saved, { exact: true })).toBeVisible();
  expect(f.saves).toEqual([original, original]);
  expect(f.versions.size).toBe(1);
});

test("replayed receipt remains distinct from a newer saved revision", async ({
  page,
}) => {
  const f = await ordinarySaveFixture(page, { loseFirstResponse: true });
  await openOrdinary(page);
  await editOrdinary(page);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText(/Save unconfirmed/)).toBeVisible();
  f.changeSaved("Newer revision");
  await page
    .getByRole("button", { name: "Retry exact original save", exact: true })
    .click();
  await expect(
    page.getByText(/Current saved content has changed since that version/),
  ).toBeVisible();
  await expect(page.getByLabel("Document title", { exact: true })).toHaveValue(
    "Retained local title",
  );
  await expect(page.getByText(saved, { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Adopt current saved content", exact: true })
    .click();
  await expect(page.getByLabel("Document title", { exact: true })).toHaveValue(
    "Newer revision",
  );
  expect(f.versions.size).toBe(1);
});

test("mismatched receipt never shows Saved or unlocks adopt/rebase", async ({
  page,
}) => {
  const f = await ordinarySaveFixture(page, { foreignReceipt: true });
  await openOrdinary(page);
  await editOrdinary(page);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText(/Save unconfirmed/)).toBeVisible();
  await page
    .getByRole("button", { name: "Read current saved content", exact: true })
    .click();
  await expect(page.getByText(saved, { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Rebase retained edits", exact: true }),
  ).toHaveCount(0);
  expect(f.saves).toHaveLength(1);
});

test("revoked current access hides retained content and cannot resend", async ({
  page,
}) => {
  const f = await ordinarySaveFixture(page, { loseFirstResponse: true });
  await openOrdinary(page);
  await editOrdinary(page);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText(/Save unconfirmed/)).toBeVisible();
  f.deny();
  await page
    .getByRole("button", { name: "Read current saved content", exact: true })
    .click();
  await expect(page.getByLabel("Document title", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByText("Retained local body", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: "Retry exact original save",
      exact: true,
    }),
  ).toHaveCount(0);
  expect(f.saves).toHaveLength(1);
});

test("actor replacement and delayed completion cannot apply or expose the old pending editor", async ({
  page,
}) => {
  const f = await ordinarySaveFixture(page, { holdSave: true });
  await openOrdinary(page);
  await editOrdinary(page);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => f.saves.length).toBe(1);
  f.changeSaved("New actor view");
  await f.switchActor();
  await expect(page.getByLabel("Document title", { exact: true })).toHaveValue(
    "New actor view",
  );
  f.release();
  await expect(page.getByLabel("Document title", { exact: true })).toHaveValue(
    "New actor view",
  );
  await expect(page.getByText(saved, { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: "Retry exact original save",
      exact: true,
    }),
  ).toHaveCount(0);
});

for (const refusalCode of [
  "WORKSPACE_SAVE_REQUEST_CONFLICT",
  "WORKSPACE_SAVE_CLIENT_CONFLICT",
  "UNKNOWN_CONFLICT",
]) {
  test(`${refusalCode} never permits adopt/rebase or a new save`, async ({
    page,
  }) => {
    const f = await ordinarySaveFixture(page, { refusalCode });
    await openOrdinary(page);
    await editOrdinary(page);
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(page.getByText(/Save unconfirmed/)).toBeVisible();
    await page
      .getByRole("button", { name: "Read current saved content", exact: true })
      .click();
    await expect(
      page.getByRole("button", {
        name: "Adopt current saved content",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Rebase retained edits", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Save draft", exact: true }),
    ).toBeDisabled();
    expect(f.versions.size).toBe(0);
  });
}
test("client move hides unknown retained edits before any exact replay dispatch", async ({
  page,
}) => {
  const f = await ordinarySaveFixture(page, { loseFirstResponse: true });
  await openOrdinary(page);
  await editOrdinary(page);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText(/Save unconfirmed/)).toBeVisible();
  f.moveClient();
  await page
    .getByRole("button", { name: "Retry exact original save", exact: true })
    .click();
  await expect(page.getByLabel("Document title", { exact: true })).toHaveCount(
    0,
  );
  expect(f.saves).toHaveLength(1);
});
test("supported formatted section survives the mounted atomic save without body round-trip", async ({
  page,
}) => {
  const f = await ordinarySaveFixture(page, { formatted: true });
  await openOrdinary(page);
  await page
    .getByLabel("Document title", { exact: true })
    .fill("Formatted document");
  await expect(
    page
      .getByRole("textbox", { name: "Body content", exact: true })
      .locator("strong"),
  ).toHaveText("Saved rich body");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText(saved, { exact: true })).toBeVisible();
  expect(
    manualSaveBody.parse(f.saves[0]).draft.config.sectionContent.Body,
  ).toBe("<p><strong>Saved rich body</strong></p>");
  expect(f.saves[0]).not.toHaveProperty("documents");
});
test("explicit client association preserves unsaved edits and requires deliberate rebase before atomic save", async ({
  page,
}) => {
  const f = await ordinarySaveFixture(page, {
    heldClient: true,
    holdAssociation: true,
  });
  await openOrdinary(page);
  await editOrdinary(page);
  await expect(
    page.getByRole("button", { name: "Save draft", exact: true }),
  ).toBeDisabled();
  await page.getByRole("combobox", { name: "Client", exact: true }).click();
  await page
    .getByRole("option", { name: "Current Aerospace", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Associate client", exact: true })
    .click();
  await expect
    .poll(
      () =>
        f.calls.filter((call) => call.key === "workspace.draft.update").length,
    )
    .toBe(1);
  await page
    .getByLabel("Document title", { exact: true })
    .fill("Edits during association");
  await page
    .getByRole("textbox", { name: "Body content", exact: true })
    .fill("Body during association");
  f.release();
  await expect(
    page.getByRole("button", { name: "Rebase retained edits", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Document title", { exact: true })).toHaveValue(
    "Edits during association",
  );
  await expect(
    page.getByRole("textbox", { name: "Body content", exact: true }),
  ).toHaveValue("Body during association");
  await expect(
    page.getByRole("button", { name: "Save draft", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Rebase retained edits", exact: true })
    .click();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText(saved, { exact: true })).toBeVisible();
  expect(f.saves).toHaveLength(1);
  expect(f.saves[0]!.draft.docTitle).toBe("Edits during association");
  expect(
    manualSaveBody.parse(f.saves[0]).draft.config.sectionContent.Body,
  ).toBe("Body during association");
  expect(f.saves[0]!.expectedClientId).toBe(f.current().clientId);
  expect(
    f.calls.filter((call) => call.key === "workspace.draft.update"),
  ).toHaveLength(1);
  expect(
    f.calls.filter((call) => call.key === "workspace.draft.snapshot"),
  ).toHaveLength(0);
});

test("failed journal reservation cannot dispatch and recovery retry preserves edits and their original baseline", async ({
  page,
}) => {
  const f = await ordinarySaveFixture(page);
  await openOrdinary(page);
  await editOrdinary(page);
  await page.evaluate(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key.startsWith("capiro-command-fence-v1:")) {
        Storage.prototype.setItem = setItem;
        throw new DOMException(
          "Synthetic storage failure",
          "QuotaExceededError",
        );
      }
      return setItem.call(this, key, value);
    };
  });
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Retry document recovery", exact: true }),
  ).toBeVisible();
  expect(f.saves).toHaveLength(0);
  f.changeSaved("Other editor while storage unavailable");
  await page
    .getByRole("button", { name: "Retry document recovery", exact: true })
    .click();
  await expect(page.getByLabel("Document title", { exact: true })).toHaveValue(
    "Retained local title",
  );
  await expect(
    page.getByRole("textbox", { name: "Body content", exact: true }),
  ).toHaveValue("Retained local body");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText(/The saved document changed/)).toBeVisible();
  expect(f.saves[0]!.expectedStateHash).toBe(f.initialStateHash);
  expect(f.versions.size).toBe(0);
});
