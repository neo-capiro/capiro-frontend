import { expect, test, type Page } from "@playwright/test";
import { receiveIntentsResponse } from "@capiro/meri-client/intents";
import {
  prepared,
  conversationId,
} from "../../tests/meri-research-share-fixture";
import { dashboard, ids, shareToken } from "./research-sharing-fixture";

async function arrange(
  page: Page,
  options: {
    mismatch?: boolean;
    revoke?: boolean;
    held?: boolean;
    unknown?: boolean;
  } = {},
) {
  const item = prepared(options.revoke);
  await receiveIntentsResponse(
    "list",
    200,
    JSON.stringify({ conversationId, intents: [item], next: null }),
    { request: { conversationId } },
  );
  const decisions: Record<string, unknown>[] = [];
  let withheld = false;
  let lists = 0;
  let release: (() => void) | undefined;
  await page.route("**/api/conversations/intents/list", (route) => {
    lists += 1;
    const request = route.request().postDataJSON();
    return route.fulfill({
      json: {
        conversationId: request.conversationId,
        intents:
          request.conversationId === conversationId
            ? [
                withheld
                  ? {
                      deliveryId: item.deliveryId,
                      createdAt: item.createdAt,
                      operation: item.operation,
                      state: item.state,
                      kind: item.kind,
                      withheld: true,
                    }
                  : item,
              ]
            : [],
        next: null,
      },
    });
  });
  await page.route("**/api/conversations/intents/decide", async (route) => {
    const request = route.request().postDataJSON();
    decisions.push(request);
    if (options.held)
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    item.proposalStatus = options.unknown
      ? "outcome_unknown"
      : request.decision === "approved"
        ? "succeeded"
        : "dismissed";
    await route
      .fulfill({
        json: {
          status: "research_share_decided",
          deliveryId: item.deliveryId,
          proposalId: item.proposal.proposalId,
          proposalStatus: item.proposalStatus,
          ...(!options.unknown &&
          !options.revoke &&
          request.decision === "approved"
            ? {
                oneTimeResult: {
                  sharePath: `/share/${shareToken}`,
                  shownOnce: true,
                },
              }
            : {}),
        },
      })
      .catch(() => undefined);
  });
  await page.route("**/api/capiro/**", async (route) => {
    const key = new URL(route.request().url()).pathname.split("/").at(-1)!;
    if (key !== "research.sharePreview")
      throw new Error(`Unexpected firm operation ${key}`);
    expect(route.request().postDataJSON()).toEqual({
      params: { id: ids.portfolio },
      body: {
        snapshotId: ids.snapshot,
        designId: ids.design,
        clientId: ids.client,
        branding: true,
      },
    });
    await route.fulfill({
      json: {
        dashboard,
        previewHash: (options.mismatch ? "e" : "d").repeat(64),
        designVersion: 1,
        logoUrl: null,
      },
    });
  });
  await page.goto("/research-sharing.html?mode=meri");
  return {
    decisions,
    listCount: () => lists,
    released: () => Boolean(release),
    release: () => release?.(),
    item,
    withhold: (value: boolean) => {
      withheld = value;
    },
  };
}

test("Meri publication requires its exact reviewed preview and shows the winning address only in memory", async ({
  page,
}) => {
  const fixture = await arrange(page);
  await expect(page.getByRole("button", { name: "Approve…" })).toBeDisabled();
  await expect(
    page.getByRole("region", { name: "Recipient preview" }),
  ).toContainText("9007199254740993.123456");
  await page
    .getByLabel("I reviewed this frozen dashboard and everything it exposes.")
    .check();
  await page.getByRole("button", { name: "Approve…" }).click();
  expect(fixture.decisions).toHaveLength(0);
  await page.getByRole("button", { name: "Confirm approval" }).click();
  await expect(
    page.getByRole("region", { name: "Published client link" }),
  ).toContainText(`/share/${shareToken}`);
  expect(fixture.decisions).toHaveLength(1);
  expect(fixture.decisions[0]).toMatchObject({
    proposalId: fixture.item.proposal.proposalId,
    commandSha256: fixture.item.proposal.commandSha256,
    decision: "approved",
  });
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    shareToken,
  );
  fixture.withhold(true);
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(
    page.getByText("This action is unavailable with your current access."),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Published client link" }),
  ).toHaveCount(0);
  fixture.withhold(false);
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.getByText("succeeded", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Published client link" }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("succeeded", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Published client link" }),
  ).toHaveCount(0);
  expect(fixture.decisions).toHaveLength(1);
});

test("an uncertain Meri share action checks recorded status without repeating approval", async ({
  page,
}) => {
  const fixture = await arrange(page, { unknown: true });
  await page
    .getByLabel("I reviewed this frozen dashboard and everything it exposes.")
    .check();
  await page.getByRole("button", { name: "Approve…" }).click();
  await page.getByRole("button", { name: "Confirm approval" }).click();
  await expect(
    page.getByText("outcome unknown", { exact: true }),
  ).toBeVisible();
  const before = fixture.listCount();
  await page.getByRole("button", { name: "Check result", exact: true }).click();
  await expect.poll(fixture.listCount).toBeGreaterThan(before);
  expect(fixture.decisions).toHaveLength(1);
  await expect(page.getByRole("button", { name: "Approve…" })).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Published client link" }),
  ).toHaveCount(0);
});

test("Meri refuses a changed preview while allowing the user to reject the proposal", async ({
  page,
}) => {
  const fixture = await arrange(page, { mismatch: true });
  await expect(page.getByRole("alert")).toContainText(
    "prepared dashboard has changed",
  );
  await expect(page.getByRole("button", { name: "Approve…" })).toBeDisabled();
  await page.getByRole("button", { name: "Reject…" }).click();
  await page.getByRole("button", { name: "Confirm rejection" }).click();
  await expect(page.getByText("dismissed", { exact: true })).toBeVisible();
  expect(fixture.decisions[0]?.decision).toBe("rejected");
});

test("a late Meri approval response cannot reveal an address in another conversation", async ({
  page,
}) => {
  const fixture = await arrange(page, { held: true });
  await page
    .getByLabel("I reviewed this frozen dashboard and everything it exposes.")
    .check();
  await page.getByRole("button", { name: "Approve…" }).click();
  await page.getByRole("button", { name: "Confirm approval" }).click();
  await expect.poll(fixture.released).toBe(true);
  await page
    .getByRole("button", { name: "Switch synthetic conversation" })
    .click();
  fixture.release();
  // The other conversation has nothing prepared, so no approvals panel is shown at all.
  await expect(
    page.getByRole("heading", { name: "Actions for your approval" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Published client link" }),
  ).toHaveCount(0);
});

test("Meri revocation uses the same explicit decision and returns no address", async ({
  page,
}) => {
  const fixture = await arrange(page, { revoke: true });
  await page.getByRole("button", { name: "Approve…" }).click();
  expect(fixture.decisions).toHaveLength(0);
  await page.getByRole("button", { name: "Confirm approval" }).click();
  await expect(page.getByText("succeeded", { exact: true })).toBeVisible();
  expect(fixture.decisions).toHaveLength(1);
  await expect(
    page.getByRole("region", { name: "Published client link" }),
  ).toHaveCount(0);
});
