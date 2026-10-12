import { expect, test } from "@playwright/test";
import { clientId, otherClientId, setup } from "./next-modules-fixtures";

for (const view of ["Month", "Week", "Agenda"] as const) {
  test(`Calendar keeps ${view} and chosen date across client, Master and history`, async ({
    page,
  }) => {
    await setup(page);
    await page.goto("/modules/calendar");
    await page.getByRole("button", { name: view, exact: true }).click();
    await page
      .getByRole("button", { name: "Choose calendar date", exact: true })
      .click();
    await page.getByLabel("Calendar date", { exact: true }).fill("2027-02-17");
    await page.getByRole("button", { name: "Done", exact: true }).click();
    const title = await page
      .getByRole("button", { name: "Choose calendar date", exact: true })
      .textContent();
    const check = async (scope: string) => {
      await expect(page.getByLabel("Calendar client scope")).toHaveValue(scope);
      await expect(
        page.getByRole("button", { name: view, exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(
        page.getByRole("button", { name: "Choose calendar date", exact: true }),
      ).toHaveText(title!);
      await page
        .getByRole("button", { name: "Choose calendar date", exact: true })
        .click();
      await expect(
        page.getByLabel("Calendar date", { exact: true }),
      ).toHaveValue("2027-02-17");
      await page.getByRole("button", { name: "Done", exact: true }).click();
    };
    await page.getByLabel("Calendar client scope").selectOption(clientId);
    await check(clientId);
    await page.getByLabel("Calendar client scope").selectOption(otherClientId);
    await check(otherClientId);
    await page.getByLabel("Calendar client scope").selectOption("");
    await check("");
    await page.goBack();
    await check(otherClientId);
    await page.goBack();
    await check(clientId);
    await page.goBack();
    await check("");
    await page.goForward();
    await check(clientId);
    await page.reload();
    await check(clientId);
  });
}

test("invalid Calendar URL selection falls back to valid defaults before any date request", async ({
  page,
}) => {
  const queries: unknown[] = [];
  await setup(page, {
    "engagement.meetings": (input) => {
      queries.push(input);
      return [];
    },
  });
  await page.goto(
    `/modules/calendar?clientId=${clientId}&view=bogus&date=2026-02-30`,
  );
  await expect(
    page.getByRole("button", { name: "Month", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Choose calendar date", exact: true }),
  ).toHaveText("October 2026");
  await expect.poll(() => queries.length).toBeGreaterThan(0);
  expect(queries).toEqual([
    {
      query: {
        from: "2026-09-28T04:00:00Z",
        to: "2026-11-02T05:00:00Z",
        clientId,
      },
    },
  ]);
});
