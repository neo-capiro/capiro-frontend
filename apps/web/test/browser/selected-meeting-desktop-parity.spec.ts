import { expect, type Locator, type Page } from "@playwright/test";
import { test } from "./runtime-observed-test";
import { setupSelectedMeeting } from "./selected-meeting-desktop-fixtures";

test.setTimeout(15_000);

async function captureBoxStyles(locator: Locator) {
  return locator.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      box: { x: box.x, y: box.y, width: box.width, height: box.height },
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      display: style.display,
      padding: style.padding,
      gap: style.gap,
      border: style.border,
      borderRadius: style.borderRadius,
      backgroundColor: style.backgroundColor,
      color: style.color,
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      overflowX: style.overflowX,
      overflowY: style.overflowY,
    };
  });
}

async function expectReferencePrepLayout(
  page: Page,
  list: Locator,
  detail: Locator,
  materials: Locator,
  followUpText: string,
) {
  await expect
    .soft(list, "Reference list card has a visible border")
    .toHaveCSS("border-width", "1px", { timeout: 500 });
  await expect
    .soft(list, "Reference list card has 20px internal padding")
    .toHaveCSS("padding", "20px", { timeout: 500 });
  await expect
    .soft(detail, "Selected panel has no outer content inset")
    .toHaveCSS("padding", "0px", { timeout: 500 });
  const [left, right, tabs, search] = await Promise.all([
    list.boundingBox(),
    detail.boundingBox(),
    materials.boundingBox(),
    page
      .getByRole("searchbox", { name: "Search meetings", exact: true })
      .boundingBox(),
  ]);
  expect
    .soft(
      Boolean(left && right && tabs && search),
      "All reference layout regions have measurable boxes",
    )
    .toBe(true);
  if (left && right && tabs && search) {
    expect
      .soft(Math.abs(left.width - 280), "Meeting list retains 280px width")
      .toBeLessThanOrEqual(1);
    expect
      .soft(
        Math.abs(right.x - left.x - left.width - 20),
        "List/detail gap remains 20px",
      )
      .toBeLessThanOrEqual(1);
    expect
      .soft(search.x, "Search belongs inside the padded list card")
      .toBeGreaterThanOrEqual(left.x + 20);
    expect.soft(search.y).toBeGreaterThanOrEqual(left.y + 20);
    expect
      .soft(search.x + search.width)
      .toBeLessThanOrEqual(left.x + left.width - 20);
    expect
      .soft(search.y + search.height)
      .toBeLessThanOrEqual(left.y + left.height - 20);
    expect
      .soft(
        Math.abs(tabs.x - right.x - 1),
        "Tabstrip begins inside the panel border",
      )
      .toBeLessThanOrEqual(1);
    expect
      .soft(
        Math.abs(tabs.width - right.width + 2),
        "Tabstrip spans the full panel interior",
      )
      .toBeLessThanOrEqual(1);
  }
  const expectedSections = [
    "Summary",
    "Agenda",
    "Talking points",
    "Watch-outs",
    "Follow-ups",
  ];
  const headings = (await detail.getByRole("heading").allTextContents()).map(
    (text) => text.trim(),
  );
  expect
    .soft(
      headings.filter((text) => expectedSections.includes(text)),
      "Reference preparation section labels and order",
    )
    .toEqual(expectedSections);
  const summary = await detail
    .getByRole("heading", { name: "Summary", exact: true })
    .boundingBox();
  if (right && summary) {
    expect
      .soft(
        Math.abs(summary.x - right.x - 17),
        "Prep content has one 16px inset",
      )
      .toBeLessThanOrEqual(1);
  }
  await expect(detail.locator("ol")).toContainText("Confirm the decision");
  const followUp = detail.getByText(followUpText, { exact: true });
  await followUp.scrollIntoViewIfNeeded();
  await expect
    .soft(followUp, "Follow-up content is reachable by scrolling")
    .toBeInViewport({ ratio: 1, timeout: 500 });
  const privacy = detail.getByText(
    /Notes remain private until explicitly shared/,
  );
  await privacy.scrollIntoViewIfNeeded();
  await expect
    .soft(privacy, "Privacy explanation is reachable by scrolling")
    .toBeInViewport({ ratio: 1, timeout: 500 });
  const overflow = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect
    .soft(overflow.width, "Desktop page has no horizontal overflow")
    .toBeLessThanOrEqual(overflow.viewport);
  for (const region of [list, detail]) {
    expect
      .soft(
        await region.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
        "Meeting region has no horizontal overflow",
      )
      .toBe(true);
  }
}

for (const colorScheme of ["light", "dark"] as const) {
  test(`Selected meeting populated Prep baseline at 1440 ${colorScheme}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 1440, height: 1040 });
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    const { current, prep, note } = await setupSelectedMeeting(page);
    await page.goto("/modules/engagement?view=meetings");
    const opener = page.getByRole("button", {
      name: new RegExp(current.subject),
    });
    await opener.click();
    const list = page.getByRole("region", {
      name: "Meeting list",
      exact: true,
    });
    const detail = page.getByRole("region", {
      name: "Selected meeting",
      exact: true,
    });
    const title = detail.getByRole("heading", {
      name: current.subject,
      exact: true,
    });
    const materials = detail.getByRole("tablist", {
      name: "Meeting materials",
      exact: true,
    });
    const prepTab = materials.getByRole("tab", { name: "Prep", exact: true });
    await expect(title).toBeVisible();
    await expect(prepTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(detail.getByText(prep.summary, { exact: true })).toBeVisible();
    for (const text of [
      ...prep.agenda,
      ...prep.talkingPoints,
      ...prep.risks,
      ...prep.followUps,
    ]) {
      await expect(detail.getByText(text, { exact: true })).toBeVisible();
    }
    await expect(
      detail.getByText(/Notes remain private until explicitly shared/),
    ).toBeVisible();
    await info.attach("selected-meeting-baseline-state", {
      body: JSON.stringify(
        {
          baselineSource: "e9df91d876eaad05d13fdd0707c1fe39d5affb62",
          reference: "411:94827",
          viewport: { width: 1440, height: 1040 },
          colorScheme,
          list: await captureBoxStyles(list),
          detail: await captureBoxStyles(detail),
          title: await captureBoxStyles(title),
          materials: await captureBoxStyles(materials),
          page: await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
            scrollHeight: document.documentElement.scrollHeight,
            clientHeight: document.documentElement.clientHeight,
            scrollTop: document.scrollingElement?.scrollTop,
            mediaPrefersDark: window.matchMedia("(prefers-color-scheme: dark)")
              .matches,
            computedDocumentBackground: getComputedStyle(
              document.documentElement,
            ).backgroundColor,
            computedDocumentColor: getComputedStyle(document.documentElement)
              .color,
            computedBodyBackground: getComputedStyle(document.body)
              .backgroundColor,
            computedBodyColor: getComputedStyle(document.body).color,
          })),
          headings: await detail.getByRole("heading").allTextContents(),
          actionLabels: await detail.getByRole("button").allTextContents(),
          scope:
            "Synthetic current-operation presentation only; no native or provider qualification.",
        },
        null,
        2,
      ),
      contentType: "application/json",
    });
    await page.screenshot({
      path: info.outputPath("selected-meeting-viewport.png"),
      animations: "disabled",
    });
    await detail.screenshot({
      path: info.outputPath("selected-meeting-detail.png"),
      animations: "disabled",
    });
    const followUpText = prep.followUps[0];
    if (followUpText === undefined)
      throw new Error("Synthetic preparation requires a follow-up.");
    await expectReferencePrepLayout(
      page,
      list,
      detail,
      materials,
      followUpText,
    );
    await prepTab.focus();
    await prepTab.press("ArrowRight");
    await expect(
      materials.getByRole("tab", { name: "Meeting Notes", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(detail.getByText(note.body, { exact: true })).toBeVisible();
    await materials
      .getByRole("tab", { name: "Meeting Notes", exact: true })
      .press("Home");
    await expect(prepTab).toHaveAttribute("aria-selected", "true");
    await expect(detail.getByText(prep.summary, { exact: true })).toBeVisible();
    await prepTab.press("Escape");
    await expect(opener).toBeFocused();
    await expect(detail).toContainText("Select a meeting");
    const search = list.getByRole("searchbox", { name: "Search meetings" });
    await search.fill("No synthetic meeting matches this");
    await expect(
      list.getByText("No meetings match these filters."),
    ).toBeVisible();
    await expect(opener).toHaveCount(0);
    await search.fill("");
    await expect(opener).toBeVisible();
  });
}

for (const mode of ["library", "queue"] as const) {
  test(`Selected meeting parity preserves ${mode} modal Notes default and close focus`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1040 });
    const { current, prep, note } = await setupSelectedMeeting(page);
    await page.goto(
      `/modules/engagement?view=${mode === "library" ? "library" : "meetings"}`,
    );
    if (mode === "queue") {
      await page
        .getByRole("tab", { name: "Preparation queue", exact: true })
        .click();
    }
    const opener =
      mode === "library"
        ? page.getByRole("button", { name: new RegExp(current.subject) })
        : page
            .locator("div")
            .filter({ has: page.getByText(current.subject, { exact: true }) })
            .filter({
              has: page.getByRole("button", {
                name: "Open meeting",
                exact: true,
              }),
            })
            .last()
            .getByRole("button", { name: "Open meeting", exact: true });
    await opener.click();
    const dialog = page.getByRole("dialog", {
      name: current.subject,
      exact: true,
    });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("tab", { name: "Meeting Notes", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(dialog.getByText(note.body, { exact: true })).toBeVisible();
    await expect(dialog.getByText(prep.summary, { exact: true })).toHaveCount(
      0,
    );
    await expect(
      dialog.getByText(/Notes remain private until explicitly shared/),
    ).toBeVisible();
    await dialog.getByRole("tab", { name: "Prep", exact: true }).click();
    await expect(
      dialog.getByRole("heading", { name: "Meeting preparation", exact: true }),
    ).toBeVisible();
    await expect(dialog.getByText(prep.summary, { exact: true })).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Summary", exact: true }),
    ).toHaveCount(0);
    await dialog
      .getByRole("tab", { name: "Meeting Notes", exact: true })
      .click();
    await dialog
      .getByRole("tab", { name: "Meeting Notes", exact: true })
      .press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
  });
}
