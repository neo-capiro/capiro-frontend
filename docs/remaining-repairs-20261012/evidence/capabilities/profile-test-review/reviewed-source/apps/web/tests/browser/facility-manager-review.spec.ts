import { test, expect } from "@playwright/test";
import {
  installProfileCurrentState,
  profileEvent,
} from "./profile-current-state-fixtures";
import { profileFacility } from "../profile-current-state-fixtures";
import { json } from "./fixtures";

for (const outcome of ["remote update", "uncertain applied edit"] as const)
  test(`inline facility recovery adopts the reviewed record after ${outcome}`, async ({
    page,
  }) => {
    const { state, unexpected } = await installProfileCurrentState(page);
    await page.goto("/profile-current-state.html?mode=facilities");
    await page
      .getByRole("button", { name: "Add facility", exact: true })
      .click();
    const manager = page.getByRole("dialog", {
      name: "Facilities: Synthetic profile client",
      exact: true,
    });
    await manager.getByRole("button", { name: "Edit", exact: true }).click();
    await manager
      .getByLabel("Notes", { exact: true })
      .fill("Local unsaved note");
    const saved = { ...profileFacility, notes: "Authoritative current note" };
    if (outcome === "remote update") {
      state.facilities = [saved];
      await profileEvent(page, "refresh");
      await expect(
        manager.getByText(/saved facility changed or is unavailable/i),
      ).toBeVisible();
    } else {
      state.write = (route) => {
        state.facilities = [saved];
        return json(route, { message: "Synthetic lost edit receipt" }, 503);
      };
      await manager
        .getByRole("button", { name: "Save facility", exact: true })
        .click();
      await expect(
        manager.getByText(/facility change result is unknown/i),
      ).toBeVisible();
    }
    await expect(manager.getByLabel("Notes", { exact: true })).toHaveValue(
      "Local unsaved note",
    );
    await expect(
      manager.getByRole("button", { name: "Save facility", exact: true }),
    ).toBeDisabled();
    await manager
      .getByRole("button", { name: "Review current facilities", exact: true })
      .click();
    await manager
      .getByRole("button", { name: "Use the reviewed facility", exact: true })
      .click();
    await expect(manager.getByLabel("Notes", { exact: true })).toHaveValue(
      "Authoritative current note",
    );
    await expect(
      manager.getByRole("button", { name: "Save facility", exact: true }),
    ).toBeEnabled();
    expect(state.writes).toHaveLength(outcome === "remote update" ? 0 : 1);
    expect(unexpected).toEqual([]);
  });
