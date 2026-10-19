import { test, expect } from "@playwright/test";
import { installFixtures, clientId, objective, json } from "./fixtures";

for (const colorScheme of ["light", "dark"] as const) {
  test(`Desktop filled Objective intake retains the agreed two-column geometry at 1440 ${colorScheme}`, async ({
    page,
  }, info) => {
    const unexpected = await installFixtures(page);
    await page.setViewportSize({ width: 1440, height: 1040 });
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.goto(`/portfolio/${clientId}/objectives?new=1`);
    const editor = page.getByRole("region", {
      name: "New objective",
      exact: true,
    });
    await editor.getByLabel(/^Outcome/).fill(objective.outcome);
    await editor
      .getByLabel(/^Government problem/)
      .fill(objective.governmentProblem);
    await editor.getByRole("radio", { name: "Both", exact: true }).check();
    await editor.getByLabel(/^Minimum win/).fill(objective.minimumWin);
    const card = editor.getByRole("region", { name: "Objective", exact: true });
    const rail = editor.getByRole("complementary", {
      name: "Objective readiness",
      exact: true,
    });
    const bounds = {
      card: await card.boundingBox(),
      rail: await rail.boundingBox(),
    };
    await info.attach("objective-geometry", {
      body: JSON.stringify({
        reference: "411:60728",
        bounds,
        scope:
          "fixture intake columns only; missing owner-bound question/cycle content is not parity acceptance",
      }),
      contentType: "application/json",
    });
    await page.screenshot({
      path: info.outputPath("desktop-objective-filled.png"),
    });
    expect(bounds.card!.x).toBeCloseTo(264, 0);
    expect(bounds.card!.width).toBeCloseTo(760, 0);
    expect(bounds.rail!.x).toBeCloseTo(1048, 0);
    expect(bounds.rail!.width).toBeCloseTo(360, 0);
    expect(unexpected).toEqual([]);
  });

  test(`Desktop ready Objective edit is captured separately from the active detail reference at 1440 ${colorScheme}`, async ({
    page,
  }, info) => {
    const unexpected = await installFixtures(page);
    const record = { ...objective, status: "ready", version: 3 };
    await page.route(`**/clients/${clientId}/objectives**`, (route) =>
      json(route, [record]),
    );
    await page.setViewportSize({ width: 1440, height: 1040 });
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.goto(
      `/portfolio/${clientId}/objectives?objective=${objective.id}`,
    );
    const editor = page.getByRole("dialog", {
      name: "Edit objective",
      exact: true,
    });
    await expect(editor).toBeVisible();
    await expect(editor.getByLabel(/^Outcome/)).toHaveValue(objective.outcome);
    await info.attach("objective-detail-intent", {
      body: JSON.stringify({
        reference: "411:61442",
        actual: "ready record edit drawer",
        parity: "NOT_EQUIVALENT_ACTIVE_DETAIL_STATE",
        bounds: await editor.boundingBox(),
      }),
      contentType: "application/json",
    });
    await page.screenshot({
      path: info.outputPath("desktop-objective-ready-edit.png"),
    });
    expect(unexpected).toEqual([]);
  });
}
