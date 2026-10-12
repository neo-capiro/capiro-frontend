import { expect, test } from "@playwright/test";
import { capabilityId, clientId, json } from "./fixtures";
import { holdResponse } from "./capability-boundary-fixtures";
import {
  installCapabilityPresentation,
  openCapabilityDetails,
  openPresentedCapability,
  presentedCapability,
} from "./capability-presentation-fixtures";

test("saved Profile keeps the exact native payload and draft across Documents and closed Details", async ({
  page,
}) => {
  const unexpected = await installCapabilityPresentation(page);
  let writes = 0;
  let saved = false;
  const expected = {
    name: "Revised interceptor",
    type: "Custom system / service",
    sector: "Aerospace / marine",
    description: "Changed synthetic description",
    tags: ["counter-uas", "novel", "comma tag", "blur tag"],
    issueCodes: ["DEF"],
    trl: null,
    mrl: 8,
    peNumbers: ["0604201A", "0605603A", "0601234A"],
    keywords: ["counter UAS", "kinetic intercept", "advanced sensing"],
    notes: "Changed synthetic notes",
  };
  await page.route(
    `**/core/clients/${clientId}/capabilities/${capabilityId}`,
    (route) => {
      expect(route.request().method()).toBe("PATCH");
      expect(route.request().postDataJSON()).toEqual(expected);
      writes += 1;
      saved = true;
      return json(route, { ...presentedCapability, ...expected });
    },
  );
  await page.route(`**/core/clients/${clientId}/capabilities`, (route) =>
    json(route, [{ ...presentedCapability, ...(saved ? expected : {}) }]),
  );
  const editor = await openPresentedCapability(page);
  await editor
    .getByLabel("Description", { exact: true })
    .fill(expected.description);
  await editor.getByLabel("Notes", { exact: true }).fill(expected.notes);
  const tags = editor.getByLabel("Tags", { exact: true });
  await tags.fill("  novel  ");
  await tags.press("Enter");
  await tags.fill("novel, comma tag");
  await tags.press(",");
  await tags.fill("blur tag");
  await editor.getByLabel("Description", { exact: true }).click();
  await editor
    .getByRole("button", { name: "Remove autonomy from Tags", exact: true })
    .click();
  await editor.getByLabel("PE numbers", { exact: true }).fill("0601234A");
  await editor.getByLabel("PE numbers", { exact: true }).press("Enter");
  await editor
    .getByLabel("Match keywords", { exact: true })
    .fill("advanced sensing");
  await editor.getByLabel("Match keywords", { exact: true }).press("Enter");
  await editor.getByRole("button", { name: "Clear TRL", exact: true }).click();
  await openCapabilityDetails(editor);
  await editor.getByLabel("Name", { exact: true }).fill(expected.name);
  await editor.getByLabel("Type", { exact: true }).fill(expected.type);
  await editor.getByLabel("Sector", { exact: true }).fill(expected.sector);
  await editor
    .getByRole("combobox", {
      name: "Manufacturing Readiness Level",
      exact: true,
    })
    .selectOption("8");
  await editor.getByRole("tab", { name: "Documents", exact: true }).click();
  await expect(editor.getByRole("textbox")).toHaveCount(0);
  await expect(
    editor.getByRole("button", { name: "Save capability", exact: true }),
  ).toHaveCount(0);
  await editor.getByRole("tab", { name: "Profile", exact: true }).click();
  await expect(editor.getByLabel("Name", { exact: true })).toHaveValue(
    expected.name,
  );
  await expect(editor.getByLabel("Description", { exact: true })).toHaveValue(
    expected.description,
  );
  await expect(editor.getByLabel("Notes", { exact: true })).toHaveValue(
    expected.notes,
  );
  await expect(
    editor.getByRole("button", {
      name: "Remove blur tag from Tags",
      exact: true,
    }),
  ).toBeVisible();
  await editor.getByText("Details", { exact: true }).click();
  await expect(editor.getByLabel("Name", { exact: true })).toBeHidden();
  expect(writes).toBe(0);
  await editor
    .getByRole("button", { name: "Save capability", exact: true })
    .click();
  await expect(editor).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Revised interceptor/ }),
  ).toBeVisible();
  expect(writes).toBe(1);
  expect(unexpected).toEqual([]);
});

test("create retains optional MRL and Notes and exposes saved-only fields after its one native create", async ({
  page,
}) => {
  const unexpected = await installCapabilityPresentation(page);
  let saved: typeof presentedCapability | undefined;
  let writes = 0;
  const expected = {
    name: "New synthetic capability",
    type: "process / custom",
    sector: "Unlisted sector",
    description: "Synthetic new capability",
    tags: ["new tag"],
    issueCodes: [],
    trl: 5,
    mrl: 9,
    peNumbers: [],
    keywords: [],
    notes: "Retained optional notes",
  };
  await page.route(`**/core/clients/${clientId}/capabilities`, (route) => {
    if (route.request().method() === "GET")
      return json(route, saved ? [saved] : []);
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toEqual(expected);
    writes += 1;
    saved = { ...presentedCapability, ...expected };
    return json(route, saved);
  });
  await page.goto(`/portfolio/${clientId}/capabilities`);
  const add = page.getByRole("button", { name: "Add capability", exact: true });
  await add.focus();
  await add.press("Enter");
  const editor = page.getByRole("dialog", {
    name: "New capability",
    exact: true,
  });
  await expect(editor.getByLabel("Name", { exact: true })).toBeFocused();
  await expect(editor.getByRole("tab")).toHaveCount(0);
  await expect(editor.getByLabel("PE numbers", { exact: true })).toHaveCount(0);
  await expect(
    editor.getByLabel("Match keywords", { exact: true }),
  ).toHaveCount(0);
  await expect(
    editor.getByRole("button", { name: "Upload document", exact: true }),
  ).toHaveCount(0);
  await editor.getByLabel("Name", { exact: true }).fill(expected.name);
  await editor.getByLabel("Type", { exact: true }).fill(expected.type);
  await editor.getByLabel("Sector", { exact: true }).fill(expected.sector);
  await editor
    .getByLabel("Description", { exact: true })
    .fill(expected.description);
  await editor.getByLabel("Tags", { exact: true }).fill("new tag");
  await editor.getByLabel("Tags", { exact: true }).press("Enter");
  await editor
    .getByRole("button", { name: "TRL 5", exact: true })
    .press("Space");
  const details = editor.getByText("Additional details", { exact: true });
  await details.focus();
  await details.press("Enter");
  await editor
    .getByRole("combobox", {
      name: "Manufacturing Readiness Level",
      exact: true,
    })
    .selectOption("9");
  await editor.getByLabel("Notes", { exact: true }).fill(expected.notes);
  await details.click();
  expect(writes).toBe(0);
  await editor
    .getByRole("button", { name: "Add capability", exact: true })
    .click();
  await expect(editor).toHaveCount(0);
  await page.getByRole("button", { name: /New synthetic capability/ }).click();
  const created = page.getByRole("dialog", {
    name: `Capability: ${expected.name}`,
    exact: true,
  });
  await expect(
    created.getByRole("tab", { name: "Documents", exact: true }),
  ).toBeVisible();
  await expect(created.getByLabel("PE numbers", { exact: true })).toBeVisible();
  expect(writes).toBe(1);
  expect(unexpected).toEqual([]);
});

test("tab and disclosure keyboard navigation excludes inactive Profile controls and restores opener focus", async ({
  page,
}) => {
  const unexpected = await installCapabilityPresentation(page);
  await page.goto(`/portfolio/${clientId}/capabilities`);
  const card = page.getByRole("button", { name: /Counter-UAS interceptors/ });
  await card.focus();
  await card.press("Enter");
  const editor = page.getByRole("dialog", {
    name: `Capability: ${presentedCapability.name}`,
    exact: true,
  });
  const profile = editor.getByRole("tab", { name: "Profile", exact: true });
  const documents = editor.getByRole("tab", { name: "Documents", exact: true });
  await expect(profile).toBeFocused();
  await profile.press("ArrowRight");
  await expect(documents).toBeFocused();
  await expect(documents).toHaveAttribute("aria-selected", "true");
  await expect(
    editor.getByRole("tabpanel", { name: "Profile", exact: true }),
  ).toHaveCount(0);
  await expect(
    editor.locator('[role="tabpanel"][data-state="inactive"]'),
  ).toHaveCount(1);
  await expect(editor.getByRole("textbox")).toHaveCount(0);
  for (let step = 0; step < 7; step += 1) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() =>
        Boolean(
          document.activeElement?.closest(
            '[role="tabpanel"][data-state="inactive"]',
          ),
        ),
      ),
    ).toBe(false);
    expect(
      await editor.evaluate((node) => node.contains(document.activeElement)),
    ).toBe(true);
  }
  await documents.focus();
  await documents.press("ArrowLeft");
  const details = editor.getByText("Details", { exact: true });
  await details.focus();
  await details.press("Enter");
  await page.keyboard.press("Tab");
  await expect(editor.getByLabel("Name", { exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(editor).toHaveCount(0);
  await expect(card).toBeFocused();
  const add = page.getByRole("button", { name: "Add capability", exact: true });
  await add.focus();
  await add.press("Enter");
  const create = page.getByRole("dialog", {
    name: "New capability",
    exact: true,
  });
  await expect(create.getByLabel("Name", { exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(create).toHaveCount(0);
  await expect(add).toBeFocused();
  expect(unexpected).toEqual([]);
});

test("saving an invalid Name inside collapsed Details reveals and focuses the field without writing", async ({
  page,
}) => {
  const unexpected = await installCapabilityPresentation(page);
  let writes = 0;
  await page.route(
    `**/core/clients/${clientId}/capabilities/${capabilityId}`,
    (route) => {
      writes += 1;
      return json(route, presentedCapability);
    },
  );
  const editor = await openPresentedCapability(page);
  await openCapabilityDetails(editor);
  const name = editor.getByLabel("Name", { exact: true });
  await name.clear();
  await editor.getByText("Details", { exact: true }).click();
  await expect(name).toBeHidden();
  await editor
    .getByRole("button", { name: "Save capability", exact: true })
    .click();
  await expect(name).toBeVisible();
  await expect(name).toBeFocused();
  expect(
    await name.evaluate(
      (input) => input instanceof HTMLInputElement && !input.validity.valid,
    ),
  ).toBe(true);
  expect(writes).toBe(0);
  expect(unexpected).toEqual([]);
});

test("a save refusal preserves the mounted Profile draft and the explicit retry action", async ({
  page,
}) => {
  const unexpected = await installCapabilityPresentation(page);
  let writes = 0;
  await page.route(
    `**/core/clients/${clientId}/capabilities/${capabilityId}`,
    (route) => {
      writes += 1;
      return json(route, { message: "Synthetic save refused" }, 403);
    },
  );
  const editor = await openPresentedCapability(page);
  await editor
    .getByLabel("Notes", { exact: true })
    .fill("Retain this local draft after refusal");
  await editor
    .getByRole("button", { name: "Save capability", exact: true })
    .click();
  await expect(editor.getByRole("alert")).toContainText(
    "You do not have permission",
  );
  await editor.getByRole("tab", { name: "Documents", exact: true }).click();
  await expect(editor.getByRole("alert")).toHaveCount(0);
  await editor.getByRole("tab", { name: "Profile", exact: true }).click();
  await expect(editor.getByRole("alert")).toBeVisible();
  await expect(editor.getByLabel("Notes", { exact: true })).toHaveValue(
    "Retain this local draft after refusal",
  );
  await expect(
    editor.getByRole("button", { name: "Save capability", exact: true }),
  ).toBeEnabled();
  expect(writes).toBe(1);
  expect(unexpected).toEqual([]);
});

test("pending save remains one operation while switching capability tabs", async ({
  page,
}) => {
  const unexpected = await installCapabilityPresentation(page);
  const held = await holdResponse(
    page,
    `**/core/clients/${clientId}/capabilities/${capabilityId}`,
    "PATCH",
    presentedCapability,
  );
  const editor = await openPresentedCapability(page);
  await editor
    .getByRole("button", { name: "Save capability", exact: true })
    .click();
  await held.started;
  await editor.getByRole("tab", { name: "Documents", exact: true }).click();
  await editor.getByRole("tab", { name: "Profile", exact: true }).click();
  await expect(
    editor.getByLabel("Description", { exact: true }),
  ).toBeDisabled();
  await expect(
    editor.getByRole("button", {
      name: "Remove autonomy from Tags",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(
    editor.getByRole("button", { name: "Remove capability", exact: true }),
  ).toBeDisabled();
  await expect(
    editor.getByRole("button", { name: "Saving…", exact: true }),
  ).toBeDisabled();
  await expect(
    editor.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeDisabled();
  held.release();
  await held.settled;
  await expect(editor).toHaveCount(0);
  expect(held.calls()).toBe(1);
  expect(unexpected).toEqual([]);
});

test("Documents tab keeps the existing source-scoped upload and file-read boundary", async ({
  page,
}) => {
  await page.clock.install();
  const unexpected = await installCapabilityPresentation(page);
  const editor = await openPresentedCapability(page);
  await editor.getByRole("tab", { name: "Documents", exact: true }).click();
  await expect(
    editor.getByRole("button", {
      name: "Synthetic datasheet.pdf",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    editor.getByRole("button", {
      name: "Other record document.pdf",
      exact: true,
    }),
  ).toHaveCount(0);
  await editor
    .getByRole("button", { name: "Upload document", exact: true })
    .click();
  const upload = page.getByRole("dialog", {
    name: "Upload files",
    exact: true,
  });
  await expect(
    upload.getByLabel("Select files", { exact: true }),
  ).toBeEnabled();
  await upload.getByRole("button", { name: "Done", exact: true }).click();
  await editor.getByRole("tab", { name: "Profile", exact: true }).click();
  await page.route("**/core/engagement/attachments?**", (route) =>
    json(route, { message: "Synthetic document read denied" }, 403),
  );
  await page.clock.fastForward(30_001);
  await editor.getByRole("tab", { name: "Documents", exact: true }).click();
  await expect(editor.getByRole("alert")).toBeVisible();
  await expect(
    editor.getByRole("button", {
      name: "Synthetic datasheet.pdf",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    editor.getByRole("button", { name: "Upload document", exact: true }),
  ).toBeDisabled();
  expect(unexpected).toEqual([]);
});
