import { expect, test, type Page } from "@playwright/test";
import { settingsFixture } from "./a2-settings-fixtures";

const failures = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = [];
  failures.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
});
test.afterEach(({ page }) => expect(failures.get(page)).toEqual([]));

const key = "synthetic-test-key-9876";
const credential = {
  provider: "openai",
  last4: "9876",
  modelOverride: "gpt-6-astra" as string | null,
  status: "active",
  lastValidatedAt: "2026-10-23T00:00:00.000Z",
  updatedAt: "2026-10-23T00:00:00.000Z",
};
async function fixture(page: Page) {
  const f = await settingsFixture(page);
  f.data.identity.role = "capiro_admin";
  const state = { credentials: [structuredClone(credential)] };
  f.handlers.set("settings.hq.ai.usage", async (route) => {
    await route.fulfill({
      json: [
        {
          tenantId: "00000084-1111-4111-8111-111111111111",
          tenantName: "Synthetic customer",
          totalCostUsd: 1,
          totalTokens: 100,
          eventCount: 1,
          tenantKeyEventCount: 1,
        },
      ],
    });
  });
  f.handlers.set("settings.hq.ai.credentials", async (route) => {
    await route.fulfill({ json: state.credentials });
  });
  f.handlers.set("settings.hq.ai.tenantUsage", async (route) => {
    await route.fulfill({
      json: {
        from: "2026-10-01",
        to: "2026-10-23",
        eventCount: 1,
        totalCostUsd: 1,
        totalInputTokens: 75,
        totalOutputTokens: 25,
        tenantKeyEventCount: 1,
        byWorkflow: [],
        byModel: [],
        byDay: [],
      },
    });
  });
  const open = async () => {
    await f.open("hq-ai-keys");
    await page.getByRole("button", { name: "Manage", exact: true }).click();
    await expect(
      page.getByRole("dialog", {
        name: "Synthetic customer, AI usage & key",
        exact: true,
      }),
    ).toBeVisible();
  };
  const draft = async (model = " gpt-4.1 ") => {
    await page.getByLabel("API key", { exact: true }).fill(key);
    await page.getByLabel("Model override", { exact: true }).fill(model);
  };
  return { ...f, state, open, draft };
}

for (const [model, applied] of [
  [" gpt-4.1 ", "gpt-6-astra"],
  ["   ", null],
  ["  custom-deployment  ", "custom-deployment"],
] as const) {
  test(`HQ accepts canonical ${model.trim() || "default"} save and refreshes masked current credentials`, async ({
    page,
  }) => {
    const f = await fixture(page);
    f.handlers.set("settings.hq.ai.setCredential", async (route) => {
      expect(route.request().postDataJSON()).toEqual({
        params: { tenantId: "00000084-1111-4111-8111-111111111111" },
        body: { provider: "openai", apiKey: key, modelOverride: model },
      });
      f.state.credentials = [{ ...credential, modelOverride: applied }];
      await route.fulfill({ json: f.state.credentials[0] });
    });
    await f.open();
    await f.draft(model);
    await page.getByRole("button", { name: "Validate & save" }).click();
    await expect(
      page.getByText("Provider key was validated and saved.", { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("API key", { exact: true })).toHaveValue("");
    await expect(
      page.getByText(applied ?? "Default model", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Validate & save" }),
    ).toBeEnabled();
    expect(f.writes()).toHaveLength(1);
    expect(f.unexpected).toEqual([]);
  });
}

test("HQ freezes key/provider/model and close while one captured rotation is in flight", async ({
  page,
}) => {
  const f = await fixture(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  f.handlers.set("settings.hq.ai.setCredential", async (route) => {
    await held;
    await route.fulfill({ json: credential });
  });
  await f.open();
  await f.draft();
  await page.getByLabel("API key", { exact: true }).press("Enter");
  await expect.poll(() => f.writes().length).toBe(1);
  await expect(
    page.getByRole("button", { name: "Validating…" }),
  ).toBeDisabled();
  await expect(page.getByLabel("API key", { exact: true })).toBeDisabled();
  await expect(
    page.getByLabel("Model override", { exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("combobox")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Close", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.mouse.click(10, 10);
  await page
    .getByRole("button", { name: "Validating…" })
    .dispatchEvent("click");
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(f.writes()).toHaveLength(1);
  release();
  await expect(
    page.getByText("Provider key was validated and saved.", { exact: true }),
  ).toBeVisible();
  expect(f.unexpected).toEqual([]);
});

for (const changed of [
  { last4: "0000" },
  { provider: "anthropic" },
  { modelOverride: "wrong-deployment" },
  { status: "disabled" },
]) {
  test(`HQ refuses mismatched delivered credential ${Object.keys(changed)[0]}`, async ({
    page,
  }) => {
    const f = await fixture(page);
    f.handlers.set("settings.hq.ai.setCredential", async (route) => {
      await route.fulfill({ json: { ...credential, ...changed } });
    });
    await f.open();
    await f.draft();
    await page.getByRole("button", { name: "Validate & save" }).click();
    await expect(
      page.getByText("Check the last change", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Validate & save" }),
    ).toBeDisabled();
    await expect(
      page.getByText("Provider key was validated and saved.", { exact: true }),
    ).toHaveCount(0);
    expect(f.writes()).toHaveLength(1);
    expect(f.unexpected).toEqual([]);
  });
}

test("HQ lost rotation stays uncertain across reload despite equal current state, without persisted key or replay", async ({
  page,
}) => {
  const f = await fixture(page);
  f.handlers.set("settings.hq.ai.setCredential", async (route) => {
    await route.abort("failed");
  });
  await f.open();
  await f.draft();
  await page.getByRole("button", { name: "Validate & save" }).click();
  await expect(
    page.getByText("Check the last change", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Manage", exact: true }).click();
  await page.getByRole("button", { name: "Check current result" }).click();
  await expect(
    page.getByRole("button", { name: "Validate & save" }),
  ).toBeDisabled();
  await expect(page.getByLabel("API key", { exact: true })).toHaveValue("");
  const persisted = await page.evaluate(() =>
    JSON.stringify({
      local: { ...localStorage },
      session: { ...sessionStorage },
    }),
  );
  expect(persisted).not.toContain(key);
  expect(f.writes()).toHaveLength(1);
  expect(f.unexpected).toEqual([]);
});

test("HQ removal needs delivered receipt and authoritative absence; delayed readback never resends delete", async ({
  page,
}) => {
  const f = await fixture(page);
  f.handlers.set("settings.hq.ai.removeCredential", async (route) => {
    await route.fulfill({ json: { removed: true } });
  });
  await f.open();
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await page.getByRole("button", { name: "Remove key", exact: true }).click();
  await expect(
    page.getByText("Check the last change", { exact: true }).last(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Remove key", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await page.getByRole("button", { name: "Manage", exact: true }).click();
  f.state.credentials = [];
  await page.getByRole("button", { name: "Check current result" }).click();
  await expect(
    page.getByRole("button", { name: "Validate & save" }),
  ).toBeEnabled();
  expect(f.writes()).toHaveLength(1);
  expect(f.writes().map((write) => write.operation)).toEqual([
    "settings.hq.ai.removeCredential",
  ]);
  expect(f.unexpected).toEqual([]);
});

test("HQ account replacement drops secrets and retires a late old credential callback", async ({
  page,
}) => {
  const f = await fixture(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  f.handlers.set("settings.hq.ai.setCredential", async (route) => {
    await held;
    await route.fulfill({ json: credential });
  });
  await f.open();
  await f.draft();
  await page.getByRole("button", { name: "Validate & save" }).click();
  await expect.poll(() => f.writes().length).toBe(1);
  f.data.identity.user.id = "00000083-1111-4111-8111-111111111111";
  f.data.identity.user.clerkUserId = "next-hq-actor";
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test:session", {
        detail: {
          userId: "next-hq-actor",
          sessionId: "next-hq-session",
          orgId: "next-hq-org",
        },
      }),
    ),
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Manage", exact: true }).click();
  await expect(page.getByLabel("API key", { exact: true })).toHaveValue("");
  await page
    .getByLabel("API key", { exact: true })
    .fill("synthetic-new-actor-draft");
  release();
  await expect(page.getByLabel("API key", { exact: true })).toHaveValue(
    "synthetic-new-actor-draft",
  );
  await expect(
    page.getByText("Provider key was validated and saved.", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Validate & save" }),
  ).toBeEnabled();
  expect(f.writes()).toHaveLength(1);
  expect(f.unexpected).toEqual([]);
});
