import { expect, test, type Route } from "@playwright/test";
import { expectAccessibleHome } from "../accessibility";
import { installFixedDate } from "./fixed-date";
import {
  assertNoEffects,
  clientId,
  otherClientId,
  otherRecordId,
  record,
  requestCompletion,
  setupOutreach,
} from "./core109-outreach-fixtures";

test.beforeEach(async ({ page }) => {
  await installFixedDate(page, Date.parse("2026-10-08T16:00:00Z"));
});

for (const width of [1440, 390]) {
  test(`Outreach scope-error keyboard retry conceals rows during the held read at ${width}px`, async ({
    page,
  }, info) => {
    const observed = await setupOutreach(page);
    await page.setViewportSize({ width, height: 1000 });
    if (width === 390) await page.emulateMedia({ colorScheme: "dark" });
    let held: Route | undefined;
    let reads = 0;
    await page.route("**/api/capiro/engagement.outreach.records?*", (route) => {
      if (++reads === 1)
        return route.fulfill({
          json: {
            items: [{ ...record, client: null, hasWorkflow: false }],
            nextCursor: null,
          },
        });
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
      page.getByRole("button", {
        name: `Open draft: ${record.title}`,
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    assertNoEffects(observed);
    const settled = requestCompletion(page, held!.request());
    await held!.fulfill({
      json: { items: [{ ...record, hasWorkflow: false }], nextCursor: null },
    });
    await settled;
    await expect(
      page.getByRole("button", {
        name: `Open draft: ${record.title}`,
        exact: true,
      }),
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
    await page.route("**/api/capiro/engagement.outreach.records?*", (route) => {
      inputs.push(
        JSON.parse(new URL(route.request().url()).searchParams.get("input")!),
      );
      return route.fulfill({
        json: {
          items: (mismatch
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
            : [record]
          ).map((row) => ({ ...row, hasWorkflow: false })),
          nextCursor: null,
        },
      });
    });
    await page.goto(`/modules/engagement?view=outreach&clientId=${clientId}`);
    await expect(page.getByRole("alert")).toContainText(
      "The returned outreach does not match this client scope.",
    );
    await expect(
      page.getByRole("button", {
        name: `Open draft: ${record.title}`,
        exact: true,
      }),
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
    await page
      .getByRole("button", { name: `Open draft: ${record.title}`, exact: true })
      .click();
    await expect(page.getByLabel("Body", { exact: true })).toHaveValue(
      record.body,
    );
    expect(inputs).toEqual(
      Array(2).fill({
        query: {
          clientId,
          deleted: "false",
          limit: 100,
        },
      }),
    );
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
  await page.route("**/api/capiro/engagement.outreach.records?*", (route) =>
    route.fulfill({
      json: {
        items: [record, unassigned, other].map((row) => ({
          ...row,
          hasWorkflow: false,
        })),
        nextCursor: null,
      },
    }),
  );
  await page.goto("/modules/engagement?view=outreach");
  await page.route("**/api/capiro/engagement.outreach.record?*", (route) =>
    route.fulfill({ json: unassigned }),
  );
  for (const row of [record, unassigned, other])
    await expect(
      page.getByRole("button", {
        name: `Open draft: ${row.title}`,
        exact: true,
      }),
    ).toBeVisible();
  await page
    .getByRole("button", {
      name: `Open draft: ${unassigned.title}`,
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Body", { exact: true })).toHaveValue(
    record.body,
  );
  assertNoEffects(observed);
});
