import { test, expect } from "@playwright/test";
import {
  acceptanceArtifact,
  artifactFixture,
  attempt,
  controls,
  deferred,
  listSettled,
  localDraft,
  obsoleteEvent,
  originalBody,
  recoveredBody,
  replaceClient,
} from "./acceptance-meeting-artifacts-fixtures";

for (const kind of ["notes", "debriefs"] as const) {
  const singular = kind === "notes" ? "note" : "debrief";
  test(`${kind}: pending then uncertain creation survives list refusal and recovery without replay`, async ({
    page,
  }) => {
    const { state, open, unexpected } = await artifactFixture(page, kind);
    state.items = [];
    const held = deferred();
    state.writeHold = held.promise;
    state.writeStatus = 503;
    state.writeReceipt = { message: "Synthetic ambiguous artifact write" };
    await open();
    await listSettled(page, "success");
    await page
      .getByRole("button", { name: `Add ${singular}`, exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Content", exact: true })
      .fill(localDraft);
    await page
      .getByRole("button", { name: `Save ${singular}`, exact: true })
      .click();
    await expect.poll(() => state.writes.length).toBe(1);
    const originalWrite = structuredClone(state.writes[0]);
    expect(originalWrite).toEqual({
      method: "POST",
      path: `/api/backend/core/engagement/meetings/meeting-one/${kind}`,
      body: { body: localDraft, confidential: false },
    });
    expect(await attempt(page)).toMatchObject({
      status: "pending",
      change: { action: "save", body: localDraft, confidential: false },
    });
    state.readStatus = 403;
    await controls(page, "refresh");
    await listSettled(page, "error");
    expect(await attempt(page)).toMatchObject({
      status: "pending",
      change: { action: "save", body: localDraft, confidential: false },
    });
    held.release();
    await expect
      .poll(async () => (await attempt(page))?.status)
      .toBe("uncertain");
    state.readStatus = 200;
    await controls(page, "refresh");
    await listSettled(page, "success");
    expect(await obsoleteEvent(page, "save")).toMatchObject({
      status: "uncertain",
    });
    expect(state.writes).toEqual([originalWrite]);
    await controls(page, "toggle");
    await expect(
      page.getByRole("heading", {
        name: kind === "notes" ? "Meeting notes" : "Debriefs",
        exact: true,
      }),
    ).toBeHidden();
    await controls(page, "toggle");
    await expect(
      page.getByRole("textbox", { name: "Content", exact: true }),
    ).toHaveValue(localDraft);
    await expect(
      page.getByRole("textbox", { name: "Content", exact: true }),
    ).toHaveAttribute("readonly", "");
    await expect(
      page.getByRole("button", { name: `Save ${singular}`, exact: true }),
    ).toBeDisabled();
    expect(await obsoleteEvent(page, "save")).toMatchObject({
      status: "uncertain",
      change: { action: "save", body: localDraft, confidential: false },
    });
    expect(state.writes).toEqual([originalWrite]);
    expect(unexpected).toEqual([]);
  });

  test(`${kind}: replacing a meeting client requires its own current list receipt`, async ({
    page,
  }) => {
    const { state, open } = await artifactFixture(page, kind);
    await open();
    await expect(page.getByText(originalBody, { exact: true })).toBeVisible();
    const held = deferred();
    state.readHold = held.promise;
    state.clientId = "client-two";
    state.items = [
      { ...acceptanceArtifact(kind, "client-two"), body: recoveredBody },
    ];
    await replaceClient(page, "client-two");
    await expect(
      page.getByText("Current client: client-two", { exact: true }),
    ).toBeVisible();
    await expect.poll(() => state.reads.length).toBe(2);
    await expect(page.getByText(originalBody, { exact: true })).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Edit", exact: true }),
    ).toBeHidden();
    held.release();
    await listSettled(page, "success");
    await expect(page.getByText(recoveredBody, { exact: true })).toBeVisible();
    await expect(page.getByText(originalBody, { exact: true })).toBeHidden();
    expect(state.writes).toEqual([]);
  });
}
