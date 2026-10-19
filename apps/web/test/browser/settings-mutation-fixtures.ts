import { expect, type Page, type Route } from "@playwright/test";
import { onlyLocalRequests, operationFixtures } from "./fixtures";
import { settingsFixtures } from "./settings-fixtures";

export const contact = settingsFixtures["settings.contact.read"];
export const branding = settingsFixtures["settings.branding.read"];
export const profile = {
  id: "30000000-0000-4000-8000-000000000001",
  name: "Synthetic policy profile",
  profileStatus: "active",
  status: "active",
  website: "https://profile.example.test",
  createdAt: "2026-10-01T12:00:00.000Z",
};
export const connection = {
  id: "40000000-0000-4000-8000-000000000001",
  provider: "microsoft_365",
  accountEmail: "synthetic@example.test",
  displayName: "Synthetic Microsoft account",
  status: "connected",
  scopes: ["Mail.Read"],
  lastSyncAt: null,
  lastError: null,
};
export const otherId = "40000000-0000-4000-8000-000000000002";
export const syncStats = {
  scanned: 1,
  matched: 1,
  skipped: 0,
  removed: 0,
  failed: 0,
  pages: 1,
  hasMore: false,
};
export const oauthUrl = "https://login.microsoftonline.com/synthetic/authorize";

export async function settingsFixture(
  page: Page,
  handlers: Parameters<typeof operationFixtures>[1] = {},
) {
  await onlyLocalRequests(page);
  await operationFixtures(page, { ...settingsFixtures, ...handlers });
}

/** A single synthetic server response, held until the test observes pending UI. */
export async function holdOperation(page: Page, operation: string) {
  let release!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requests: unknown[] = [];
  let payload: object = {};
  let offered = false;
  await page.route(`**/api/capiro/${operation}`, async (route) => {
    requests.push(route.request().postDataJSON());
    await wait;
    await route.fulfill({ json: payload });
    offered = true;
  });
  return {
    requests,
    get offered() {
      return offered;
    },
    finish(value: object) {
      payload = value;
      release();
    },
  };
}

export async function refuse(route: Route, message: string) {
  await route.fulfill({ status: 409, json: { message } });
}

export function providerCard(page: Page) {
  return page.locator("section").filter({
    has: page.getByRole("heading", { name: "Microsoft 365", exact: true }),
  });
}

export async function openSettings(page: Page, section: string) {
  await page.goto(`/settings/${section}`);
  await expect(page.getByText("Loading.", { exact: true })).toHaveCount(0);
}

export async function replaceSession(page: Page) {
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test:session", {
        detail: { sessionId: "replacement-settings-session" },
      }),
    ),
  );
}
