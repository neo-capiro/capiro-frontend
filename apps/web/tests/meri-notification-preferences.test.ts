import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import {
  receiveUserPreferencesResponse,
  USER_PREFERENCE_DEFAULTS,
  USER_PREFERENCE_NOTIFICATIONS,
  type UserPreferences,
  type UserPreferencesOwner,
  type UserPreferencesSaveRequest,
} from "@capiro/meri-client/user-preferences";
import type { RunIndexSummary } from "@capiro/meri-contracts/conversation-history";
import {
  MEMORY_NOTIFICATION_SCHEMA,
  MEMORY_REVIEW_NOTIFICATION_EVENTS,
  memoryNotificationDelivery,
  receiveMemoryNotificationPage,
} from "../src/shared/meri-notifications/memory-contract";
import { createMemoryNotificationsClient } from "../src/shared/meri-notifications/memory-client";
import {
  proxyMemoryNotifications,
  targetForMemoryNotifications,
} from "../src/shared/meri-notifications/memory-proxy.server";
import {
  MANDATORY_NOTIFICATION_CLASSES,
  NOTIFICATION_CATEGORIES,
  applyNotificationPreference,
  notificationCategory,
  optionalNoticePresented,
  projectUpdates,
} from "../src/shared/meri-notifications/projection";
import { UserPreferencesController } from "../src/shared/meri-user-preferences/controller";
import { userPreferencesJournal } from "../src/shared/meri-user-preferences/journal";
import type { UserPreferencesPort } from "../src/shared/meri-user-preferences/transport";
import { NotificationCategoryControls } from "../src/features/meri/notifications/NotificationCategoryControls";

const owner: UserPreferencesOwner = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  actorId: "22222222-2222-4222-8222-222222222222",
};
const other: UserPreferencesOwner = {
  tenantId: "33333333-3333-4333-8333-333333333333",
  actorId: "44444444-4444-4444-8444-444444444444",
};
const json = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const env = {
  MERI_MEMORY_OWNER_REVIEW_ENABLED: "true",
  CORE_API_BASE_URL: "https://core.test/api",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_ZXhhbXBsZQ==",
  CLERK_SECRET_KEY: "sk_test_example",
};

function rawItem(eventType: string, over: Record<string, unknown> = {}) {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    reviewRequestId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    candidateId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    clientId: null,
    eventType,
    title: "Memory proposal",
    readAt: null,
    createdAt: "2026-10-27T10:00:00.000Z",
    ...over,
  };
}

function page(
  items: Record<string, unknown>[],
  over: Record<string, unknown> = {},
) {
  return receiveMemoryNotificationPage({
    schemaVersion: MEMORY_NOTIFICATION_SCHEMA,
    enabled: true,
    items,
    nextCursor: null,
    ...over,
  });
}

function completedRun(over: Partial<RunIndexSummary> = {}): RunIndexSummary {
  const conversationId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const runId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
  return {
    conversationId,
    runId,
    createdAt: "2026-10-26T09:00:00.000Z",
    state: "completed",
    statusAt: "2026-10-27T12:00:00.000Z",
    lastSequence: 4,
    clientIds: [],
    usage: {
      recording: "not-recorded",
      sdkEstimateUsd: null,
      providerBilledUsd: null,
    },
    references: { conversationId, runId },
    ...over,
  };
}

const modelCatalog = {
  defaultSelection: { provider: "bedrock", modelId: "m-1", effort: null },
  models: [
    {
      provider: "bedrock",
      modelId: "m-1",
      label: "Model one",
      efforts: [null],
      available: true,
      unavailableReason: null,
    },
  ],
};

type Mode = "ok" | "conflict" | "unknown" | "revoked";

/** A synthetic CAS store that admits every response through the public receiver. */
function preferencesStore(start: Partial<UserPreferences> = {}) {
  const state = {
    revision: 2,
    preferences: {
      ...USER_PREFERENCE_DEFAULTS,
      theme: "dark",
      density: "compact",
      timezone: "America/New_York",
      ...start,
    } as UserPreferences,
  };
  let mode: Mode = "ok";
  const body = () => ({
    owner,
    revision: state.revision,
    preferences: state.preferences,
    modelCatalog,
  });
  const port: UserPreferencesPort = {
    async read() {
      if (mode === "revoked")
        return receiveUserPreferencesResponse(
          "read",
          403,
          JSON.stringify({ error: { code: "MEMBERSHIP_REVOKED" } }),
          { owner },
        );
      return receiveUserPreferencesResponse(
        "read",
        200,
        JSON.stringify(body()),
        {
          owner,
        },
      );
    },
    async save(request: UserPreferencesSaveRequest) {
      if (mode === "conflict")
        return receiveUserPreferencesResponse(
          "save",
          409,
          JSON.stringify({ error: { code: "SETTINGS_REVISION_CONFLICT" } }),
          { owner, request },
        );
      if (mode === "unknown")
        return receiveUserPreferencesResponse(
          "save",
          503,
          JSON.stringify({
            error: { code: "SETTINGS_COMMIT_UNKNOWN", outcome: "UNKNOWN" },
          }),
          { owner, request },
        );
      state.revision = request.expectedRevision + 1;
      state.preferences = request.preferences;
      return receiveUserPreferencesResponse(
        "save",
        200,
        JSON.stringify(body()),
        {
          owner,
          request,
        },
      );
    },
  };
  return { port, state, set: (next: Mode) => (mode = next) };
}

describe("notification category and delivery mapping", () => {
  it("maps only canonical keys and never maps connections to memoryReviewed", () => {
    const keys = NOTIFICATION_CATEGORIES.map((category) => category.key).filter(
      (key): key is NonNullable<typeof key> => key !== null,
    );
    for (const key of keys)
      expect(USER_PREFERENCE_NOTIFICATIONS).toContain(key);
    expect(notificationCategory("connections").key).toBeNull();
    expect(notificationCategory("connections").control).toBe("unsupported");
    expect(notificationCategory("connections").reason).toMatch(
      /never mapped to memoryReviewed/,
    );
    expect(notificationCategory("run-outcomes").key).toBe("runCompleted");
    expect(notificationCategory("memory-review").key).toBe("memoryReviewed");
  });

  it("maps the approval toggle to optional waiting-run notices only", () => {
    const decisions = notificationCategory("decisions");
    expect(decisions.control).toBe("revisioned");
    expect(decisions.reason).toMatch(/mandatory assignment notices/);
    expect(optionalNoticePresented("decisions", null)).toBe(false);
  });

  it("classifies the released event vocabulary into required and optional notices", () => {
    expect(MEMORY_REVIEW_NOTIFICATION_EVENTS).toHaveLength(6);
    expect(memoryNotificationDelivery("review_assigned")).toBe("required");
    expect(memoryNotificationDelivery("review_revision_assigned")).toBe(
      "required",
    );
    expect(memoryNotificationDelivery("review_reassigned")).toBe("required");
    expect(memoryNotificationDelivery("review_changes_requested")).toBe(
      "required",
    );
    expect(memoryNotificationDelivery("review_approved")).toBe(
      "optional-outcome",
    );
    expect(memoryNotificationDelivery("review_rejected")).toBe(
      "optional-outcome",
    );
    expect([...MANDATORY_NOTIFICATION_CLASSES]).toEqual([
      "approval-obligation",
      "security",
      "broadcast",
    ]);
  });
});

describe("memory notification receiver", () => {
  it("admits the released page shape and refuses a changed one", () => {
    const admitted = page([rawItem("review_assigned")]);
    expect(admitted.items).toHaveLength(1);
    expect(
      receiveMemoryNotificationPage({ ...admitted, unknown: 1 }),
    ).toBeDefined();
    expect(() =>
      page([rawItem("review_assigned")], { schemaVersion: "x" }),
    ).toThrow();
    expect(() => page([rawItem("review_removed")])).toThrow();
    expect(() =>
      page([rawItem("review_assigned", { id: "not-a-uuid" })]),
    ).toThrow();
    expect(() =>
      page([rawItem("review_assigned"), rawItem("review_assigned")]),
    ).toThrow();
    expect(() =>
      page([rawItem("review_assigned")], { enabled: "yes" }),
    ).toThrow();
    expect(() =>
      page([rawItem("review_assigned")], { nextCursor: "bad\u0000cursor" }),
    ).toThrow();
    expect(() =>
      page(
        Array.from({ length: 21 }, (_, index) =>
          rawItem("review_assigned", {
            id: `${String(index).padStart(8, "0")}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,
          }),
        ),
      ),
    ).toThrow();
  });
});

describe("closed notifications adapter", () => {
  async function call(
    request: Request,
    options: {
      token?: string | null;
      fetcher?: typeof fetch;
      environment?: Record<string, string | undefined>;
    } = {},
  ) {
    return proxyMemoryNotifications(
      request,
      options.environment ?? env,
      async () =>
        options.token === undefined ? "native-token" : options.token,
      options.fetcher,
    );
  }

  it("requires the reviewed Core connection and never dispatches without it", async () => {
    let called = 0;
    const fetcher = (async () => {
      called += 1;
      return Response.json({}, { headers: json });
    }) as unknown as typeof fetch;
    expect(targetForMemoryNotifications({})).toBeNull();
    expect(
      targetForMemoryNotifications({
        ...env,
        CAPIRO_PREVIEW_READ_ONLY: "true",
      }),
    ).toBeNull();
    const response = await call(
      new Request("https://app.test/api/meri/notifications?limit=20"),
      { fetcher, environment: {} },
    );
    expect(response.status).toBe(503);
    expect(called).toBe(0);
  });

  it("refuses a wrong method, path, query or browser-supplied authority before dispatch", async () => {
    let called = 0;
    let tokens = 0;
    const fetcher = (async () => {
      called += 1;
      return Response.json({}, { headers: json });
    }) as unknown as typeof fetch;
    const proxy = (request: Request) =>
      proxyMemoryNotifications(
        request,
        env,
        async () => {
          tokens += 1;
          return "native-token";
        },
        fetcher,
      );
    const post = await proxy(
      new Request("https://app.test/api/meri/notifications?limit=20", {
        method: "POST",
      }),
    );
    expect(post.status).toBe(405);
    const wrongPath = await proxy(
      new Request("https://app.test/api/meri/notifications/other?limit=20"),
    );
    expect(wrongPath.status).toBe(400);
    const wrongLimit = await proxy(
      new Request("https://app.test/api/meri/notifications?limit=50"),
    );
    expect(wrongLimit.status).toBe(400);
    const extraParam = await proxy(
      new Request("https://app.test/api/meri/notifications?limit=20&tenant=x"),
    );
    expect(extraParam.status).toBe(400);
    const duplicated = await proxy(
      new Request("https://app.test/api/meri/notifications?limit=20&limit=20"),
    );
    expect(duplicated.status).toBe(400);
    const badCursor = await proxy(
      new Request(
        `https://app.test/api/meri/notifications?limit=20&cursor=${encodeURIComponent("a b")}`,
      ),
    );
    expect(badCursor.status).toBe(400);
    const browserAuthority = await proxy(
      new Request("https://app.test/api/meri/notifications?limit=20", {
        headers: { Authorization: "Bearer browser-supplied" },
      }),
    );
    expect(browserAuthority.status).toBe(400);
    expect(called).toBe(0);
    expect(tokens).toBe(0);
  });

  it("requires a current native token and forwards only the closed read", async () => {
    const seen: Array<{ url: string; authorization: string | null }> = [];
    const fetcher = (async (url: string | URL, init?: RequestInit) => {
      seen.push({
        url: String(url),
        authorization: new Headers(init?.headers).get("authorization"),
      });
      // Actual Core listNotifications wire has no browser-envelope schemaVersion.
      return new Response(
        JSON.stringify({
          enabled: true,
          items: [rawItem("review_assigned")],
          nextCursor: null,
        }),
        {
          status: 200,
          headers: json,
        },
      );
    }) as unknown as typeof fetch;
    const unsigned = await call(
      new Request("https://app.test/api/meri/notifications?limit=20"),
      { fetcher, token: null },
    );
    expect(unsigned.status).toBe(401);
    expect(seen).toHaveLength(0);
    const ok = await call(
      new Request("https://app.test/api/meri/notifications?limit=20", {
        headers: { Accept: "application/json" },
      }),
      { fetcher },
    );
    expect(ok.status).toBe(200);
    expect(seen[0]?.url).toBe(
      "https://core.test/api/memory/review/notifications?limit=20",
    );
    expect(seen[0]?.authorization).toBe("Bearer native-token");
    const body = (await ok.json()) as {
      schemaVersion: string;
      items: unknown[];
    };
    expect(body.schemaVersion).toBe("meri.memory-notifications/1");
    expect(body.items).toHaveLength(1);
  });

  it("never turns a refused or changed upstream read into an empty page", async () => {
    const refused = (async () =>
      new Response(JSON.stringify({ message: "no" }), {
        status: 403,
        headers: json,
      })) as unknown as typeof fetch;
    const denied = await call(
      new Request("https://app.test/api/meri/notifications?limit=20"),
      { fetcher: refused },
    );
    expect(denied.status).toBe(403);
    const broken = (async () =>
      new Response(JSON.stringify({ items: [], nextCursor: null }), {
        status: 200,
        headers: json,
      })) as unknown as typeof fetch;
    const unavailable = await call(
      new Request("https://app.test/api/meri/notifications?limit=20"),
      { fetcher: broken },
    );
    expect(unavailable.status).toBe(503);
    const wrongEnvelope = await call(
      new Request("https://app.test/api/meri/notifications?limit=20"),
      { fetcher: (async () => Response.json(page([]))) as typeof fetch },
    );
    expect(wrongEnvelope.status).toBe(503);
    const failed = (async () =>
      new Response(JSON.stringify({ message: "boom" }), {
        status: 500,
        headers: json,
      })) as unknown as typeof fetch;
    const server = await call(
      new Request("https://app.test/api/meri/notifications?limit=20"),
      { fetcher: failed },
    );
    expect(server.status).toBe(503);
  });
});

describe("browser notifications client", () => {
  it("expires access on a refused read and never publishes a stale response", async () => {
    let lost = 0;
    const denied = createMemoryNotificationsClient(
      () => true,
      () => (lost += 1),
      (async () =>
        new Response(JSON.stringify({ error: { code: "ACCESS_DENIED" } }), {
          status: 403,
          headers: json,
        })) as unknown as typeof fetch,
    );
    await expect(
      denied.list({ cursor: null }, new AbortController().signal),
    ).rejects.toThrow();
    expect(lost).toBe(1);

    let current = true;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const late = createMemoryNotificationsClient(
      () => current,
      () => (lost += 1),
      (async () => {
        await gate;
        return new Response(
          JSON.stringify(page([rawItem("review_assigned")])),
          { status: 200, headers: json },
        );
      }) as unknown as typeof fetch,
    );
    const pending = late.list({ cursor: null }, new AbortController().signal);
    current = false;
    release();
    await expect(pending).rejects.toThrow();
    expect(lost).toBe(1);
  });
});

describe("joined updates projection", () => {
  const required = rawItem("review_assigned", {
    id: "11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    title: "Assignment",
    createdAt: "2026-10-27T11:00:00.000Z",
  });
  const optional = rawItem("review_approved", {
    id: "22222222-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    title: "Approved outcome",
    createdAt: "2026-10-27T09:00:00.000Z",
  });
  const feed = page([required, optional]);

  function project(preferences: UserPreferences | null) {
    return projectUpdates({
      notifications: { state: "observed", page: feed },
      runs: { state: "observed", runs: [completedRun()] },
      preferences,
    });
  }

  it("keeps mandatory notices while every personal toggle is false", () => {
    const projection = project({
      ...USER_PREFERENCE_DEFAULTS,
      notifications: {
        runCompleted: false,
        approvalRequested: false,
        memoryReviewed: false,
      },
    });
    expect(projection.notices.map((notice) => notice.id)).toEqual([
      "memory-review:11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    ]);
    expect(projection.notices[0]?.delivery).toBe("required");
    expect(projection.notices[0]?.governedBy).toBeNull();
    expect(projection.withheldOptional).toBe(2);
    expect(projection.state).toBe("ready");
  });

  it("hides only the optional rows each saved key governs", () => {
    const memoryOff = project({
      ...USER_PREFERENCE_DEFAULTS,
      notifications: {
        runCompleted: true,
        approvalRequested: true,
        memoryReviewed: false,
      },
    });
    // Newest observed occurrence first: the run outcome (12:00Z) precedes the assignment (11:00Z).
    expect(memoryOff.notices.map((notice) => notice.id)).toEqual([
      "run-outcome:dddddddd-dddd-4ddd-8ddd-dddddddddddd:eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      "memory-review:11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    ]);
    const runsOff = project({
      ...USER_PREFERENCE_DEFAULTS,
      notifications: {
        runCompleted: false,
        approvalRequested: true,
        memoryReviewed: true,
      },
    });
    expect(runsOff.notices.map((notice) => notice.id)).toEqual([
      "memory-review:11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "memory-review:22222222-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    ]);
    const all = project({ ...USER_PREFERENCE_DEFAULTS });
    expect(all.notices).toHaveLength(3);
    expect(all.notices.map((notice) => notice.occurredAt)).toEqual([
      "2026-10-27T12:00:00.000Z",
      "2026-10-27T11:00:00.000Z",
      "2026-10-27T09:00:00.000Z",
    ]);
    const runNotice = all.notices.find(
      (notice) => notice.source === "run-outcome",
    );
    expect(runNotice?.run).toEqual({
      conversationId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      runId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    });
    expect(runNotice?.read).toBeNull();
  });

  it("separates unavailable, empty, suppressed and unverified preferences", () => {
    const unavailable = projectUpdates({
      notifications: { state: "unavailable", page: null },
      runs: { state: "unavailable", runs: [] },
      preferences: { ...USER_PREFERENCE_DEFAULTS },
    });
    expect(unavailable.state).toBe("unavailable");
    expect(unavailable.notices).toHaveLength(0);

    const empty = projectUpdates({
      notifications: { state: "observed", page: page([]) },
      runs: { state: "observed", runs: [] },
      preferences: { ...USER_PREFERENCE_DEFAULTS },
    });
    expect(empty.state).toBe("empty");

    const suppressed = projectUpdates({
      notifications: { state: "observed", page: page([optional]) },
      runs: { state: "observed", runs: [completedRun()] },
      preferences: {
        ...USER_PREFERENCE_DEFAULTS,
        notifications: {
          runCompleted: false,
          approvalRequested: false,
          memoryReviewed: false,
        },
      },
    });
    expect(suppressed.state).toBe("suppressed");
    expect(suppressed.withheldOptional).toBe(2);

    const unverified = projectUpdates({
      notifications: { state: "observed", page: feed },
      runs: { state: "observed", runs: [] },
      preferences: null,
    });
    expect(unverified.preferences).toBe("unverified");
    expect(unverified.notices).toHaveLength(1);
    expect(unverified.withheldOptional).toBe(1);
    // Rows are shown but the page is not a verified ready page: unverified
    // preferences are never reported as a saved false preference.
    expect(unverified.state).toBe("partial");
    expect(unverified.withheldReason).toBe("preferences-unverified");
    expect(suppressed.withheldReason).toBe("saved-preference");
    // A missing source can never be reported as a clean empty page.
    const missingOne = projectUpdates({
      notifications: { state: "unavailable", page: null },
      runs: { state: "observed", runs: [] },
      preferences: { ...USER_PREFERENCE_DEFAULTS },
    });
    expect(missingOne.state).toBe("partial");
    expect(missingOne.notices).toHaveLength(0);

    const notEnabled = projectUpdates({
      notifications: { state: "observed", page: page([], { enabled: false }) },
      runs: { state: "observed", runs: [] },
      preferences: { ...USER_PREFERENCE_DEFAULTS },
    });
    expect(notEnabled.memoryNotifications).toBe("not-enabled");
    expect(notEnabled.state).toBe("empty");
    expect(JSON.stringify(notEnabled)).not.toMatch(/caught up|unread|count/i);
  });

  it("uses approvalRequested for waiting runs without suppressing mandatory decisions", () => {
    const waiting = completedRun({ state: "waiting-for-approval" });
    const input = {
      notifications: { state: "observed" as const, page: feed },
      runs: { state: "observed" as const, runs: [waiting] },
    };
    const enabled = projectUpdates({
      ...input,
      preferences: USER_PREFERENCE_DEFAULTS,
    });
    const notice = enabled.notices.find((row) => row.source === "run-approval");
    expect(notice?.governedBy).toBe("approvalRequested");
    expect(notice?.title).toBe("Run waiting for approval");
    expect(notice?.detail).toContain("does not establish that you can approve");
    expect(notice?.read).toBeNull();
    expect(enabled.runCoverage).toBe("paged-observation");
    const disabled = projectUpdates({
      ...input,
      preferences: applyNotificationPreference(
        USER_PREFERENCE_DEFAULTS,
        "approvalRequested",
        false,
      ),
    });
    expect(disabled.notices.some((row) => row.source === "run-approval")).toBe(
      false,
    );
    expect(
      disabled.notices.filter((row) => row.delivery === "required"),
    ).toHaveLength(1);
    expect(
      disabled.notices.some((row) => row.governedBy === "memoryReviewed"),
    ).toBe(true);
    expect(disabled.withheldOptional).toBe(1);
    const unknown = projectUpdates({ ...input, preferences: null });
    expect(
      unknown.notices.filter((row) => row.delivery === "required"),
    ).toHaveLength(1);
    expect(unknown.withheldReason).toBe("preferences-unverified");
  });
});

describe("revisioned preference save and reload", () => {
  it("removes only the optional rows a saved key governs and preserves unrelated values", async () => {
    const client = new QueryClient();
    const journal = userPreferencesJournal(client, owner);
    const store = preferencesStore();
    const controller = new UserPreferencesController(
      owner,
      store.port,
      journal,
    );
    controller.attach();
    await controller.load();
    expect(controller.snapshot().status).toBe("ready");
    const before = controller.snapshot().document;
    expect(before).toBeDefined();
    const feed = page([
      rawItem("review_changes_requested", {
        id: "33333333-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
      rawItem("review_approved", {
        id: "44444444-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
    ]);
    const projected = projectUpdates({
      notifications: { state: "observed", page: feed },
      runs: { state: "observed", runs: [completedRun()] },
      preferences: before?.preferences ?? null,
    });
    expect(projected.notices).toHaveLength(3);

    const next = applyNotificationPreference(
      applyNotificationPreference(
        before?.preferences as UserPreferences,
        "memoryReviewed",
        false,
      ),
      "runCompleted",
      false,
    );
    await controller.save(next);
    expect(controller.snapshot().status).toBe("saved");
    await controller.load();
    expect(controller.snapshot().status).toBe("ready");
    const after = controller.snapshot().document;
    expect(after?.revision).toBe((before?.revision ?? 0) + 1);
    expect(after?.preferences.notifications).toEqual({
      runCompleted: false,
      approvalRequested: true,
      memoryReviewed: false,
    });
    expect(after?.preferences.theme).toBe(before?.preferences.theme);
    expect(after?.preferences.density).toBe(before?.preferences.density);
    expect(after?.preferences.timezone).toBe(before?.preferences.timezone);
    expect(after?.preferences.defaultModel).toEqual(
      before?.preferences.defaultModel,
    );
    const reloaded = projectUpdates({
      notifications: { state: "observed", page: feed },
      runs: { state: "observed", runs: [completedRun()] },
      preferences: after?.preferences ?? null,
    });
    expect(reloaded.notices.map((notice) => notice.id)).toEqual([
      "memory-review:33333333-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    ]);
    expect(reloaded.notices[0]?.delivery).toBe("required");
    expect(reloaded.withheldOptional).toBe(2);
  });

  it("keeps unrelated stored preferences through a revision conflict", async () => {
    const client = new QueryClient();
    const journal = userPreferencesJournal(client, owner);
    const store = preferencesStore();
    const controller = new UserPreferencesController(
      owner,
      store.port,
      journal,
    );
    controller.attach();
    await controller.load();
    const document = controller.snapshot().document;
    store.set("conflict");
    await controller.save(
      applyNotificationPreference(
        document?.preferences as UserPreferences,
        "memoryReviewed",
        false,
      ),
    );
    expect(controller.snapshot().status).toBe("conflict");
    expect(journal.read().status).toBe("idle");
    expect(store.state.revision).toBe(document?.revision);
    expect(store.state.preferences.notifications.memoryReviewed).toBe(true);
    expect(store.state.preferences.theme).toBe("dark");
    expect(store.state.preferences.timezone).toBe("America/New_York");
  });

  it("never reports saved for an uncertain commit or a revoked membership", async () => {
    const client = new QueryClient();
    const journal = userPreferencesJournal(client, owner);
    const store = preferencesStore();
    const controller = new UserPreferencesController(
      owner,
      store.port,
      journal,
    );
    controller.attach();
    await controller.load();
    const document = controller.snapshot().document;
    store.set("unknown");
    await controller.save(
      applyNotificationPreference(
        document?.preferences as UserPreferences,
        "memoryReviewed",
        false,
      ),
    );
    expect(controller.snapshot().status).toBe("unknown");
    expect(controller.snapshot().message).toMatch(/uncertain/);

    const revokedJournal = userPreferencesJournal(client, owner);
    const revokedStore = preferencesStore();
    revokedStore.set("revoked");
    const revoked = new UserPreferencesController(
      owner,
      revokedStore.port,
      revokedJournal,
    );
    revoked.attach();
    revokedJournal.write({ status: "saved" });
    await revoked.load();
    expect(revoked.snapshot().status).toBe("access-lost");
    expect(revoked.snapshot().document).toBeUndefined();
    expect(revoked.snapshot().message).toMatch(/cleared/);
  });

  it("does not reuse another account's or tenant's attempts", () => {
    const client = new QueryClient();
    const mine = userPreferencesJournal(client, owner);
    mine.write({ status: "pending" });
    expect(mine.read().status).toBe("pending");
    const theirs = userPreferencesJournal(client, other);
    expect(theirs.read().status).toBe("idle");
  });
});

describe("revisioned controls rendering", () => {
  it("renders only supported toggles with mandatory messaging and no caught-up claim", () => {
    const html = renderToStaticMarkup(
      createElement(NotificationCategoryControls, {
        preferences: {
          ...USER_PREFERENCE_DEFAULTS,
          notifications: {
            runCompleted: false,
            approvalRequested: true,
            memoryReviewed: true,
          },
        },
        editable: true,
        unavailable: "Unavailable",
        onChange: () => undefined,
      }),
    );
    expect(html).toContain('data-category="run-outcomes"');
    expect(html).toContain('data-control="revisioned"');
    expect(html).toContain('data-category="decisions"');
    expect(html).not.toContain('data-control="unavailable"');
    expect(html).toContain('data-category="connections"');
    expect(html).toContain('data-control="unsupported"');
    expect(html).toContain("Always delivered");
    expect(html).toContain("never mapped to memoryReviewed");
    expect(html).toContain("visible runs currently waiting for approval");
    expect(html).not.toMatch(/caught up|all caught up|preview/i);
    expect(html).toMatch(/aria-pressed="false"/);
    expect(html).toMatch(/aria-pressed="true"/);
  });

  it("disables every control when the saved document is not editable", () => {
    const html = renderToStaticMarkup(
      createElement(NotificationCategoryControls, {
        preferences: { ...USER_PREFERENCE_DEFAULTS },
        editable: false,
        unavailable: "Settings are unavailable",
        onChange: () => undefined,
      }),
    );
    expect(html).toContain("Settings are unavailable");
    // Every control is disabled and no category can be changed; a disabled control
    // still displays the saved value it would change.
    expect(html.match(/disabled=""/g)).toHaveLength(
      NOTIFICATION_CATEGORIES.length,
    );
    expect(html).not.toMatch(/title="(?!Settings are unavailable)/);
  });
});
