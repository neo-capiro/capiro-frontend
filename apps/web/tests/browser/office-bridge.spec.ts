import { expect, test } from "@playwright/test";

/** Entry → proposal → apply → reopen over the scripted owners: the Files entry carries the exact version
 * (id and hash) into the conversation handoff; Meri's proposal shows each change with before/after; Apply
 * sends one approved decision, the card reports the version saved from Meri's edit and reopens it in the
 * editor with its provenance note; a repeated Apply is never sent. Not Collabora, Core or Meri acceptance. */
test("Ask Meri entry, proposal review, Apply and reopen of the published version", async ({
  page,
}) => {
  await page.goto("/office-bridge.html", { timeout: 120_000 });
  await page
    .getByRole("button", { name: "Ask Meri about this document", exact: true })
    .click();
  await expect(
    page.getByRole("link", {
      name: "Continue with Meri in the original conversation",
    }),
  ).toBeVisible();
  // The handoff is the tab journal record the composer adopts on the conversation page.
  const handoff = await page.evaluate(() =>
    Object.entries(sessionStorage)
      .filter(([key]) => key.includes("handoff"))
      .map(([, value]) => value)
      .join(" | "),
  );
  expect(handoff).toContain("00000000-0000-4000-8000-00000000000b");
  expect(handoff).toContain("a".repeat(64));
  expect(handoff).toContain("Quarterly report.docx");

  const card = page.getByRole("article", {
    name: /Edit Quarterly report.docx/,
  });
  await expect(card).toContainText("Awaiting your decision");
  await expect(card).toContainText("Change 1 before");
  await expect(card).toContainText("Quarterly report — Ω (final)");
  await expect(card).toContainText("(nothing: a new unit is inserted)");
  await card.getByRole("button", { name: "Approve…", exact: true }).click();
  await card
    .getByRole("button", { name: "Confirm approval", exact: true })
    .click();
  await expect(page.getByLabel("Proposal status")).toHaveText("applied");
  await expect(card).toContainText("Applied");
  await expect(card).toContainText("Saved from");
  await expect(card).toContainText("Meri's edit, applied by you");
  const operations = page.getByLabel("Service operations");
  await expect(operations).toContainText("decide:approved");
  expect(
    (await operations.textContent())!.split("decide:approved").length,
  ).toBe(2);
  await expect(
    card.getByRole("button", { name: "Approve…", exact: true }),
  ).toHaveCount(0);

  await card
    .getByRole("button", { name: "Open the new version in the editor" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Quarterly report.docx");
  await expect(dialog).toContainText(
    "New version of Quarterly report.docx, saved from Meri's edit",
  );
  await expect(dialog).toContainText(
    "Save keeps a private draft. Release the editor, then Publish to create a new file version.",
  );
});

test("Reject records the person's choice and the proposal is never applied", async ({
  page,
}) => {
  await page.goto("/office-bridge.html", { timeout: 120_000 });
  const card = page.getByRole("article", {
    name: /Edit Quarterly report.docx/,
  });
  await card.getByRole("button", { name: "Reject…", exact: true }).click();
  await card
    .getByRole("button", { name: "Confirm rejection", exact: true })
    .click();
  await expect(page.getByLabel("Proposal status")).toHaveText("rejected");
  await expect(card).toContainText("Rejected");
  await expect(card).toContainText("Nothing was changed");
  await expect(
    card.getByRole("button", { name: "Open the new version in the editor" }),
  ).toHaveCount(0);
});
