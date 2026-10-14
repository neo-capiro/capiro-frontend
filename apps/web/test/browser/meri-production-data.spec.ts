import { test, expect, type Page } from "@playwright/test";
import {
  installFixtures,
  json,
  client,
  clientId,
} from "../../tests/browser/fixtures";
import { onlyLocalRequests, testIdentity as identity } from "./fixtures";
async function setup(page: Page) {
  await onlyLocalRequests(page);
  const unexpected = await installFixtures(page);
  page.on("pageerror", (error) =>
    unexpected.push(`Page error: ${error.message}`),
  );
  page.on("request", (request) => {
    if (
      new URL(request.url()).pathname.startsWith("/api/") &&
      request.method() !== "GET"
    )
      unexpected.push(`Unexpected write: ${request.method()}`);
  });
  return unexpected;
}
async function noSamples(page: Page) {
  const body = page.locator("body");
  for (const text of [
    "Good morning, Jordan.",
    "Anduril",
    "Anduril meeting brief",
    "FY27 funding landscape",
    "Weekly client updates",
    "Approvals · 2",
    "Your authorized data",
    "Disconnected synthetic fixture",
    "Conversation and workspace samples remain disconnected",
  ])
    await expect(body).not.toContainText(text);
}
test("normal signed-in Meri displays API identity and verified client with no sample records", async ({
  page,
}, info) => {
  const unexpected = await setup(page);
  const seen: string[] = [];
  await page.route("**/api/backend/core/me", (r) => {
    seen.push("me");
    return json(r, {
      ...identity,
      user: { ...identity.user, firstName: "API person" },
    });
  });
  await page.route(`**/api/backend/core/clients/${clientId}`, (r) => {
    seen.push("client");
    return json(r, { ...client, name: "API permitted client" });
  });
  await page.goto(`/meri?clientId=${clientId}`);
  await expect(
    page.getByRole("heading", { name: "Meri", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Welcome, API person.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Selected client: API permitted client", { exact: true }),
  ).toBeVisible();
  expect(seen).toEqual(expect.arrayContaining(["me", "client"]));
  await expect(
    page.getByRole("heading", {
      name: "Conversations unavailable",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "New conversation", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("link", { name: "Open document files", exact: true }),
  ).toHaveAttribute("href", `/meri/files?clientId=${clientId}`);
  await noSamples(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const portfolio = page.getByRole("link", {
    name: "Open Portfolio",
    exact: true,
  });
  await portfolio.focus();
  await expect(portfolio).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("meri-real-context-mobile.png"),
    fullPage: true,
  });
  expect(unexpected).toEqual([]);
});
test("null account names and no client selection use neutral state, never sample identity", async ({
  page,
}) => {
  const unexpected = await setup(page);
  await page.route("**/api/backend/core/me", (r) =>
    json(r, { ...identity, user: { ...identity.user, firstName: null } }),
  );
  await page.goto("/meri");
  await expect(page.getByText("Welcome.", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "No client selected", exact: true }),
  ).toBeVisible();
  await noSamples(page);
  expect(unexpected).toEqual([]);
});
for (const status of [401, 403, 503])
  test(`identity ${status} exposes failure without substituting sample data`, async ({
    page,
  }) => {
    const unexpected = await setup(page);
    await page.route("**/api/backend/core/me", (r) =>
      json(r, { message: "Identity unavailable" }, status),
    );
    await page.goto("/meri");
    if (status === 401)
      await expect(
        page.getByRole("heading", {
          name: "Your session expired",
          exact: true,
        }),
      ).toBeVisible();
    else await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByText(/^Welcome/)).toHaveCount(0);
    await noSamples(page);
    expect(unexpected).toEqual([]);
  });
test("malformed identity response has no greeting and explicit retry reads current owner data", async ({
  page,
}) => {
  const unexpected = await setup(page);
  let valid = false,
    reads = 0;
  await page.route("**/api/backend/core/me", (r) => {
    reads++;
    return json(
      r,
      valid
        ? {
            ...identity,
            user: { ...identity.user, firstName: "Verified after retry" },
          }
        : { user: { firstName: "Rejected label" } },
    );
  });
  await page.goto("/meri");
  await expect(page.getByRole("alert")).toContainText("unexpected response");
  await expect(
    page.getByText("Welcome, Rejected label.", { exact: true }),
  ).toHaveCount(0);
  const previous = reads;
  valid = true;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByText("Welcome, Verified after retry.", { exact: true }),
  ).toBeVisible();
  expect(reads).toBeGreaterThan(previous);
  await noSamples(page);
  expect(unexpected).toEqual([]);
});
test("unavailable selected client hides Meri content instead of inventing a client", async ({
  page,
}) => {
  const unexpected = await setup(page);
  await page.route(`**/api/backend/core/clients/${clientId}`, (r) =>
    json(r, { message: "Client unavailable" }, 403),
  );
  await page.goto(`/meri?clientId=${clientId}`);
  await expect(
    page.getByRole("heading", {
      name: "Selected client unavailable",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Meri", exact: true }),
  ).toHaveCount(0);
  await noSamples(page);
  expect(unexpected).toEqual([]);
});
test("session replacement rejects held earlier identity data", async ({
  page,
}) => {
  const unexpected = await setup(page);
  let reads = 0,
    release!: () => void,
    settle!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const settled = new Promise<void>((resolve) => {
    settle = resolve;
  });
  await page.route("**/api/backend/core/me", async (r) => {
    reads++;
    if (reads === 1) {
      await held;
      await json(r, {
        ...identity,
        user: { ...identity.user, firstName: "Old actor" },
      }).catch(() => {});
      settle();
      return;
    }
    return json(r, {
      ...identity,
      user: { ...identity.user, firstName: "Current actor" },
    });
  });
  await page.goto("/meri");
  await expect.poll(() => reads).toBe(1);
  await page.evaluate(() =>
    dispatchEvent(
      new CustomEvent("test:session", { detail: { sessionId: "new-session" } }),
    ),
  );
  await expect(
    page.getByText("Welcome, Current actor.", { exact: true }),
  ).toBeVisible();
  release();
  await settled;
  await expect(
    page.getByText("Welcome, Old actor.", { exact: true }),
  ).toHaveCount(0);
  await noSamples(page);
  expect(unexpected).toEqual([]);
});
test("sign-out removes identity and prevents reads after client navigation", async ({
  page,
}) => {
  const unexpected = await setup(page);
  let reads = 0;
  await page.route("**/api/backend/core/me", (r) => {
    reads++;
    return json(r, identity);
  });
  await page.goto("/meri");
  // Synthetic session event after hydration exercises the ordinary auth gate.
  await page.evaluate(() =>
    dispatchEvent(
      new CustomEvent("test:session", {
        detail: { userId: null, sessionId: null },
      }),
    ),
  );
  await expect(
    page.getByRole("heading", { name: "Sign in to Capiro", exact: true }),
  ).toBeVisible();
  await noSamples(page);
  const before = reads;
  await page.evaluate((id) => {
    history.pushState({}, "", `/meri?clientId=${id}`);
    dispatchEvent(new PopStateEvent("popstate"));
  }, clientId);
  await expect(
    page.getByRole("heading", { name: "Sign in to Capiro", exact: true }),
  ).toBeVisible();
  expect(reads).toBe(before);
  expect(unexpected).toEqual([]);
});
for (const path of ["/meri/files", "/meri/actions"])
  test(`${path} ordinary shell never supplies sample recent titles or approval counts`, async ({
    page,
  }) => {
    const unexpected = await setup(page);
    await page.goto(path);
    await noSamples(page);
    await expect(
      page.getByRole("button", { name: "Approvals", exact: true }),
    ).toBeDisabled();
    await expect(page.getByRole("contentinfo")).not.toContainText("samples");
    expect(unexpected).toEqual([]);
  });
