import { test, expect } from "@playwright/test";
import type { HearingSourceReadResponse } from "@capiro/meri-contracts/conversation-sources";
import rawRecords from "../../tests/meri-hearing-source-fixtures.json" with { type: "json" };
import {
  binding,
  clientId,
  event,
  history,
  openEvidence,
  reply,
  setupConversation,
  sse,
  status,
} from "./meri-conversation-fixtures";

const records = rawRecords as Record<
  keyof typeof rawRecords,
  HearingSourceReadResponse
>;

test("native hearing event reaches the existing SDK conversation viewer", async ({
  page,
}) => {
  await setupConversation(page);
  await page.route("**/api/conversations/history", (route) =>
    reply(
      route,
      history([event(1, "Synthetic hearing read")], { state: "running" }),
    ),
  );
  await page.route("**/api/conversations/events", (route) =>
    sse(route, [records.published.event, status(3, "completed")]),
  );
  await page.route("**/api/conversations/events/*/stream", (route) =>
    sse(route, [records.published.event, status(3, "completed")]),
  );
  await page.route("**/api/conversations/source-read", (route) =>
    reply(route, records.published),
  );
  await page.goto(
    `/meri?clientId=${clientId}&conversationId=${binding.conversationId}`,
  );
  await openEvidence(page);
  await page.getByRole("button", { name: "Open saved page" }).click();
  const viewer = page.getByRole("region", {
    name: "Hearing record viewer",
    exact: true,
  });
  await expect(
    viewer.getByText("Complete saved record", { exact: true }),
  ).toBeVisible();
  await viewer.getByText("View saved record data", { exact: true }).click();
  await expect(viewer.locator("pre")).toContainText("<script>");
  await expect(viewer.locator("script, iframe, video, audio, a")).toHaveCount(
    0,
  );
});

for (const width of [1440, 390])
  test(`completed hearing source reload, exact read and stale clearing at${width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await setupConversation(page);
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
            event(1, "Synthetic saved hearing record"),
            records.reconciliation.event,
            status(3, "completed"),
          ],
          { state: "completed" },
        ),
      ),
    );
    await page.route("**/api/conversations/source-read", (route) =>
      reply(route, records.reconciliation),
    );
    await page.goto(
      `/meri?clientId=${clientId}&conversationId=${binding.conversationId}`,
    );
    await openEvidence(page);
    const open = page.getByRole("button", { name: "Open saved page" });
    await open.click();
    const viewer = page.getByRole("region", {
      name: "Hearing record viewer",
      exact: true,
    });
    await expect(
      viewer.getByRole("region", { name: "Owner claims", exact: true }),
    ).toBeVisible();
    await expect(
      viewer.getByRole("region", {
        name: "Owner assessments and reviews",
        exact: true,
      }),
    ).toBeVisible();
    expect(reads).toEqual([
      {
        schemaVersion: "meri.hearing-source-read/1",
        conversationId: binding.conversationId,
        runId: binding.runId,
        referenceId: records.reconciliation.event.eventId,
      },
    ]);
    expect(effects).toEqual([]);
    await viewer.screenshot({
      path: info.outputPath(`hearing-current-${width}.png`),
    });
    await page.getByRole("button", { name: "Close hearing record" }).click();
    await expect(open).toBeFocused();
    await page.route("**/api/conversations/source-read", (route) =>
      reply(route, { error: { code: "SOURCE_REFERENCE_STALE" } }, 409),
    );
    await open.click();
    await expect(
      viewer.getByRole("heading", { name: "The saved page has changed" }),
    ).toBeVisible();
    await expect(
      viewer.getByText("Owner passage", { exact: true }),
    ).toHaveCount(0);
    await expect(viewer.locator("pre, a")).toHaveCount(0);
  });

test("hearing fragment remains partial and a late reply cannot restore a closed viewer", async ({
  page,
}) => {
  await setupConversation(page);
  await page.route("**/api/conversations/history", (route) =>
    reply(
      route,
      history(
        [
          event(1, "Synthetic fragment"),
          records.briefFragment.event,
          status(3, "completed"),
        ],
        { state: "completed" },
      ),
    ),
  );
  let release!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  let dispatched = false;
  await page.route("**/api/conversations/source-read", async (route) => {
    dispatched = true;
    await wait;
    await reply(route, records.briefFragment).catch(() => undefined);
  });
  await page.goto(
    `/meri?clientId=${clientId}&conversationId=${binding.conversationId}`,
  );
  await openEvidence(page);
  await page.getByRole("button", { name: "Open saved page" }).click();
  await expect.poll(() => dispatched).toBe(true);
  await page.getByRole("button", { name: "Close hearing record" }).click();
  release();
  await expect(
    page.getByRole("region", { name: "Hearing record viewer", exact: true }),
  ).toHaveCount(0);
  await page.route("**/api/conversations/source-read", (route) =>
    reply(route, records.briefFragment),
  );
  await page.getByRole("button", { name: "Open saved page" }).click();
  const viewer = page.getByRole("region", {
    name: "Hearing record viewer",
    exact: true,
  });
  await expect(
    viewer.getByText("Partial saved record", { exact: true }),
  ).toBeVisible();
  await expect(
    viewer.getByRole("region", { name: "Owner claims", exact: true }),
  ).toHaveCount(0);
});
