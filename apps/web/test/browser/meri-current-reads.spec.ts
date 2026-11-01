import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { createRequire } from "node:module";
import {
  sourceText,
  nativeSource,
  sourceResponse,
  recordedUsage,
  missingUsage,
  unavailableUsage,
} from "../../tests/meri-current-read-fixtures";
import {
  binding,
  clientId,
  event,
  eventOf,
  history,
  openEvidence,
  reply,
  setupConversation,
  status,
  sse,
} from "./meri-conversation-fixtures";
/** Usage is offered only once the run announced a usage record. */
const usageRecorded = (sequence: number) =>
  eventOf(sequence, "usage.recorded", {
    usageId: "b0000000-0000-4000-8000-00000000000b",
  });
const require = createRequire(import.meta.url);

test("live native source event reaches the existing conversation viewer", async ({
  page,
}) => {
  await setupConversation(page);
  await page.route("**/api/conversations/history", (route) =>
    reply(
      route,
      history([event(1, "Reading a synthetic bill page.")], {
        state: "running",
      }),
    ),
  );
  await page.route("**/api/conversations/events", (route) =>
    sse(route, [nativeSource(), status(3, "completed")]),
  );
  await page.route("**/api/conversations/events/*/stream", (route) =>
    sse(route, [nativeSource(), status(3, "completed")]),
  );
  await page.route("**/api/conversations/source-read", (route) =>
    reply(route, sourceResponse()),
  );
  await page.goto(
    `/meri?clientId=${clientId}&conversationId=${binding.conversationId}`,
  );
  await openEvidence(page);
  await page
    .getByRole("button", { name: "Open saved page" })
    .click({ timeout: 8000 });
  await expect(page.getByText(sourceText, { exact: true })).toBeVisible();
});

async function openSavedRun(page: Page) {
  const fixture = await setupConversation(page);
  const effects: string[] = [],
    reads: unknown[] = [];
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (
      /\/api\/conversations\/(submit|next-turn|input\/|control|cancel)/.test(
        path,
      )
    )
      effects.push(path);
    if (path === "/api/conversations/source-read")
      reads.push(request.postDataJSON());
  });
  await page.route("**/api/conversations/history", (route) =>
    reply(
      route,
      history(
        [
          event(1, "Synthetic answer with a saved native bill page."),
          nativeSource(),
          usageRecorded(3),
          status(4, "completed"),
        ],
        { state: "completed" },
      ),
    ),
  );
  await page.route("**/api/conversations/source-read", (route) =>
    reply(route, sourceResponse()),
  );
  await page.route("**/api/conversations/usage", (route) =>
    reply(route, recordedUsage()),
  );
  await page.goto(
    `/meri?clientId=${clientId}&conversationId=${binding.conversationId}`,
  );
  // Audit material is closed until asked for; nothing about it sits in the answer.
  await expect(
    page.getByRole("button", { name: "Open saved page" }),
  ).toBeHidden();
  await openEvidence(page);
  await expect(
    page.getByRole("button", { name: "Open saved page" }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() => document.fonts.check("14px TestGeist")),
  ).toBe(true);
  return { ...fixture, effects, reads };
}

async function audit(
  page: Page,
  info: TestInfo,
  selector: string,
  name: string,
) {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const result = await page.evaluate(async (scope) => {
    const axe = (
      window as unknown as {
        axe: {
          run: (
            node: Element,
          ) => Promise<{ violations: unknown[]; incomplete: unknown[] }>;
        };
      }
    ).axe;
    return axe.run(document.querySelector(scope)!);
  }, selector);
  await info.attach(name, {
    body: JSON.stringify(result),
    contentType: "application/json",
  });
  expect(result.violations).toEqual([]);
  expect(result.incomplete).toEqual([]);
}

for (const width of [1440, 390])
  test(`native saved page and separate run usage at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1040 });
    const fixture = await openSavedRun(page);
    await expect(
      page.getByText("No source references were provided.", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("No source references in the loaded updates.", {
        exact: true,
      }),
    ).toHaveCount(0);
    const open = page.getByRole("button", { name: "Open saved page" });
    await open.focus();
    await page.keyboard.press("Enter");
    const viewer = page.getByRole("region", {
      name: "Bill text viewer",
      exact: true,
    });
    await expect(viewer).toBeFocused();
    await expect(viewer.getByText(sourceText, { exact: true })).toBeVisible();
    await expect(
      viewer.getByText("Partial bill text", { exact: true }),
    ).toBeVisible();
    await expect(
      viewer.getByRole("heading", {
        name: "Bill text · 119-HR-42",
        exact: true,
      }),
    ).toHaveCSS("font-size", "22px");
    await expect(
      viewer.getByText("Partial bill text", { exact: true }),
    ).toHaveCSS("color", "rgb(10, 10, 10)");
    await expect(viewer.getByText(/UTF-16 text offsets 37–/)).toBeVisible();
    await expect(
      viewer.getByRole("link", { name: "Open source" }),
    ).toHaveAttribute("href", sourceResponse().current.sourceLocator!);
    await expect(viewer.locator("a")).toHaveCount(1);
    await expect(viewer.locator("script")).toHaveCount(0);
    expect(fixture.reads).toEqual([
      {
        schemaVersion: "meri.bill-text-source-read/1",
        conversationId: binding.conversationId,
        runId: binding.runId,
        referenceId: nativeSource().eventId,
      },
    ]);
    expect(
      await viewer.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
    await viewer.screenshot({
      path: info.outputPath(`bill-source-${width}.png`),
    });
    await audit(
      page,
      info,
      '[aria-label="Bill text viewer"]',
      `source-${width}-axe`,
    );
    await viewer.getByRole("button", { name: "Close bill text" }).click();
    await expect(open).toBeFocused();
    await page.getByRole("button", { name: "View recorded usage" }).click();
    const usage = page.getByRole("region", {
      name: "Run usage viewer",
      exact: true,
    });
    await expect(
      usage.getByText("Recorded SDK estimate: $0.1 USD", { exact: true }),
    ).toBeVisible();
    await expect(
      usage.getByText("Recorded cumulative SDK estimate: $0.3 USD", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(usage.getByText(/Partial record. 2 omitted/)).toBeVisible();
    await expect(
      usage.getByText("Completed · 0 ms", { exact: true }),
    ).toBeVisible();
    await expect(
      usage.getByText("Failed · Duration unknown", { exact: true }),
    ).toBeVisible();
    await expect(
      usage.getByText(/Provider: unknown · Cost basis: unknown/),
    ).toBeVisible();
    expect(
      await usage.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
    await usage.screenshot({
      path: info.outputPath(`recorded-usage-${width}.png`),
    });
    await audit(
      page,
      info,
      '[aria-label="Run usage viewer"]',
      `usage-${width}-axe`,
    );
    await page.screenshot({
      path: info.outputPath(`conversation-${width}.png`),
      fullPage: true,
    });
    await page.reload();
    await openEvidence(page);
    await page.getByRole("button", { name: "View recorded usage" }).click();
    await expect(
      page.getByText("Recorded SDK estimate: $0.1 USD", { exact: true }),
    ).toBeVisible();
    expect(fixture.effects).toEqual([]);
    expect(fixture.unexpected).toEqual([]);
    await page.route("**/api/conversations/history", (route) =>
      reply(
        route,
        history(
          [
            event(1, "Synthetic answer without sources."),
            status(2, "completed"),
          ],
          { state: "completed" },
        ),
      ),
    );
    await page.reload();
    await expect(
      page.getByText("Synthetic answer without sources.", { exact: true }),
    ).toBeVisible();
    // A run that saved nothing and recorded nothing has no details at all.
    await expect(
      page.getByText("No source references were provided.", { exact: true }),
    ).toHaveCount(0);
    await expect(page.getByText("Sources & usage")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Open saved page" }),
    ).toHaveCount(0);
  });

for (const [code, responseStatus] of [
  ["SOURCE_REFERENCE_STALE", 409],
  ["ACCESS_DENIED", 403],
] as const)
  test(`current source ${code} clears previously displayed text and links`, async ({
    page,
  }, info) => {
    await openSavedRun(page);
    await page.getByRole("button", { name: "Open saved page" }).click();
    await expect(page.getByText(sourceText, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Close bill text" }).click();
    await page.route("**/api/conversations/source-read", (route) =>
      reply(route, { error: { code } }, responseStatus),
    );
    await page.getByRole("button", { name: "Open saved page" }).click();
    if (responseStatus === 409)
      await expect(
        page.getByRole("heading", { name: "The saved page has changed" }),
      ).toBeVisible();
    else
      await expect(
        page.getByRole("heading", { name: "Conversation access unavailable" }),
      ).toBeVisible();
    await expect(page.getByText(sourceText, { exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Open source" })).toHaveCount(
      0,
    );
    await page.screenshot({
      path: info.outputPath(`${code}.png`),
      fullPage: true,
    });
  });

test("late source result cannot reopen a closed selection or replaced identity", async ({
  page,
}) => {
  await openSavedRun(page);
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  let dispatched = 0;
  await page.route("**/api/conversations/source-read", async (route) => {
    dispatched++;
    await waiting;
    await reply(route, sourceResponse()).catch(() => undefined);
  });
  await page.getByRole("button", { name: "Open saved page" }).click();
  await expect.poll(() => dispatched).toBe(1);
  await page.getByRole("button", { name: "Close bill text" }).click();
  await page.getByRole("button", { name: "View recorded usage" }).click();
  await expect(
    page.getByText("Recorded SDK estimate: $0.1 USD", { exact: true }),
  ).toBeVisible();
  release();
  await expect(page.getByText(sourceText, { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Close recorded usage" }).click();
  let releaseIdentity!: () => void;
  const identityWait = new Promise<void>((resolve) => {
    releaseIdentity = resolve;
  });
  await page.route("**/api/conversations/source-read", async (route) => {
    dispatched++;
    await identityWait;
    await reply(route, sourceResponse()).catch(() => undefined);
  });
  await page.getByRole("button", { name: "Open saved page" }).click();
  await expect.poll(() => dispatched).toBe(2);
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test:session", {
        detail: {
          userId: "different-user",
          sessionId: "different-session",
          orgId: "different-org",
        },
      }),
    ),
  );
  releaseIdentity();
  await expect(page.getByText(sourceText, { exact: true })).toHaveCount(0);
  await expect(
    page.getByText("Recorded SDK estimate: $0.1 USD", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Open source" })).toHaveCount(0);
});

test("usage absence, unavailable, zero and invalid private data remain distinct", async ({
  page,
}, info) => {
  await openSavedRun(page);
  for (const [response, expected] of [
    [
      missingUsage(),
      "No usage record is available for this run. This is not a recorded zero.",
    ],
    [unavailableUsage(), "Run delta unavailable."],
    [recordedUsage(true), "Recorded SDK estimate: $0 USD"],
  ] as const) {
    await page.route("**/api/conversations/usage", (route) =>
      reply(route, response),
    );
    await page.getByRole("button", { name: "View recorded usage" }).click();
    await expect(page.getByText(expected, { exact: true })).toBeVisible();
    await page.getByRole("region", { name: "Run usage viewer" }).screenshot({
      path: info.outputPath(
        `usage-${response.recording === "not-recorded" ? "missing" : response.usage?.status === "unavailable" ? "unavailable" : "zero"}.png`,
      ),
    });
    await page.getByRole("button", { name: "Close recorded usage" }).click();
  }
  await page.route("**/api/conversations/usage", (route) =>
    reply(route, { ...recordedUsage(), toolUseId: "private-never-render" }),
  );
  await page.getByRole("button", { name: "View recorded usage" }).click();
  await expect(
    page.getByRole("heading", { name: "Recorded usage unavailable" }),
  ).toBeVisible();
  await expect(page.getByText("private-never-render")).toHaveCount(0);
  await expect(
    page.getByText("Recorded SDK estimate: $0 USD", { exact: true }),
  ).toHaveCount(0);
});

test("unsafe link stays inert and malformed source response never displays text", async ({
  page,
}) => {
  await openSavedRun(page);
  const value = sourceResponse();
  value.current.linkStatus = "unsafe";
  value.current.sourceLocator = null;
  await page.route("**/api/conversations/source-read", (route) =>
    reply(route, value),
  );
  await page.getByRole("button", { name: "Open saved page" }).click();
  await expect(page.getByText(sourceText, { exact: true })).toBeVisible();
  await expect(
    page.getByText("Source link unavailable", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Bill text viewer" }).locator("a"),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Close bill text" }).click();
  value.event.binding = {
    ...value.event.binding,
    runId: "40000000-0000-4000-8000-000000000099",
  };
  await page.getByRole("button", { name: "Open saved page" }).click();
  await expect(
    page.getByRole("heading", { name: "Bill text is unavailable" }),
  ).toBeVisible();
  await expect(page.getByText(sourceText, { exact: true })).toHaveCount(0);
});
