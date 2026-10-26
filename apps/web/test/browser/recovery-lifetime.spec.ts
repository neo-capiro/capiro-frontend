import { expect, test, type Page } from "@playwright/test";
import type { RecoveryFixture } from "./recovery-lifetime";

declare global {
  interface Window {
    recoveryFixture: RecoveryFixture;
  }
}

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const account = {
  tenantId: "synthetic-recovery-tenant",
  actorId: "synthetic-recovery-actor",
};
const source = {
  ...account,
  conversationId: id(1),
  runId: id(2),
  selectedClientId: id(5),
};
const target = { ...source, runId: id(3) };
const inspect = (page: Page) =>
  page.evaluate(() => window.recoveryFixture.inspect());

async function serve(page: Page) {
  const requests: Array<Record<string, unknown>> = [],
    effects: string[] = [];
  const settings = {
    actorId: account.actorId,
    rebind: false,
    mismatch: false,
    malformed: false,
  };
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path !== "/api/action-followthrough/session") {
      effects.push(path);
      return route.abort("blockedbyclient");
    }
    const hints = route.request().postDataJSON();
    requests.push(hints);
    const context = {
      ...source,
      actorId: settings.actorId,
      selectedClientId: hints.clientId,
      runId: hints.runId ?? id(2),
    };
    const rebind = settings.rebind && hints.runId === source.runId;
    const receipt = {
      credential: `action_session_${"A".repeat(43)}`,
      expiresAtMs: Date.now() + 240_000,
      context:
        rebind || settings.mismatch
          ? {
              ...context,
              runId: target.runId,
              ...(settings.malformed ? { actorId: "foreign" } : {}),
            }
          : context,
      ...(rebind
        ? {
            initialRunRebind: {
              sourceRunId: source.runId,
              targetRunId: target.runId,
            },
          }
        : {}),
    };
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(receipt),
    });
  });
  return { requests, effects, settings };
}

test("actual mounted receiver admits exact A-to-B recovery, then both retry branches and rerenders remain on B", async ({
  page,
}) => {
  const f = await serve(page);
  await page.goto("/recovery-lifetime.html");
  await expect(page.getByTestId("connection")).toHaveText("ready");
  await expect(page.getByTestId("run")).toHaveText(source.runId);
  f.settings.rebind = true;
  await page.getByRole("button", { name: "Retry exact", exact: true }).click();
  await expect(page.getByTestId("run")).toHaveText(target.runId);
  expect(f.requests[1]).toEqual({
    clientId: id(5),
    conversationId: id(1),
    runId: source.runId,
  });
  await page
    .getByRole("button", { name: "Revoke access", exact: true })
    .click();
  await expect(page.getByTestId("connection")).toHaveText("expired");
  await expect
    .poll(async () =>
      (await inspect(page)).retainedCurrent.every((x: boolean) => !x),
    )
    .toBe(true);
  expect(
    (await inspect(page)).portStates.every(
      (state: string) => state === "disposed",
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Retry exact", exact: true }).click();
  await expect(page.getByTestId("connection")).toHaveText("ready");
  for (let n = 0; n < 2; n++) {
    await page.getByRole("button", { name: "Rerender", exact: true }).click();
    await page
      .getByRole("button", { name: "Retry exact", exact: true })
      .click();
    await expect.poll(() => f.requests.length).toBe(n + 4);
    await expect(page.getByTestId("connection")).toHaveText("ready");
  }
  expect(f.requests.slice(2)).toEqual(
    Array(3).fill({
      clientId: id(5),
      conversationId: id(1),
      runId: target.runId,
    }),
  );
  expect(await inspect(page)).toMatchObject({
    historySeedWasNotFound: true,
    retainedHistoryErrors: 0,
    retainedHistoryData: 0,
    exposesHistoryAuthority: false,
    accessLost: false,
  });
  expect(f.effects).toEqual([]);
});

test("real unknown request corruption blocks the mounted journal through retry and retirement without replay", async ({
  page,
}) => {
  const f = await serve(page);
  await page.goto("/recovery-lifetime.html?unknown=1");
  await expect(page.getByTestId("journal")).toHaveText("unknown");
  expect(
    await page.evaluate(() => window.recoveryFixture.corruptRequest()),
  ).toBe(id(20));
  await page.getByRole("button", { name: "Retry exact", exact: true }).click();
  await expect(page.getByTestId("journal")).toHaveText("blocked");
  expect(await inspect(page)).toMatchObject({
    corruptions: 1,
    journal: { blocked: true, current: false, storageError: true },
  });
  await page
    .getByRole("button", { name: "Revoke access", exact: true })
    .click();
  await expect(page.getByTestId("connection")).toHaveText("expired");
  await expect
    .poll(async () =>
      (await inspect(page)).retainedCurrent.every((x: boolean) => !x),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Retry exact", exact: true }).click();
  await expect(page.getByTestId("connection")).toHaveText("ready");
  await expect(page.getByTestId("journal")).toHaveText("blocked");
  expect(await inspect(page)).toMatchObject({
    journal: { blocked: true, current: false, storageError: true },
  });
  expect(f.requests).toEqual(
    Array(3).fill({
      clientId: id(5),
      conversationId: id(1),
      runId: source.runId,
    }),
  );
  expect(f.effects).toEqual([]);
});

for (const malformed of [false, true])
  test(`actual receiver refuses ${malformed ? "foreign transition" : "ordinary target mismatch"} without a ready port`, async ({
    page,
  }) => {
    const f = await serve(page);
    Object.assign(f.settings, {
      rebind: malformed,
      malformed,
      mismatch: !malformed,
    });
    await page.goto("/recovery-lifetime.html");
    await expect(page.getByTestId("connection")).toHaveText("unavailable");
    expect(await inspect(page)).toMatchObject({ portCount: 0 });
    expect(f.requests).toHaveLength(1);
    expect(f.effects).toEqual([]);
  });

test("scope and identity replacement unmount the old lifetime and cannot reuse its request owner", async ({
  page,
}) => {
  const f = await serve(page);
  await page.goto("/recovery-lifetime.html?unknown=1");
  await expect(page.getByTestId("journal")).toHaveText("unknown");
  await page
    .getByRole("button", { name: "Change client", exact: true })
    .click();
  await expect.poll(() => f.requests.length).toBe(2);
  await expect(page.getByTestId("journal")).toHaveText("no-retained-request");
  expect(f.requests[1]).toEqual({ clientId: id(6), conversationId: id(1) });
  f.settings.actorId = "synthetic-other-actor";
  await page
    .getByRole("button", { name: "Change identity", exact: true })
    .click();
  await expect.poll(() => f.requests.length).toBe(3);
  await expect(page.getByTestId("connection")).toHaveText("ready");
  await expect
    .poll(async () => (await inspect(page)).retainedCurrent[0])
    .toBe(false);
  await page.getByRole("button", { name: "Unmount", exact: true }).click();
  await expect(page.getByTestId("connection")).toHaveCount(0);
  expect((await inspect(page)).unmounts).toBeGreaterThanOrEqual(3);
  expect(
    (await inspect(page)).portStates.every(
      (state: string) => state === "disposed",
    ),
  ).toBe(true);
  expect(f.effects).toEqual([]);
});

test("unmount aborts a pending actual issuance and a late valid receipt cannot bind a port", async ({
  page,
}) => {
  const f = await serve(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let delivered!: () => void;
  const finished = new Promise<void>((resolve) => {
    delivered = resolve;
  });
  let entered = false;
  await page.route("**/api/action-followthrough/session", async (route) => {
    entered = true;
    await held;
    try {
      await route
        .fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            credential: `action_session_${"A".repeat(43)}`,
            expiresAtMs: Date.now() + 240_000,
            context: source,
          }),
        })
        .catch(() => undefined);
    } finally {
      delivered();
    }
  });
  try {
    await page.goto("/recovery-lifetime.html", {
      waitUntil: "domcontentloaded",
    });
    await expect.poll(() => entered).toBe(true);
    await expect(page.getByTestId("connection")).toHaveText("connecting");
    await page.getByRole("button", { name: "Unmount", exact: true }).click();
    await expect(page.getByTestId("connection")).toHaveCount(0);
    release();
    await finished;
    expect(await inspect(page)).toMatchObject({ portCount: 0 });
    expect(f.effects).toEqual([]);
  } finally {
    release();
  }
});
