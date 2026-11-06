import { test, expect, type Route } from "@playwright/test";
import nativeActions from "../fixtures/procurement-action-details-native.json" with { type: "json" };
import { unavailableAccounts } from "../fixtures/procurement-account-reports";
import path from "node:path";
import fs from "node:fs";

const screenshotDir =
  process.env.CAPIRO_PROCUREMENT_EVIDENCE_DIR ??
  path.resolve("test-results/procurement-evidence");
fs.mkdirSync(screenshotDir, { recursive: true });

/**
 * Convert old-contract action-details fixture to observed-contract format.
 * Used for panel browser tests that intercept procurement.observedActionDetails.
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

async function screenshot(page: import("@playwright/test").Page, name: string) {
  const dest = path.join(screenshotDir, `${name}.png`);
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() =>
      [...document.fonts].some(
        (font) => font.family === "Geist" && font.status === "loaded",
      ),
    ),
  ).toBe(true);
  await page.screenshot({ path: dest, fullPage: !name.includes("modal") });
  return dest;
}

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`qualified action evidence opens with full identity at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto("/procurement-result.html?scenario=actions");
    await expect(page.locator("table tbody tr")).toHaveCount(4);
    await expect(page.getByText("-$500,000.00", { exact: true })).toBeVisible();
    const amountLines = await page
      .getByRole("cell", { name: "$70,368,744,177,665.00", exact: true })
      .evaluate((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return new Set(
          Array.from(range.getClientRects(), (rect) => Math.round(rect.top)),
        ).size;
      });
    expect(amountLines).toBe(1);
    await screenshot(
      page,
      `${viewport.width}x${viewport.height}-qualified-actions`,
    );
    const trigger = page.getByRole("button", {
      name: "Inspect action CONT_AWD_0001_2100_-NONE-_-NONE-, modification P00001, transaction 1",
      exact: true,
    });
    await expect(trigger).toBeVisible({ timeout: 1500 });
    await trigger.click();
    const dialog = page.getByRole("dialog", {
      name: "Qualified action evidence",
    });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(
      "usaspending|award|CONT_AWD_0001_2100_-NONE-_-NONE-",
    );
    await expect(dialog).toContainText(
      "4910122498d29868ce36a32b63df3f26737ca94416fcfe99a3b7341a78a957cf",
    );
    await expect(dialog).toContainText("9700-FUNDING");
    await expect(dialog).toContainText("2100-CONTRACT");
    await expect(
      dialog.getByRole("link", { name: "Recorded source search" }),
    ).toHaveAttribute(
      "href",
      "https://api.sam.gov/contract-awards/v1/search?piid=0001",
    );
    await screenshot(
      page,
      `${viewport.width}x${viewport.height}-action-evidence-modal`,
    );
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(viewport.width + 1);
    expect(errors).toEqual([]);
  });
}

test("rich action rows and exported evidence preserve the vendor and fiscal subset", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/procurement-result.html?scenario=rich");
  await page
    .getByRole("button", { name: "Vendor Footprint", exact: true })
    .click();
  await page.getByRole("button", { name: "FY2025", exact: true }).click();
  await page.getByRole("searchbox").fill("TEST VENDOR 2");
  await expect(page.locator("dl").first().locator("dd").first()).toContainText(
    "$800,000.00",
  );
  await page.getByRole("button", { name: "Money Flow", exact: true }).click();
  await expect(page.locator("table tbody tr")).toHaveCount(1);
  await expect(
    page.getByRole("columnheader", {
      name: "Funding organization",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator("table")).toContainText("2100-CONTRACT");
  await screenshot(page, "1440x1000-rich-filtered-actions");
  await page.getByRole("button", { name: "Download evidence finding" }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download JSON", exact: true })
    .click();
  const downloaded = await pending;
  const payload = JSON.parse(
    fs.readFileSync((await downloaded.path())!, "utf8"),
  );
  expect(payload.display.actions).toHaveLength(1);
  expect(payload.display.actions[0].awardIdentityKey).toBe(
    "usaspending|award|CONT_AWD_0001_2100_-NONE-_-NONE-",
  );
  expect(payload.display.totals.obligationUsd).toBe("800000.00");
  expect(payload.sourceSnapshot.actionDetails).toHaveLength(4);
});

test("display filters conserve headlines, survive view switches and bind downloaded evidence", async ({
  page,
}) => {
  await page.goto("/procurement-result.html?scenario=populated");
  await page
    .getByRole("button", { name: "Vendor Footprint", exact: true })
    .click();
  await page.getByRole("button", { name: "FY2025", exact: true }).click();
  await page.getByRole("searchbox").fill("Other");
  await expect(page.locator("dl").first().locator("dd").first()).toContainText(
    "$200.00",
  );
  await page.getByRole("button", { name: "Money Flow", exact: true }).click();
  await expect(page.getByRole("searchbox")).toHaveValue("Other");
  await expect(page.locator("table tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Download evidence finding" }).click();
  await page
    .getByPlaceholder(/analyst judgment/)
    .fill("Review the next funding report.");
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download JSON", exact: true })
    .click();
  const download = await downloadPromise;
  const payload = JSON.parse(fs.readFileSync((await download.path())!, "utf8"));
  expect(payload.display.filters).toEqual({
    fiscalYear: "2025",
    vendor: "Other",
  });
  expect(payload.display.totals.obligationUsd).toBe("200.00");
  expect(payload.display.groups).toHaveLength(1);
  expect(payload.sourceSnapshot.totals.obligationUsd).toBe("1700.00");
  // One latest catalog observation per award cannot produce more vendor identities than awards.
  expect(
    new Set(
      payload.sourceSnapshot.groups.map(
        (group: { vendorKey: string }) => group.vendorKey,
      ),
    ).size,
  ).toBeLessThanOrEqual(payload.sourceSnapshot.scope.awardIdentityKeys.length);
  expect(payload.analystJudgment.followUp).toBe(
    "Review the next funding report.",
  );
});

test.describe("ProcurementResult populated 1440x1000", () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test("Money Flow view: renders obligation, clocks, groups - no console errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto("/procurement-result.html?scenario=populated");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Observed obligations (USD)")).toBeVisible();
    await expect(
      page.getByText("Selected procurement action groups"),
    ).toBeVisible();
    const overflow = await page.evaluate(() => {
      return (
        Math.max(
          document.body.scrollWidth,
          document.documentElement.scrollWidth,
        ) >
        window.innerWidth + 1
      );
    });
    expect(overflow, "Root overflows horizontally").toBe(false);
    await screenshot(page, "1440x1000-money-flow-populated");
    expect(errors).toEqual([]);
  });

  test("Vendor Footprint view: switch, aggregation, source UEI - no console errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto("/procurement-result.html?scenario=populated");
    await page.getByRole("button", { name: "Vendor Footprint" }).click();
    await expect(
      page.getByText("Vendor footprint grouped by source-reported vendor key"),
    ).toBeVisible();
    // Source UEI appears in vendor identity column header and cell - use first
    await expect(
      page.locator("td").filter({ hasText: "Source UEI" }).first(),
    ).toBeVisible();
    await expect(page.getByRole("searchbox")).toBeVisible();
    await screenshot(page, "1440x1000-vendor-footprint-populated");
    expect(errors).toEqual([]);
  });

  test("Source coverage disclosures expand in footprint view", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/procurement-result.html?scenario=populated");
    await page.getByRole("button", { name: "Vendor Footprint" }).click();
    await expect(
      page.getByText("Vendor footprint grouped by source-reported vendor key"),
    ).toBeVisible();
    await page.getByText("Source coverage disclosures").click();
    await expect(page.getByText("AWARD A/B/C/D")).toBeVisible();
    await expect(page.getByText("90-day")).toBeVisible();
    await screenshot(page, "1440x1000-vendor-footprint-disclosures");
    expect(errors).toEqual([]);
  });

  test("Fiscal filter FY2025 in vendor footprint - no console errors", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/procurement-result.html?scenario=populated");
    await page.getByRole("button", { name: "Vendor Footprint" }).click();
    await expect(
      page.getByText("Vendor footprint grouped by source-reported vendor key"),
    ).toBeVisible();
    await page.getByRole("button", { name: "FY2025", exact: true }).click();
    await screenshot(page, "1440x1000-vendor-footprint-fy2025");
    expect(errors).toEqual([]);
  });

  test("Paging: pagination navigation present in money flow", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/procurement-result.html?scenario=populated");
    await expect(
      page.getByRole("navigation", { name: "Procurement group pages" }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("Keyboard: Vendor Footprint button focusable and activatable via Enter", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/procurement-result.html?scenario=populated");
    const vendorBtn = page.getByRole("button", { name: "Vendor Footprint" });
    await vendorBtn.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByText("Vendor footprint grouped by source-reported vendor key"),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("Export button present; modal opens with analyst judgment prompt", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/procurement-result.html?scenario=populated");
    const exportBtn = page.getByRole("button", {
      name: "Download evidence finding",
    });
    await expect(exportBtn).toBeVisible();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await exportBtn.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByPlaceholder(/analyst judgment/)).toBeVisible();
    await screenshot(page, "1440x1000-export-modal");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(exportBtn).toBeFocused();
    await exportBtn.click();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe("ProcurementResult populated 390x844 mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Money Flow renders without horizontal overflow on mobile", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto("/procurement-result.html?scenario=populated");
    await expect(page.getByText("Observed obligations (USD)")).toBeVisible();
    const overflow = await page.evaluate(() => {
      return (
        Math.max(
          document.body.scrollWidth,
          document.documentElement.scrollWidth,
        ) >
        window.innerWidth + 1
      );
    });
    expect(overflow, "Root overflows horizontally on mobile").toBe(false);
    await screenshot(page, "390x844-money-flow-populated");
    expect(errors).toEqual([]);
  });

  test("Vendor Footprint mobile renders without horizontal overflow", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/procurement-result.html?scenario=populated");
    await page.getByRole("button", { name: "Vendor Footprint" }).click();
    await expect(
      page.getByText("Vendor footprint grouped by source-reported vendor key"),
    ).toBeVisible();
    const overflow = await page.evaluate(() => {
      return (
        Math.max(
          document.body.scrollWidth,
          document.documentElement.scrollWidth,
        ) >
        window.innerWidth + 1
      );
    });
    expect(overflow, "Root overflows on mobile in footprint view").toBe(false);
    await screenshot(page, "390x844-vendor-footprint-populated");
    expect(errors).toEqual([]);
  });
});

test.describe("ProcurementResult unavailable state", () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test("Unavailable state: no dollar amounts, spending warning visible, no export", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/procurement-result.html?scenario=unavailable");
    await expect(page.getByText("does not mean zero spending")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Download evidence finding" }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Vendor Footprint" }),
    ).not.toBeVisible();
    const html = await page.content();
    expect(html).not.toContain("$0");
    await screenshot(page, "1440x1000-unavailable");
    expect(errors).toEqual([]);
  });
});

test.describe("ProcurementResult negative obligations", () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test("Negative obligations aggregate correctly in vendor footprint (sign fix)", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/procurement-result.html?scenario=negative");
    await page.getByRole("button", { name: "Vendor Footprint" }).click();
    await expect(
      page.getByText("Vendor footprint grouped by source-reported vendor key"),
    ).toBeVisible();
    // Aggregated total should be -2.00 (= -1.50 + -0.50); sign bug would show -0.50
    const content = await page.textContent("body");
    expect(content).toContain("-$2.00");
    expect(content).not.toContain("-$0.50");
    await screenshot(page, "1440x1000-vendor-footprint-negative");
    expect(errors).toEqual([]);
  });
});

for (const view of ["Money Flow", "Vendor Footprint"]) {
  test(`mobile ${view} keeps readable columns in a keyboard-scrollable table`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/procurement-result.html?scenario=populated");
    await page.getByRole("button", { name: view, exact: true }).click();
    const table = page.getByRole("table");
    const box = await table.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(720);
    const region = page.getByRole("region");
    await expect(region).toHaveCount(1);
    await region.focus();
    await page.keyboard.press("ArrowRight");
    await expect
      .poll(() => region.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(391);
  });
}

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`export dialog is centered and inside ${viewport.width}px viewport`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto("/procurement-result.html?scenario=populated");
    await page
      .getByRole("button", { name: "Download evidence finding" })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.waitForFunction(() =>
      document
        .getAnimations()
        .every((animation) => animation.playState !== "running"),
    );
    const geometry = await dialog.evaluate((element) => ({
      rect: element.getBoundingClientRect().toJSON(),
      transform: getComputedStyle(element).transform,
      translate: getComputedStyle(element).translate,
    }));
    await testInfo.attach("dialog-geometry", {
      body: JSON.stringify({ viewport, ...geometry }),
      contentType: "application/json",
    });
    expect(
      Math.abs(geometry.rect.x + geometry.rect.width / 2 - viewport.width / 2),
    ).toBeLessThanOrEqual(2);
    expect(
      Math.abs(
        geometry.rect.y + geometry.rect.height / 2 - viewport.height / 2,
      ),
    ).toBeLessThanOrEqual(2);
    expect(geometry.rect.left).toBeGreaterThanOrEqual(16);
    expect(geometry.rect.right).toBeLessThanOrEqual(viewport.width - 16);
    await screenshot(
      page,
      `${viewport.width}x${viewport.height}-centered-export-modal`,
    );
  });
}

test("empty display subset remains unavailable and can be cleared", async ({
  page,
}) => {
  await page.goto("/procurement-result.html?scenario=populated");
  await page.getByRole("searchbox").fill("no such synthetic vendor");
  await expect(page.getByRole("status")).toContainText(
    "does not mean zero spending",
  );
  await expect(
    page.getByRole("button", { name: "Download evidence finding" }),
  ).toBeDisabled();
  await expect(page.locator("table")).toHaveCount(0);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator("dl").first().locator("dd").first()).toContainText(
    "$1,700.00",
  );
});

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`mounted panel uses the real read transport and clears stale data on refusal at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const pageErrors: string[] = [],
      consoleErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    let pendingRoute: Route | undefined;
    let refuse = false;
    await page.route(
      "**/api/capiro/procurement.accountReports",
      async (route) => {
        const body = route.request().postDataJSON().body;
        await route.fulfill({
          json: unavailableAccounts(body.awardIdentityKeys, body.knownAt),
        });
      },
    );
    await page.route(
      "**/api/capiro/procurement.observedActionDetails",
      async (route) => {
        if (refuse)
          await route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ message: "Synthetic source refusal" }),
          });
        else pendingRoute = route;
      },
    );
    const parameters = new URLSearchParams({
      scenario: "panel",
      procurementKnownAt: nativeActions.knownAt,
    });
    for (const key of nativeActions.scope.awardIdentityKeys)
      parameters.append("procurementAward", key);
    const firstRequest = page.waitForRequest(
      "**/api/capiro/procurement.observedActionDetails",
    );
    await page.goto(`/procurement-result.html?${parameters}`);
    const request = await firstRequest;
    expect(request.postDataJSON().body).toEqual({
      awardIdentityKeys: nativeActions.scope.awardIdentityKeys,
      knownAt: nativeActions.knownAt,
      revisionBasis: "latest_observed",
      includeActionDetails: true,
    });
    await expect(page.getByRole("status").first()).toContainText("Loading");
    if (viewport.width < 650) {
      const description = await page
        .getByText(
          /^Qualified observed actions for your explicit award selection/,
        )
        .boundingBox();
      const refresh = await page
        .getByRole("button", { name: "Refresh snapshot", exact: true })
        .boundingBox();
      expect(refresh!.y).toBeGreaterThanOrEqual(
        description!.y + description!.height,
      );
    }
    await screenshot(
      page,
      `${viewport.width}x${viewport.height}-mounted-panel-loading`,
    );
    await pendingRoute!.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(makeObservedFromNative(nativeActions)),
    });
    await expect(page.locator("table tbody tr")).toHaveCount(4);
    await expect(
      page.getByText(/oversized selections are refused/),
    ).toBeVisible();
    await screenshot(
      page,
      `${viewport.width}x${viewport.height}-mounted-panel-ready`,
    );
    expect(consoleErrors).toEqual([]);
    refuse = true;
    await page
      .getByRole("button", { name: "Refresh snapshot", exact: true })
      .click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.locator("table")).toHaveCount(0);
    await screenshot(
      page,
      `${viewport.width}x${viewport.height}-mounted-panel-error`,
    );
    expect(pageErrors).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(viewport.width + 1);
  });
}

// ---------------------------------------------------------------------------
// Observed contract: disclosures and label handling
// NOTE: Run with CAPIRO_COMPONENT_TEST_PORT=5294 for isolated server.
// ---------------------------------------------------------------------------
for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`observed contract renders correct disclosures at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/procurement-result.html?scenario=observed");
    // Observed contract disclosure present
    await expect(
      page.getByText(/latest observed revision basis/i),
    ).toBeVisible();
    await expect(page.getByText(/verbatim/i).first()).toBeVisible();
    // Publisher label shown verbatim, NOT formatted as UTC
    await expect(page.getByText("2026-10-14")).toBeVisible();
    // sourceThrough is null — no "Source cutoff" line
    await expect(page.getByText(/source cutoff/i)).not.toBeVisible();
    // Hub deep-link is HIDDEN for observed results
    await expect(
      page.getByRole("link", { name: "Open this snapshot in Hub" }),
    ).not.toBeVisible();
    // Retrieved clock shown (not "Observed" clock label)
    await expect(page.getByText(/Retrieved/)).toBeVisible();
    // Vendor footprint view
    await page
      .getByRole("button", { name: "Vendor Footprint", exact: true })
      .click();
    // Vendor footprint shows "Not applicable (observed)" instead of a revision timestamp
    await expect(page.getByText("Not applicable (observed)")).toBeVisible();
    await screenshot(
      page,
      `${viewport.width}x${viewport.height}-observed-result`,
    );
    expect(errors).toEqual([]);
  });

  test(`observed action detail evidence shows publisher label at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/procurement-result.html?scenario=observedDetailed");
    // Switch to Money Flow view (default) and inspect an action
    const inspectBtn = page.getByRole("button", {
      name: /inspect action CONT_AWD_OBSERVED01/i,
    });
    await expect(inspectBtn).toBeVisible({ timeout: 5000 });
    await inspectBtn.click();
    const dialog = page.getByRole("dialog", {
      name: "Qualified action evidence",
    });
    await expect(dialog).toBeVisible();
    // Shows "Publisher revision label (verbatim)" not "Source revision (UTC)"
    await expect(
      dialog.getByText("Publisher revision label (verbatim)"),
    ).toBeVisible();
    await expect(dialog.getByText("Source revision (UTC)")).not.toBeVisible();
    await screenshot(
      page,
      `${viewport.width}x${viewport.height}-observed-action-evidence`,
    );
  });
}
