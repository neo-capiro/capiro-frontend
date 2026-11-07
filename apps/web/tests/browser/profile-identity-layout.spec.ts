import { expect, test } from "@playwright/test";
import { clientId, json } from "./fixtures";
import { installProfileTools, toolsTenantId } from "./profile-tools-fixtures";

test("cold profile identity resolution admits focus ownership and preserves editable layout", async ({
  page,
}) => {
  const fixture = await installProfileTools(page);
  let releaseIdentity = () => {};
  const pendingIdentity = new Promise<void>((resolve) => {
    releaseIdentity = resolve;
  });
  await page.route("**/api/backend/core/me", async (route) => {
    await pendingIdentity;
    await json(route, {
      user: { id: "user-test", email: "test@example.test" },
      tenant: { id: toolsTenantId, name: "Synthetic UI tenant" },
      role: "user_admin",
    });
  });
  try {
    await page.goto(`/portfolio/${clientId}`);
    const focus = page.getByLabel("Client focus tags");
    const owner = page.getByRole("button", { name: "Account team" });
    const add = page.getByRole("button", {
      name: "+ Add focus tag",
      exact: true,
    });
    await expect(page.getByRole("main").getByRole("status")).toHaveText(
      "Loading…",
    );
    await expect(focus).toHaveCount(0);
    await expect(owner).toHaveCount(0);
    await expect(add).toHaveCount(0);
    expect(fixture.calls.gets).toBe(0);
    expect(fixture.calls.puts).toBe(0);
    releaseIdentity();
    await expect(focus).toContainText("Saved focus");
    await expect(add).toBeEnabled();
    await expect(owner).toBeVisible();
    const focusBox = await focus.boundingBox();
    const ownerBox = await owner.boundingBox();
    if (!focusBox || !ownerBox)
      throw new Error("Current identity has no focus or ownership row");
    expect(focusBox.y + focusBox.height).toBeLessThan(ownerBox.y);
    await add.click();
    await page
      .getByRole("textbox", { name: "Focus tag" })
      .fill("Current actor");
    await page.getByRole("button", { name: "Add tag", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(focus).toContainText("Current actor");
    expect(fixture.current().intakeData.tags).toEqual([
      "Saved focus",
      "Current actor",
    ]);
    expect(fixture.calls.puts).toBe(1);
    expect(fixture.unexpected).toEqual([]);
  } finally {
    releaseIdentity();
  }
});
