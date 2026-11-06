import { test, expect, type Locator, type Page } from "@playwright/test";
import { clientId } from "./fixtures";
import {
  installFieldCoverage,
  rowIds,
  values,
} from "./profile-field-coverage-fixtures";

// Coverage: Company 6, Registration 10, Sites 8, Leadership 3,
// Capabilities 3, Advocacy 8 (including conditional Primary sector) = 38.
// Logo upload/retry is separately covered by client-intake.spec.ts.
const steps = [
  "1. Company",
  "2. Registration",
  "3. Sites",
  "4. Leadership",
  "5. Capabilities",
  "6. Advocacy profile",
];
const step = (dialog: Locator, index: number) =>
  dialog.getByRole("button", { name: steps[index]!, exact: true }).click();
const field = (scope: Locator, label: string) =>
  scope.getByLabel(label, { exact: true });
async function fillFields(scope: Locator, fields: Record<string, string>) {
  for (const [label, value] of Object.entries(fields))
    await field(scope, label).fill(value);
}
async function expectFields(scope: Locator, fields: Record<string, string>) {
  for (const [label, value] of Object.entries(fields))
    await expect(field(scope, label), label).toHaveValue(value);
}
async function openEditor(page: Page) {
  await page.getByRole("button", { name: /^More actions for / }).click();
  await page
    .getByRole("menuitem", { name: "Edit client profile", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Edit client details",
    exact: true,
  });
  await expect(field(dialog, "Legal name *")).toBeVisible();
  return dialog;
}
async function choices(
  page: Page,
  dialog: Locator,
  label: string,
  selected: Record<string, boolean>,
) {
  await dialog.getByRole("button", { name: label, exact: true }).click();
  const group = page.getByRole("group", { name: label, exact: true });
  for (const [name, checked] of Object.entries(selected))
    await group.getByLabel(name, { exact: true }).setChecked(checked);
  await page.getByRole("button", { name: "Done", exact: true }).click();
}
async function addCode(dialog: Locator, label: string, code: string) {
  const group = dialog.getByRole("group", { name: label, exact: true });
  await group.getByLabel(`Search ${label}`, { exact: true }).fill(code);
  await group
    .getByRole("button", { name: new RegExp(`^${code} Synthetic`) })
    .click();
  await group
    .getByRole("button", { name: "Close search", exact: true })
    .click();
}
async function addPriority(dialog: Locator, priority: string) {
  await field(dialog, "Funding priorities").fill(priority);
  await field(dialog, "Funding priorities").press("Enter");
}
async function fillAll(page: Page, dialog: Locator) {
  await fillFields(dialog, values.company);
  await field(dialog, "Small Business (SB)").check();
  await field(dialog, "WOSB").check();
  await step(dialog, 1);
  await fillFields(dialog, values.registration);
  await dialog
    .getByRole("combobox", { name: "SAM.gov status", exact: true })
    .selectOption("Active");
  await addCode(dialog, "NAICS codes", "541330");
  await addCode(dialog, "PSC codes", "R425");
  await choices(page, dialog, "Organization types", { "Small business": true });
  await field(dialog, "8A").check();
  await field(dialog, "WOSB").check();
  await step(dialog, 2);
  await dialog.getByRole("button", { name: "Add site", exact: true }).click();
  await fillFields(
    dialog.getByRole("group", { name: "Site 1", exact: true }),
    values.site,
  );
  await dialog
    .getByRole("combobox", { name: "Role", exact: true })
    .selectOption("engineering");
  await dialog
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("operating");
  await dialog.getByRole("button", { name: "Add site", exact: true }).click();
  await dialog
    .getByRole("button", { name: "Remove site 2", exact: true })
    .click();
  await step(dialog, 3);
  await dialog.getByRole("button", { name: "Add leader", exact: true }).click();
  await fillFields(dialog, values.leader);
  await dialog.getByRole("button", { name: "Add leader", exact: true }).click();
  await dialog
    .getByRole("button", { name: "Remove person 2", exact: true })
    .click();
  await step(dialog, 4);
  await dialog
    .getByRole("button", { name: "Add capability", exact: true })
    .click();
  await fillFields(dialog, values.capability);
  await dialog
    .getByRole("combobox", { name: "Type", exact: true })
    .selectOption("platform");
  await dialog
    .getByRole("button", { name: "Add capability", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Remove capability 2", exact: true })
    .click();
  await step(dialog, 5);
  await choices(page, dialog, "Sector tags", {
    Defense: true,
    "Commerce / Tech": true,
  });
  await dialog
    .getByRole("combobox", { name: "Primary sector", exact: true })
    .selectOption("COMMERCE_TECH");
  await addPriority(dialog, "Synthetic prototype funding");
  await addPriority(dialog, "Synthetic workforce");
  await field(dialog, "NDAA Authorization Request").check();
  await field(dialog, "Advocacy / Dear Colleague").check();
  await addCode(dialog, "LDA issue codes (bill/policy matching)", "DEF");
  await fillFields(dialog, values.advocacy);
}
async function expectAll(page: Page, dialog: Locator) {
  await step(dialog, 0);
  await expectFields(dialog, values.company);
  await expect(field(dialog, "Small Business (SB)")).toBeChecked();
  await expect(field(dialog, "WOSB")).toBeChecked();
  await step(dialog, 1);
  await expectFields(dialog, values.registration);
  await expect(
    dialog.getByRole("combobox", { name: "SAM.gov status", exact: true }),
  ).toHaveValue("Active");
  for (const code of ["541330", "R425"])
    await expect(
      dialog.getByRole("button", { name: `Remove ${code}`, exact: true }),
    ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Organization types", exact: true })
    .click();
  await expect(
    page.getByLabel("Small business", { exact: true }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  for (const name of ["8A", "WOSB"])
    await expect(field(dialog, name)).toBeChecked();
  await step(dialog, 2);
  await expectFields(dialog, values.site);
  await expect(
    dialog.getByRole("combobox", { name: "Role", exact: true }),
  ).toHaveValue("engineering");
  await expect(
    dialog.getByRole("combobox", { name: "Status", exact: true }),
  ).toHaveValue("operating");
  await expect(dialog.getByRole("group", { name: /^Site \d+$/ })).toHaveCount(
    1,
  );
  await step(dialog, 3);
  await expectFields(dialog, values.leader);
  await expect(dialog.getByRole("group", { name: /^Person \d+$/ })).toHaveCount(
    1,
  );
  await step(dialog, 4);
  await expectFields(dialog, values.capability);
  await expect(
    dialog.getByRole("combobox", { name: "Type", exact: true }),
  ).toHaveValue("platform");
  await expect(
    dialog.getByRole("group", { name: /^Capability \d+$/ }),
  ).toHaveCount(1);
  await step(dialog, 5);
  await expectFields(dialog, values.advocacy);
  await expect(
    dialog.getByRole("combobox", { name: "Primary sector", exact: true }),
  ).toHaveValue("COMMERCE_TECH");
  await dialog
    .getByRole("button", { name: "Sector tags", exact: true })
    .click();
  for (const label of ["Defense", "Commerce / Tech"])
    await expect(page.getByLabel(label, { exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  for (const priority of ["Synthetic prototype funding", "Synthetic workforce"])
    await expect(
      dialog.getByRole("button", {
        name: `Remove ${priority} from Funding priorities`,
        exact: true,
      }),
    ).toBeVisible();
  for (const label of [
    "NDAA Authorization Request",
    "Advocacy / Dear Colleague",
  ])
    await expect(field(dialog, label)).toBeChecked();
  await expect(
    dialog.getByRole("button", { name: "Remove DEF", exact: true }),
  ).toBeVisible();
}
async function save(dialog: Locator) {
  await step(dialog, 5);
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
}

test("all 38 intake groups survive save, reopen and a real page reload", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const { state, unexpected } = await installFieldCoverage(page);
  await page.goto(`/portfolio/${clientId}`);
  let dialog = await openEditor(page);
  await fillAll(page, dialog);
  await step(dialog, 0);
  await expectFields(dialog, values.company); // Returning between steps keeps the draft.
  await save(dialog);
  expect(state.creates).toBe(0);
  expect(state.clientWrites).toHaveLength(1);
  expect(state.commands).toHaveLength(1);
  await expect(
    page.getByRole("button", {
      name: `More actions for ${values.company["Legal name *"]}`,
      exact: true,
    }),
  ).toBeVisible();
  dialog = await openEditor(page);
  await expectAll(page, dialog);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  const reads = { client: state.clientReads, profile: state.profileReads };
  await page.reload();
  dialog = await openEditor(page);
  await expectAll(page, dialog);
  expect(state.clientReads).toBeGreaterThan(reads.client);
  expect(state.profileReads).toBeGreaterThan(reads.profile);
  for (const key of ["locations", "leadership", "capabilities"] as const)
    expect(state.profile.sections[key]).toEqual([
      expect.objectContaining({ id: rowIds[key] }),
    ]);
  expect(unexpected).toEqual([]);
});

async function clearAndRevise(page: Page, dialog: Locator) {
  await fillFields(dialog, {
    "Website (optional)": "",
    "Company description": "",
    "Main company email": "",
    "Main company phone": "",
  });
  await field(dialog, "Small Business (SB)").uncheck();
  await field(dialog, "WOSB").uncheck();
  await field(dialog, "Large Business").check();
  await step(dialog, 1);
  await fillFields(
    dialog,
    Object.fromEntries(
      Object.keys(values.registration).map((label) => [label, ""]),
    ),
  );
  await dialog
    .getByRole("combobox", { name: "SAM.gov status", exact: true })
    .selectOption("");
  for (const code of ["541330", "R425"])
    await dialog
      .getByRole("button", { name: `Remove ${code}`, exact: true })
      .click();
  await choices(page, dialog, "Organization types", {
    "Small business": false,
    "Other for-profit organization": true,
  });
  await field(dialog, "8A").uncheck();
  await field(dialog, "WOSB").uncheck();
  await step(dialog, 2);
  await fillFields(dialog, {
    "Site name": "Synthetic revised site",
    "Country (two-letter code)": "CA",
    "Street address": "",
    City: "Ottawa",
    "State or region": "ON",
    "Postal code": "",
  });
  await dialog
    .getByRole("combobox", { name: "Role", exact: true })
    .selectOption("research");
  await dialog
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("proposed");
  await expect(
    dialog.getByRole("button", { name: "Remove site 1", exact: true }),
  ).toHaveCount(0);
  await step(dialog, 3);
  await fillFields(dialog, {
    Name: "Jordan Revised",
    "Role or title": "Research director",
    "Email (optional)": "",
  });
  await step(dialog, 4);
  await fillFields(dialog, {
    "Capability name": "Synthetic revised service",
    Description: "",
  });
  await dialog
    .getByRole("combobox", { name: "Type", exact: true })
    .selectOption("service");
  await step(dialog, 5);
  await choices(page, dialog, "Sector tags", {
    Defense: false,
    "Commerce / Tech": false,
  });
  await expect(
    dialog.getByRole("combobox", { name: "Primary sector", exact: true }),
  ).toHaveCount(0);
  for (const priority of ["Synthetic prototype funding", "Synthetic workforce"])
    await dialog
      .getByRole("button", {
        name: `Remove ${priority} from Funding priorities`,
        exact: true,
      })
      .click();
  await field(dialog, "NDAA Authorization Request").uncheck();
  await field(dialog, "Advocacy / Dear Colleague").uncheck();
  await dialog.getByRole("button", { name: "Remove DEF", exact: true }).click();
  await fillFields(dialog, {
    "Engagement start date": "",
    "Primary POC at client": "",
    "Internal notes": "",
  });
}
async function expectCleared(page: Page, dialog: Locator) {
  await expectFields(dialog, {
    "Website (optional)": "",
    "Company description": "",
    "Main company email": "",
    "Main company phone": "",
  });
  await expect(field(dialog, "Large Business")).toBeChecked();
  for (const flag of ["Small Business (SB)", "WOSB"])
    await expect(field(dialog, flag)).not.toBeChecked();
  await step(dialog, 1);
  await expectFields(
    dialog,
    Object.fromEntries(
      Object.keys(values.registration).map((label) => [label, ""]),
    ),
  );
  await expect(
    dialog.getByRole("combobox", { name: "SAM.gov status", exact: true }),
  ).toHaveValue("");
  for (const code of ["541330", "R425"])
    await expect(
      dialog.getByRole("button", { name: `Remove ${code}`, exact: true }),
    ).toHaveCount(0);
  for (const flag of ["8A", "WOSB"])
    await expect(field(dialog, flag)).not.toBeChecked();
  await dialog
    .getByRole("button", { name: "Organization types", exact: true })
    .click();
  await expect(
    page.getByLabel("Other for-profit organization", { exact: true }),
  ).toBeChecked();
  await expect(
    page.getByLabel("Small business", { exact: true }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await step(dialog, 2);
  await expectFields(dialog, {
    "Site name": "Synthetic revised site",
    "Country (two-letter code)": "CA",
    "Street address": "",
    City: "Ottawa",
    "State or region": "ON",
    "Postal code": "",
  });
  await expect(
    dialog.getByRole("combobox", { name: "Role", exact: true }),
  ).toHaveValue("research");
  await expect(
    dialog.getByRole("combobox", { name: "Status", exact: true }),
  ).toHaveValue("proposed");
  await step(dialog, 3);
  await expectFields(dialog, {
    Name: "Jordan Revised",
    "Role or title": "Research director",
    "Email (optional)": "",
  });
  await step(dialog, 4);
  await expectFields(dialog, {
    "Capability name": "Synthetic revised service",
    Description: "",
  });
  await expect(
    dialog.getByRole("combobox", { name: "Type", exact: true }),
  ).toHaveValue("service");
  await step(dialog, 5);
  await expectFields(dialog, {
    "Engagement start date": "",
    "Primary POC at client": "",
    "Internal notes": "",
  });
  await expect(
    dialog.getByRole("combobox", { name: "Primary sector", exact: true }),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: /from Funding priorities$/ }),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: "Remove DEF", exact: true }),
  ).toHaveCount(0);
  for (const label of [
    "NDAA Authorization Request",
    "Advocacy / Dear Colleague",
  ])
    await expect(field(dialog, label)).not.toBeChecked();
}

test("clearing fields and revising saved rows preserves remote siblings and row identity", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const { state, unexpected } = await installFieldCoverage(page, true);
  await page.goto(`/portfolio/${clientId}`);
  let dialog = await openEditor(page);
  // Another editor changes unrelated data after this form opens.
  state.client.intakeData = {
    ...state.client.intakeData,
    profileNotes: "Remote profile note",
    unrelated: { keep: "Remote sibling" },
    addedRemotely: "Keep me",
  };
  await clearAndRevise(page, dialog);
  await save(dialog);
  expect(state.client.intakeData).toEqual({
    profileNotes: "Remote profile note",
    unrelated: { keep: "Remote sibling" },
    addedRemotely: "Keep me",
    sbClassification: { importedFlag: true, large: true },
  });
  expect(state.client).toMatchObject({
    website: null,
    description: null,
    primaryContactEmail: null,
    primaryContactPhone: null,
    primaryContactName: null,
    uei: null,
    cageCode: null,
    sectorTag: null,
    naicsCodes: [],
    pscCodes: [],
    issueCodes: [],
    submissionTracks: [],
    setAsideCertifications: [],
  });
  for (const key of ["locations", "leadership", "capabilities"] as const) {
    expect(state.commands[0]?.[key]).toEqual([
      expect.objectContaining({ id: rowIds[key] }),
    ]);
    expect(state.profile.sections[key]).toHaveLength(1);
  }
  dialog = await openEditor(page);
  await expectCleared(page, dialog);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.reload();
  dialog = await openEditor(page);
  await expectCleared(page, dialog);
  expect(state.clientWrites).toHaveLength(1);
  expect(state.commands).toHaveLength(1);
  expect(unexpected).toEqual([]);
});

test("invalid six-section drafts cannot save and errors retain the entered values", async ({
  page,
}) => {
  const { state, unexpected } = await installFieldCoverage(page, true);
  await page.goto(`/portfolio/${clientId}`);
  const dialog = await openEditor(page);
  const attempt = () =>
    dialog.getByRole("button", { name: "Save profile", exact: true }).click();
  for (const [label, value, message] of [
    ["Legal name *", "", "Legal name is required."],
    ["Website (optional)", "javascript:alert(1)", "Enter a valid website."],
    [
      "Company description",
      "x".repeat(601),
      "Company description is limited to 600 characters.",
    ],
  ]) {
    await field(dialog, label!).fill(value!);
    await attempt();
    await expect(dialog.getByText(message!, { exact: true })).toBeVisible();
    await expect(field(dialog, label!)).toBeFocused();
    await expect(field(dialog, label!)).toHaveValue(value!);
    await field(dialog, label!).fill(
      values.company[label as keyof typeof values.company],
    );
  }
  await field(dialog, "Main company email").fill("not-an-email");
  await attempt();
  await expect(field(dialog, "Main company email")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(field(dialog, "Main company email")).toHaveValue("not-an-email");
  await field(dialog, "Main company email").fill(
    values.company["Main company email"],
  );
  await step(dialog, 1);
  await field(dialog, "EIN").fill("12-abc");
  await attempt();
  await expect(dialog.getByText(/Enter nine digits/)).toBeVisible();
  await expect(field(dialog, "EIN")).toHaveValue("12-abc");
  await field(dialog, "EIN").fill(values.registration.EIN);
  for (const label of ["NAICS codes", "PSC codes"]) {
    const codes = dialog.getByRole("group", { name: label, exact: true });
    await codes
      .getByLabel(`Search ${label}`, { exact: true })
      .fill("invalid-code");
    await expect(codes.getByRole("button", { name: /^Use / })).toHaveCount(0);
    await expect(
      codes.getByLabel(`Search ${label}`, { exact: true }),
    ).toHaveValue("invalid-code");
    await codes
      .getByRole("button", { name: "Close search", exact: true })
      .click();
  }
  await step(dialog, 2);
  await field(dialog, "Site name").fill("");
  await attempt();
  await expect(
    dialog.getByText("Name each site.", { exact: true }),
  ).toBeVisible();
  await expect(field(dialog, "Site name")).toHaveValue("");
  await field(dialog, "Site name").fill(values.site["Site name"]);
  await field(dialog, "Country (two-letter code)").fill("USA");
  await attempt();
  await expect(
    dialog.getByText("Use a two-letter country code, or leave it empty.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(field(dialog, "Country (two-letter code)")).toHaveValue("USA");
  await field(dialog, "Country (two-letter code)").fill("US");
  await step(dialog, 3);
  await field(dialog, "Name").fill("");
  await attempt();
  await expect(field(dialog, "Name")).toHaveAttribute("aria-invalid", "true");
  await expect(field(dialog, "Name")).toHaveValue("");
  await field(dialog, "Name").fill(values.leader.Name);
  await field(dialog, "Email (optional)").fill("invalid-leader");
  await attempt();
  await expect(field(dialog, "Email (optional)")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(field(dialog, "Email (optional)")).toHaveValue("invalid-leader");
  await field(dialog, "Email (optional)").fill(
    values.leader["Email (optional)"],
  );
  await step(dialog, 4);
  await field(dialog, "Capability name").fill("");
  await attempt();
  await expect(field(dialog, "Capability name")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(field(dialog, "Capability name")).toHaveValue("");
  await field(dialog, "Capability name").fill(
    values.capability["Capability name"],
  );
  await step(dialog, 5);
  await field(dialog, "Internal notes").fill("n".repeat(2001));
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(
    dialog.getByText("Internal notes are limited to 2,000 characters.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(field(dialog, "Internal notes")).toHaveValue("n".repeat(2001));
  await field(dialog, "Internal notes").fill(values.advocacy["Internal notes"]);
  await addPriority(dialog, "p".repeat(121));
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(
    dialog.getByText("Each funding priority is limited to 120 characters.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", {
      name: `Remove ${"p".repeat(121)} from Funding priorities`,
      exact: true,
    }),
  ).toBeVisible();
  expect(state.clientWrites).toEqual([]);
  expect(state.commands).toEqual([]);
  expect(unexpected).toEqual([]);
});

test("partial create retries the same detail command without a duplicate client or rows", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const { state, unexpected } = await installFieldCoverage(page);
  state.failDetailsOnce = true;
  await page.goto("/portfolio");
  await page
    .getByRole("button", { name: "Add profile", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: /Manual entry/ }).click();
  const dialog = page.getByRole("dialog", { name: "Add profile", exact: true });
  await fillAll(page, dialog);
  await dialog
    .getByRole("button", { name: "Create profile", exact: true })
    .click();
  const confirmation = dialog.getByRole("radio", {
    name: "Create a profile with the company details I entered",
    exact: true,
  });
  await expect(confirmation).toBeVisible();
  await confirmation.check();
  await expect(confirmation).toBeChecked();
  await dialog
    .getByRole("button", { name: "Create profile", exact: true })
    .click();
  await expect(
    dialog.getByText("Synthetic profile details temporarily unavailable", {
      exact: true,
    }),
  ).toBeVisible();
  expect(state.creates).toBe(1);
  for (const label of steps)
    await expect(
      dialog.getByRole("button", { name: label, exact: true }),
    ).toBeDisabled();
  await dialog
    .getByRole("button", { name: "Retry profile details", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  expect(state.creates).toBe(1);
  expect(state.commands).toHaveLength(2);
  expect(state.commands[1]).toEqual(state.commands[0]);
  await page.goto(`/portfolio/${clientId}`);
  await page.reload();
  await expectAll(page, await openEditor(page));
  for (const key of ["locations", "leadership", "capabilities"] as const)
    expect(state.profile.sections[key]).toHaveLength(1);
  expect(unexpected).toEqual([]);
});
