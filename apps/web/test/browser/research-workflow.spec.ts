import { expect, test, type Page } from "@playwright/test";
import { ids, portfolio, timestamp } from "./research-sharing-fixture";
const jobId = "20000000-0000-4000-8000-000000000001";
const rowId = "20000000-0000-4000-8000-000000000002";
const artifactId = "20000000-0000-4000-8000-000000000003";
const member = {
  id: rowId,
  targetKind: "program_element",
  targetId: "0601102A",
  label: "Synthetic PE",
  disposition: "included",
  origin: "manual",
  reason: null,
  unresolvedInput: null,
  resolvedAt: null,
  revision: 1,
  createdByUserId: "owner",
  updatedByUserId: "owner",
  createdAt: timestamp,
  updatedAt: timestamp,
};
type Write = {
  key: string;
  input: { params?: Record<string, string>; body?: Record<string, unknown> };
};
async function api(
  page: Page,
  extra: (key: string, input: Write["input"]) => unknown = () => undefined,
  archived = false,
) {
  const writes: Write[] = [];
  await page.route("**/api/capiro/**", async (route) => {
    const key = new URL(route.request().url()).pathname.split("/").at(-1)!;
    const input =
      route.request().method() === "GET"
        ? JSON.parse(
            new URL(route.request().url()).searchParams.get("input") || "{}",
          )
        : route.request().postDataJSON();
    if (route.request().method() !== "GET") writes.push({ key, input });
    const result = extra(key, input);
    if (result instanceof Error)
      return route.fulfill({ status: 503, json: { message: result.message } });
    const fallback: Record<string, unknown> = {
      "research.detail": {
        ...portfolio,
        lifecycle: archived ? "archived" : "active",
        members: [member],
        memberCount: 1,
      },
      "research.tour": {
        tourVersion: "research-portfolios-v1",
        status: "dismissed",
        completedAt: null,
      },
      "research.rules": [],
      "research.templates": [],
      "research.snapshots": [],
      "research.bookmarks": [],
      "research.reviews": [],
      "settings.tenantMembers": [],
      "clients.list": [],
      "research.sharing": {
        portfolioId: ids.portfolio,
        enabled: false,
        tenantEnabled: true,
        pinSet: false,
        pinUpdatedAt: null,
        activeLinkCount: 0,
        updatedAt: null,
      },
    };
    await route.fulfill({ json: result ?? fallback[key] ?? {} });
  });
  return writes;
}
test("mounted rule preview binds publication to the unchanged selected portfolio and draft", async ({
  page,
}) => {
  const writes = await api(page, (key) =>
    key === "research.rules.preview"
      ? {
          previewId: jobId,
          previewHash: "hash",
          portfolioRevision: 1,
          expiresAt: "2099-01-01T00:00:00Z",
          complete: true,
          counts: { retained: 1 },
          items: [
            {
              targetKind: "program_element",
              targetId: member.targetId,
              label: member.label,
              result: "match",
              disposition: "retained",
              reasons: ["Canonical source"],
            },
          ],
        }
      : key === "research.rules.publish"
        ? {
            portfolioId: ids.portfolio,
            eventId: jobId,
            actorUserId: "owner",
            occurredAt: timestamp,
            resultingRevision: 2,
            replayed: false,
            outcomes: [],
          }
        : undefined,
  );
  await page.goto("/research-workflow.html?view=rules");
  await page.getByLabel("Condition value").fill("Army");
  await page
    .getByRole("button", { name: "Preview membership changes" })
    .click();
  await expect(
    page.getByRole("button", { name: "Publish reviewed rule" }),
  ).toBeVisible();
  await page.getByLabel("Condition value").fill("Navy");
  await expect(
    page.getByRole("button", { name: "Publish reviewed rule" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Preview membership changes" })
    .click();
  await page.getByRole("button", { name: "Publish reviewed rule" }).click();
  await expect
    .poll(
      () =>
        writes.filter((write) => write.key === "research.rules.publish").length,
    )
    .toBe(1);
  const previews = writes.filter(
    (write) => write.key === "research.rules.preview",
  );
  expect(previews).toHaveLength(2);
  expect(previews[1]?.input.params).toEqual({ id: ids.portfolio });
  expect(previews[1]?.input.body?.candidates).toEqual([
    {
      targetKind: "program_element",
      targetId: member.targetId,
      label: member.label,
      facts: {},
    },
  ]);
  expect(
    writes.filter((write) => write.key === "research.rules.publish"),
  ).toHaveLength(1);
});
test("CSV mapping and repair must be previewed before applying, and every row outcome remains visible", async ({
  page,
}) => {
  let status = "mapped";
  const receipt = () => ({
    id: jobId,
    portfolioId: ids.portfolio,
    operationKey: "original",
    worksheetKind: "membership",
    status,
    fileName: "members.csv",
    originalHash: "a".repeat(64),
    originalSize: 50,
    targetRevision: 1,
    rowCount: 1,
    appliedCount: status === "completed" ? 1 : 0,
    updatedAt: timestamp,
    rows: [
      {
        id: rowId,
        rowNumber: 2,
        rowIdentity: "row-2",
        rawCells: { target_kind: "program_element", target_id: "bad" },
        parsedData: { target_kind: "program_element", target_id: "bad" },
        repairs: {},
        validationIssues: [],
        selected: true,
        previewClassification: status === "mapped" ? null : "resolved",
        previewReason: null,
        finalOutcome: status === "completed" ? "applied" : null,
        finalReason: null,
        targetKind: "program_element",
        targetId: "0601102A",
      },
    ],
    mappings: [],
    attempts: [],
    compensationReceipts: [],
  });
  const writes = await api(page, (key, input) => {
    if (key === "research.imports.create" || key === "research.imports.detail")
      return receipt();
    if (key === "research.imports.action") {
      status = input.params?.action === "preview" ? "previewed" : "completed";
      return receipt();
    }
  });
  await page.goto("/research-workflow.html?view=imports");
  await page.getByLabel("CSV file").setInputFiles({
    name: "members.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("target_kind,target_id\nprogram_element,bad"),
  });
  await page.getByRole("button", { name: "Create import worksheet" }).click();
  await expect(
    page.getByRole("button", { name: "Apply", exact: true }),
  ).toBeDisabled();
  await page.getByText("Edit row 2", { exact: true }).click();
  await page.getByLabel("Row 2 target_id", { exact: true }).fill("0601102A");
  await page.getByRole("button", { name: "Preview selected rows" }).click();
  await expect(
    page.getByRole("button", { name: "Apply", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByText("applied", { exact: true })).toBeVisible();
  expect(
    writes.find((write) => write.input.params?.action === "preview")?.input.body
      ?.repairs,
  ).toEqual({ [rowId]: { target_id: "0601102A" } });
  expect(
    writes.filter((write) => write.input.params?.action === "apply"),
  ).toHaveLength(1);
});
test("uncertain output creation keeps the request key and filing opens the canonical file destination", async ({
  page,
}) => {
  let creates = 0;
  const job = {
    id: jobId,
    status: "completed",
    operationKey: "request",
    attemptCount: 1,
    lastError: null,
    updatedAt: timestamp,
    request: {
      portfolioId: ids.portfolio,
      snapshotId: null,
      selectedSections: ["analytics"],
      includeSourceAppendix: true,
      format: "csv",
    },
    attempts: [],
    artifact: {
      id: artifactId,
      contentHash: "b".repeat(64),
      byteSize: 120,
      mediaType: "text/csv",
      fileName: "research.csv",
    },
  };
  const writes = await api(page, (key) => {
    if (key === "research.outputs.create")
      return ++creates === 1 ? new Error("Outcome unknown") : job;
    if (key === "research.outputs.job") return job;
    if (key === "research.outputs.file")
      return {
        id: rowId,
        artifactId,
        clientId: ids.client,
        attachmentId: rowId,
        attachmentName: "research.csv",
        lifecycleStatus: "processing",
        scanStatus: "pending",
        indexedAt: null,
        openPath: "/clients",
        createdAt: timestamp,
      };
  });
  await page.route("**/api/capiro/research.outputs.download?*", (route) =>
    route.fulfill({
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="research.csv"',
      },
      body: "subject,value\nSynthetic,1\n",
    }),
  );
  await page.goto("/research-workflow.html?view=outputs");
  await page.getByRole("button", { name: "Generate CSV" }).click();
  await page.getByRole("button", { name: "Check same output request" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download CSV", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("research-portfolio.csv");
  await page.getByLabel("File with linked client").selectOption(ids.client);
  await page.getByRole("button", { name: "Save to Client Files" }).click();
  await expect(
    page.getByRole("link", { name: "Open Client Files" }),
  ).toHaveAttribute("href", `/portfolio/${ids.client}/files?file=${rowId}`);
  const requests = writes.filter(
    (write) => write.key === "research.outputs.create",
  );
  expect(requests).toHaveLength(2);
  expect(requests[0]?.input.body).toEqual(requests[1]?.input.body);
  expect(
    writes.find((write) => write.key === "research.outputs.file")?.input.body
      ?.clientId,
  ).toBe(ids.client);
});
test("archived native settings preserve restore but disable edits and snapshots", async ({
  page,
}) => {
  const writes = await api(page, undefined, true);
  await page.goto("/research-workflow.html?view=settings");
  await expect(
    page.getByRole("button", { name: "Save settings" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Restore portfolio" }),
  ).toBeEnabled();
  await page.getByRole("tab", { name: "Snapshots", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Create snapshot" }),
  ).toBeDisabled();
  expect(writes).toEqual([]);
});

test("three-step create retains the draft through Back and refresh and retries the exact unknown request", async ({
  page,
}) => {
  await page.route("**/api/backend/core/me", (route) =>
    route.fulfill({
      json: {
        user: { id: "owner", email: null },
        tenant: { id: "tenant", name: "Synthetic" },
        role: "standard_user",
      },
    }),
  );
  let creates = 0;
  const writes = await api(page, (key) =>
    key === "research.create"
      ? ++creates === 1
        ? new Error("Outcome unknown")
        : {
            portfolioId: ids.portfolio,
            eventId: jobId,
            actorUserId: "owner",
            occurredAt: timestamp,
            resultingRevision: 1,
            replayed: true,
            outcomes: [],
          }
      : undefined,
  );
  await page.goto("/research-workflow.html?mode=create");
  await page.getByRole("button", { name: "+ New portfolio" }).click();
  await page
    .getByLabel("Name", { exact: true })
    .fill("Retained synthetic portfolio");
  await page.getByLabel("Purpose", { exact: true }).fill("A retained purpose");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("Mode", { exact: true }).selectOption("hybrid");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
    "Retained synthetic portfolio",
  );
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByLabel("Mode", { exact: true })).toHaveValue("hybrid");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("dialog")).toContainText("Step 3 of 3");
  await expect(page.getByRole("dialog")).toContainText(
    "Retained synthetic portfolio",
  );
  await page
    .getByRole("button", { name: "Create portfolio", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Retry portfolio request" }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Retry portfolio request" }).click();
  await expect(page).toHaveURL(new RegExp(`created=${ids.portfolio}`));
  const attempts = writes.filter((write) => write.key === "research.create");
  expect(attempts).toHaveLength(2);
  expect(attempts[0]?.input.body).toEqual(attempts[1]?.input.body);
});

test("a saved draft opens its real artifact and an unknown version save recovers recorded children without repeating the write", async ({
  page,
}) => {
  let saved = false;
  const writes = await api(page, (key, input) => {
    if (key === "research.drafts.version") {
      saved = true;
      return new Error("Save result unknown");
    }
    if (key === "research.drafts.read") {
      const child = input.params?.artifactId === rowId;
      return {
        artifactId: child ? rowId : artifactId,
        portfolioId: ids.portfolio,
        conversationId: jobId,
        parentArtifactId: child ? artifactId : null,
        title: "Synthetic saved brief",
        kind: "research_portfolio_brief",
        contentType: "text/markdown",
        bodyText: child ? "Edited saved text" : "Original saved text",
        reviewStatus: "unreviewed_draft",
        createdAt: timestamp,
        childVersions:
          saved && !child
            ? [
                {
                  artifactId: rowId,
                  title: "Synthetic saved brief",
                  createdAt: timestamp,
                  reviewStatus: "unreviewed_draft",
                },
              ]
            : [],
        childVersionsHasMore: false,
      };
    }
  });
  await page.goto(
    `/research-workflow.html?view=drafts&artifactId=${artifactId}`,
  );
  await expect(page.getByLabel("Draft text", { exact: true })).toHaveValue(
    "Original saved text",
  );
  await page
    .getByLabel("Draft text", { exact: true })
    .fill("Edited saved text");
  await page
    .getByRole("button", { name: "Save new version", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save new version", exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("Draft text", { exact: true })).toHaveValue(
    "Edited saved text",
  );
  await page.getByRole("button", { name: "Refresh recorded versions" }).click();
  await page.getByRole("button", { name: /Open version saved/ }).click();
  await expect(page).toHaveURL(new RegExp(`artifactId=${rowId}`));
  await expect(page.getByLabel("Draft text", { exact: true })).toHaveValue(
    "Edited saved text",
  );
  await expect(
    page.getByRole("button", { name: "Open previous version" }),
  ).toBeVisible();
  expect(
    writes.filter((write) => write.key === "research.drafts.version"),
  ).toHaveLength(1);
});
