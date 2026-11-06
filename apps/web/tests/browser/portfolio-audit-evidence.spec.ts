import { test, expect } from "@playwright/test";
import { clientId, json } from "./fixtures";
import { qaFixtures } from "./portfolio-qa-fixtures";

for (const width of [390, 1440]) {
  test(`exact authorized alert details survive navigation at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    const unexpected = await qaFixtures(page);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const base = {
      clientId,
      clientName: "Synthetic client",
      title: "Repeated source headline",
      subtitle: "Synthetic recorded evidence",
      type: "bill_text_updated",
      severity: "info",
      when: "2026-11-05T00:00:00Z",
      countdownDays: null,
      countdownLabel: null,
      href: "javascript:alert(1)",
      canonicalComplete: false,
      canonicalMissingFields: ["issueId", "whoActs"],
    };
    const alerts = ["a", "b"].map((id) => ({
      ...base,
      id: `${clientId}:change:source-record-${id}`,
    }));
    const otherClient = "10000000-0000-4000-8000-000000000099";
    await page.route("**/core/intelligence/portfolio-alerts*", (route) =>
      json(route, {
        alerts: [
          ...alerts,
          {
            ...base,
            id: `${otherClient}:change:hidden`,
            clientId: otherClient,
            title: "Synthetic inaccessible record",
          },
        ],
        total: 3,
        clientCount: 2,
        generatedAt: "2026-11-05T00:00:00Z",
      }),
    );
    await page.goto("/portfolio");
    const list = page.getByRole("list", { name: "Reported client alerts" });
    await expect(list.getByRole("listitem")).toHaveCount(2);
    await expect(page.getByText("Synthetic inaccessible record")).toHaveCount(
      0,
    );
    await list
      .getByRole("listitem")
      .filter({ hasText: "change:source-record-a" })
      .getByRole("link")
      .click();
    const detail = page.getByRole("dialog", {
      name: "Repeated source headline",
      exact: true,
    });
    await expect(detail).toContainText("change:source-record-a");
    await expect(detail).toContainText("Issue association, Action owner");
    await expect(
      detail.getByRole("link", { name: "Open client profile" }),
    ).toHaveAttribute("href", `/portfolio/${clientId}`);
    await expect(detail.locator('a[href^="javascript:"]')).toHaveCount(0);
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await page.screenshot({
      path: info.outputPath(`alert-detail-${width}.png`),
      animations: "disabled",
    });
    await page.goBack();
    await expect(detail).toHaveCount(0);
    await page.goForward();
    await expect(detail).toContainText("change:source-record-a");
    await page.reload();
    await expect(detail).toContainText("change:source-record-a");
    await detail.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page).not.toHaveURL(/alert=/);
    await page.goto(
      `/portfolio?alert=${encodeURIComponent(`${otherClient}:change:hidden`)}`,
    );
    await expect(
      page.getByRole("dialog", { name: "Alert unavailable" }),
    ).toContainText("not in the current authorized feed");
    await expect(page.getByText("Synthetic inaccessible record")).toHaveCount(
      0,
    );
    expect(errors).toEqual([]);
    expect(unexpected).toEqual([]);
  });

  test(`metric capability gaps stay explicit at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    const unexpected = await qaFixtures(page);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/portfolio/${clientId}`);
    await expect(
      page.getByRole("region", { name: "Profile activity", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Profile activity", exact: true }),
    ).toContainText("0 of 6 details complete");
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await page
      .getByRole("region", { name: "Profile activity", exact: true })
      .screenshot({
        path: info.outputPath(`profile-activity-${width}.png`),
        animations: "disabled",
      });
    await page.goto(`/portfolio/${clientId}/objectives`);
    await expect(
      page.getByText(
        "Operational summaries are not supplied by the current objective service.",
      ),
    ).toBeVisible();
    await expect(page.getByText("Not available", { exact: true })).toHaveCount(
      4,
    );
    await page.screenshot({
      path: info.outputPath(`objective-summary-${width}.png`),
      fullPage: true,
      animations: "disabled",
    });
    await page.goto(`/portfolio/${clientId}/bills`);
    await expect(
      page.getByText(
        "Tracker metrics are not configured for this environment.",
      ),
    ).toBeVisible();
    await page.screenshot({
      path: info.outputPath(`tracker-metrics-${width}.png`),
      fullPage: true,
      animations: "disabled",
    });
    expect(errors).toEqual([]);
    expect(unexpected).toEqual([]);
  });
}
