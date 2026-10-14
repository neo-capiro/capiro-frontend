# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: strategy-proposal-compatibility.spec.ts >> stale409 stays visible with both dialogs and never retries the mutation
- Location: test/browser/strategy-proposal-compatibility.spec.ts:300:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.route: Target crashed 
```

# Test source

```ts
  1  | import type { Page } from "@playwright/test";
  2  | export const testIdentity = {
  3  |   user: {
  4  |     id: "10000000-0000-4000-8000-000000000001",
  5  |     clerkUserId: "test-user",
  6  |     email: "test@example.test",
  7  |     firstName: "Test",
  8  |     lastName: "User",
  9  |     title: "CTO",
  10 |     emailSignatureEnabled: false,
  11 |     hasEmailSignature: false,
  12 |     tourCompleted: true,
  13 |     legiwatchIntroSeen: true,
  14 |     legiwatchPrefs: null,
  15 |   },
  16 |   tenant: {
  17 |     id: "20000000-0000-4000-8000-000000000001",
  18 |     name: "Test Firm",
  19 |     slug: "test-firm",
  20 |   },
  21 |   role: "user_admin" as const,
  22 |   billingAdmin: true,
  23 |   entitlements: {
  24 |     memoryGovernance: true,
  25 |     peWatch: true,
  26 |     defenseBudgetIntel: true,
  27 |     complianceModule: true,
  28 |     dataExport: true,
  29 |     customConnectors: false,
  30 |   },
  31 |   features: {},
  32 | };
  33 | export async function onlyLocalRequests(page: Page) {
> 34 |   await page.route("**/*", (route) => {
     |              ^ Error: page.route: Target crashed 
  35 |     const url = new URL(route.request().url());
  36 |     return url.hostname === "127.0.0.1"
  37 |       ? route.continue()
  38 |       : route.abort("blockedbyclient");
  39 |   });
  40 | }
  41 | export async function operationFixtures(
  42 |   page: Page,
  43 |   handlers: Record<
  44 |     string,
  45 |     | object
  46 |     | string
  47 |     | number
  48 |     | boolean
  49 |     | null
  50 |     | undefined
  51 |     | ((input: unknown) => unknown)
  52 |   >,
  53 | ) {
  54 |   await page.route("**/api/capiro/*", async (route) => {
  55 |     const request = route.request();
  56 |     const url = new URL(request.url());
  57 |     const key = decodeURIComponent(url.pathname.split("/").pop()!);
  58 |     const handler = handlers[key];
  59 |     if (handler === undefined)
  60 |       return route.fulfill({
  61 |         status: 500,
  62 |         json: { message: `Unconfigured test operation: ${key}` },
  63 |       });
  64 |     const input: unknown =
  65 |       request.method() === "GET"
  66 |         ? JSON.parse(url.searchParams.get("input") ?? "{}")
  67 |         : request.postDataJSON();
  68 |     const payload = typeof handler === "function" ? handler(input) : handler;
  69 |     return route.fulfill({ json: payload });
  70 |   });
  71 | }
  72 | 
```