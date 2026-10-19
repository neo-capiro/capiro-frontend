import { expect, type Page, type Request, type Route } from "@playwright/test";
import type { FunnelSession } from "../../src/shared/capiro/onboard-contracts";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";
import {
  invite,
  publicConfig,
  tokenA,
  tokenB,
  navigateProbe,
  replaceSession,
} from "./onboard-boundary-fixtures";

export { tokenA, tokenB, replaceSession, navigateProbe as navigateHost };
export const hostConfig = {
  ...publicConfig,
  clerkPublishableKey: "pk_test_YQ==",
};
export const hostInvite = (name: string) => ({
  ...invite(name),
  googleClientId: "synthetic-google-client",
});
export const trialName = /Just exploring\? Start with a 30-day free trial/;
export const nativeSession = (
  sessionId = "synthetic-native-A",
  patch: Partial<FunnelSession> = {},
): FunnelSession => ({
  sessionId,
  state: "verified",
  plan: null,
  payMethod: null,
  profiles: null,
  roleMode: null,
  roleDesignations: [],
  importMode: null,
  itAdminEmails: [],
  orgProfile: {},
  slugFinal: null,
  tenantId: null,
  failureReason: null,
  email: "synthetic-purchaser@example.test",
  firstName: "Synthetic",
  lastName: "Purchaser",
  orgName: "Synthetic Firm",
  stripe: {},
  ...patch,
});

type Reply = { status?: number; json: unknown };
type Observed = {
  key: string;
  method: string;
  input: unknown;
  headers: Record<string, string>;
};
type Handler = (route: Route) => Promise<void>;
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function requestCompletion(page: Page, request: Request) {
  const complete = deferred();
  const finish = (candidate: Request) => {
    if (candidate !== request) return;
    page.off("requestfinished", finish);
    page.off("requestfailed", finish);
    complete.resolve();
  };
  page.on("requestfinished", finish);
  page.on("requestfailed", finish);
  return complete.promise;
}

/** HTTP interception only; actual Host, query and authority owners remain mounted. */
export async function hostFixture(
  page: Page,
  session: FunnelSession | null = nativeSession(),
) {
  await onlyLocalRequests(page);
  await operationFixtures(page, {
    "me.read": testIdentity,
    "public-onboard.config": hostConfig,
    "public-onboard.invite": (input) =>
      hostInvite(
        (input as { params: { token: string } }).params.token === tokenB
          ? "Synthetic token B"
          : "Synthetic token A",
      ),
    "onboard.funnel.session": session,
    "onboard.funnel.plan": { ok: true },
    "onboard.funnel.importPref": { ok: true },
  });
  const requests: Observed[] = [],
    remote: string[] = [],
    errors: string[] = [];
  const queued = new Map<string, Handler[]>();
  page.on("request", (request) => {
    if (new URL(request.url()).hostname !== "127.0.0.1")
      remote.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/capiro/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    const key = decodeURIComponent(url.pathname.split("/").pop()!);
    requests.push({
      key,
      method: request.method(),
      input:
        request.method() === "GET"
          ? JSON.parse(url.searchParams.get("input") ?? "{}")
          : request.postDataJSON(),
      headers: await request.allHeaders(),
    });
    const override = queued.get(key)?.shift();
    if (override) return override(route);
    if (key === "onboard.funnel.session" && session === null)
      return route.fulfill({
        status: 404,
        json: { message: "Synthetic purchaser is not registered" },
      });
    return route.fallback();
  });
  const queue = (key: string, handler: Handler) =>
    queued.set(key, [...(queued.get(key) ?? []), handler]);
  return {
    requests,
    remote,
    errors,
    calls: (key: string) => requests.filter((request) => request.key === key),
    writes: () => requests.filter((request) => request.method !== "GET"),
    reply(key: string, reply: Reply) {
      queue(key, (route) => route.fulfill(reply));
    },
    hold(key: string, reply: Reply) {
      const entered = deferred(),
        released = deferred(),
        settled = deferred();
      queue(key, async (route) => {
        const completed = requestCompletion(page, route.request());
        entered.resolve();
        await released.promise;
        try {
          await route.fulfill(reply);
          await completed;
        } finally {
          settled.resolve();
        }
      });
      return {
        entered: entered.promise,
        async release() {
          released.resolve();
          await settled.promise;
        },
      };
    },
  };
}

export async function expectRegistration(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Let's get your firm set up" }),
  ).toBeVisible();
  await expect(page.getByLabel("First name", { exact: true })).toBeVisible();
}
export async function expectPlan(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Choose how to start" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue", exact: true }),
  ).toBeVisible();
}
export function expectHostIsolated(
  fixture: Awaited<ReturnType<typeof hostFixture>>,
) {
  expect(fixture.remote).toEqual([]);
  expect(fixture.errors).toEqual([]);
}
export async function expectHorizontalFit(page: Page) {
  const dimensions = await page.evaluate(() => ({
    width: Math.max(
      document.body.scrollWidth,
      document.documentElement.scrollWidth,
    ),
    viewport: window.innerWidth,
  }));
  expect(dimensions.viewport).toBe(page.viewportSize()!.width);
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport);
}
