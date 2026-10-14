import { readFileSync } from "node:fs";
import { expect, type Page, type Request, type Route } from "@playwright/test";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";
import { client, navigate } from "./next-modules-fixtures";

export { navigate };
export function wire(name: string) {
  return JSON.parse(
    readFileSync(
      new URL(
        `../../tests/fixtures/meri-actions/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  );
}
export const actionContext = wire("CONTEXT");
export const actionClock = Date.parse(actionContext.syntheticNow);
export const actionClient = {
  ...client,
  id: actionContext.clientId,
  name: "Synthetic action client",
};
export const otherActionClient = {
  ...client,
  id: "abcdef00-0000-4000-8000-000000000010",
  name: "Synthetic replacement client",
};
export const actionUrl = (id = actionClient.id) =>
  `/meri/actions?clientId=${id}`;
export const sessionReceipt = (id = actionClient.id) => ({
  credential: `action_session_${"a".repeat(43)}`,
  expiresAtMs: actionClock + 60_000,
  context: {
    tenantId: actionContext.tenantId,
    actorId: actionContext.actorId,
    conversationId: actionContext.conversationId,
    runId: actionContext.runId,
    selectedClientId: id,
  },
});
type Reply = { status?: number; json: unknown };
type Observed = {
  route: string;
  method: string;
  body: unknown;
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
  const done = deferred();
  const finish = (candidate: Request) => {
    if (candidate !== request) return;
    page.off("requestfinished", finish);
    page.off("requestfailed", finish);
    done.resolve();
  };
  page.on("requestfinished", finish);
  page.on("requestfailed", finish);
  return done.promise;
}

/** Synthetic HTTP only. Public receiver/host/controller and authority lifetimes stay real. */
export async function actionHostFixture(page: Page) {
  await page.clock.install({ time: new Date(actionClock) });
  await page.clock.setFixedTime(new Date(actionClock));
  await onlyLocalRequests(page);
  const requests: Observed[] = [],
    remote: string[] = [],
    errors: string[] = [],
    unexpected: string[] = [];
  const queued = new Map<string, Handler[]>();
  const defaults = new Map<string, Reply>();
  page.on("request", (request) => {
    if (new URL(request.url()).hostname !== "127.0.0.1")
      remote.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/**", (route) => {
    unexpected.push(route.request().url());
    return route.fulfill({
      status: 501,
      json: { message: "Unconfigured synthetic API route" },
    });
  });
  await operationFixtures(page, {
    "me.read": testIdentity,
    "clients.list": [actionClient, otherActionClient],
  });
  // Ordinary Meri reads canonical Core identity; never replace it with the former home fixture.
  await page.route("**/api/backend/core/me", (route) => {
    expect(route.request().method()).toBe("GET");
    return route.fulfill({ json: testIdentity });
  });
  const receive = async (route: Route, name: string, fallback: Reply) => {
    const request = route.request();
    requests.push({
      route: name,
      method: request.method(),
      body: request.method() === "GET" ? null : request.postDataJSON(),
      headers: await request.allHeaders(),
    });
    const override = queued.get(name)?.shift();
    if (override) return override(route);
    if (!defaults.has(name) && fallback.status === 501)
      unexpected.push(request.url());
    return route.fulfill(defaults.get(name) ?? fallback);
  };
  await page.route("**/api/backend/core/clients/*", (route) =>
    receive(route, "client", {
      json: new URL(route.request().url()).pathname.endsWith(
        otherActionClient.id,
      )
        ? otherActionClient
        : actionClient,
    }),
  );
  await page.route("**/api/action-followthrough/*", (route) => {
    const name = new URL(route.request().url()).pathname.split("/").pop()!;
    const reply =
      name === "session"
        ? {
            json: sessionReceipt(
              (route.request().postDataJSON() as { clientId: string }).clientId,
            ),
          }
        : {
            status: 501,
            json: { message: "No synthetic action response queued" },
          };
    return receive(route, name, reply);
  });
  const queue = (name: string, handler: Handler) =>
    queued.set(name, [...(queued.get(name) ?? []), handler]);
  return {
    requests,
    remote,
    errors,
    unexpected,
    calls: (name: string) =>
      requests.filter((request) => request.route === name),
    actions: () => requests.filter((request) => request.route !== "client"),
    reply(name: string, reply: Reply) {
      queue(name, (route) => route.fulfill(reply));
    },
    use(name: string) {
      const data = wire(name);
      defaults.set(data.route, {
        status: data.httpStatus,
        json: data.response,
      });
    },
    hold(name: string, reply: Reply) {
      const entered = deferred(),
        released = deferred(),
        settled = deferred();
      queue(name, async (route) => {
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
export async function connectActionHost(page: Page) {
  await expect(
    page.getByRole("button", { name: "Connect action service", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Connect action service", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Find recommendations", exact: true }),
  ).toBeEnabled();
}
export async function selectAction(page: Page) {
  await page
    .getByRole("button", { name: "Find recommendations", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Returned recommendations" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /^Select recommendation\s*:/ })
    .click();
  await expect(page.getByLabel("Task title", { exact: true })).toHaveValue(
    "Issue",
  );
  await page
    .getByLabel("Task title", { exact: true })
    .fill(actionContext.task.title);
}
export async function reviewAction(page: Page) {
  await page.getByRole("button", { name: "Review draft", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Reviewed task intent", exact: true }),
  ).toBeVisible();
}
export async function prepareAction(page: Page) {
  await page
    .getByRole("button", { name: "Prepare approval proposal", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Pending separate approval",
      exact: true,
    }),
  ).toBeVisible();
}
export function expectActionIsolation(
  fixture: Awaited<ReturnType<typeof actionHostFixture>>,
) {
  expect(fixture.remote).toEqual([]);
  expect(fixture.errors).toEqual([]);
  expect(fixture.unexpected).toEqual([]);
}
export async function replaceActionIdentity(
  page: Page,
  detail: Record<string, string>,
) {
  await page.evaluate(
    (detail) => dispatchEvent(new CustomEvent("test:session", { detail })),
    detail,
  );
}
