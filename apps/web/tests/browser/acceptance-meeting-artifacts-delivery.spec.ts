import { test, expect } from "@playwright/test";
import {
  artifactFixture,
  invalidateAndSubmit,
  listSettled,
  localDraft,
} from "./acceptance-meeting-artifacts-fixtures";

for (const kind of ["notes", "debriefs"] as const) {
  test(`${kind}: a delivered editor submit checks current cache before React conceals the form`, async ({
    page,
  }) => {
    const { state, open, unexpected } = await artifactFixture(page, kind);
    await open();
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Content", exact: true })
      .fill(localDraft);
    state.readStatus = 403;
    const observed = await invalidateAndSubmit(page);
    expect(observed).toMatchObject({
      delivered: true,
      connectedAfterInvalidation: true,
      handled: true,
      list: { fetchStatus: "fetching" },
      attempt: { status: "idle" },
    });
    await listSettled(page, "error");
    await expect(
      page.getByRole("textbox", { name: "Content", exact: true }),
    ).toBeHidden();
    expect(state.writes).toEqual([]);
    expect(unexpected).toEqual([]);
  });
}
