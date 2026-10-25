import { expect, test, type Page } from "@playwright/test";

const tenantId = "10000000-0000-4000-8000-000000000010";
const actorId = "10000000-0000-4000-8000-000000000011";
const conversationId = "10000000-0000-4000-8000-000000000013";
const runId = "10000000-0000-4000-8000-000000000014";
const instruction = "Synthetic unsent routine choices";

async function setup(page: Page) {
  const calls = {
    sessions: 0,
    routines: [] as string[],
    sessionStatus: 200,
    holdRenewal: false,
    releaseRenewal: () => {},
    actor: actorId,
    tenant: tenantId,
  };
  await page.clock.install();
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith("/api/")) return route.continue();
    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (path === "/api/backend/core/me")
      return json({
        user: { id: calls.actor, email: null },
        tenant: { id: calls.tenant, name: "Synthetic" },
      });
    if (path.startsWith("/api/backend/core/clients/"))
      return json({
        id: path.split("/").at(-1),
        name: "Synthetic client",
        profileStatus: "complete",
        status: "active",
      });
    const body = route.request().postDataJSON();
    if (path.includes("meri.conversation.bootstrap"))
      return json({
        ...body.body,
        conversationId,
        tenantId: calls.tenant,
        actorId: calls.actor,
      });
    if (path === "/api/action-followthrough/session") {
      calls.sessions++;
      if (calls.sessionStatus !== 200) return json({}, calls.sessionStatus);
      if (calls.sessions > 1 && calls.holdRenewal)
        await new Promise<void>((resolve) => {
          calls.releaseRenewal = resolve;
        });
      return json({
        credential: "action_session_" + "s".repeat(43),
        expiresAtMs: (await page.evaluate(() => Date.now())) + 60_000,
        context: {
          tenantId: calls.tenant,
          actorId: calls.actor,
          selectedClientId: body.clientId,
          conversationId,
          runId,
        },
      });
    }
    calls.routines.push(path);
    return json({}, 403);
  });
  await page.goto("/routine-draft.html");
  await page
    .getByRole("button", { name: "Connect routines", exact: true })
    .click();
  await page.getByRole("button", { name: "New routine", exact: true }).click();
  await page.getByLabel("Instructions", { exact: true }).fill(instruction);
  await page.getByLabel("Output destination").fill("Synthetic inbox");
  return calls;
}

test("ordinary receipt expiry reauthorizes without losing the same-owner unsent routine draft or submitting it", async ({
  page,
}) => {
  const calls = await setup(page);
  calls.holdRenewal = true;
  await page.clock.fastForward(60_001);
  await expect.poll(() => calls.sessions).toBe(2);
  await expect(page.getByLabel("Instructions", { exact: true })).toBeHidden();
  expect(calls.routines).toEqual([]);
  calls.releaseRenewal();
  await expect(page.getByLabel("Instructions", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Instructions", { exact: true })).toHaveValue(
    instruction,
  );
  await expect(page.getByLabel("Output destination")).toHaveValue(
    "Synthetic inbox",
  );
  await expect(
    page.getByRole("button", { name: "Prepare routine for review" }),
  ).toBeEnabled();
  expect(calls.routines).toEqual([]);
});

test("failed reauthorization retains the draft for explicit retry and never retries a routine command", async ({
  page,
}) => {
  const calls = await setup(page);
  calls.sessionStatus = 400;
  await page.clock.fastForward(60_001);
  await expect.poll(() => calls.sessions).toBe(2);
  await expect(
    page.getByRole("button", { name: "Connect routines", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Instructions", { exact: true })).toBeHidden();
  calls.sessionStatus = 200;
  await page
    .getByRole("button", { name: "Connect routines", exact: true })
    .click();
  await expect(page.getByLabel("Instructions", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Instructions", { exact: true })).toHaveValue(
    instruction,
  );
  expect(calls.sessions).toBe(3);
  expect(calls.routines).toEqual([]);
});

test("a definitive routine refusal clears the unsent draft and cannot renew itself", async ({
  page,
}) => {
  const calls = await setup(page);
  await page
    .getByRole("button", { name: "Refresh routines", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Connect routines", exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(60_001);
  expect(calls.sessions).toBe(1);
  await page
    .getByRole("button", { name: "Connect routines", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "New routine", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Instructions", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "New routine", exact: true }).click();
  await expect(page.getByLabel("Instructions", { exact: true })).toHaveValue(
    "",
  );
  expect(calls.routines).toEqual(["/api/action-followthrough/routine-list"]);
});

test("fresh session refusal clears the old draft before any explicit reconnect", async ({
  page,
}) => {
  const calls = await setup(page);
  calls.sessionStatus = 403;
  await page.clock.fastForward(60_001);
  await expect.poll(() => calls.sessions).toBe(2);
  await expect(page.getByLabel("Instructions", { exact: true })).toHaveCount(0);
  calls.sessionStatus = 200;
  await page
    .getByRole("button", { name: "Connect routines", exact: true })
    .click();
  await page.getByRole("button", { name: "New routine", exact: true }).click();
  await expect(page.getByLabel("Instructions", { exact: true })).toHaveValue(
    "",
  );
  expect(calls.routines).toEqual([]);
});

test("a client change retires the draft and requires an explicit connection in the new scope", async ({
  page,
}) => {
  const calls = await setup(page);
  await page.getByRole("button", { name: "Switch synthetic client" }).click();
  await expect(page.getByLabel("Instructions", { exact: true })).toHaveCount(0);
  expect(calls.sessions).toBe(1);
  await page
    .getByRole("button", { name: "Connect routines", exact: true })
    .click();
  await page.getByRole("button", { name: "New routine", exact: true }).click();
  await expect(page.getByLabel("Instructions", { exact: true })).toHaveValue(
    "",
  );
  expect(calls.routines).toEqual([]);
});

for (const field of ["actor", "tenant"] as const) {
  test(`a changed ${field} cannot inherit the former owner's draft`, async ({
    page,
  }) => {
    const calls = await setup(page);
    calls[field] = "10000000-0000-4000-8000-000000000016";
    await page
      .getByRole("button", { name: "Refresh synthetic identity" })
      .click();
    await expect(page.getByLabel("Instructions", { exact: true })).toHaveCount(
      0,
    );
    expect(calls.sessions).toBe(1);
    await page
      .getByRole("button", { name: "Connect routines", exact: true })
      .click();
    await page
      .getByRole("button", { name: "New routine", exact: true })
      .click();
    await expect(page.getByLabel("Instructions", { exact: true })).toHaveValue(
      "",
    );
    expect(calls.routines).toEqual([]);
  });
}
