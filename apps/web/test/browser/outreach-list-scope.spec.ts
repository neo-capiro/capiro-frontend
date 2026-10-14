import { expect, test, type Route } from "@playwright/test";
import { expectAccessibleHome } from "../accessibility";
import {
  assertNoEffects,
  clientId,
  otherClientId,
  otherRecordId,
  record,
  requestCompletion,
  setupOutreach,
} from "./core109-outreach-fixtures";

for (const width of [1440, 390]) {
  test(`Outreach scope-error keyboard retry conceals rows during the held read at ${width}px`, async ({
    page,
  }, info) => {
    const observed = await setupOutreach(page);
    await page.setViewportSize({ width, height: 1000 });
    if (width === 390) await page.emulateMedia({ colorScheme: "dark" });
    let held: Route | undefined;
    let reads = 0;
    await page.route("**/api/capiro/engagement.outreach?*", (route) => {
      if (++reads === 1)
        return route.fulfill({ json: [{ ...record, client: null }] });
      held = route;
    });
    await page.goto(`/modules/engagement?view=outreach&clientId=${clientId}`);
    await expect(page.getByRole("alert")).toContainText(
      "does not match this client scope",
    );
    await expectAccessibleHome(page, info);
    await page.screenshot({
      path: info.outputPath(`outreach-scope-error-${width}.png`),
      fullPage: true,
    });
    const retry = page.getByRole("button", { name: "Try again", exact: true });
    await retry.focus();
    await expect(retry).toBeFocused();
    await page.keyboard.press("Enter");
    await expect.poll(() => Boolean(held)).toBe(true);
    await expect(
      page.getByRole("button", { name: record.title, exact: true }),
    ).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    assertNoEffects(observed);
    const settled = requestCompletion(page, held!.request());
    await held!.fulfill({ json: [record] });
    await settled;
    await expect(
      page.getByRole("button", { name: record.title, exact: true }),
    ).toBeVisible();
    expect(reads).toBe(2);
    assertNoEffects(observed);
  });
}

for (const association of [
  "other-client",
  "null-client",
  "missing-client",
] as const) {
  test(`scoped Outreach refuses ${association} list receipts and recovers with a current matching read`, async ({
    page,
  }) => {
    const observed = await setupOutreach(page);
    let mismatch = true;
    const inputs: unknown[] = [];
    await page.route("**/api/capiro/engagement.outreach?*", (route) => {
      inputs.push(
        JSON.parse(new URL(route.request().url()).searchParams.get("input")!),
      );
      return route.fulfill({
        json: mismatch
          ? [
              record,
              {
                ...record,
                id: otherRecordId,
                title: "Synthetic unverified client record",
                client:
                  association === "other-client"
                    ? { id: otherClientId, name: "Other client" }
                    : association === "null-client"
                      ? null
                      : undefined,
              },
            ]
          : [record],
      });
    });
    await page.goto(`/modules/engagement?view=outreach&clientId=${clientId}`);
    await expect(page.getByRole("alert")).toContainText(
      "The returned outreach does not match this client scope.",
    );
    await expect(
      page.getByRole("button", { name: record.title, exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", {
        name: "Synthetic unverified client record",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    assertNoEffects(observed);
    mismatch = false;
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await page.getByRole("button", { name: record.title, exact: true }).click();
    await expect(page.getByLabel("Body", { exact: true })).toHaveValue(
      record.body,
    );
    expect(inputs).toEqual(Array(2).fill({ query: { clientId, limit: 500 } }));
    assertNoEffects(observed);
  });
}

test("all permitted clients Outreach retains matching, other-client and unassigned records", async ({
  page,
}) => {
  const observed = await setupOutreach(page);
  const unassigned = {
    ...record,
    id: otherRecordId,
    title: "Synthetic unassigned record",
    client: null,
  };
  const other = {
    ...record,
    id: "60000000-0000-4000-8000-000000000006",
    title: "Synthetic other-client record",
    client: { id: otherClientId, name: "Other client" },
  };
  await page.route("**/api/capiro/engagement.outreach?*", (route) =>
    route.fulfill({ json: [record, unassigned, other] }),
  );
  await page.goto("/modules/engagement?view=outreach");
  for (const row of [record, unassigned, other])
    await expect(
      page.getByRole("button", { name: row.title, exact: true }),
    ).toBeVisible();
  await page
    .getByRole("button", { name: unassigned.title, exact: true })
    .click();
  await expect(page.getByLabel("Body", { exact: true })).toHaveValue(
    record.body,
  );
  assertNoEffects(observed);
});
