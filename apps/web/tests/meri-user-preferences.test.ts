import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  USER_PREFERENCE_DEFAULTS,
  receiveUserPreferencesRequest,
  receiveUserPreferencesResponse,
  type UserPreferences,
  type UserPreferencesSaveRequest,
} from "@capiro/meri-client/user-preferences";
import { UserPreferencesController } from "../src/shared/meri-user-preferences/controller";
import { userPreferencesJournal } from "../src/shared/meri-user-preferences/journal";
import {
  userPreferencesTransport,
  PreferencesAccessLost,
} from "../src/shared/meri-user-preferences/transport";
import {
  modelCatalog,
  currentPreferencesFixture,
} from "./meri-user-preferences-fixtures";
import archived from "../test/browser/user-preferences-fixture.json" with { type: "json" };

const owner = {
  tenantId: "20000000-0000-4000-8000-000000000001",
  actorId: "10000000-0000-4000-8000-000000000001",
};
const document = (
  revision = 3,
  preferences: UserPreferences = structuredClone(USER_PREFERENCE_DEFAULTS),
) => ({ owner, revision, preferences, modelCatalog });

describe("current synthetic preferences fixture receiving", () => {
  it("keeps the historical read and save request refused by the current contract", async () => {
    await expect(
      receiveUserPreferencesResponse(
        "read",
        200,
        JSON.stringify(archived.read),
        {
          owner: archived.read.owner,
        },
      ),
    ).rejects.toMatchObject({ code: "USER_PREFERENCES_SHAPE" });
    await expect(
      receiveUserPreferencesRequest("save", JSON.stringify(archived.request)),
    ).rejects.toMatchObject({ code: "USER_PREFERENCES_SHAPE" });
    expect(archived.read.preferences).not.toHaveProperty("defaultModel");
    expect(archived.read).not.toHaveProperty("modelCatalog");
  });
  it("admits the complete current read, captured save and readback without altering retained fields", async () => {
    const current = currentPreferencesFixture;
    const request = await receiveUserPreferencesRequest(
      "save",
      JSON.stringify(current.request),
    );
    expect(request).toEqual(current.request);
    for (const key of ["read", "readback"] as const) {
      expect(
        await receiveUserPreferencesResponse(
          "read",
          200,
          JSON.stringify(current[key]),
          {
            owner: current.read.owner,
          },
        ),
      ).toEqual(current[key]);
      const { defaultModel, ...preferences } = current[key].preferences;
      expect(defaultModel).toBeNull();
      expect(preferences).toEqual(archived[key].preferences);
    }
    expect(
      await receiveUserPreferencesResponse(
        "save",
        200,
        JSON.stringify(current.save),
        {
          owner: current.read.owner,
          request,
        },
      ),
    ).toEqual(current.save);
  });
  it("still rejects a foreign owner and a mismatched saved preference", async () => {
    const current = currentPreferencesFixture;
    const request = await receiveUserPreferencesRequest(
      "save",
      JSON.stringify(current.request),
    );
    await expect(
      receiveUserPreferencesResponse(
        "read",
        200,
        JSON.stringify({
          ...current.read,
          owner: { ...current.read.owner, actorId: "foreign" },
        }),
        { owner: current.read.owner },
      ),
    ).rejects.toMatchObject({ code: "USER_PREFERENCES_CORRELATION" });
    await expect(
      receiveUserPreferencesResponse(
        "save",
        200,
        JSON.stringify({
          ...current.save,
          preferences: { ...current.save.preferences, theme: "light" },
        }),
        { owner: current.read.owner, request },
      ),
    ).rejects.toMatchObject({ code: "USER_PREFERENCES_CORRELATION" });
  });
});
const changed = (): UserPreferences => ({
  ...structuredClone(USER_PREFERENCE_DEFAULTS),
  defaultModel: { ...modelCatalog.defaultSelection, effort: "high" },
  theme: "dark",
  density: "compact",
  timezone: "America/New_York",
  notifications: {
    runCompleted: false,
    approvalRequested: false,
    memoryReviewed: true,
  },
  defaultClientId: "30000000-0000-4000-8000-000000000001",
});
function setup() {
  const client = new QueryClient();
  const journal = userPreferencesJournal(client, owner);
  const read = vi.fn(async () => document());
  const save = vi.fn(async (request: UserPreferencesSaveRequest) =>
    document(request.expectedRevision + 1, request.preferences),
  );
  const controller = new UserPreferencesController(
    owner,
    { read, save },
    journal,
  );
  return { client, journal, read, save, controller };
}

describe("personal preferences captured saves and reconciliation", () => {
  it("resets supported defaults with the observed revision while preserving notification and client choices", async () => {
    const f = setup();
    const previous = changed();
    f.read.mockResolvedValue(document(9, previous));
    await f.controller.load();
    await f.controller.resetPersonalDefaults();
    const request = f.save.mock.calls[0]![0];
    expect(request).toEqual({
      expectedRevision: 9,
      preferences: {
        ...USER_PREFERENCE_DEFAULTS,
        notifications: previous.notifications,
        defaultClientId: previous.defaultClientId,
      },
    });
    await f.controller.resetPersonalDefaults();
    expect(f.save).toHaveBeenCalledTimes(1);
    f.read.mockResolvedValue(document(10, request.preferences));
    await f.controller.load();
    expect(f.controller.snapshot().status).toBe("ready");
  });
  it.each(["conflict", "unknown"] as const)(
    "holds reset after %s and recovers only by readback",
    async (outcome) => {
      const f = setup();
      await f.controller.load();
      if (outcome === "conflict")
        f.save.mockResolvedValueOnce({
          error: { code: "SETTINGS_REVISION_CONFLICT" },
        } as never);
      else
        f.save.mockRejectedValueOnce(new Error("Lost reset acknowledgement"));
      await f.controller.resetPersonalDefaults();
      await f.controller.resetPersonalDefaults();
      expect(f.controller.snapshot().status).toBe(outcome);
      expect(f.save).toHaveBeenCalledTimes(1);
      f.read.mockResolvedValue(document(4));
      await f.controller.load();
      expect(f.controller.snapshot().status).toBe("ready");
      expect(f.save).toHaveBeenCalledTimes(1);
    },
  );
  it("loads, captures all unexposed values immutably, saves once and confirms by separate read", async () => {
    const f = setup();
    await f.controller.load();
    const draft = changed();
    const original = structuredClone(draft);
    await f.controller.save(draft);
    draft.notifications.runCompleted = true;
    expect(f.save).toHaveBeenCalledTimes(1);
    const request = f.save.mock.calls[0]![0];
    expect(request).toEqual({ expectedRevision: 3, preferences: original });
    expect(Object.isFrozen(request.preferences.notifications)).toBe(true);
    expect(f.controller.snapshot().status).toBe("saved");
    await f.controller.save(changed());
    expect(f.save).toHaveBeenCalledTimes(1);
    f.read.mockResolvedValue(document(4, original));
    await f.controller.load();
    expect(f.controller.snapshot()).toMatchObject({
      status: "ready",
      document: { revision: 4, preferences: original },
    });
    expect(f.journal.read()).toEqual({ status: "idle" });
  });
  it("requires explicit reload after a revision conflict, never reapplies the old draft", async () => {
    const f = setup();
    await f.controller.load();
    f.save.mockResolvedValueOnce({
      error: { code: "SETTINGS_REVISION_CONFLICT" },
    } as never);
    await f.controller.save(changed());
    expect(f.controller.snapshot().status).toBe("conflict");
    await f.controller.save(changed());
    expect(f.save).toHaveBeenCalledTimes(1);
    f.read.mockResolvedValue(document(7));
    await f.controller.load();
    expect(f.controller.snapshot()).toMatchObject({
      status: "ready",
      document: { revision: 7, preferences: USER_PREFERENCE_DEFAULTS },
    });
  });
  it("retains the exact unknown attempt across navigation and performs only reads", async () => {
    const f = setup();
    await f.controller.load();
    f.save.mockRejectedValueOnce(new Error("Lost delivery"));
    await f.controller.save(changed());
    const attempt = f.journal.read();
    f.controller.dispose();
    expect(f.controller.snapshot().document).toBeUndefined();
    const read = vi.fn(async () => document(3));
    const remount = new UserPreferencesController(
      owner,
      { read, save: f.save },
      userPreferencesJournal(f.client, owner),
    );
    expect(remount.snapshot().status).toBe("unknown");
    await remount.load();
    remount.adoptCurrent();
    await remount.save(changed());
    expect(remount.snapshot().status).toBe("unknown");
    expect(f.journal.read()).toBe(attempt);
    expect(f.save).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledTimes(1);
  });
  it("allows explicit adoption only when a higher saved revision fences the old CAS", async () => {
    const f = setup();
    await f.controller.load();
    f.save.mockRejectedValueOnce(new Error());
    await f.controller.save(changed());
    const current = {
      ...structuredClone(USER_PREFERENCE_DEFAULTS),
      theme: "light" as const,
    };
    f.read.mockResolvedValue(document(5, current));
    await f.controller.load();
    expect(f.controller.snapshot()).toMatchObject({
      status: "unknown",
      document: { revision: 5, preferences: current },
    });
    await f.controller.save(changed());
    expect(f.save).toHaveBeenCalledTimes(1);
    f.controller.adoptCurrent();
    expect(f.controller.snapshot().status).toBe("ready");
    await f.controller.save(current);
    expect(f.save.mock.calls[1]![0]).toEqual({
      expectedRevision: 5,
      preferences: current,
    });
  });
  it("never clears an unknown write fence on a failed reconciliation read, including a revision-conflict error", async () => {
    const f = setup();
    await f.controller.load();
    f.save.mockRejectedValueOnce(new Error());
    await f.controller.save(changed());
    const attempt = f.journal.read();
    f.read.mockResolvedValueOnce({
      error: { code: "SETTINGS_REVISION_CONFLICT" },
    } as never);
    await f.controller.load();
    f.controller.adoptCurrent();
    await f.controller.save(changed());
    expect(f.journal.read()).toBe(attempt);
    expect(f.controller.snapshot().status).toBe("unknown");
    expect(f.save).toHaveBeenCalledTimes(1);
    f.read.mockResolvedValue(document(3));
    await f.controller.load();
    await f.controller.save(changed());
    expect(f.controller.snapshot().status).toBe("unknown");
    expect(f.save).toHaveBeenCalledTimes(1);
  });
  it("treats an interrupted in-flight write as unknown before disposing, ignoring its late result", async () => {
    const f = setup();
    await f.controller.load();
    let release!: (value: ReturnType<typeof document>) => void;
    f.save.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const pending = f.controller.save(changed());
    await vi.waitFor(() => expect(f.save).toHaveBeenCalledTimes(1));
    f.controller.dispose();
    expect(f.journal.read().status).toBe("unknown");
    release(document(4, changed()));
    await pending;
    expect(f.journal.read().status).toBe("unknown");
    await f.controller.save(changed());
    expect(f.save).toHaveBeenCalledTimes(1);
  });
  it("cache replacement invalidates retained requests and late reads", async () => {
    const f = setup();
    let release!: (value: ReturnType<typeof document>) => void;
    f.read.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const pending = f.controller.load();
    f.client.clear();
    release(document());
    await pending;
    expect(f.controller.snapshot().document).toBeUndefined();
    expect(f.journal.current()).toBe(false);
    await f.controller.save(changed());
    expect(f.save).not.toHaveBeenCalled();
    const next = userPreferencesJournal(f.client, owner);
    expect(next.read()).toEqual({ status: "idle" });
  });
  it.each(["UNKNOWN", "RESULT_NOT_RELEASED"] as const)(
    "preserves admitted %s before access loss and removes private content",
    async (outcome) => {
      const f = setup();
      await f.controller.load();
      f.save.mockResolvedValueOnce({
        error: { code: "ACCESS_DENIED", outcome },
      } as never);
      await f.controller.save(changed());
      expect(f.controller.snapshot()).toMatchObject({ status: "access-lost" });
      expect(f.controller.snapshot().document).toBeUndefined();
      expect(f.journal.read()).toEqual({
        status:
          outcome === "RESULT_NOT_RELEASED" ? "result-withheld" : "unknown",
        accessLost: true,
      });
      await f.controller.load();
      await f.controller.save(changed());
      expect(f.save).toHaveBeenCalledTimes(1);
    },
  );
  it("rejects a noncanonical timezone before any mutation", async () => {
    const f = setup();
    await f.controller.load();
    await f.controller.save({ ...changed(), timezone: "Not/AZone" });
    expect(f.save).not.toHaveBeenCalled();
    expect(f.controller.snapshot().status).toBe("ready");
  });
  it("reattaches under StrictMode without reviving an aborted response generation", async () => {
    const f = setup();
    let release!: (value: ReturnType<typeof document>) => void;
    f.read.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const pending = f.controller.load();
    f.controller.dispose();
    f.controller.attach();
    await f.controller.load();
    release(document(99));
    await pending;
    expect(f.controller.snapshot()).toMatchObject({
      status: "ready",
      document: { revision: 3 },
    });
  });
});

describe("native preferences browser receiving", () => {
  it("binds reads to the independently verified owner and uses cookie-only fixed requests", async () => {
    const fetcher = vi.fn(async () => Response.json(document()));
    const transport = userPreferencesTransport(owner, () => true, fetcher);
    const received = await transport.read(new AbortController().signal);
    expect(received).toEqual(document());
    expect(Object.isFrozen(received)).toBe(true);
    expect(fetcher.mock.calls[0]).toMatchObject([
      "/api/settings/user/read",
      {
        method: "POST",
        body: "{}",
        credentials: "same-origin",
        redirect: "error",
      },
    ]);
    expect(
      (fetcher.mock.calls[0] as unknown as [string, RequestInit])[1].headers,
    ).toEqual({ "Content-Type": "application/json" });
  });
  it("rejects a foreign owner, wrong saved document and wrong revision", async () => {
    for (const response of [
      {
        ...document(),
        owner: { ...owner, actorId: "10000000-0000-4000-8000-000000000002" },
      },
      document(5),
      document(4),
    ]) {
      const transport = userPreferencesTransport(
        owner,
        () => true,
        async () => Response.json(response),
      );
      await expect(
        transport.save(
          { expectedRevision: 3, preferences: changed() },
          new AbortController().signal,
        ),
      ).rejects.toThrow();
    }
  });
  it("discards a late response when the current identity changes", async () => {
    let current = true;
    const response = Response.json(document());
    const transport = userPreferencesTransport(
      owner,
      () => current,
      async () => {
        current = false;
        return response;
      },
    );
    await expect(
      transport.read(new AbortController().signal),
    ).rejects.toBeInstanceOf(PreferencesAccessLost);
    expect(response.bodyUsed).toBe(true);
  });
  it("refuses oversized and non-JSON replies", async () => {
    for (const response of [
      new Response("x".repeat(16385), {
        headers: { "content-type": "application/json" },
      }),
      new Response("{}"),
    ]) {
      const transport = userPreferencesTransport(
        owner,
        () => true,
        async () => response,
      );
      await expect(
        transport.read(new AbortController().signal),
      ).rejects.toThrow();
    }
  });
  it("admits known withheld outcomes through the actual public receiver", async () => {
    const reply = {
      error: { code: "ACCESS_DENIED", outcome: "RESULT_NOT_RELEASED" },
    };
    expect(
      await receiveUserPreferencesResponse("save", 403, JSON.stringify(reply), {
        owner,
        request: { expectedRevision: 3, preferences: changed() },
      }),
    ).toEqual(reply);
  });
  it.each(["UNKNOWN", "RESULT_NOT_RELEASED"] as const)(
    "preserves admitted authentication-loss %s and clears unsigned local proxy failures",
    async (outcome) => {
      const request = { expectedRevision: 3, preferences: changed() };
      const known = {
        error: { code: "UNAUTHENTICATED", outcome },
      };
      const transport = userPreferencesTransport(
        owner,
        () => true,
        async () => Response.json(known, { status: 401 }),
      );
      expect(
        await transport.save(request, new AbortController().signal),
      ).toEqual(known);
      const local = userPreferencesTransport(
        owner,
        () => true,
        async () =>
          Response.json(
            { error: { code: "FRONTEND_USER_PREFERENCES_UNAVAILABLE" } },
            { status: 401 },
          ),
      );
      await expect(
        local.save(request, new AbortController().signal),
      ).rejects.toBeInstanceOf(PreferencesAccessLost);
    },
  );
});
