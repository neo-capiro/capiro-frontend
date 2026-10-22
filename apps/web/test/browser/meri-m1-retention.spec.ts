import { expect, test } from "@playwright/test";
import {
  binding,
  clientId,
  composer,
  sendButton,
} from "./meri-conversation-fixtures";
import { installM1Flow } from "./meri-m1-flow-fixtures";
import {
  answerFor,
  installRetentionConversations,
  navigateInDocument,
  neighbour,
  nextActor,
  recoveryEntries,
  setTestSession,
} from "./meri-m1-retention-fixtures";

const url = (id = binding.conversationId) =>
  `/meri?clientId=${clientId}&conversationId=${id}`;

test("M1 retention: signout purges an unknown immutable request and newer draft without cancelling backend work", async ({
  page,
}) => {
  const flow = await installM1Flow(page);
  await page.route("**/api/conversations/submit", (route) => {
    flow.initial.submitResponse(route);
    return route.abort("failed");
  });
  await page.goto(url());
  await composer(page).fill("Private original dispatched input");
  await expect(sendButton(page)).toBeEnabled();
  await sendButton(page).click();
  await expect(
    page.getByRole("button", { name: "Retry same request", exact: true }),
  ).toBeVisible();
  await composer(page).fill("Private newer unsent draft");
  const before = await recoveryEntries(page);
  expect(JSON.stringify(before)).toContain("Private original dispatched input");
  expect(JSON.stringify(before)).toContain("Private newer unsent draft");
  expect(flow.initial.calls.submit).toHaveLength(1);
  await page.evaluate(() =>
    sessionStorage.setItem("unrelated-retention-test", "keep"),
  );
  await setTestSession(page, { userId: null, sessionId: null, orgId: null });
  await expect(
    page.getByText("Sign in to continue.", { exact: true }),
  ).toBeVisible();
  await expect.poll(() => recoveryEntries(page)).toEqual([]);
  await expect(composer(page)).toHaveCount(0);
  await expect(
    page.getByText("You: Private original dispatched input", { exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("unrelated-retention-test"),
    ),
  ).toBe("keep");
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("capiro-meri-tab-identity-v1"),
    ),
  ).toBeNull();
  expect(flow.initial.calls.submit).toHaveLength(1);
  expect(flow.calls.cancel).toBe(0);
  expect(flow.calls.reservations).toEqual([]);
  expect(flow.fixture.unexpected).toEqual([]);
});

test("M1 retention: exact conversation revocation purges its draft while a neighbouring conversation still recovers", async ({
  page,
}) => {
  const native = await installRetentionConversations(page);
  await page.goto(url(neighbour.conversationId));
  await expect(
    page.getByText(answerFor(neighbour), { exact: true }),
  ).toBeVisible();
  await composer(page).fill("Permitted neighbour draft");
  const neighbourBefore = (await recoveryEntries(page)).filter(([key]) =>
    key.includes(neighbour.conversationId),
  );
  expect(JSON.stringify(neighbourBefore)).toContain(
    "Permitted neighbour draft",
  );
  await page.goto(url());
  await expect(
    page.getByText(answerFor(binding), { exact: true }),
  ).toBeVisible();
  await composer(page).fill("Revoked conversation private draft");
  expect(JSON.stringify(await recoveryEntries(page))).toContain(
    "Revoked conversation private draft",
  );
  native.deny(binding.conversationId);
  await expect(
    page.getByRole("heading", {
      name: "Conversation access unavailable",
      exact: true,
    }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(composer(page)).toHaveValue("");
  await expect(page.getByText(answerFor(binding), { exact: true })).toHaveCount(
    0,
  );
  await expect
    .poll(async () =>
      (await recoveryEntries(page)).filter(([key]) =>
        key.includes(binding.conversationId),
      ),
    )
    .toEqual([]);
  expect(
    (await recoveryEntries(page)).filter(([key]) =>
      key.includes(neighbour.conversationId),
    ),
  ).toEqual(neighbourBefore);
  await page.goto(url(neighbour.conversationId));
  await expect(
    page.getByText(answerFor(neighbour), { exact: true }),
  ).toBeVisible();
  await expect(composer(page)).toHaveValue("Permitted neighbour draft");
  expect(native.mutations).toEqual([]);
  expect(native.fixture.unexpected).toEqual([]);
});

test("M1 retention: public-route reload then a different sign-in clears old recovery before protected content mounts", async ({
  page,
}) => {
  const native = await installRetentionConversations(page);
  await page.goto(url());
  await expect(
    page.getByText(answerFor(binding), { exact: true }),
  ).toBeVisible();
  await composer(page).fill("First account private draft");
  const retained = await recoveryEntries(page);
  expect(JSON.stringify(retained)).toContain("First account private draft");
  await page.goto("/forms/invalid");
  await expect(
    page.getByRole("region", { name: "Public request form" }),
  ).toBeVisible();
  expect(await recoveryEntries(page)).toEqual(retained);
  await page.evaluate(
    (oldKeys) => {
      const original = Storage.prototype.getItem;
      const reads: string[] = [];
      Object.assign(window, { m1OldRecoveryReads: reads });
      Storage.prototype.getItem = function (key) {
        const value = original.call(this, key);
        if (this === sessionStorage && oldKeys.includes(key) && value !== null)
          reads.push(key);
        return value;
      };
    },
    retained.map(([key]) => key),
  );
  native.changeActor();
  await setTestSession(page, {
    userId: "other-test-user",
    sessionId: "other-test-session",
    orgId: "test-org",
  });
  await navigateInDocument(page, url(nextActor.conversationId));
  await expect(
    page.getByText(answerFor(nextActor), { exact: true }),
  ).toBeVisible();
  await expect(composer(page)).toHaveValue("");
  await expect(page.getByText(answerFor(binding), { exact: true })).toHaveCount(
    0,
  );
  const after = await recoveryEntries(page);
  expect(after.some(([key]) => retained.some(([old]) => old === key))).toBe(
    false,
  );
  expect(JSON.stringify(after)).not.toContain("First account private draft");
  expect(
    await page.evaluate(
      () =>
        (window as Window & { m1OldRecoveryReads?: string[] })
          .m1OldRecoveryReads,
    ),
  ).toEqual([]);
  expect(native.mutations).toEqual([]);
  expect(native.fixture.unexpected).toEqual([]);
});
