import { expect, test, type Response } from "@playwright/test";
import { composer, sendButton, stopButton } from "./meri-conversation-fixtures";
import { readM1LiveRelease } from "./meri-m1-release";

const release = readM1LiveRelease(process.env);
test.skip(
  !release,
  "LIVE NOT RUN: requires Fable's explicit preview approval, completed manifest and test-account state",
);
test.use({ storageState: process.env.MERI_M1_STORAGE_STATE });

test("M1 approved preview whole flow: two turns, reload, Stop and client isolation", async ({
  page,
}, info) => {
  if (!release) return;
  test.setTimeout(6 * 60_000);
  const marker = `M1_${Date.now()}`;
  const receipts: Array<{
    path: string;
    status: number;
    requestId?: string;
    runId?: string;
    conversationId?: string;
    state?: string;
  }> = [];
  const pending: Promise<void>[] = [];
  const submittedIds: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/conversations/submit") {
      const input = request.postDataJSON();
      submittedIds.push(input.requestId);
    }
  });
  const record = async (response: Response) => {
    const path = new URL(response.url()).pathname;
    if (
      ![
        "/api/conversations/submit",
        "/api/conversations/cancel",
        "/api/conversations/input/admit",
        "/api/conversations/next-turn",
      ].includes(path)
    )
      return;
    const body = await response.json().catch(() => ({}));
    receipts.push({
      path,
      status: response.status(),
      ...(body.requestId ? { requestId: body.requestId } : {}),
      ...(body.run?.binding
        ? {
            runId: body.run.binding.runId,
            conversationId: body.run.binding.conversationId,
          }
        : {}),
      ...(body.targetBinding
        ? {
            runId: body.targetBinding.runId,
            conversationId: body.targetBinding.conversationId,
          }
        : {}),
      ...(body.state ? { state: body.state } : {}),
    });
  };
  page.on("response", (response) => pending.push(record(response)));
  const meResponse = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/api/backend/core/me",
  );
  await page.goto(
    `${release.deployment.origin}/meri?clientId=${release.identity.clientId}`,
  );
  const me = await (await meResponse).json();
  expect(me.tenant.id).toBe(release.identity.tenantId);
  expect(me.user.id).toBe(release.identity.actorId);
  expect(me.user.clerkUserId).toBe(release.identity.nativeSubject);
  await composer(page).fill(
    `For this isolated chat acceptance test remember ${marker}. Reply with exactly that marker and no other text.`,
  );
  await expect(sendButton(page)).toBeEnabled();
  await sendButton(page).click();
  await expect(page.getByText(marker, { exact: true })).toBeVisible({
    timeout: 180_000,
  });
  await expect(
    page
      .getByRole("article", { name: "Current turn", exact: true })
      .getByText("Completed", { exact: true }),
  ).toBeVisible({ timeout: 60_000 });
  const submittedBeforeReload = [...submittedIds];
  expect(new Set(submittedBeforeReload).size).toBe(1);
  await page.reload();
  await expect(page.getByText(marker, { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  expect(submittedIds).toEqual(submittedBeforeReload);
  await composer(page).fill(
    "For the second acceptance-test turn, write a detailed numbered explanation of ten ways to organize a fictional research notebook. Do not call tools or change records.",
  );
  await expect(sendButton(page)).toBeEnabled();
  await sendButton(page).click();
  await expect(stopButton(page)).toBeEnabled({ timeout: 30_000 });
  const stopResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/conversations/cancel",
  );
  await stopButton(page).click();
  expect((await stopResponse).ok()).toBe(true);
  await expect(
    page
      .getByRole("article", { name: "Current turn", exact: true })
      .getByText(/^(Cancelled|Stopped|Completed)$/),
  ).toBeVisible({ timeout: 90_000 });
  expect(new Set(submittedIds).size).toBe(2);
  await page
    .locator('details:has(nav[aria-label="Choose Meri client"]) summary')
    .click();
  await page
    .getByRole("navigation", { name: "Choose Meri client" })
    .locator(`a[href="/meri?clientId=${release.identity.otherClientId}"]`)
    .click();
  await expect(page).toHaveURL(
    new RegExp(`clientId=${release.identity.otherClientId}`),
  );
  await expect(page.getByText(marker, { exact: true })).toHaveCount(0);
  await Promise.all(pending);
  expect(
    receipts.filter(
      (receipt) =>
        receipt.path === "/api/conversations/submit" && receipt.status < 400,
    ).length,
  ).toBeGreaterThanOrEqual(2);
  await info.attach("M1-preview-receipts", {
    contentType: "application/json",
    body: Buffer.from(
      JSON.stringify(
        {
          evidenceTier: "preview",
          sources: release.sources,
          sourceAndConfigurationReceiptId:
            release.deployment.sourceAndConfigurationReceiptId,
          operatorApprovalReceiptId:
            release.deployment.operatorApprovalReceiptId,
          receipts,
          submittedIds,
          deploymentReopen: "NOT_RUN_SEPARATE_OPERATOR_DRILL",
          idle20Minutes: "NOT_RUN_SEPARATE_OPERATOR_DRILL",
        },
        null,
        2,
      ),
    ),
  });
});
