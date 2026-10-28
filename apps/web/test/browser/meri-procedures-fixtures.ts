/**
 * Synthetic local-only fixture for the firm procedure governance mounted checks.
 *
 * Only the HTTP boundary is synthetic: the real host, the real governance client, the real
 * authenticated-account read and the real session/refresh lifetimes are exercised, and every request
 * stays on the loopback harness through `onlyLocalRequests`. The procedure interception extends the
 * harness's operation-fixture pattern with call recording, holds and queued replies, which the static
 * `operationFixtures` helper cannot express (the required proofs need a held in-flight mutation).
 */
import { expect, type Page, type Request, type Route } from "@playwright/test";
import { onlyLocalRequests, operationFixtures } from "./fixtures";

export const procedureUuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
/** 64 lowercase hex characters, the stored procedure manifest digest. */
export const procedureDigest = "0123456789abcdef".repeat(4);
export const procedureUrl = (search = "") => `/meri-procedures.html${search}`;

/** The account is read from Core `me`; the browser session hint never selects it. */
export const procedureAdmin = {
  user: {
    id: procedureUuid(1),
    clerkUserId: "synthetic-user-a",
    email: "a@example.test",
    firstName: "Ada",
    lastName: "Admin",
  },
  tenant: { id: procedureUuid(101), name: "Synthetic Firm A" },
  role: "user_admin",
  billingAdmin: true,
};
export const procedureSecondAdmin = {
  user: {
    id: procedureUuid(2),
    clerkUserId: "synthetic-user-b",
    email: "b@example.test",
    firstName: "Bea",
    lastName: "Admin",
  },
  tenant: { id: procedureUuid(102), name: "Synthetic Firm B" },
  role: "user_admin",
  billingAdmin: false,
};
export const procedureMember = {
  user: {
    id: procedureUuid(3),
    clerkUserId: "synthetic-user-c",
    email: "c@example.test",
    firstName: "Cam",
    lastName: "Member",
  },
  tenant: { id: procedureUuid(101), name: "Synthetic Firm A" },
  role: "member",
  billingAdmin: false,
};

export const procedureTemplate = {
  heading: "Hearing brief",
  sections: ["summary", "facts"],
};
export const procedureManifest = {
  scopes: ["client"],
  steps: ["read", "draft"],
};

export const storedSkill = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  id: "hearing_prep",
  name: "Hearing preparation",
  triggers: ["hearing", "prep"],
  systemAddendum: "Prepare the hearing brief from the stored record.",
  requiredTools: ["get_client_context"],
  template: procedureTemplate,
  procedure: procedureManifest,
  ...overrides,
});

export const procedureRow = (overrides: Record<string, unknown> = {}) => ({
  id: procedureUuid(11),
  skillId: "hearing_prep",
  name: "Hearing preparation",
  skill: storedSkill(),
  version: 3,
  versions: [
    { version: 1, savedAt: "2026-10-01T00:00:00.000Z" },
    { version: 2, savedAt: "2026-10-05T00:00:00.000Z" },
    { version: 3, savedAt: "2026-10-09T00:00:00.000Z" },
  ],
  enabled: true,
  runnable: true,
  procedureDigest,
  procedureScopes: ["client"],
  validationErrors: [],
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-09T00:00:00.000Z",
  ...overrides,
});

/** A second row: disabled, no stored template/procedure, no restorable history. */
export const secondProcedureRow = procedureRow({
  id: procedureUuid(12),
  skillId: "draft_review",
  name: "Draft review",
  skill: storedSkill({
    id: "draft_review",
    name: "Draft review",
    triggers: ["draft"],
    requiredTools: [],
    systemAddendum: "Review the draft against the stored record.",
    template: undefined,
    procedure: undefined,
  }),
  version: 1,
  versions: [{ version: 1, savedAt: "2026-10-02T00:00:00.000Z" }],
  enabled: false,
  runnable: false,
  procedureDigest: null,
  procedureScopes: [],
});

/** The replacement account's own row: a superseded account's rows must never render under it. */
export const thirdProcedureRow = procedureRow({
  id: procedureUuid(13),
  skillId: "firm_b_briefing",
  name: "Firm B briefing",
  skill: storedSkill({
    id: "firm_b_briefing",
    name: "Firm B briefing",
    triggers: ["briefing"],
    systemAddendum: "Prepare Firm B's briefing.",
  }),
  version: 1,
  versions: [{ version: 1, savedAt: "2026-10-03T00:00:00.000Z" }],
});

/** What the admin write routes return: the persisted row, not the list projection. */
export const persistedProcedureRow = (
  overrides: Record<string, unknown> = {},
) => ({
  id: procedureUuid(11),
  tenantId: procedureUuid(101),
  skillId: "hearing_prep",
  name: "Hearing preparation",
  skillJson: storedSkill(),
  version: 4,
  versions: [
    { version: 1, savedAt: "2026-10-01T00:00:00.000Z" },
    { version: 2, savedAt: "2026-10-05T00:00:00.000Z" },
    { version: 3, savedAt: "2026-10-09T00:00:00.000Z" },
    { version: 4, savedAt: "2026-10-10T00:00:00.000Z" },
  ],
  enabled: true,
  createdByUserId: procedureUuid(1),
  updatedByUserId: procedureUuid(1),
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-10T00:00:00.000Z",
  ...overrides,
});

type Reply = { status?: number; json: unknown };
type Outcome = "pending" | "settled" | "aborted";
export type ProcedureCall = {
  key: string;
  method: string;
  input: unknown;
  outcome: Outcome;
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

export async function procedureFixture(page: Page) {
  await onlyLocalRequests(page);
  const calls: ProcedureCall[] = [];
  const recorded = new Map<Request, ProcedureCall>();
  const remote: string[] = [];
  const errors: string[] = [];
  const unexpected: string[] = [];
  const queued = new Map<string, Handler[]>();
  const defaults = new Map<string, Reply>();
  let identity: unknown = procedureAdmin;
  let rows: unknown[] = [procedureRow(), secondProcedureRow];

  page.on("request", (request) => {
    if (new URL(request.url()).hostname !== "127.0.0.1")
      remote.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("requestfinished", (request) => {
    const call = recorded.get(request);
    if (call && call.outcome === "pending") call.outcome = "settled";
  });
  page.on("requestfailed", (request) => {
    const call = recorded.get(request);
    if (call && call.outcome === "pending") call.outcome = "aborted";
  });

  // Catch-alls first: the most recently registered matching route wins, so every route below them
  // takes precedence.
  await page.route("**/api/**", (route) => {
    // Vite also serves source modules whose directory is named `api`.
    if (!new URL(route.request().url()).pathname.startsWith("/api/"))
      return route.fallback();
    unexpected.push(route.request().url());
    return route.fulfill({
      status: 501,
      json: { message: "Unconfigured synthetic API route" },
    });
  });
  // Ordinary Meri reads the canonical Core identity for the authenticated account.
  await page.route("**/api/backend/core/me", (route) => {
    expect(route.request().method()).toBe("GET");
    return route.fulfill({ json: identity });
  });
  await operationFixtures(page, { "me.read": procedureAdmin });
  await page.route("**/api/capiro/meri.procedures.*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const key = decodeURIComponent(url.pathname.split("/").pop() ?? "");
    const call: ProcedureCall = {
      key,
      method: request.method(),
      input:
        request.method() === "GET"
          ? JSON.parse(url.searchParams.get("input") ?? "{}")
          : request.postDataJSON(),
      outcome: "pending",
    };
    calls.push(call);
    recorded.set(request, call);
    const override = queued.get(key)?.shift();
    const fallback: Reply =
      key === "meri.procedures.list"
        ? { json: rows }
        : {
            status: 501,
            json: { message: `Unconfigured test operation: ${key}` },
          };
    if (!override && !defaults.has(key) && key !== "meri.procedures.list")
      unexpected.push(request.url());
    try {
      if (override) await override(route);
      else await route.fulfill(defaults.get(key) ?? fallback);
    } catch {
      // The surface cancelled this request before its synthetic reply was delivered.
    }
  });

  const queue = (key: string, handler: Handler) =>
    queued.set(key, [...(queued.get(key) ?? []), handler]);

  return {
    remote,
    errors,
    unexpected,
    calls: (key?: string) =>
      calls.filter((call) => (key ? call.key === key : true)),
    settled: (key: string) =>
      calls.filter((call) => call.key === key && call.outcome === "settled"),
    aborted: (key: string) =>
      calls.filter((call) => call.key === key && call.outcome === "aborted"),
    setIdentity(next: unknown) {
      identity = next;
    },
    setRows(next: unknown[]) {
      rows = next;
    },
    reply(key: string, reply: Reply) {
      defaults.set(key, reply);
    },
    hold(key: string, reply: Reply) {
      const entered = deferred();
      const released = deferred();
      const settled = deferred();
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

export type ProcedureFixture = Awaited<ReturnType<typeof procedureFixture>>;

/** The row's own controls, scoped so a two-row list cannot resolve to the wrong button. */
export const procedureRowFor = (page: Page, skillId: string) =>
  page.getByRole("row", { name: new RegExp(skillId) });

export async function openProcedureSurface(page: Page) {
  await page.goto(procedureUrl());
  await expect(procedureRowFor(page, "hearing_prep")).toBeVisible();
}

/** Replaces the session the way the product does; the account itself still comes from Core `me`. */
export async function replaceProcedureIdentity(
  page: Page,
  detail: Record<string, string>,
) {
  await page.evaluate(
    (detail) => dispatchEvent(new CustomEvent("test:session", { detail })),
    detail,
  );
}

export function expectProcedureIsolation(fixture: ProcedureFixture) {
  expect(fixture.remote).toEqual([]);
  expect(fixture.errors).toEqual([]);
  expect(fixture.unexpected).toEqual([]);
}
