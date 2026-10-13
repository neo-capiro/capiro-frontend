import { expect, type Page, type Route } from "@playwright/test";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";

export const tokenA = "a".repeat(64);
export const tokenB = "b".repeat(64);
export const registerUrl = "/register?onboard-boundary=1";
export const tokenUrl = (token: string) => `/it/${token}?onboard-boundary=1`;
export const legal = [
  {
    docType: "tos",
    version: "current-legal",
    html: "<p>Synthetic legal document</p>",
  },
];
export const publicConfig = {
  clerkPublishableKey: null,
  stripePublishableKey: null,
  appBaseUrl: "http://127.0.0.1/",
  apiBaseUrl: "http://127.0.0.1/",
  onboardingBaseUrl: "http://127.0.0.1/",
  funnelEnabled: true,
  environment: "synthetic-current-config",
};
export const invite = (orgName: string) => ({
  orgName,
  email: "synthetic-admin@example.test",
  status: "pending",
  provider: null,
  providers: { google: true, microsoft: true },
  googleClientId: null,
});
type Operation =
  | "onboard.funnel.legal"
  | "onboard.funnel.plan"
  | "public-onboard.invite"
  | "public-onboard.config";
type Observed = {
  key: string;
  method: string;
  input: unknown;
  headers: Record<string, string>;
};
type Handler = (route: Route) => Promise<void>;
export async function onboardFixture(page: Page) {
  await onlyLocalRequests(page);
  await operationFixtures(page, { "me.read": testIdentity });
  const requests: Observed[] = [],
    writes: string[] = [],
    errors: string[] = [],
    remote: string[] = [];
  const queued = new Map<Operation, Handler[]>();
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.hostname !== "127.0.0.1") remote.push(request.url());
    if (url.pathname.startsWith("/api/capiro/") && request.method() !== "GET")
      writes.push(url.pathname);
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/capiro/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    const key = decodeURIComponent(url.pathname.split("/").pop()!) as Operation;
    if (!key.startsWith("onboard.") && !key.startsWith("public-onboard."))
      return route.fallback();
    const input =
      request.method() === "GET"
        ? JSON.parse(url.searchParams.get("input") ?? "{}")
        : request.postDataJSON();
    requests.push({
      key,
      input,
      method: request.method(),
      headers: await request.allHeaders(),
    });
    const override = queued.get(key)?.shift();
    if (override) return override(route);
    if (key === "onboard.funnel.legal") return route.fulfill({ json: legal });
    if (key === "onboard.funnel.plan")
      return route.fulfill({ json: { ok: true } });
    if (key === "public-onboard.config")
      return route.fulfill({ json: publicConfig });
    if (key === "public-onboard.invite")
      return route.fulfill({
        json: invite(
          input.params.token === tokenB ? "Current token B" : "Current token A",
        ),
      });
    return route.fulfill({
      status: 500,
      json: { message: "Unconfigured Onboard probe operation" },
    });
  });
  return {
    requests,
    writes,
    errors,
    remote,
    calls: (key: Operation) => requests.filter((entry) => entry.key === key),
    queue(key: Operation, handler: Handler) {
      queued.set(key, [...(queued.get(key) ?? []), handler]);
    },
  };
}
export function heldResponse() {
  let release!: () => void, finish!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  const settled = new Promise<void>((resolve) => {
    finish = resolve;
  });
  return { wait, release, settled, finish };
}
export async function replaceSession(
  page: Page,
  detail: Record<string, string | boolean | null>,
) {
  await page.evaluate(
    (value) =>
      window.dispatchEvent(new CustomEvent("test:session", { detail: value })),
    detail,
  );
}
export async function navigateProbe(page: Page, href: string) {
  await page.evaluate((url) => {
    history.pushState({}, "", url);
    dispatchEvent(new PopStateEvent("popstate"));
  }, href);
}
export async function expectFreshProbe(page: Page, session: string) {
  await expect(
    page.getByRole("heading", { name: "Synthetic Onboard boundary probe" }),
  ).toBeVisible();
  await expect(page.getByTestId("onboard-session")).toHaveText(session);
  await expect(page.getByLabel("Onboard scope draft")).toHaveValue("");
  await expect(page.getByTestId("onboard-receipt")).toHaveText("");
  await expect(page.getByTestId("onboard-error")).toHaveText("");
  await expect(page.getByTestId("onboard-pending")).toHaveText("");
}
export function expectIsolated(
  fixture: Awaited<ReturnType<typeof onboardFixture>>,
) {
  expect(fixture.errors).toEqual([]);
  expect(fixture.remote).toEqual([]);
}
