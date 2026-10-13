import { test, expect } from "@playwright/test";
import {
  acceptanceArtifact,
  acceptanceMetadata,
  artifactFixture,
  controls,
  deferred,
  listSettled,
  listState,
  localDraft,
  obsoleteEvent,
  originalBody,
  recoveredBody,
} from "./acceptance-meeting-artifacts-fixtures";

for (const kind of ["notes", "debriefs"] as const) {
  const singular = kind === "notes" ? "note" : "debrief";
  test(`${kind}: a held read conceals an open editor without discarding its local draft`, async ({
    page,
  }) => {
    const { state, open, unexpected } = await artifactFixture(page, kind);
    await open();
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const content = page.getByRole("textbox", { name: "Content", exact: true });
    await content.fill(localDraft);
    const held = deferred();
    state.readHold = held.promise;
    await controls(page, "refresh");
    await expect
      .poll(async () => (await listState(page))?.fetchStatus)
      .toBe("fetching");
    await expect(content).toBeHidden();
    expect(await obsoleteEvent(page, "save")).toMatchObject({ status: "idle" });
    expect(state.writes).toEqual([]);
    state.readHold = undefined;
    held.release();
    await listSettled(page, "success");
    await expect(content).toBeVisible();
    await expect(content).toHaveValue(localDraft);
    state.writeReceipt = { ...acceptanceMetadata(kind), status: "edited" };
    state.items = [
      { ...acceptanceArtifact(kind), body: localDraft, status: "edited" },
    ];
    await page
      .getByRole("button", { name: `Save ${singular}`, exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByText(localDraft, { exact: true })).toBeVisible();
    expect(state.writes).toEqual([
      {
        method: "PATCH",
        path: `/api/backend/core/engagement/meetings/meeting-one/${kind}/artifact-one`,
        body: { body: localDraft, confidential: false },
      },
    ]);
    expect(unexpected).toEqual([]);
  });

  test(`${kind}: a failed read refuses an obsolete editor submit before dispatch`, async ({
    page,
  }) => {
    const { state, open } = await artifactFixture(page, kind);
    await open();
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Content", exact: true })
      .fill(localDraft);
    state.readStatus = 403;
    await controls(page, "refresh");
    await listSettled(page, "error");
    // A synthetic old submit explicitly exercises the handler, not just CSS/disabled state.
    expect(await obsoleteEvent(page, "save")).toMatchObject({ status: "idle" });
    expect(state.writes).toEqual([]);
    await expect(
      page.getByRole("textbox", { name: "Content", exact: true }),
    ).toBeHidden();
    state.readStatus = 200;
    await controls(page, "refresh");
    await listSettled(page, "success");
    await expect(
      page.getByRole("textbox", { name: "Content", exact: true }),
    ).toHaveValue(localDraft);
    await expect(
      page.getByRole("button", { name: `Save ${singular}`, exact: true }),
    ).toBeEnabled();
    expect(state.writes).toEqual([]);
  });

  test(`${kind}: an already opened share confirmation cannot dispatch after list refusal`, async ({
    page,
  }) => {
    const { state, open } = await artifactFixture(page, kind);
    state.items = [{ ...acceptanceArtifact(kind), status: "approved" }];
    await open();
    await page.getByRole("button", { name: "Share", exact: true }).click();
    const dialog = page.getByRole("dialog", {
      name: `Share ${singular}`,
      exact: true,
    });
    await expect(dialog).toBeVisible();
    state.readStatus = 403;
    await controls(page, "refresh");
    await listSettled(page, "error");
    expect(await obsoleteEvent(page, "share")).toMatchObject({
      status: "idle",
    });
    expect(state.writes).toEqual([]);
    await expect(dialog).toBeHidden();
    state.readStatus = 200;
    await controls(page, "refresh");
    await listSettled(page, "success");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: `Share ${singular}`, exact: true }),
    ).toBeEnabled();
    expect(state.writes).toEqual([]);
  });
}

test("debrief preview conceals cached content and printing after parent list refusal", async ({
  page,
}) => {
  const { state, open } = await artifactFixture(page, "debriefs");
  await open();
  await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  const preview = page.getByRole("dialog", {
    name: "Meeting debrief · PDF preview",
    exact: true,
  });
  await expect(preview.getByText(originalBody, { exact: true })).toBeVisible();
  state.readStatus = 403;
  await controls(page, "refresh");
  await listSettled(page, "error");
  await expect(preview).toBeHidden();
  await expect(page.getByText(originalBody, { exact: true })).toBeHidden();
  await page.evaluate(() => {
    Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
      .find((button) => button.textContent?.trim() === "Print / Save as PDF")
      ?.click();
  });
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __artifactPrintCalls: number })
          .__artifactPrintCalls,
    ),
  ).toBe(0);
  state.readStatus = 200;
  state.items = [
    {
      ...acceptanceArtifact("debriefs"),
      body: recoveredBody,
      updatedAt: "2026-10-10T15:05:00Z",
    },
  ];
  await controls(page, "refresh");
  await listSettled(page, "success");
  // Reopening after current admission must use the new persisted document.
  if (await preview.isVisible())
    await preview
      .getByRole("button", { name: "Close preview", exact: true })
      .click();
  await page.getByRole("button", { name: "Export PDF", exact: true }).click();
  await expect(preview.getByText(recoveredBody, { exact: true })).toBeVisible();
  await expect(preview.getByText(originalBody, { exact: true })).toBeHidden();
  expect(state.writes).toEqual([]);
});
