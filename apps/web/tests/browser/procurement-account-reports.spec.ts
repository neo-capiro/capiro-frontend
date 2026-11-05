import { test, expect, type Route } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import nativeActions from "../fixtures/procurement-action-details-native.json" with { type: "json" };
import {
  accountFixture,
  unavailableAccounts,
} from "../fixtures/procurement-account-reports";

const evidence =
  process.env.CAPIRO_PROCUREMENT_EVIDENCE_DIR ??
  "test-results/account-evidence";
fs.mkdirSync(evidence, { recursive: true });

/**
 * Convert old-contract action-details fixture to observed-contract format.
 * ProcurementPanel uses procurement.observedActionDetails, not the old
 * procurement.actionDetails.
 */
function makeObservedFromNative(native: typeof nativeActions) {
  return {
    ...native,
    contract: "defproc-observed-money-flow/v1" as const,
    measure: "latest_observed_actions" as const,
    revisionBasis: "latest_observed" as const,
    sourceThrough: null,
    provenance: native.provenance.map((p) => ({
      ...p,
      contract: "sam-contract-action/observed-v1" as const,
    })),
    groups: native.groups.map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ latestSourceRevision: _omit, ...g }) => g,
    ),
    actionDetails: native.actionDetails.map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ sourceRevisionOrder, transactionIdentityKey: _oldTx, ...d }) => ({
        ...d,
        sourceRevisionLabel: sourceRevisionOrder,
        transactionIdentityKey:
          "sam_gov|modification|" +
          encodeURIComponent(
            JSON.stringify([
              "sam-contract-action/observed-v1",
              d.awardIdentityKey,
              d.modificationNumber,
              d.transactionNumber,
            ]),
          ),
      }),
    ),
  };
}

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`account reporting stays separate, exports its receipt and clears errors at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("503"))
        errors.push(message.text());
    });
    // ProcurementPanel uses procurement.observedActionDetails (not the old
    // procurement.actionDetails). Intercept the observed operation and respond
    // with an observed-contract version of the native fixture.
    await page.route(
      "**/api/capiro/procurement.observedActionDetails",
      (route) => route.fulfill({ json: makeObservedFromNative(nativeActions) }),
    );
    const accounts = unavailableAccounts(
      nativeActions.scope.awardIdentityKeys,
      nativeActions.knownAt,
    );
    accounts.reports[0] = accountFixture(
      nativeActions.scope.awardIdentityKeys[0],
      nativeActions.knownAt,
    ).reports[0]!;
    let pending: Route | undefined;
    let fail = false;
    let readCount = 0;
    await page.route(
      "**/api/capiro/procurement.accountReports",
      async (route) => {
        readCount += 1;
        expect(route.request().postDataJSON().body).toEqual({
          awardIdentityKeys: nativeActions.scope.awardIdentityKeys,
          knownAt: nativeActions.knownAt,
        });
        if (fail)
          await route.fulfill({
            status: 503,
            json: { message: "Synthetic account read refusal" },
          });
        else pending = route;
      },
    );
    const params = new URLSearchParams({
      scenario: "panel",
      procurementKnownAt: nativeActions.knownAt,
    });
    for (const key of nativeActions.scope.awardIdentityKeys)
      params.append("procurementAward", key);
    await page.goto(`/procurement-result.html?${params}`);
    const region = page.getByRole("region", {
      name: "Reported accounts and outlays",
      exact: true,
    });
    await expect.poll(() => Boolean(pending)).toBe(true);
    await expect(region.getByRole("status")).toContainText("Loading");
    await page.evaluate(() => document.fonts.ready);
    await region.screenshot({
      path: path.join(evidence, `${viewport.width}-accounts-loading.png`),
    });
    await pending!.fulfill({ json: accounts });
    await expect(region.locator("tbody tr")).toHaveCount(3);
    await expect(region).toContainText("-$1,700,000.00");
    await expect(region).toContainText("$0.00");
    await expect(region).toContainText("Only historical reporting periods");
    if (viewport.width === 390)
      await expect(
        region.getByText(
          "Scroll horizontally to see reported amounts and source agencies.",
          { exact: true },
        ),
      ).toBeVisible();
    await expect(
      page.getByText("Observed outlays (USD)", { exact: true }).locator(".."),
    ).toContainText("Not reported");
    await page.getByRole("button", { name: "FY2025", exact: true }).click();
    await expect(region.locator("tbody tr")).toHaveCount(3);
    expect(readCount).toBe(1);
    const downloadEvent = page.waitForEvent("download");
    await region
      .getByRole("button", { name: "Export account evidence", exact: true })
      .click();
    const download = await downloadEvent;
    const file = path.join(evidence, `${viewport.width}-account-export.json`);
    await download.saveAs(file);
    const exported = JSON.parse(fs.readFileSync(file, "utf8"));
    expect(exported.sourceSnapshot).toEqual(accounts);
    expect(exported.caveats.join(" ")).toContain(
      "never added to SAM action obligations",
    );
    expect(exported).not.toHaveProperty("totalOutlays");
    await region.getByText("Observation receipt", { exact: true }).click();
    await expect(
      region.getByText(accounts.reports[0]!.sourcePayloadSha256!, {
        exact: true,
      }),
    ).toBeVisible();
    await region
      .locator("details > summary")
      .filter({ hasText: "No observation available" })
      .click();
    await expect(region).toContainText("This does not mean zero spending");
    await region.screenshot({
      path: path.join(evidence, `${viewport.width}-accounts-ready.png`),
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(viewport.width + 1);
    const money = region.getByText("-$1,700,000.00", { exact: true });
    expect(
      await money.evaluate((element) => {
        const r = document.createRange();
        r.selectNodeContents(element);
        return r.getClientRects().length;
      }),
    ).toBe(1);
    const scroll = region.locator('[role="region"]');
    if (viewport.width === 390) {
      await scroll.focus();
      await page.keyboard.press("ArrowRight");
      await expect
        .poll(() => scroll.evaluate((element) => element.scrollLeft))
        .toBeGreaterThan(0);
      await region.getByText("$0.00", { exact: true }).scrollIntoViewIfNeeded();
      await expect(region.getByText("$0.00", { exact: true })).toBeInViewport();
      await page.screenshot({
        path: path.join(
          evidence,
          `${viewport.width}-accounts-money-columns.png`,
        ),
      });
    }
    fail = true;
    await region
      .getByRole("button", { name: "Reload account snapshot", exact: true })
      .click();
    await expect(region.getByRole("alert")).toBeVisible();
    await expect(region.locator("table")).toHaveCount(0);
    await expect(
      region.getByRole("button", {
        name: "Export account evidence",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Observed obligations (USD)", { exact: true }),
    ).toBeVisible();
    await region.screenshot({
      path: path.join(evidence, `${viewport.width}-accounts-error.png`),
    });
    expect(errors).toEqual([]);
  });
}

for (const width of [1440, 390]) {
  test(`retained original-source rows render without fabricating SAM actions at ${width}px`, async ({
    page,
  }) => {
    const accounts = (
      await import("../fixtures/procurement-account-reports-source.json", {
        with: { type: "json" },
      })
    ).default;
    const actions = (
      await import("../fixtures/procurement-account-actions-source.json", {
        with: { type: "json" },
      })
    ).default;
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    expect(actions.actionDetails).toEqual([]);
    expect(actions.totals).toBeNull();
    expect(accounts.knownAt).toBe(actions.knownAt);
    expect(accounts.scope).toEqual(actions.scope);
    // ProcurementPanel uses procurement.observedActionDetails. Build an observed-contract
    // unavailable response from the source fixture scope so the panel renders
    // the unavailable state without fabricating spending totals.
    const observedUnavailable = {
      contract: "defproc-observed-money-flow/v1",
      measure: "latest_observed_actions",
      revisionBasis: "latest_observed",
      state: "unavailable",
      currency: "USD",
      knownAt: actions.knownAt,
      sourceThrough: null,
      scope: actions.scope,
      totals: null,
      coverage: (actions as Record<string, unknown>).coverage ?? {
        unqualified: "0",
      },
      groups: [],
      provenance: [],
      actionDetails: [],
      sources: (actions as Record<string, unknown>).sources ?? [],
    };
    await page.route(
      "**/api/capiro/procurement.observedActionDetails",
      (route) => route.fulfill({ json: observedUnavailable }),
    );
    await page.route("**/api/capiro/procurement.accountReports", (route) => {
      expect(route.request().postDataJSON().body).toEqual({
        awardIdentityKeys: actions.scope.awardIdentityKeys,
        knownAt: actions.knownAt,
      });
      return route.fulfill({ json: accounts });
    });
    const params = new URLSearchParams({
      scenario: "panel",
      sourceReplay: "1",
      procurementKnownAt: actions.knownAt,
    });
    for (const key of actions.scope.awardIdentityKeys)
      params.append("procurementAward", key);
    await page.goto(`/procurement-result.html?${params}`);
    const region = page.getByRole("region", {
      name: "Reported accounts and outlays",
      exact: true,
    });
    let observedRows = 0;
    for (const [index, report] of accounts.reports.entries()) {
      const summary = region
        .locator("summary")
        .filter({ hasText: `${report.awardIdentityKey.slice(18)} ·` });
      const section = summary.locator("..");
      if (
        !(await section.evaluate(
          (element) => (element as HTMLDetailsElement).open,
        ))
      )
        await summary.click();
      for (let offset = 0; offset < report.rows.length; offset += 20) {
        const expected = report.rows
          .slice(offset, offset + 20)
          .map((row) => `Source row ${row.sourceRowIndex + 1}`);
        await expect(
          section.locator("tbody tr td:first-child small"),
        ).toHaveText(expected);
        observedRows += expected.length;
        if (offset + 20 < report.rows.length)
          await section
            .getByRole("button", { name: "Next account rows", exact: true })
            .click();
      }
      for (
        let pageIndex = Math.ceil(report.rows.length / 20) - 1;
        pageIndex > 0;
        pageIndex--
      ) {
        await section
          .getByRole("button", { name: "Previous account rows", exact: true })
          .click();
      }
      if (index > 0) await summary.click();
    }
    expect(observedRows).toBe(82);
    await expect(page.getByRole("status").first()).toContainText(
      "Spending totals are unavailable; this does not mean zero spending",
    );
    await expect(region).toContainText("Only historical reporting periods");
    await expect(region).toContainText(
      accounts.reports[0]!.rows[0]!.accountTitle!,
    );
    const downloaded = page.waitForEvent("download");
    await region
      .getByRole("button", { name: "Export account evidence", exact: true })
      .click();
    const file = path.join(evidence, `${width}-original-source-export.json`);
    await (await downloaded).saveAs(file);
    expect(JSON.parse(fs.readFileSync(file, "utf8")).sourceSnapshot).toEqual(
      accounts,
    );
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: path.join(evidence, `${width}-original-source-ready.png`),
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width + 1);
    if (width === 390) {
      await region
        .getByText(
          "Scroll horizontally to see reported amounts and source agencies.",
          { exact: true },
        )
        .first()
        .scrollIntoViewIfNeeded();
      const scroller = region.locator('[role="region"]').first();
      await scroller.evaluate((element) => {
        element.scrollLeft = 700;
      });
      const amount = scroller.locator("tbody tr").first().locator("td").last();
      await amount.scrollIntoViewIfNeeded();
      await expect(amount).toBeInViewport();
      await expect(amount).toContainText("$");
      await page.screenshot({
        path: path.join(evidence, `${width}-original-source-money.png`),
      });
    }
    expect(errors).toEqual([]);
  });
}
