import { test, expect, type Page } from "@playwright/test";
import type { UIEvent } from "@capiro/meri-contracts";
import { runActivityEvents } from "../../src/features/meri/fixtures/run-activity-events";
import { expectAccessibleHome } from "../accessibility";
import { tabTo, expectFocusEvidence } from "../accessibility-interaction";
import {
  event,
  eventOf,
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

const sample = runActivityEvents("activity").find(
  (item) => item.type === "source.available",
)!;
if (sample.type !== "source.available")
  throw new Error("Missing synthetic source");
const source = { ...sample.data, scopes };
const answer =
  "[source](javascript:alert(1)) <script>alert(2)</script> https://untrusted.invalid/source";

async function savedSources(page: Page) {
  const fixture = await setupConversation(page);
  const entries = [
    event(1, answer),
    eventOf(2, "source.available", source),
    eventOf(3, "source.available", {
      ...source,
      sourceVersionId: "synthetic-version-3",
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
  await expect(
    page.getByRole("button", {
      name: "2 saved source references",
      exact: true,
    }),
  ).toBeVisible();
  return { fixture, native };
}

test("saved reference disclosure is keyboard accessible and retains both exact versions after reload", async ({
  page,
}, info) => {
  const { fixture } = await savedSources(page);
  const trigger = page.getByRole("button", {
    name: "2 saved source references",
    exact: true,
  });
  const list = page.getByRole("list", { name: "Saved source references" });
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await expect(
    list.getByText(source.sourceVersionId, { exact: true }),
  ).toBeVisible();
  await expect(
    list.getByText("synthetic-version-3", { exact: true }),
  ).toBeVisible();
  await tabTo(page, trigger);
  await expectFocusEvidence(trigger, info);
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(list).toBeHidden();
  await page.keyboard.press("Space");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(list).toBeVisible();
  await page.reload();
  await expect(
    list.getByText(source.sourceVersionId, { exact: true }),
  ).toBeVisible();
  await expect(
    list.getByText("synthetic-version-3", { exact: true }),
  ).toBeVisible();
  await expectAccessibleHome(page, info);
  await info.attach("saved-source-references-desktop", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
  expect(fixture.unexpected).toEqual([]);
});

test("mobile source references and failed tool results stay truthful and hostile answer text stays inert", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { fixture } = await savedSources(page);
  await expect(page.getByText(answer, { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      /Source preview unavailable\. Saved references do not confirm current access/,
    ),
  ).toBeVisible();
  await expect(page.getByRole("list", { name: "Tool activity" })).toContainText(
    "Result recorded · outcome unavailable",
  );
  await expect(
    page.getByRole("list", { name: "Tool activity" }),
  ).not.toContainText("Done");
  await expect(
    page.locator('a[href*="untrusted.invalid"], a[href^="javascript:"]'),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await expectAccessibleHome(page, info);
  await info.attach("saved-source-references-mobile", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
  expect(fixture.unexpected).toEqual([]);
});

test("existing conversation access denial removes the visible saved source references", async ({
  page,
}) => {
  const { fixture, native } = await savedSources(page);
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
  await expect(
    page.getByRole("list", { name: "Saved source references" }),
  ).toHaveCount(0);
  await expect(
    page.getByText(source.sourceVersionId, { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText(answer, { exact: true })).toHaveCount(0);
  expect(fixture.unexpected).toEqual([]);
});
