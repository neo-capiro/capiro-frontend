import { test, expect, type Page, type Route } from "@playwright/test";
import records from "../../tests/meri-hearing-source-fixtures.json" with { type: "json" };
import { hearingMediaFixture } from "../../tests/meri-hearing-media-fixtures";
import {
  binding,
  clientId,
  event,
  history,
  reply,
  setupConversation,
  status,
} from "./meri-conversation-fixtures";

function silence() {
  const bytes = Buffer.alloc(44 + 20 * 16_000 * 2);
  bytes.write("RIFF", 0);
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(16_000, 24);
  bytes.writeUInt32LE(32_000, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(bytes.length - 44, 40);
  return bytes;
}

async function openHearing(
  page: Page,
  media?: (route: Route) => Promise<void>,
) {
  await setupConversation(page);
  await page.route("**/api/conversations/history", (route) =>
    reply(
      route,
      history(
        [
          event(1, "Synthetic saved hearing audio"),
          records.published.event,
          status(3, "completed"),
        ],
        { state: "completed" },
      ),
    ),
  );
  await page.route("**/api/conversations/source-read", async (route) => {
    const request = route.request().postDataJSON();
    if (request.schemaVersion === "meri.hearing-source-read/1")
      return reply(route, records.published);
    if (media) return media(route);
    return reply(
      route,
      hearingMediaFixture(request.playback?.positionMs ?? null),
    );
  });
  await page.route("https://media.example.test/synthetic.wav", (route) =>
    route.fulfill({ status: 200, contentType: "audio/wav", body: silence() }),
  );
  await page.goto(
    `/meri?clientId=${clientId}&conversationId=${binding.conversationId}`,
  );
  await page.getByRole("button", { name: "Open saved page" }).click();
  await page.getByRole("button", { name: "Check recording coverage" }).click();
}

for (const width of [1440, 390])
  test(`retained hearing audio uses real player controls and exact segments at${width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    const effects: string[] = [],
      selections: unknown[] = [];
    page.on("request", (request) => {
      const path = new URL(request.url()).pathname;
      if (
        /\/api\/conversations\/(submit|next-turn|input\/|control|cancel)/.test(
          path,
        )
      )
        effects.push(path);
      if (
        path === "/api/conversations/source-read" &&
        request.postDataJSON().schemaVersion === "meri.hearing-media-read/1"
      )
        selections.push(request.postDataJSON().playback);
    });
    await openHearing(page);
    const recording = page.getByRole("region", {
      name: "Hearing recording",
      exact: true,
    });
    await expect(
      recording.getByText("Captions are unavailable for this recording."),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Load recording 1", exact: true })
      .click();
    const audio = page.locator("audio");
    await expect
      .poll(() => audio.evaluate((element) => element.readyState))
      .toBeGreaterThanOrEqual(2);
    await recording.locator("media-play-button").click();
    await expect
      .poll(() => audio.evaluate((element) => element.currentTime))
      .toBeGreaterThan(0);
    await recording.locator("media-play-button").click();
    await expect
      .poll(() => audio.evaluate((element) => element.paused))
      .toBe(true);
    await recording.locator("media-mute-button").click();
    await expect
      .poll(() => audio.evaluate((element) => element.muted))
      .toBe(true);
    await recording.locator("media-playback-rate-button").click();
    await expect
      .poll(() => audio.evaluate((element) => element.playbackRate))
      .not.toBe(1);
    const slider = recording.locator("media-time-range").getByRole("slider");
    await slider.focus();
    await page.keyboard.press("ArrowRight");
    await expect
      .poll(() => audio.evaluate((element) => element.currentTime))
      .toBeGreaterThan(1);
    await expect(
      recording.getByText(/Recording position: 00:00:/),
    ).toBeVisible();
    await page.getByRole("button", { name: "Load next segment" }).click();
    await expect(
      recording.getByText(
        "Loaded segment: 00:00:50–00:01:10 on the recording timeline.",
      ),
    ).toBeVisible();
    expect(selections).toEqual([
      null,
      { epochId: "synthetic-epoch", positionMs: 30_000 },
      { epochId: "synthetic-epoch", positionMs: 50_000 },
    ]);
    expect(effects).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await recording.screenshot({
      path: info.outputPath(`hearing-media-${width}.png`),
    });
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    const violations = await recording.evaluate(async (element) => {
      const axe = (
        window as unknown as {
          axe: {
            run: (element: Element) => Promise<{ violations: unknown[] }>;
          };
        }
      ).axe;
      return (await axe.run(element)).violations;
    });
    expect(violations).toEqual([]);
  });

test("expired playback removes the player and pauses its detached audio", async ({
  page,
}) => {
  await page.clock.install({ time: new Date() });
  await openHearing(page);
  await page
    .getByRole("button", { name: "Load recording 1", exact: true })
    .click();
  await expect(page.locator("audio")).toHaveCount(1);
  const audio = await page.locator("audio").elementHandle();
  await page.locator("media-play-button").click();
  await expect
    .poll(() => audio!.evaluate((element) => element.paused))
    .toBe(false);
  await page.clock.fastForward(61_000);
  await expect(
    page.getByText(
      "Playback access expired. Load the recording again to check access.",
    ),
  ).toBeVisible();
  await expect(page.locator("audio, media-controller")).toHaveCount(0);
  expect(await audio!.evaluate((element) => element.paused)).toBe(true);
});

test("closing disposes media and identity replacement rejects late media replies", async ({
  page,
}) => {
  await openHearing(page);
  await page
    .getByRole("button", { name: "Load recording 1", exact: true })
    .click();
  await expect(page.locator("audio")).toHaveCount(1);
  const audio = await page.locator("audio").elementHandle();
  await page.locator("media-play-button").click();
  await expect
    .poll(() => audio!.evaluate((element) => element.paused))
    .toBe(false);
  await page.getByRole("button", { name: "Close hearing record" }).click();
  await expect(page.locator("audio")).toHaveCount(0);
  expect(await audio!.evaluate((element) => element.paused)).toBe(true);
  let release!: () => void,
    requested = false;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/conversations/source-read", async (route) => {
    const request = route.request().postDataJSON();
    if (request.schemaVersion === "meri.hearing-source-read/1")
      return reply(route, records.published);
    if (!request.playback) return reply(route, hearingMediaFixture());
    requested = true;
    await pending;
    await reply(route, hearingMediaFixture(30_000)).catch(() => undefined);
  });
  await page.getByRole("button", { name: "Open saved page" }).click();
  await page.getByRole("button", { name: "Check recording coverage" }).click();
  await page
    .getByRole("button", { name: "Load recording 1", exact: true })
    .click();
  await expect.poll(() => requested).toBe(true);
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
  release();
  await expect(page.locator("audio, media-controller")).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Hearing record viewer", exact: true }),
  ).toHaveCount(0);
});

test("identity replacement removes active playback and pauses detached audio", async ({
  page,
}) => {
  await openHearing(page);
  await page
    .getByRole("button", { name: "Load recording 1", exact: true })
    .click();
  const audio = await page.locator("audio").elementHandle();
  await page.locator("media-play-button").click();
  await expect
    .poll(() => audio!.evaluate((element) => element.paused))
    .toBe(false);
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
  await expect(page.locator("audio, media-controller")).toHaveCount(0);
  expect(await audio!.evaluate((element) => element.paused)).toBe(true);
});

test("unavailable, stale and unsafe media never reach the audio provider", async ({
  page,
}) => {
  for (const failure of ["missing", "denied", "stale", "unsafe"]) {
    await openHearing(page, async (route) => {
      const request = route.request().postDataJSON();
      if (failure === "missing") {
        const value = hearingMediaFixture();
        value.current.media.manifest!.epochs = [];
        return reply(route, value);
      }
      if (!request.playback) return reply(route, hearingMediaFixture());
      if (failure === "denied")
        return reply(route, { error: { code: "ACCESS_DENIED" } }, 403);
      if (failure === "stale")
        return reply(route, { error: { code: "SOURCE_REFERENCE_STALE" } }, 409);
      const value = hearingMediaFixture(30_000);
      value.current.media.playback!.url = "javascript:alert(1)";
      return reply(route, value);
    });
    if (failure !== "missing") {
      const finished = page.waitForResponse(
        (response) =>
          response.url().endsWith("/api/conversations/source-read") &&
          response.request().postDataJSON().playback,
      );
      await page
        .getByRole("button", { name: "Load recording 1", exact: true })
        .click();
      await finished;
      if (failure === "unsafe")
        await expect(
          page.getByText(
            "This recording segment is unavailable with current access. Coverage may contain gaps.",
          ),
        ).toBeVisible();
      if (failure === "denied")
        await expect(
          page.getByRole("region", {
            name: "Hearing record viewer",
            exact: true,
          }),
        ).toHaveCount(0);
      if (failure === "stale")
        await expect(
          page.getByRole("button", { name: "Check recording coverage" }),
        ).toBeVisible();
    } else
      await expect(
        page.getByText("No retained audio is available for this hearing."),
      ).toBeVisible();
    await expect(page.locator("audio, media-controller")).toHaveCount(0);
  }
});
