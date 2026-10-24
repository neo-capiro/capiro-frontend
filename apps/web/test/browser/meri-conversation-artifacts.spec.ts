import { test, expect, type Page } from "@playwright/test";
import { ids, inspected } from "../../tests/meri-document-public-fixtures";
import {
  accessFormats,
  nativeInspection,
  accessInspection,
} from "../../tests/meri-document-access-fixtures";
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

for (const format of accessFormats)
  test(`conversation ${format} files inspect and download through a signed link`, async ({
    page,
  }, info) => {
    const { f, seen, card } = await withArtifact(page);
    const receipt = accessInspection(format);
    const filename = receipt.version.filename;
    await page.route("**/api/documents/inspect", (r) => reply(r, receipt));
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
          "content-type": receipt.version.mimeType,
          "content-disposition": `attachment; filename="${filename}"`,
          "content-length": String(fileBytes.length),
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
          "referrer-policy": "no-referrer",
        },
        body: fileBytes,
      }),
    );
    await card.getByRole("button", { name: "Preview", exact: true }).click();
    const file = page.getByRole("group", { name: filename });
    await expect(file.getByText("Generation: draft")).toBeVisible();
    await expect(file.getByText("Preview: pending")).toBeVisible();
    await expect(
      file.getByText("Native opening and rendering have not been verified", {
        exact: false,
      }),
    ).toBeVisible();
    if (format !== "txt")
      await expect(file.getByText("UTF-8 text", { exact: false })).toHaveCount(
        0,
      );
    if (format === "pptx")
      await expect(
        file.getByText("Visual inspection", { exact: true }),
      ).toBeVisible();
    if (format === "pdf")
      await expect(
        file.getByText("Render inspection", { exact: true }),
      ).toBeVisible();
    if (format === "zip")
      await expect(
        file.getByText("Archive rows", { exact: true }),
      ).toBeVisible();
    const download = page.waitForEvent("download");
    await file.getByRole("button", { name: "Download", exact: true }).click();
    const saved = await download;
    expect(saved.suggestedFilename()).toBe(filename);
    const path = await saved.path();
    const { readFile } = await import("node:fs/promises");
    expect(await readFile(path!, "utf8")).toBe(fileBytes);
    await expect(
      file.getByText(
        `Downloaded ${filename}; its bytes matched the inspected version.`,
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
      path: info.outputPath(`meri-conversation-${format}-files.png`),
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

test("native workspace files show truthful path/bytes and download without generated claims", async ({
  page,
}, info) => {
  const { f, card, seen } = await withArtifact(page),
    receipt = nativeInspection();
  await page.route("**/api/documents/inspect", (r) => reply(r, receipt));
  await page.route("**/api/documents/links/issue", (r) =>
    reply(r, {
      versionId: ids.version,
      token,
      expiresAtMs: Date.now() + 60000,
    }),
  );
  await page.route("**/api/documents/links/redeem", (r) =>
    r.fulfill({
      status: 200,
      headers: {
        "content-type": "application/octet-stream",
        "content-disposition": 'attachment; filename="report.csv"',
        "content-length": String(fileBytes.length),
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
      body: fileBytes,
    }),
  );
  await card.getByRole("button", { name: "Preview", exact: true }).click();
  const file = page.getByRole("group", { name: "report.csv" });
  await expect(
    file.getByText("exports/report.csv", { exact: true }),
  ).toBeVisible();
  await expect(file.getByText("Stored bytes verified")).toBeVisible();
  await expect(
    file.getByText(
      /Generation:|Preview: pending|Visual inspection|Native opening/,
    ),
  ).toHaveCount(0);
  const pending = page.waitForEvent("download");
  await file.getByRole("button", { name: "Download", exact: true }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("report.csv");
  const { readFile } = await import("node:fs/promises");
  expect(await readFile((await download.path())!, "utf8")).toBe(fileBytes);
  expect(seen.map((row) => row.path)).toEqual([
    "/api/documents/inspect",
    "/api/documents/inspect",
    "/api/documents/links/issue",
    "/api/documents/links/redeem",
  ]);
  expect(f.unexpected).toEqual([]);
  await page.screenshot({
    path: info.outputPath("native-workspace-file.png"),
    fullPage: true,
  });
});

for (const kind of ["native", "generated"] as const)
  for (const denial of [401, 403])
    for (const deniedAt of ["inspect", "issue", "redeem"] as const)
      test(`${kind} file clears artifact-local data after ${deniedAt} ${denial}`, async ({
        page,
      }) => {
        await page.addInitScript(() => {
          const urls = { created: [] as string[], revoked: [] as string[] };
          Object.assign(window, { artifactUrls: urls });
          const create = URL.createObjectURL.bind(URL);
          const revoke = URL.revokeObjectURL.bind(URL);
          URL.createObjectURL = (blob) => {
            const value = create(blob);
            urls.created.push(value);
            return value;
          };
          URL.revokeObjectURL = (value) => {
            urls.revoked.push(value);
            revoke(value);
          };
        });
        const { f, card } = await withArtifact(page);
        const receipt =
          kind === "native" ? nativeInspection() : accessInspection("txt");
        const filename = kind === "native" ? "report.csv" : "Synthetic.txt";
        const mimeType =
          "mimeType" in receipt.version
            ? receipt.version.mimeType
            : "application/octet-stream";
        let denied = false,
          downloads = 0;
        page.on("download", () => downloads++);
        await page.route("**/api/documents/inspect", (route) =>
          denied && deniedAt === "inspect"
            ? reply(
                route,
                {
                  error: { code: "ACCESS_DENIED", outcome: "READ_UNAVAILABLE" },
                },
                denial,
              )
            : reply(route, receipt),
        );
        await page.route("**/api/documents/links/issue", (route) =>
          denied && deniedAt === "issue"
            ? reply(route, { error: { code: "DOWNLOAD_LINK_REFUSED" } }, denial)
            : reply(route, {
                versionId: ids.version,
                token,
                expiresAtMs: Date.now() + 60000,
              }),
        );
        await page.route("**/api/documents/links/redeem", (route) =>
          denied && deniedAt === "redeem"
            ? reply(route, { error: { code: "DOWNLOAD_LINK_REFUSED" } }, denial)
            : route.fulfill({
                status: 200,
                headers: {
                  "content-type": mimeType,
                  "content-disposition": `attachment; filename="${filename}"`,
                  "content-length": String(fileBytes.length),
                  "cache-control": "no-store",
                  "x-content-type-options": "nosniff",
                },
                body: fileBytes,
              }),
        );
        await card
          .getByRole("button", { name: "Preview", exact: true })
          .click();
        const file = page.getByRole("group", { name: filename });
        await expect(file).toBeVisible();
        const saved = page.waitForEvent("download");
        await file
          .getByRole("button", { name: "Download", exact: true })
          .click();
        expect((await saved).suggestedFilename()).toBe(filename);
        const downloadUrl = await page.evaluate(() =>
          (
            window as unknown as { artifactUrls: { created: string[] } }
          ).artifactUrls.created.at(-1),
        );
        expect(downloadUrl).toMatch(/^blob:/);
        denied = true;
        await file
          .getByRole("button", {
            name: deniedAt === "inspect" ? "Preview" : "Download",
            exact: true,
          })
          .click();
        await expect(
          page.getByText(
            /(?:Preview|Download) unavailable \(.+\). Nothing was substituted\./,
          ),
        ).toBeVisible();
        await expect
          .soft(page.getByRole("group", { name: filename }))
          .toHaveCount(0);
        await expect
          .soft(
            page.getByText(
              /Stored bytes verified|Generation: draft|Preview: pending/,
            ),
          )
          .toHaveCount(0);
        expect
          .soft(
            await page.evaluate(
              (url) =>
                (
                  window as unknown as { artifactUrls: { revoked: string[] } }
                ).artifactUrls.revoked.includes(url!),
              downloadUrl,
            ),
          )
          .toBe(true);
        expect(downloads).toBe(1);
        await expect(
          page.getByLabel("Meri message", { exact: true }),
        ).toBeVisible();
        await expect(
          page.getByText("Your brief is ready.", { exact: true }),
        ).toBeVisible();
        expect(f.hints).toHaveLength(1);
        expect(f.unexpected).toEqual([]);
      });
