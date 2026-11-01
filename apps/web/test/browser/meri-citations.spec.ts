import { test, expect, type Page, type TestInfo } from "@playwright/test";
import type { UIEvent } from "@capiro/meri-contracts";
import { runActivityEvents } from "../../src/features/meri/fixtures/run-activity-events";
import { expectAccessibleHome } from "../accessibility";
import { tabTo, expectFocusEvidence } from "../accessibility-interaction";
import {
  event,
  eventOf,
  openEvidence,
  scopes,
  setupConversation,
  status,
} from "./meri-conversation-fixtures";
import {
  installCurrentRun,
  installHistory,
  selectedUrl,
  turn,
} from "./meri-history-fixtures";

test.use({ timezoneId: "America/New_York" });

const sample = runActivityEvents("activity").find(
  (item) => item.type === "source.available",
)!;
if (sample.type !== "source.available")
  throw new Error("Missing synthetic source");
const source = {
  ...sample.data,
  scopes,
  observedAt: "2026-10-26T09:30:00Z",
  sourceUpdatedAt: null,
};
const answer =
  "[source](javascript:alert(1)) <script>alert(2)</script> https://untrusted.invalid/source";
// Markdown renders the unsafe scheme as inert text and the raw tag as escaped text; only the https
// URL becomes a link, and that link may never leak the referrer or keep the tab.
const renderedAnswer =
  "source <script>alert(2)</script> https://untrusted.invalid/source";
const limitation =
  "Saved references do not confirm current access. No live links or excerpts are available.";
const incomplete =
  "Some saved reference details are unavailable. This does not mean the answer had no sources.";
const disclosure = (page: Page) =>
  page.getByRole("button", { name: "Saved references · 2", exact: true });
const references = (page: Page) =>
  page.getByRole("list", { name: "Saved source references" });

async function savedSources(
  page: Page,
  partial = false,
  secondObservedAt = source.observedAt,
) {
  const fixture = await setupConversation(page);
  const entries = [
    event(1, answer),
    eventOf(2, "source.available", source),
    eventOf(3, "source.available", {
      ...source,
      sourceVersionId: "synthetic-version-3",
      observedAt: secondObservedAt,
    }),
    eventOf(4, "tool.started", {
      requestId: sample.data.citationId,
      tool: "Synthetic source read",
    }),
    eventOf(5, "tool.completed", {
      requestId: sample.data.citationId,
      resultReference: sample.data.authorizationDecisionId,
    }),
    eventOf(6, "run.error", {
      code: "TOOL_UNAVAILABLE",
      message: "synthetic raw error",
      retryable: false,
    }),
    status(7, "failed"),
    // Cross the real history page boundary; later saved updates remain unloaded.
    ...(partial
      ? Array.from({ length: 100 }, (_, i) => status(i + 8, "failed"))
      : []),
  ];
  const saved = turn(
    undefined,
    undefined,
    "Synthetic reference question",
    0,
    entries.length,
  );
  saved.run = { ...saved.run, state: "failed" };
  const { native } = await installHistory(page, {
    turns: [saved],
    events: entries.map((item) => ({
      sequence: item.sequence,
      event: item as UIEvent,
    })),
  });
  await installCurrentRun(page, native);
  await page.goto(selectedUrl);
  await expect(disclosure(page)).toBeVisible();
  return { fixture, native };
}

async function capture(page: Page, info: TestInfo, name: string) {
  await page.evaluate(() => document.fonts.ready);
  const panel = disclosure(page).locator("..");
  await info.attach(name, {
    body: await panel.screenshot(),
    contentType: "image/png",
  });
  const box = await panel.boundingBox();
  const typography = await panel.evaluate((element) => {
    const style = (target: Element) => {
      const css = getComputedStyle(target);
      return {
        font: css.fontFamily,
        size: css.fontSize,
        lineHeight: css.lineHeight,
        color: css.color,
      };
    };
    return {
      fontLoaded: document.fonts.check("14px TestGeist"),
      trigger: style(element.querySelector("button")!),
      paragraphs: [...element.querySelectorAll("p")].map(style),
    };
  });
  await info.attach(`${name}-geometry`, {
    body: JSON.stringify({ box, typography }),
    contentType: "application/json",
  });
  return box!;
}

/** Isolate the mounted component at Figma's width, then restore its scrolling host. */
async function captureDesignWidth(page: Page, info: TestInfo, name: string) {
  const panel = disclosure(page).locator("..");
  const previous = await panel.evaluate((element) => {
    const previous: (string | null)[] = [];
    for (let host = element.parentElement; host; host = host.parentElement) {
      previous.push(host.getAttribute("style"));
      if (host === element.parentElement) {
        host.style.width = "712px";
        host.style.minWidth = "712px";
      }
      host.style.overflow = "visible";
    }
    return previous;
  });
  try {
    const box = await capture(page, info, name);
    expect(box.width).toBe(712);
    return box;
  } finally {
    await panel.evaluate((element, previous) => {
      let index = 0;
      for (let host = element.parentElement; host; host = host.parentElement) {
        const style = previous[index++]!;
        if (style === null) host.removeAttribute("style");
        else host.setAttribute("style", style);
      }
    }, previous);
  }
}

async function expectNeutralReferences(page: Page) {
  const list = references(page);
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await expect(list.getByRole("heading")).toHaveText([
    "Saved reference 1",
    "Saved reference 2",
  ]);
  await expect(
    list.getByText("Observed 26 Oct 2026, 09:30 UTC", { exact: true }),
  ).toHaveCount(2);
  for (const identifier of [
    source.sourceId,
    source.sourceVersionId,
    "synthetic-version-3",
    source.recordId,
    source.authorizationDecisionId,
    source.contentSha256,
  ])
    await expect(list).not.toContainText(identifier);
  await expect(list.locator("a, button, img, iframe")).toHaveCount(0);
  await expect(list).not.toContainText("Not provided");
  await expect(list).not.toContainText("Up to date");
}

test("saved references start collapsed, support keyboard disclosure and retain both versions after reload", async ({
  page,
}, info) => {
  const { fixture } = await savedSources(page);
  const trigger = disclosure(page);
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(references(page)).toBeHidden();
  await expect(
    page.getByText("Source preview unavailable", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(limitation, { exact: true })).toBeVisible();
  const integrated = await capture(page, info, "saved-references-conversation");
  expect(integrated.width).toBe(682);
  const collapsed = await captureDesignWidth(
    page,
    info,
    "saved-references-collapsed",
  );
  expect(Math.abs(collapsed.height - 114)).toBeLessThan(1);
  await expectAccessibleHome(page, info);
  await tabTo(page, trigger);
  await expectFocusEvidence(trigger, info);
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expectNeutralReferences(page);
  await page.keyboard.press("Space");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(references(page)).toBeHidden();
  await expect(page.getByText(limitation, { exact: true })).toBeVisible();
  await page.keyboard.press("Enter");
  await page.reload();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await expectNeutralReferences(page);
  await trigger.blur();
  const expanded = await captureDesignWidth(
    page,
    info,
    "saved-references-expanded",
  );
  expect(Math.abs(expanded.height - 350)).toBeLessThan(1);
  await expectAccessibleHome(page, info);
  expect(fixture.unexpected).toEqual([]);
});

test("incomplete saved history keeps its references and does not claim zero sources", async ({
  page,
}, info) => {
  const { fixture } = await savedSources(page, true);
  await expect(page.getByText(incomplete, { exact: true })).toBeVisible();
  await expect(
    page.getByText("More saved updates for this run have not been loaded.", {
      exact: true,
    }),
  ).toBeVisible();
  await disclosure(page).click();
  await expectNeutralReferences(page);
  await disclosure(page).blur();
  const box = await captureDesignWidth(
    page,
    info,
    "saved-references-incomplete",
  );
  expect(Math.abs(box.height - 381)).toBeLessThan(1);
  await expect(
    page.getByText("No source references were provided.", { exact: true }),
  ).toHaveCount(0);
  await expectAccessibleHome(page, info);
  await page
    .getByRole("button", { name: "Load more saved turns", exact: true })
    .click();
  await expect(page.getByText(incomplete, { exact: true })).toHaveCount(0);
  await expectNeutralReferences(page);
  expect(fixture.unexpected).toEqual([]);
});

test("mobile references and failed tool results stay truthful and hostile answer text stays inert", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { fixture } = await savedSources(page);
  await expect(page.getByText(renderedAnswer, { exact: true })).toBeVisible();
  await expect(page.getByText(limitation, { exact: true })).toBeVisible();
  await capture(page, info, "saved-references-mobile-collapsed");
  await disclosure(page).click();
  await expectNeutralReferences(page);
  // Tool activity is audit material: it lives behind the closed details, not in the answer.
  const activity = page.getByRole("list", { name: "Tool activity" });
  await expect(activity).toBeHidden();
  await openEvidence(page);
  await expect(activity).toContainText("Result recorded · outcome unavailable");
  await expect(activity).not.toContainText("Done");
  await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
  await expect(
    page.getByRole("article", { name: "Current turn" }).locator("script"),
  ).toHaveCount(0);
  const link = page.locator('a[href="https://untrusted.invalid/source"]');
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("referrerpolicy", "no-referrer");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await expectAccessibleHome(page, info);
  await disclosure(page).blur();
  await capture(page, info, "saved-references-mobile-expanded");
  expect(fixture.unexpected).toEqual([]);
});

test("existing conversation access denial removes expanded saved references", async ({
  page,
}) => {
  const { fixture, native } = await savedSources(page);
  await disclosure(page).click();
  await expectNeutralReferences(page);
  native.denied = true;
  await page
    .getByRole("button", { name: "Reload saved history", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Conversation access unavailable",
      exact: true,
    }),
  ).toBeVisible();
  await expect(references(page)).toHaveCount(0);
  await expect(disclosure(page)).toHaveCount(0);
  await expect(page.getByText(renderedAnswer, { exact: true })).toHaveCount(0);
  expect(fixture.unexpected).toEqual([]);
});

test("observation labels display each admitted UTC timestamp independently of browser timezone", async ({
  page,
}) => {
  const { fixture } = await savedSources(page, false, "2026-10-25T23:45:00Z");
  await disclosure(page).click();
  const cards = references(page).getByRole("listitem");
  await expect(cards.nth(0)).toContainText("Observed 26 Oct 2026, 09:30 UTC");
  await expect(cards.nth(1)).toContainText("Observed 25 Oct 2026, 23:45 UTC");
  await expect(references(page)).not.toContainText("Source updated");
  expect(fixture.unexpected).toEqual([]);
});
