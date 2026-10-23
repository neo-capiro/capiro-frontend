import { createHash } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { clientId, file, installFixtures, json } from "./fixtures";
const rows = [
  { ...file, metadataRevision: 0, sourceEntityType: null },
  {
    ...file,
    id: "60000000-0000-4000-8000-000000000002",
    fileName: "Second synthetic.pdf",
    metadataRevision: 0,
    sourceEntityType: null,
  },
];
function receipt(command: {
  requestId: string;
  folder: string | null;
  files: { id: string; expectedRevision: number }[];
}) {
  return {
    schemaVersion: 1,
    clientId,
    requestId: command.requestId,
    payloadDigest: createHash("sha256")
      .update(JSON.stringify(command))
      .digest("hex"),
    outcome: "moved",
    committedAt: "2026-10-23T00:00:00.000Z",
    files: command.files.map((file) => ({
      id: file.id,
      previousRevision: file.expectedRevision,
      revision: file.expectedRevision + 1,
      folder: command.folder,
    })),
  };
}
async function setup(page: Page) {
  const unexpected = await installFixtures(page);
  await page.route("**/engagement/attachments?**", (route) =>
    json(route, rows),
  );
  await page.goto(`/portfolio/${clientId}/files`);
  for (const row of rows)
    await page
      .getByRole("checkbox", { name: `Select ${row.fileName}`, exact: true })
      .check();
  await page
    .getByRole("button", { name: "Move to folder", exact: true })
    .click();
  return {
    unexpected,
    dialog: page.getByRole("dialog", { name: "Move to folder", exact: true }),
  };
}
test("explicit batch freezes edits/dismissal, rejects double dispatch and shows only the exact receipt", async ({
  page,
}, info) => {
  const { dialog, unexpected } = await setup(page);
  let writes = 0,
    release: (() => void) | undefined;
  await page.route("**/files/batch-moves", async (route) => {
    writes++;
    const body = route.request().postDataJSON();
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await json(route, receipt(body));
  });
  await dialog
    .getByRole("button", { name: "Move 2 items" })
    .evaluate((button) => {
      (button as HTMLButtonElement).click();
      (button as HTMLButtonElement).click();
    });
  await expect.poll(() => writes).toBe(1);
  await expect(
    dialog.getByRole("textbox", { name: "Search folders" }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  release!();
  await expect(dialog.getByRole("status")).toContainText(
    "Batch of 2 files confirmed",
  );
  await page.screenshot({ path: info.outputPath("batch-confirmed.png") });
  expect(writes).toBe(1);
  expect(unexpected).toEqual([]);
});
test("lost response survives reload and recovery only reads the exact command receipt", async ({
  page,
}) => {
  const { dialog, unexpected } = await setup(page);
  let writes = 0,
    reads = 0,
    saved: ReturnType<typeof receipt>;
  await page.route("**/files/batch-moves", (route) => {
    writes++;
    saved = receipt(route.request().postDataJSON());
    return route.abort("failed");
  });
  await page.route("**/files/batch-moves/*", (route) => {
    reads++;
    expect(route.request().url()).toContain(saved.requestId);
    return json(route, saved);
  });
  await dialog.getByRole("button", { name: "Move 2 items" }).click();
  await expect(dialog.getByText(/result is unconfirmed/)).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Move 2 items" }),
  ).toBeDisabled();
  await page.reload();
  await page.getByRole("button", { name: "Check batch result" }).click();
  await expect(page.getByText(/Batch of 2 files confirmed/)).toBeVisible();
  expect(writes).toBe(1);
  expect(reads).toBe(1);
  expect(unexpected).toEqual([]);
});
test("partial or wrong-destination 2xx cannot clear the retained command", async ({
  page,
}) => {
  const { dialog, unexpected } = await setup(page);
  let writes = 0;
  await page.route("**/files/batch-moves", (route) => {
    writes++;
    const result = receipt(route.request().postDataJSON());
    result.files[0]!.folder = "Wrong destination";
    return json(route, result);
  });
  await dialog.getByRole("button", { name: "Move 2 items" }).click();
  await expect(dialog.getByRole("alert")).toContainText("did not confirm");
  await expect(
    dialog.getByRole("button", { name: "Move 2 items" }),
  ).toBeDisabled();
  await expect(dialog.getByText(/Batch of 2 files confirmed/)).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        Object.keys(sessionStorage).filter((key) =>
          key.startsWith("capiro:file-batch:"),
        ).length,
    ),
  ).toBe(1);
  expect(writes).toBe(1);
  expect(unexpected).toEqual([]);
});
for (const gap of ["missing revision", "hearing owner"] as const)
  test(`${gap} stays unavailable, while one-file behavior stays available`, async ({
    page,
  }) => {
    const unexpected = await installFixtures(page);
    await page.route("**/engagement/attachments?**", (route) =>
      json(route, [
        {
          ...rows[0],
          ...(gap === "missing revision"
            ? { metadataRevision: undefined }
            : { sourceEntityType: "hearing_record_brief" }),
        },
        rows[1],
      ]),
    );
    await page.goto(`/portfolio/${clientId}/files`);
    await page
      .getByRole("checkbox", {
        name: `Select ${rows[0]!.fileName}`,
        exact: true,
      })
      .check();
    await expect(
      page.getByRole("button", { name: "Move to folder", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("checkbox", {
        name: `Select ${rows[1]!.fileName}`,
        exact: true,
      })
      .check();
    await expect(
      page.getByRole("button", { name: "Move to folder", exact: true }),
    ).toBeDisabled();
    await expect(
      page
        .getByText(
          gap === "missing revision"
            ? /Batch revisions are unavailable/
            : /hearing/i,
        )
        .last(),
    ).toBeVisible();
    expect(unexpected).toEqual([]);
  });
