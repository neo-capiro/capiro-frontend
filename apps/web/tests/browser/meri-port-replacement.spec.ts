import { expect, test, type Page } from "@playwright/test";
const calls = (page: Page) =>
  page.evaluate(() =>
    (
      window as unknown as { replacementCalls: () => string[] }
    ).replacementCalls(),
  );
for (const late of [false, true]) {
  test(`renewed port reads its transcript while the retired read ${late ? "settles late" : "is aborted"}`, async ({
    page,
  }) => {
    await page.goto(`/meri-port-replacement.html${late ? "?late=1" : ""}`);
    await expect.poll(() => calls(page)).toHaveLength(1);
    await expect(page.getByTestId("busy")).toHaveText("true");
    await page.getByRole("button", { name: "Replace session" }).click();
    await expect.poll(() => calls(page)).toHaveLength(2);
    await expect(page.getByTestId("transcript")).toHaveText("loaded");
    await expect(page.getByTestId("state")).toHaveText("completed");
    await expect(page.getByTestId("busy")).toHaveText("false");
    await expect(page.getByTestId("error")).toHaveText("none");
    if (late) {
      await page.getByRole("button", { name: "Release retired read" }).click();
      await expect
        .poll(() =>
          page.evaluate(() =>
            (
              window as unknown as { retiredSettled: () => boolean }
            ).retiredSettled(),
          ),
        )
        .toBe(true);
      await expect(page.getByTestId("transcript")).toHaveText("loaded");
      await expect(page.getByTestId("error")).toHaveText("none");
    }
    expect((await calls(page)).every((path) => path.endsWith("/history"))).toBe(
      true,
    );
  });
}
