import { test, expect, type Page, type Route } from "@playwright/test";
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
const lineage = "Original,";

/**
 * A published file in the transcript. The card reads the file's details as soon as it is shown (one
 * `inspect`), so it names the file, its kind, size and version without a click; `inspect` answers what
 * the test supplies, or refuses when nothing is supplied.
 */
async function withArtifact(
  page: Page,
  inspect: (route: Route) => Promise<void> = (r) =>
    reply(
      r,
      { error: { code: "DOCUMENT_REFUSED", outcome: "READ_UNAVAILABLE" } },
      502,
    ),
) {
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
  await page.route("**/api/documents/inspect", inspect);
  await connect(page);
  await expect(
    page.getByRole("heading", { name: "Files in this conversation" }),
  ).toBeVisible();
  return { f, seen };
}

const links = (page: Page, mimeType: string, filename: string) =>
  Promise.all([
    page.route("**/api/documents/links/issue", (r) =>
      reply(r, {
        versionId: ids.version,
        token,
        expiresAtMs: Date.now() + 60_000,
      }),
    ),
    page.route("**/api/documents/links/redeem", (r) =>
      r.fulfill({
        status: 200,
        headers: {
          "content-type": mimeType,
          "content-disposition": `attachment; filename="${filename}"`,
          "content-length": String(fileBytes.length),
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
          "referrer-policy": "no-referrer",
        },
        body: fileBytes,
      }),
    ),
  ]);

for (const format of accessFormats)
  test(`a published ${format} file is named with its size and version at once, shows its details and downloads through a signed link`, async ({
    page,
  }, info) => {
    const receipt = accessInspection(format);
    const filename = receipt.version.filename;
    const { f, seen } = await withArtifact(page, (r) => reply(r, receipt));
    const file = page.getByRole("group", { name: filename });
    await expect(file).toBeVisible();
    // The details line names the kind, the size and the version's creation with no click (M26/M23: a card, not a bare id).
    await expect(
      file.getByText(`${receipt.version.object.bytes} B · ${lineage}`, {
        exact: false,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("group", { name: "Generated file" }),
    ).toHaveCount(0);
    await links(page, receipt.version.mimeType, filename);
    await file.getByRole("button", { name: "Details", exact: true }).click();
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
    await file
      .getByRole("button", { name: "Hide details", exact: true })
      .click();
    await expect(file.getByText("Generation: draft")).toHaveCount(0);
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
    // One read when the card mounted, then the download's own verification, link issue and redeem.
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
  const { f, seen } = await withArtifact(page, (r) => reply(r, inspected()));
  await page.route("**/api/documents/links/issue", (r) =>
    reply(r, { error: { code: "DOWNLOADS_UNAVAILABLE" } }, 503),
  );
  let downloads = 0;
  page.on("download", () => downloads++);
  const card = page.getByRole("group", { name: "Synthetic.txt" });
  await card.getByRole("button", { name: "Download", exact: true }).click();
  await expect(
    card.getByText(
      "Download unavailable (DOWNLOADS_UNAVAILABLE). Nothing was substituted.",
    ),
  ).toBeVisible();
  expect(seen.map((item) => item.path)).toEqual([
    "/api/documents/inspect",
    "/api/documents/inspect",
    "/api/documents/links/issue",
  ]);
  expect(downloads).toBe(0);
  expect(f.unexpected).toEqual([]);
});

test("a refused inspection leaves the file without invented details, and the person can read them again", async ({
  page,
}) => {
  let refuse = true;
  const { f, seen } = await withArtifact(page, (r) =>
    refuse
      ? reply(
          r,
          { error: { code: "DOCUMENT_REFUSED", outcome: "READ_UNAVAILABLE" } },
          502,
        )
      : reply(r, inspected()),
  );
  const card = page.getByRole("group", { name: "Generated file" });
  await expect(card).toBeVisible();
  await expect(
    card.getByText(
      "File details unavailable (DOCUMENT_REFUSED). Nothing was substituted.",
    ),
  ).toBeVisible();
  await expect(page.getByText("Synthetic.txt")).toHaveCount(0);
  await expect(card.getByText(/Generation:/)).toHaveCount(0);
  refuse = false;
  await card
    .getByRole("button", { name: "Read details again", exact: true })
    .click();
  const file = page.getByRole("group", { name: "Synthetic.txt" });
  await expect(file).toBeVisible();
  await expect(file.getByText(lineage, { exact: false })).toBeVisible();
  expect(seen.map((item) => item.path)).toEqual([
    "/api/documents/inspect",
    "/api/documents/inspect",
  ]);
  expect(f.unexpected).toEqual([]);
});

test("native workspace files show truthful path/bytes and download without generated claims", async ({
  page,
}, info) => {
  const receipt = nativeInspection();
  const { f, seen } = await withArtifact(page, (r) => reply(r, receipt));
  await links(page, "application/octet-stream", "report.csv");
  const file = page.getByRole("group", { name: "report.csv" });
  await expect(file).toBeVisible();
  await file.getByRole("button", { name: "Details", exact: true }).click();
  await expect(
    file.getByText("exports/report.csv", { exact: true }),
  ).toBeVisible();
  await expect(file.getByText("Stored bytes verified")).toBeVisible();
  await expect(
    file.getByText(
      /Generation:|Preview: pending|Visual inspection|Native opening/,
    ),
  ).toHaveCount(0);
  await expect(
    file.getByRole("link", { name: "Open in Workspace" }),
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
        const { f } = await withArtifact(page, (route) =>
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
        const file = page.getByRole("group", { name: filename });
        await expect(file).toBeVisible();
        await file
          .getByRole("button", { name: "Details", exact: true })
          .click();
        await expect(
          file.getByText(
            kind === "native" ? "Stored bytes verified" : "Generation: draft",
          ),
        ).toBeVisible();
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
        // Every download verifies the version first, so a denied inspection is met on the download path too.
        await file
          .getByRole("button", { name: "Download", exact: true })
          .click();
        await expect(
          page.getByText(
            /Download unavailable \(.+\). Nothing was substituted\./,
          ),
        ).toBeVisible();
        await expect
          .soft(page.getByRole("group", { name: filename }))
          .toHaveCount(0);
        await expect
          .soft(page.getByRole("group", { name: "Generated file" }))
          .toBeVisible();
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
