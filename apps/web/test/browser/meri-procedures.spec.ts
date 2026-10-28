/**
 * Mounted (real browser) qualification for the 09.04 firm procedure governance surface.
 *
 * These checks mount the REAL host, the REAL governance client and the REAL session/query lifetimes
 * through the existing Playwright + Vite harness. Only the HTTP boundary is synthetic and loopback.
 * They are the effect-level proof the static render could not give: the list, the account scope, the
 * pending-mutation retirement, the unknown-outcome barrier and the confirmation flow are all driven by
 * clicks against the mounted component.
 */
import { expect, test } from "@playwright/test";
import {
  expectProcedureIsolation,
  openProcedureSurface,
  persistedProcedureRow,
  procedureAdmin,
  procedureFixture,
  procedureManifest,
  procedureMember,
  procedureRow,
  procedureRowFor,
  procedureSecondAdmin,
  procedureTemplate,
  procedureUuid,
  procedureUrl,
  replaceProcedureIdentity,
  secondProcedureRow,
  storedSkill,
  thirdProcedureRow,
} from "./meri-procedures-fixtures";

test("an admin read settles once and renders the stored rows under replayed effects", async ({
  page,
}, info) => {
  const fixture = await procedureFixture(page);
  await openProcedureSurface(page);
  // The page mounts StrictMode against the development build, so the first effect pass is replayed
  // and cancelled: exactly one read may settle and it must not be applied twice.
  expect(fixture.settled("meri.procedures.list")).toHaveLength(1);
  expect(fixture.calls("meri.procedures.list").length).toBeLessThanOrEqual(2);
  await expect(page.getByRole("row")).toHaveCount(3);
  await expect(procedureRowFor(page, "hearing_prep")).toHaveCount(1);
  await expect(procedureRowFor(page, "draft_review")).toHaveCount(1);
  await expect(page.getByRole("status")).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("meri-procedures-rows.png") });
  // Nothing re-reads after the scope settles.
  await page.waitForTimeout(300);
  expect(fixture.settled("meri.procedures.list")).toHaveLength(1);
  expectProcedureIsolation(fixture);
});

test("the seven procedure operations come from the production registry", async ({
  page,
}) => {
  await procedureFixture(page);
  await page.goto(procedureUrl());
  const composition = await page.evaluate(
    () =>
      (
        window as unknown as {
          procedureRegistryFixture: {
            missingBefore: string[];
            registered: string[];
          };
        }
      ).procedureRegistryFixture,
  );
  expect(composition.missingBefore).toHaveLength(0);
  expect(composition.registered).toHaveLength(7);
});

test("an account replacement retires a pending change without publishing or reloading it", async ({
  page,
}) => {
  const fixture = await procedureFixture(page);
  await openProcedureSurface(page);
  const held = fixture.hold("meri.procedures.setEnabled", {
    json: persistedProcedureRow({ enabled: false }),
  });
  await procedureRowFor(page, "hearing_prep")
    .getByRole("button", { name: "Disable", exact: true })
    .click();
  await held.entered;
  // In flight: the same change cannot be dispatched again.
  await expect(
    procedureRowFor(page, "hearing_prep").getByRole("button", {
      name: "Disable",
      exact: true,
    }),
  ).toBeDisabled();
  // The account changes through the authenticated Core identity, and the session is replaced the way
  // the product disposes queries, drafts and pending writes.
  fixture.setIdentity(procedureSecondAdmin);
  fixture.setRows([thirdProcedureRow]);
  await replaceProcedureIdentity(page, {
    userId: procedureSecondAdmin.user.id,
    sessionId: "synthetic-session-b",
    orgId: "synthetic-org-b",
  });
  await expect(procedureRowFor(page, "firm_b_briefing")).toBeVisible();
  await expect(procedureRowFor(page, "hearing_prep")).toHaveCount(0);
  const settledBefore = fixture.settled("meri.procedures.list").length;
  await held.release();
  // The retired result is neither rendered nor turned into a reload of the new account's list.
  await expect(page.getByText(/Core reported/)).toHaveCount(0);
  await expect(page.getByText(/retired instead of replayed/)).toHaveCount(0);
  expect(fixture.settled("meri.procedures.list")).toHaveLength(settledBefore);
  expect(fixture.aborted("meri.procedures.setEnabled")).toHaveLength(1);
  expectProcedureIsolation(fixture);
});

test("unmounting the surface retires a pending change", async ({ page }) => {
  const fixture = await procedureFixture(page);
  await openProcedureSurface(page);
  const held = fixture.hold("meri.procedures.setEnabled", {
    json: persistedProcedureRow({ enabled: false }),
  });
  await procedureRowFor(page, "hearing_prep")
    .getByRole("button", { name: "Disable", exact: true })
    .click();
  await held.entered;
  await page.getByRole("button", { name: "Unmount surface" }).click();
  await expect(page.getByTestId("surface-state")).toHaveText("unmounted");
  await expect(page.getByRole("row")).toHaveCount(0);
  const settledBefore = fixture.settled("meri.procedures.list").length;
  await held.release();
  await expect(page.getByText(/Core reported/)).toHaveCount(0);
  expect(fixture.settled("meri.procedures.list")).toHaveLength(settledBefore);
  expect(fixture.aborted("meri.procedures.setEnabled")).toHaveLength(1);
  expectProcedureIsolation(fixture);
});

test("an unknown outcome holds every conflicting change until an authoritative read-back", async ({
  page,
}, info) => {
  const fixture = await procedureFixture(page);
  fixture.reply("meri.procedures.setEnabled", {
    status: 503,
    json: { message: "Synthetic upstream failure" },
  });
  await openProcedureSurface(page);
  await procedureRowFor(page, "hearing_prep")
    .getByRole("button", { name: "Disable", exact: true })
    .click();
  await expect(
    page.getByText(/the last firm procedure change is unknown/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Check current stored state" }),
  ).toBeVisible();
  expect(fixture.calls("meri.procedures.setEnabled")).toHaveLength(1);
  expect(fixture.settled("meri.procedures.list")).toHaveLength(1);
  await page.screenshot({
    path: info.outputPath("meri-procedures-unknown-hold.png"),
  });
  // Every conflicting control is held, and the unknown change is never replayed.
  await expect(
    procedureRowFor(page, "hearing_prep").getByRole("button", {
      name: "Disable",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Create procedure", exact: true }),
  ).toBeDisabled();
  await page.waitForTimeout(300);
  expect(fixture.calls("meri.procedures.setEnabled")).toHaveLength(1);
  expect(fixture.calls("meri.procedures.create")).toHaveLength(0);
  // The authoritative read-back is what releases it.
  await page
    .getByRole("button", { name: "Check current stored state" })
    .click();
  await expect(
    page.getByText(/the last firm procedure change is unknown/),
  ).toHaveCount(0);
  await expect(
    procedureRowFor(page, "hearing_prep").getByRole("button", {
      name: "Disable",
      exact: true,
    }),
  ).toBeEnabled();
  expect(fixture.settled("meri.procedures.list")).toHaveLength(2);
  expectProcedureIsolation(fixture);
});

test("editing pre-fills the stored fields and carries the stored template and procedure through the update", async ({
  page,
}, info) => {
  const fixture = await procedureFixture(page);
  fixture.reply("meri.procedures.update", {
    json: persistedProcedureRow({
      name: "Hearing preparation revised",
      version: 4,
    }),
  });
  await openProcedureSurface(page);
  await procedureRowFor(page, "hearing_prep")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await expect(page.getByLabel("Procedure id", { exact: true })).toHaveValue(
    "hearing_prep",
  );
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
    "Hearing preparation",
  );
  await expect(
    page.getByLabel("Triggers (comma separated)", { exact: true }),
  ).toHaveValue("hearing, prep");
  await expect(
    page.getByLabel("Required read tools (comma separated)", { exact: true }),
  ).toHaveValue("get_client_context");
  await expect(
    page.getByLabel("Guidance addendum", { exact: true }),
  ).toHaveValue("Prepare the hearing brief from the stored record.");
  await expect(
    page.getByText(/keeps the stored template and procedure manifest/),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("meri-procedures-edit-prefilled.png"),
  });
  await page
    .getByLabel("Name", { exact: true })
    .fill("Hearing preparation revised");
  await page.getByRole("button", { name: "Save new version" }).click();
  await expect(page.getByText(/Core reported hearing_prep/)).toBeVisible();
  expect(fixture.calls("meri.procedures.update")).toHaveLength(1);
  expect(fixture.calls("meri.procedures.update")[0]!.input).toEqual({
    params: { id: procedureUuid(11) },
    body: {
      id: "hearing_prep",
      name: "Hearing preparation revised",
      triggers: ["hearing", "prep"],
      requiredTools: ["get_client_context"],
      systemAddendum: "Prepare the hearing brief from the stored record.",
      template: procedureTemplate,
      procedure: procedureManifest,
      expectedVersion: 3,
    },
  });
  // The saved draft is cleared and the list is re-read.
  await expect(
    page.getByRole("button", { name: "Save new version" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Procedure id", { exact: true })).toHaveValue(
    "",
  );
  expectProcedureIsolation(fixture);
});

test("a stored payload this form cannot preserve refuses edit instead of erasing it", async ({
  page,
}) => {
  const fixture = await procedureFixture(page);
  fixture.setRows([
    procedureRow({ skill: { ...storedSkill(), notes: "unsupported" } }),
    secondProcedureRow,
  ]);
  await openProcedureSurface(page);
  await procedureRowFor(page, "hearing_prep")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await expect(
    page.getByText(/fields this form cannot preserve: notes/),
  ).toBeVisible();
  // The form is not silently rewritten with an empty payload.
  await expect(page.getByLabel("Procedure id", { exact: true })).toHaveValue(
    "",
  );
  expect(fixture.calls("meri.procedures.update")).toHaveLength(0);
  expect(fixture.calls("meri.procedures.create")).toHaveLength(0);
  expectProcedureIsolation(fixture);
});

test("a settled create leaves no retained custody behind", async ({ page }) => {
  const fixture = await procedureFixture(page);
  fixture.reply("meri.procedures.create", {
    json: persistedProcedureRow({
      id: procedureUuid(13),
      skillId: "brief_builder",
      name: "Brief builder",
      skillJson: storedSkill({ id: "brief_builder", name: "Brief builder" }),
      version: 1,
      versions: [{ version: 1, savedAt: "2026-10-10T00:00:00.000Z" }],
    }),
  });
  await openProcedureSurface(page);
  const create = async () => {
    await page
      .getByLabel("Procedure id", { exact: true })
      .fill("brief_builder");
    await page.getByLabel("Name", { exact: true }).fill("Brief builder");
    await page
      .getByLabel("Triggers (comma separated)", { exact: true })
      .fill("brief, summary");
    await page
      .getByLabel("Required read tools (comma separated)", { exact: true })
      .fill("get_client_context");
    await page
      .getByLabel("Guidance addendum", { exact: true })
      .fill("Build the brief from the stored record.");
    await page.getByRole("button", { name: "Create procedure" }).click();
  };
  await create();
  await expect(page.getByText(/Core reported brief_builder/)).toBeVisible();
  expect(fixture.calls("meri.procedures.create")).toHaveLength(1);
  // A settled command is dropped: no unknown barrier is left, the form is cleared, and the next
  // change dispatches immediately instead of being refused or replayed.
  await expect(
    page.getByText(/the last firm procedure change is unknown/),
  ).toHaveCount(0);
  await expect(page.getByLabel("Procedure id", { exact: true })).toHaveValue(
    "",
  );
  await create();
  await expect
    .poll(() => fixture.calls("meri.procedures.create").length)
    .toBe(2);
  expect(fixture.settled("meri.procedures.create")).toHaveLength(2);
  expectProcedureIsolation(fixture);
});

test("Remove asks for confirmation and dispatches exactly once", async ({
  page,
}, info) => {
  const fixture = await procedureFixture(page);
  fixture.reply("meri.procedures.remove", { json: { deleted: true } });
  await openProcedureSurface(page);
  const remove = procedureRowFor(page, "hearing_prep").getByRole("button", {
    name: "Remove",
    exact: true,
  });
  await remove.click();
  await expect(page.getByRole("dialog")).toContainText(
    "Remove hearing_prep at version 3?",
  );
  await page.screenshot({
    path: info.outputPath("meri-procedures-remove-dialog.png"),
  });
  // Declining dispatches nothing.
  await page.getByRole("button", { name: "Keep it", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(fixture.calls("meri.procedures.remove")).toHaveLength(0);
  await remove.click();
  await page
    .getByRole("button", { name: "Remove procedure", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  // The surface reports the call, not a row it did not see.
  await expect(
    page.getByText(/Core reported the row at version \?/),
  ).toBeVisible();
  const removeCalls = fixture.calls("meri.procedures.remove");
  expect(removeCalls).toHaveLength(1);
  expect(removeCalls[0]!.input).toEqual({
    params: { id: procedureUuid(11) },
    query: { expectedVersion: 3 },
  });
  await page.waitForTimeout(300);
  expect(fixture.calls("meri.procedures.remove")).toHaveLength(1);
  expect(fixture.settled("meri.procedures.list")).toHaveLength(2);
  expectProcedureIsolation(fixture);
});

test("a non-admin account neither reads nor mutates", async ({ page }) => {
  const fixture = await procedureFixture(page);
  fixture.setIdentity(procedureMember);
  await page.goto(procedureUrl());
  await expect(
    page.getByText(/requires the current Core user_admin or capiro_admin role/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create procedure", exact: true }),
  ).toBeDisabled();
  await expect(
    procedureRowFor(page, "hearing_prep").getByRole("button", {
      name: "Disable",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(page.locator("[data-account-key]")).toHaveAttribute(
    "data-account-key",
    JSON.stringify([
      procedureMember.tenant.id,
      procedureMember.user.id,
      procedureMember.role,
    ]),
  );
  await page.waitForTimeout(300);
  // No read is issued at all for a role that cannot read the rows.
  expect(fixture.calls()).toHaveLength(0);
  expect(fixture.settled("meri.procedures.list")).toHaveLength(0);
  expectProcedureIsolation(fixture);
});

test("the account comes from the authenticated Core identity, not the browser session hint", async ({
  page,
}) => {
  const fixture = await procedureFixture(page);
  await openProcedureSurface(page);
  const account = page.locator("[data-account-key]");
  const before = await account.getAttribute("data-account-key");
  expect(before).toBe(
    JSON.stringify([
      procedureAdmin.tenant.id,
      procedureAdmin.user.id,
      procedureAdmin.role,
    ]),
  );
  // A different browser session alone must not change the governed account.
  await replaceProcedureIdentity(page, { orgId: "synthetic-other-org" });
  await expect(procedureRowFor(page, "hearing_prep")).toBeVisible();
  expect(await account.getAttribute("data-account-key")).toBe(before);
  expect(fixture.settled("meri.procedures.list")).toHaveLength(2);
  expectProcedureIsolation(fixture);
});

test("revoking the admin role ends the scope without dispatching another change", async ({
  page,
}) => {
  const fixture = await procedureFixture(page);
  await openProcedureSurface(page);
  const held = fixture.hold("meri.procedures.setEnabled", {
    json: persistedProcedureRow({ enabled: false }),
  });
  await procedureRowFor(page, "hearing_prep")
    .getByRole("button", { name: "Disable", exact: true })
    .click();
  await held.entered;
  fixture.setIdentity(procedureMember);
  await replaceProcedureIdentity(page, {
    sessionId: "synthetic-revoked-session",
  });
  await expect(
    page.getByText(/requires the current Core user_admin or capiro_admin role/),
  ).toBeVisible();
  await held.release();
  await expect(page.getByText(/Core reported/)).toHaveCount(0);
  expect(fixture.calls("meri.procedures.setEnabled")).toHaveLength(1);
  expect(fixture.settled("meri.procedures.list")).toHaveLength(1);
  expectProcedureIsolation(fixture);
});
