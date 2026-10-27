import { expect, test } from "@playwright/test";
import { ids, portfolio, timestamp } from "./research-sharing-fixture";

test("lost compensation-preview response retries its exact request without a second receipt", async ({
  page,
}) => {
  const jobId = "20000000-0000-4000-8000-000000000001";
  const requests: unknown[] = [];
  const receipts: {
    id: string;
    operationKey: string;
    previewHash: string;
    status: string;
    effects: object[];
    createdAt: string;
  }[] = [];
  const job = () => ({
    id: jobId,
    portfolioId: ids.portfolio,
    operationKey: "original-import",
    worksheetKind: "membership",
    status: "completed",
    fileName: "synthetic.csv",
    originalHash: "a".repeat(64),
    originalSize: 10,
    targetRevision: 1,
    rowCount: 1,
    appliedCount: 1,
    updatedAt: timestamp,
    rows: [],
    mappings: [],
    attempts: [],
    compensationReceipts: receipts,
  });
  await page.route("**/api/capiro/**", async (route) => {
    const key = new URL(route.request().url()).pathname.split("/").at(-1);
    if (key === "research.imports.action") {
      const request = route.request().postDataJSON();
      requests.push(request);
      const operationKey = request.body.operationKey as string;
      if (!receipts.some((receipt) => receipt.operationKey === operationKey))
        receipts.push({
          id: "20000000-0000-4000-8000-000000000002",
          operationKey,
          previewHash: "exact-effects",
          status: "previewed",
          effects: [{ effectKind: "member_created" }],
          createdAt: timestamp,
        });
      if (requests.length === 1)
        return route.fulfill({
          status: 503,
          json: { message: "Synthetic lost response after commit" },
        });
      return route.fulfill({ json: job() });
    }
    const data: Record<string, unknown> = {
      "research.detail": portfolio,
      "research.tour": {
        tourVersion: "research-portfolios-v1",
        status: "dismissed",
        completedAt: null,
      },
      "research.imports.detail": job(),
    };
    return route.fulfill({ json: data[key ?? ""] ?? [] });
  });
  await page.goto(`/research-workflow.html?view=imports&importJobId=${jobId}`);
  const preview = page.getByRole("button", {
    name: "Preview compensation",
    exact: true,
  });
  await preview.click();
  await expect(page.getByRole("alert")).toContainText(
    "Synthetic lost response",
  );
  await preview.click();
  await expect(
    page.getByRole("button", { name: "Confirm reviewed compensation" }),
  ).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests[1]).toEqual(requests[0]);
  expect(receipts).toHaveLength(1);
});
