import { test, expect } from "@playwright/test";
import {
  artifactFixture,
  attempt,
  controls,
  deferred,
  listSettled,
  localDraft,
} from "./acceptance-meeting-artifacts-fixtures";

for (const kind of ["notes", "debriefs"] as const) {
  test(`${kind}: list refusal while parent preflight is held prevents write and retains original intent`, async ({
    page,
  }) => {
    const { state, open, unexpected } = await artifactFixture(page, kind);
    state.items = [];
    const held = deferred();
    state.parentHold = held.promise;
    await open();
    await listSettled(page, "success");
    const singular = kind === "notes" ? "note" : "debrief";
    await page
      .getByRole("button", { name: `Add ${singular}`, exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Content", exact: true })
      .fill(localDraft);
    await page
      .getByRole("button", { name: `Save ${singular}`, exact: true })
      .click();
    await expect.poll(() => state.parentReads.length).toBe(1);
    const parent = state.parentReads[0]!;
    expect(await attempt(page)).toMatchObject({
      status: "pending",
      change: { action: "save", body: localDraft, confidential: false },
    });
    expect(state.writes).toEqual([]);
    state.readStatus = 403;
    await controls(page, "refresh");
    await listSettled(page, "error");
    const completed = page.waitForEvent(
      "requestfinished",
      (request) => request === parent,
    );
    held.release();
    await completed;
    // The same original attempt must terminate after the exact held parent read.
    await expect
      .poll(async () => (await attempt(page))?.status)
      .toBe("refused");
    expect(await attempt(page)).toMatchObject({
      status: "refused",
      change: { action: "save", body: localDraft, confidential: false },
    });
    expect(state.writes).toEqual([]);
    state.readStatus = 200;
    state.parentHold = undefined;
    await controls(page, "refresh");
    await listSettled(page, "success");
    await expect(
      page.getByRole("textbox", { name: "Content", exact: true }),
    ).toHaveValue(localDraft);
    await expect(
      page.getByRole("button", { name: `Save ${singular}`, exact: true }),
    ).toBeEnabled();
    expect(state.writes).toEqual([]);
    expect(unexpected).toEqual([]);
  });
}
