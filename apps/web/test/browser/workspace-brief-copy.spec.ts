import { test, expect } from "@playwright/test";
import {
  copyWorkflowFixture,
  copiedTabUrl,
  createCopyUrl,
} from "./workspace-brief-copy-fixture";
import {
  copyBody,
  copyIds,
  copySource,
} from "../../tests/workspace-brief-copy-fixtures";

test("explicit copy binds the exact Core version and reads the created tab without Core mutation", async ({
  page,
}) => {
  const fixture = await copyWorkflowFixture(page);
  await page.goto(createCopyUrl);
  await expect(
    page.getByRole("button", { name: "Create independent Workspace copy" }),
  ).toBeEnabled();
  expect(fixture.writes).toHaveLength(0);
  await page
    .getByRole("button", { name: "Create independent Workspace copy" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Core brief copied", exact: true }),
  ).toBeVisible();
  expect(fixture.writes).toHaveLength(1);
  expect(fixture.writes[0]!.input).toMatchObject({
    params: { draftId: copyIds.draft },
    body: { source: copySource, expectedClientId: null },
  });
  await page.getByRole("link", { name: "Open copied tab" }).click();
  await expect(page.getByLabel("Original Core section content")).toHaveValue(
    "Original text",
  );
  expect(fixture.coreWrites).toEqual([]);
  expect(fixture.errors).toEqual([]);
});

test("atomic rich copy edit preserves complete extra fields and reopens the exact saved tab", async ({
  page,
}) => {
  const fixture = await copyWorkflowFixture(page);
  await page.goto(copiedTabUrl);
  await page
    .getByLabel("Original Core section content")
    .fill("Independent Workspace text");
  await page
    .getByRole("button", { name: "Save copied tab", exact: true })
    .click();
  await expect(page.getByText(/Saved Workspace version/)).toBeVisible();
  expect(fixture.writes.map(({ key }) => key)).toEqual([
    "workspace.brief-copy.save",
  ]);
  expect(fixture.writes[0]!.input.body.body).toEqual({
    ...copyBody,
    blocks: [
      { ...copyBody.blocks[0], content: "Independent Workspace text" },
      ...copyBody.blocks.slice(1),
    ],
  });
  await page.reload();
  await expect(page.getByLabel("Original Core section content")).toHaveValue(
    "Independent Workspace text",
  );
  expect(fixture.coreWrites).toEqual([]);
});

test("full JSON editing requires explicit application and retains table and photo structures", async ({
  page,
}) => {
  const fixture = await copyWorkflowFixture(page);
  await page.goto(copiedTabUrl);
  await page
    .getByRole("button", { name: "Edit full document JSON", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save copied tab", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Full copied document JSON", { exact: true })
    .fill('{"blocks":');
  await page
    .getByRole("button", { name: "Apply JSON to local draft", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Invalid or excessive JSON",
  );
  const body = { ...copyBody, layout: { columns: 2 } };
  await page
    .getByLabel("Full copied document JSON", { exact: true })
    .fill(JSON.stringify(body));
  await page
    .getByRole("button", { name: "Apply JSON to local draft", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save copied tab", exact: true })
    .click();
  await expect(page.getByText(/Saved Workspace version/)).toBeVisible();
  expect(fixture.writes[0]!.input.body.body).toEqual(body);
});

test("lost atomic receipt retains exact input across reload and replay shows newer current body", async ({
  page,
}) => {
  const fixture = await copyWorkflowFixture(page);
  fixture.loseNext();
  await page.goto(copiedTabUrl);
  await page
    .getByLabel("Original Core section content")
    .fill("Retain my exact attempt");
  await page
    .getByRole("button", { name: "Save copied tab", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Retry current access and recovery" }),
  ).toBeVisible();
  fixture.replaceBody("A later saved edit");
  await page.reload();
  await expect(page.getByLabel("Original Core section content")).toHaveValue(
    "Retain my exact attempt",
  );
  await expect(page.getByLabel("Original Core section content")).toBeDisabled();
  expect(fixture.writes).toHaveLength(1);
  await page
    .getByRole("button", { name: "Retry exact retained command" })
    .click();
  await expect(page.getByLabel("Original Core section content")).toHaveValue(
    "A later saved edit",
  );
  expect(fixture.writes).toHaveLength(2);
  expect(fixture.writes[1]!.input).toEqual(fixture.writes[0]!.input);
  await expect(page.getByText(/original receipt replayed/)).toBeVisible();
  expect(fixture.coreWrites).toEqual([]);
});

test("receipt success followed by unavailable fresh reads retains the receipt and recovers without resending", async ({
  page,
}) => {
  const fixture = await copyWorkflowFixture(page);
  fixture.failFreshRead();
  await page.goto(copiedTabUrl);
  await page
    .getByLabel("Original Core section content")
    .fill("Receipt-backed edit");
  await page
    .getByRole("button", { name: "Save copied tab", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Retry current access and recovery" }),
  ).toBeVisible();
  await expect(page.getByLabel("Original Core section content")).toHaveCount(0);
  fixture.reads(200);
  await page
    .getByRole("button", { name: "Retry current access and recovery" })
    .click();
  await page
    .getByRole("button", { name: "Read current after saved receipt" })
    .click();
  await expect(page.getByLabel("Original Core section content")).toHaveValue(
    "Receipt-backed edit",
  );
  await expect(
    page.getByRole("button", { name: "Save copied tab", exact: true }),
  ).toBeEnabled();
  expect(fixture.writes).toHaveLength(1);
});

test("state conflict requires explicit fresh review before a new request while retaining proposed text", async ({
  page,
}) => {
  const fixture = await copyWorkflowFixture(page);
  fixture.conflictNext();
  await page.goto(copiedTabUrl);
  await page
    .getByLabel("Original Core section content")
    .fill("Keep after conflict");
  await page
    .getByRole("button", { name: "Save copied tab", exact: true })
    .click();
  await expect(page.getByLabel("Original Core section content")).toBeDisabled();
  await page
    .getByRole("button", {
      name: "Review current state and retire refused request",
    })
    .click();
  await expect(page.getByLabel("Original Core section content")).toHaveValue(
    "Keep after conflict",
  );
  await expect(
    page.getByRole("button", { name: "Save copied tab", exact: true }),
  ).toBeEnabled();
  expect(fixture.writes).toHaveLength(1);
  await page
    .getByRole("button", { name: "Save copied tab", exact: true })
    .click();
  await expect(page.getByText(/Saved Workspace version/)).toBeVisible();
  expect(fixture.writes).toHaveLength(2);
  expect(fixture.writes[1]!.input.body.requestId).not.toBe(
    fixture.writes[0]!.input.body.requestId,
  );
  expect(fixture.writes[1]!.input.body.expectedStateHash).toBe("7".repeat(64));
  expect(fixture.writes[1]!.input.body.body).toEqual(
    fixture.writes[0]!.input.body.body,
  );
});

for (const status of [403, 503])
  test(`a failed current ${status} read hides the copied editor and requires a successful current read`, async ({
    page,
  }) => {
    const fixture = await copyWorkflowFixture(page);
    await page.goto(copiedTabUrl);
    await page
      .getByLabel("Original Core section content")
      .fill("Unsent obsolete draft");
    fixture.reads(status);
    await page
      .getByRole("button", { name: "Read current copied document" })
      .click();
    await expect(page.getByLabel("Original Core section content")).toHaveCount(
      0,
    );
    fixture.reads(200);
    await page
      .getByRole("button", { name: "Retry current access and recovery" })
      .click();
    await expect(page.getByLabel("Original Core section content")).toHaveValue(
      "Original text",
    );
    expect(fixture.writes).toHaveLength(0);
  });

test("navigation during a held atomic save cannot install its late receipt in another view", async ({
  page,
}) => {
  const fixture = await copyWorkflowFixture(page);
  fixture.hold();
  await page.goto(copiedTabUrl);
  await page
    .getByLabel("Original Core section content")
    .fill("Held exact intent");
  await page
    .getByRole("button", { name: "Save copied tab", exact: true })
    .click();
  await expect.poll(fixture.entered).toBe(true);
  await expect(page.getByLabel("Original Core section content")).toBeDisabled();
  await page.goto("/modules/workspace?prospectId=invalid");
  fixture.release();
  await expect.poll(fixture.completed).toBe(1);
  await expect(
    page.getByRole("heading", { name: "Prospect unavailable" }),
  ).toBeVisible();
  await expect(page.getByText(/Saved Workspace version/)).toHaveCount(0);
  await page.goto(copiedTabUrl);
  await expect(
    page.getByRole("button", { name: "Retry exact retained command" }),
  ).toBeVisible();
  expect(fixture.writes).toHaveLength(1);
  expect(fixture.coreWrites).toEqual([]);
});

test("two pages share the real journal execution lock and never replay a command acknowledged by the first page", async ({
  page,
  context,
}) => {
  const second = await context.newPage();
  const fixture = await copyWorkflowFixture(page, [second]);
  fixture.hold();
  await page.goto(copiedTabUrl);
  await page
    .getByLabel("Original Core section content")
    .fill("First page exact text");
  await page
    .getByRole("button", { name: "Save copied tab", exact: true })
    .click();
  await expect.poll(fixture.entered).toBe(true);
  await second.goto(copiedTabUrl);
  await expect(second.getByLabel("Original Core section content")).toHaveValue(
    "First page exact text",
  );
  await second
    .getByRole("button", { name: "Retry exact retained command" })
    .click();
  await expect
    .poll(() =>
      second.evaluate(async () => {
        const locks = await navigator.locks.query();
        return (
          locks.pending?.filter((lock) =>
            lock.name?.startsWith("capiro-command-execution-v1:"),
          ).length ?? 0
        );
      }),
    )
    .toBe(1);
  expect(fixture.writes).toHaveLength(1);
  fixture.release();
  await expect(page.getByText(/Saved Workspace version/)).toBeVisible();
  await expect(
    second.getByRole("button", { name: "Retry current access and recovery" }),
  ).toBeVisible();
  expect(fixture.writes).toHaveLength(1);
  await second
    .getByRole("button", { name: "Retry current access and recovery" })
    .click();
  await expect(second.getByLabel("Original Core section content")).toHaveValue(
    "First page exact text",
  );
  await expect(
    second.getByRole("button", { name: "Save copied tab", exact: true }),
  ).toBeEnabled();
  expect(fixture.writes).toHaveLength(1);
  expect(fixture.coreWrites).toEqual([]);
  expect(fixture.errors).toEqual([]);
  await second.close();
});
