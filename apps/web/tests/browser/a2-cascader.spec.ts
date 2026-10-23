import { expect, test } from "@playwright/test";

for (const query of [
  "",
  "static=1",
  "back=1",
  "mode=columns",
  "mode=columns&back=1",
  "virtual=1",
  "mode=tree",
]) {
  test(`Cascader retains keyboard activation through level changes: ${query || "async drill"}`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/a2-cascader.html?${query}`);
    const trigger = page.getByRole("combobox", {
      name: "Choose synthetic work",
    });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const search = page.getByRole("combobox", {
      name: "Search synthetic work",
    });
    await expect(search).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowRight");
    const leaf = page.getByRole(
      query.includes("tree") ? "treeitem" : "option",
      { name: /^Synthetic leaf 0/ },
    );
    await expect(leaf).toBeVisible();
    if (query.includes("virtual")) {
      await expect(page.getByRole("listbox")).toHaveAttribute(
        "data-virtualized",
      );
      expect(await page.getByRole("option").count()).toBeLessThan(200);
    }
    if (query.includes("back")) {
      await page.keyboard.press("ArrowLeft");
      await expect(
        page.getByRole("option", { name: /^Synthetic branch/ }),
      ).toBeVisible();
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowRight");
      await expect(leaf).toBeVisible();
    }
    await search.fill("Synthetic leaf 0");
    await page.keyboard.press("ArrowDown");
    if (query.includes("tree")) await page.keyboard.press("ArrowDown");
    await expect(leaf).toHaveAttribute("data-highlighted");
    await expect(search).toHaveAttribute(
      "aria-activedescendant",
      (await leaf.getAttribute("id")) ?? "missing",
    );
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("status", { name: "Selected work" }),
    ).toHaveText("leaf-0");
    await trigger.click();
    await expect(leaf).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    expect(errors).toEqual([]);
  });
}
