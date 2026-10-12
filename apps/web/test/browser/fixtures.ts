import type { Page } from "@playwright/test";
export const testIdentity = {
  user: {
    id: "10000000-0000-4000-8000-000000000001",
    clerkUserId: "test-user",
    email: "test@example.test",
    firstName: "Test",
    lastName: "User",
    title: "CTO",
    emailSignatureEnabled: false,
    hasEmailSignature: false,
    tourCompleted: true,
    legiwatchIntroSeen: true,
    legiwatchPrefs: null,
  },
  tenant: {
    id: "20000000-0000-4000-8000-000000000001",
    name: "Test Firm",
    slug: "test-firm",
  },
  role: "user_admin" as const,
  billingAdmin: true,
  entitlements: {
    memoryGovernance: true,
    peWatch: true,
    defenseBudgetIntel: true,
    complianceModule: true,
    dataExport: true,
    customConnectors: false,
  },
  features: {},
};
export async function onlyLocalRequests(page: Page) {
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return url.hostname === "127.0.0.1"
      ? route.continue()
      : route.abort("blockedbyclient");
  });
}
export async function operationFixtures(
  page: Page,
  handlers: Record<
    string,
    | object
    | string
    | number
    | boolean
    | null
    | undefined
    | ((input: unknown) => unknown)
  >,
) {
  await page.route("**/api/capiro/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const key = decodeURIComponent(url.pathname.split("/").pop()!);
    const handler = handlers[key];
    if (handler === undefined)
      return route.fulfill({
        status: 500,
        json: { message: `Unconfigured test operation: ${key}` },
      });
    const input: unknown =
      request.method() === "GET"
        ? JSON.parse(url.searchParams.get("input") ?? "{}")
        : request.postDataJSON();
    const payload = typeof handler === "function" ? handler(input) : handler;
    return route.fulfill({ json: payload });
  });
}
