import { test, expect, type Page } from "@playwright/test";
import {
  created,
  ids,
  inspected,
} from "../../tests/meri-document-public-fixtures";
import {
  setupConversation,
  connect,
  eventOf,
  event,
  status,
  history,
  reply,
} from "./meri-conversation-fixtures";

const token = `${"c".repeat(40)}.${"m".repeat(43)}`;
const fileBytes = "Synthetic document";

async function withArtifact(page: Page) {
  const f = await setupConversation(page);
  await page.route("**/api/conversations/history", (r) =>
    reply(
      r,
      history(
        [
          event(1, "Your brief is ready."),
          eventOf(2, "artifact.available", {
            artifactId: ids.artifact,
            versionId: ids.version,
          }),
          status(3, "completed"),
        ],
        { state: "completed" },
      ),
    ),
  );
  const seen: { path: string; body: unknown; url: string }[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/documents/"))
      seen.push({
        path: url.pathname,
        url: request.url(),
        body: request.postDataJSON(),
      });
  });
  await connect(page);
  const card = page.getByRole("group", { name: /^File version / });
  await expect(card).toBeVisible();
  return { f, seen, card };
}

test("conversation files preview through canonical inspection and download through a signed link", async ({
  page,
}, info) => {
  const { f, seen, card } = await withArtifact(page);
  await page.route("**/api/documents/inspect", (r) => reply(r, inspected()));
  await page.route("**/api/documents/links/issue", (r) =>
    reply(r, {
      versionId: ids.version,
      token,
      expiresAtMs: Date.now() + 60_000,
    }),
  );
  await page.route("**/api/documents/links/redeem", (r) =>
    r.fulfill({
      status: 200,
      headers: {
        "content-type": created().version.mimeType,
        "content-disposition": 'attachment; filename="Synthetic.txt"',
        "content-length": String(fileBytes.length),
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
        "referrer-policy": "no-referrer",
      },
      body: fileBytes,
    }),
  );
  await card.getByRole("button", { name: "Preview", exact: true }).click();
  const file = page.getByRole("group", { name: "Synthetic.txt" });
  await expect(file.getByText("Generation: draft")).toBeVisible();
  await expect(file.getByText("Preview: pending")).toBeVisible();
  await expect(
    file.getByText("Native opening and rendering have not been verified", {
      exact: false,
    }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await file.getByRole("button", { name: "Download", exact: true }).click();
  const saved = await download;
  expect(saved.suggestedFilename()).toBe("Synthetic.txt");
  const path = await saved.path();
  const { readFile } = await import("node:fs/promises");
  expect(await readFile(path!, "utf8")).toBe(fileBytes);
  await expect(
    file.getByText(
      "Downloaded Synthetic.txt; its bytes matched the inspected version.",
    ),
  ).toBeVisible();
  expect(seen.map((item) => item.path)).toEqual([
    "/api/documents/inspect",
    "/api/documents/inspect",
    "/api/documents/links/issue",
    "/api/documents/links/redeem",
  ]);
  expect(seen[2]!.body).toEqual({ versionId: ids.version });
  expect(seen[3]!.body).toEqual({ token });
  expect(seen.every((item) => !item.url.includes(token))).toBe(true);
  await page.screenshot({
    path: info.outputPath("meri-conversation-files.png"),
    fullPage: true,
  });
  expect(f.unexpected).toEqual([]);
});

test("a closed download-link refusal is reported and nothing is downloaded", async ({
  page,
}) => {
  const { f, seen, card } = await withArtifact(page);
  await page.route("**/api/documents/inspect", (r) => reply(r, inspected()));
  await page.route("**/api/documents/links/issue", (r) =>
    reply(r, { error: { code: "DOWNLOADS_UNAVAILABLE" } }, 503),
  );
  let downloads = 0;
  page.on("download", () => downloads++);
  await card.getByRole("button", { name: "Download", exact: true }).click();
  await expect(
    card.getByText(
      "Download unavailable (DOWNLOADS_UNAVAILABLE). Nothing was substituted.",
    ),
  ).toBeVisible();
  expect(seen.map((item) => item.path)).toEqual([
    "/api/documents/inspect",
    "/api/documents/links/issue",
  ]);
  expect(downloads).toBe(0);
  expect(f.unexpected).toEqual([]);
});

test("a refused inspection leaves the file without invented details", async ({
  page,
}) => {
  const { f, card } = await withArtifact(page);
  await page.route("**/api/documents/inspect", (r) =>
    reply(
      r,
      { error: { code: "DOCUMENT_REFUSED", outcome: "READ_UNAVAILABLE" } },
      502,
    ),
  );
  await card.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(
    card.getByText(
      "Preview unavailable (DOCUMENT_REFUSED). Nothing was substituted.",
    ),
  ).toBeVisible();
  await expect(page.getByText("Synthetic.txt")).toHaveCount(0);
  await expect(card.getByText(/Generation:/)).toHaveCount(0);
  expect(f.unexpected).toEqual([]);
});
