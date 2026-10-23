import { confirmReviewedMappings } from "./mappings/bulkReview";
import {
  reconcileSettingsWrite,
  settingsWriteNeedsReadback,
} from "./security-write-reconciliation";
import { describe, expect, it, vi } from "vitest";
import { CapiroApiError } from "../../shared/capiro/http";
import { settingsOperations } from "../../shared/capiro/operations/settings";
import {
  assertSettingsReceipt,
  isDefiniteSettingsRejection,
  snapshotSettingsWrite,
} from "./security-writes";
import {
  clearSettingsWrite,
  persistSettingsWrite,
  restoreSettingsWrite,
} from "./security-write-journal";

const fixture = (operation: string, input: unknown) =>
  snapshotSettingsWrite(operation, input);
const negativeReceipts = [
  [
    "team.invite",
    { body: { email: "right@example.test", role: "standard_user" } },
    { invitation: { email: "wrong@example.test", role: "standard_user" } },
  ],
  [
    "team.setRole",
    { params: { userId: "right" }, body: { role: "user_admin" } },
    { member: { localUserId: "wrong" }, role: "user_admin" },
  ],
  [
    "team.setBillingAdmin",
    { params: { userId: "right" }, body: { billingAdmin: true } },
    { userId: "right", billingAdmin: false },
  ],
  [
    "hq.tenants.create",
    {
      body: { slug: "right", name: "Right", adminEmail: "right@example.test" },
    },
    {
      tenant: { slug: "wrong", name: "Right" },
      invitation: { email: "right@example.test" },
    },
  ],
  [
    "hq.tenants.delete",
    { params: { tenantId: "right" } },
    { deletedTenantId: "wrong" },
  ],
  ["hq.customers.comp", { body: { comped: true } }, { status: "none" }],
  [
    "hq.ai.setCredential",
    { body: { provider: "openai", apiKey: "secret1234" } },
    {
      provider: "anthropic",
      status: "active",
      last4: "1234",
      modelOverride: null,
    },
  ],
  [
    "hq.ai.updateModel",
    {
      body: {
        provider: "openai",
        modelOverride: "gpt-6.1-sol",
        expectedUpdatedAt: "old",
      },
    },
    { provider: "openai", modelOverride: "gpt-6.1-sol", updatedAt: "old" },
  ],
  ["hq.ai.removeCredential", {}, { removed: false }],
  [
    "hq.broadcasts.send",
    {
      body: {
        tenantId: "right",
        title: "Title",
        body: "Text",
        audience: "selected_users",
        userIds: ["u1"],
      },
    },
    {
      tenantId: "right",
      title: "Title",
      body: "Text",
      audience: "selected_users",
      recipients: [{ userId: "u2" }],
    },
  ],
  [
    "hq.broadcasts.archive",
    { params: { id: "right" } },
    { id: "wrong", archivedAt: "now" },
  ],
  [
    "mappings.confirmIndividual",
    { params: { mappingId: "right" }, body: { confirmed: true } },
    { id: "wrong", confirmed: true },
  ],
  [
    "mappings.manual",
    {
      params: { clientId: "right" },
      body: { source: "lda", externalId: "external" },
    },
    {
      clientId: "wrong",
      source: "lda",
      externalId: "external",
      confirmed: true,
    },
  ],
  [
    "analyst.programMatches.decide",
    { params: { id: "right" }, body: { decision: "accept" } },
    { id: "right", decision: "accept", status: "rejected" },
  ],
  [
    "analyst.aliases.delete",
    { params: { id: "right" } },
    { id: "wrong", deleted: true },
  ],
  [
    "analyst.programs.merge",
    { body: { keepProgramId: "keep", mergeProgramId: "merge" } },
    { keepProgramId: "merge", mergeProgramId: "keep" },
  ],
] as const;

describe("A1 Settings receipt boundaries", () => {
  it("generic branding writes reject logo object fields before dispatch", () => {
    const schema = settingsOperations["settings.branding.update"].request;
    expect(schema.safeParse({ body: { name: "Allowed" } }).success).toBe(true);
    expect(
      schema.safeParse({
        body: { name: "Allowed", logoS3Key: "other/logo.png" },
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        body: { name: "Allowed", logoContentType: "image/png" },
      }).success,
    ).toBe(false);
  });
  it.each(negativeReceipts)(
    "rejects a mismatched %s receipt",
    (operation, input, result) => {
      expect(() =>
        assertSettingsReceipt(fixture(`settings.${operation}`, input), result),
      ).toThrow("not confirmed");
    },
  );
  it("readback confirms the exact member value and does not infer a role from an absent row", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce([{ userId: "other", role: "user_admin" }])
      .mockResolvedValueOnce([{ userId: "right", role: "standard_user" }])
      .mockResolvedValueOnce([{ userId: "right", role: "user_admin" }]);
    const write = fixture("settings.team.setRole", {
      params: { userId: "right" },
      body: { role: "user_admin" },
    });
    const api = { request } as unknown as Parameters<
      typeof reconcileSettingsWrite
    >[0];
    const signal = new AbortController().signal;
    expect(await reconcileSettingsWrite(api, write, signal)).toBe(false);
    expect(await reconcileSettingsWrite(api, write, signal)).toBe(false);
    expect(await reconcileSettingsWrite(api, write, signal)).toBe(true);
    expect(
      request.mock.calls.every(
        ([operation]) => operation === "settings.team.list",
      ),
    ).toBe(true);
  });
  it("requires exact resolved queue rows, including bounded pagination", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        data: [{ id: "other", status: "confirmed" }],
        page: 1,
        limit: 100,
        total: 101,
      })
      .mockResolvedValueOnce({
        data: [{ id: "right", status: "confirmed" }],
        page: 2,
        limit: 100,
        total: 101,
      })
      .mockResolvedValueOnce({ data: [], page: 1, limit: 100, total: 0 });
    const api = { request } as unknown as Parameters<
      typeof reconcileSettingsWrite
    >[0];
    const write = fixture("settings.analyst.personCandidates.decide", {
      params: { id: "right" },
      body: { decision: "confirm" },
    });
    expect(
      await reconcileSettingsWrite(api, write, new AbortController().signal),
    ).toBe(true);
    expect(
      await reconcileSettingsWrite(api, write, new AbortController().signal),
    ).toBe(false);
    expect(request.mock.calls[1]?.[1]).toEqual({
      query: { status: "confirmed", page: 2, limit: 100 },
    });
  });
  it("refuses cancelled readback before any request", async () => {
    const request = vi.fn();
    const control = new AbortController();
    control.abort();
    await expect(
      reconcileSettingsWrite(
        { request } as unknown as Parameters<typeof reconcileSettingsWrite>[0],
        fixture("settings.team.remove", { params: { userId: "right" } }),
        control.signal,
      ),
    ).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
  it("never treats absence of a durable invitation/send/key-rotation receipt as permission to retry", async () => {
    const request = vi.fn();
    for (const operation of [
      "settings.team.invite",
      "settings.hq.broadcasts.send",
      "settings.hq.ai.setCredential",
    ])
      expect(
        await reconcileSettingsWrite(
          { request } as unknown as Parameters<
            typeof reconcileSettingsWrite
          >[0],
          fixture(operation, {}),
          new AbortController().signal,
        ),
      ).toBe(false);
    expect(request).not.toHaveBeenCalled();
    expect(settingsWriteNeedsReadback("settings.team.remove")).toBe(true);
    expect(
      settingsWriteNeedsReadback("settings.analyst.personCandidates.decide"),
    ).toBe(true);
  });
  it("only definite API rejection unlocks, never network, malformed response or 5xx", () => {
    expect(isDefiniteSettingsRejection(new CapiroApiError(403, "denied"))).toBe(
      true,
    );
    for (const error of [
      new Error("response lost"),
      new CapiroApiError(500, "after commit"),
      new CapiroApiError(502, "bad receipt"),
      new DOMException("aborted", "AbortError"),
    ])
      expect(isDefiniteSettingsRejection(error)).toBe(false);
  });
});

function storage() {
  const records = new Map<string, string>();
  return {
    records,
    getItem: (key: string) => records.get(key) ?? null,
    setItem: (key: string, value: string) => {
      records.set(key, value);
    },
    removeItem: (key: string) => {
      records.delete(key);
    },
  };
}
describe("A1 nonreplayable recovery metadata", () => {
  it("captures a frozen request and removes raw credentials from memory and persistent recovery", async () => {
    const input = {
      params: { tenantId: "tenant" },
      body: {
        provider: "openai",
        apiKey: "secret-key-1234",
        modelOverride: "model",
      },
    };
    const write = fixture("settings.hq.ai.setCredential", input);
    input.body.provider = "anthropic";
    expect(write.input.body?.provider).toBe("openai");
    expect(write.input.body?.apiKey).toBeUndefined();
    expect(write.input.body?.keyLast4).toBe("1234");
    const store = storage();
    await persistSettingsWrite(store, "scope", write, input);
    const text = store.getItem("scope")!;
    expect(text).not.toContain("secret-key");
    expect(JSON.parse(text).requestHash).toMatch(/^[a-f0-9]{64}$/);
    expect(restoreSettingsWrite(store, "scope")?.state).toBe("unknown");
  });
  it("retains only exact target IDs, request digest and nonsecret expected values across reload", async () => {
    const store = storage();
    const input = {
      body: {
        tenantId: "target",
        title: "private title",
        body: "private body",
        audience: "all_users",
      },
    };
    await persistSettingsWrite(
      store,
      "actor-session-a",
      fixture("settings.hq.broadcasts.send", input),
      input,
    );
    expect(store.getItem("actor-session-a")).not.toContain("private");
    expect(restoreSettingsWrite(store, "actor-session-a")?.operation).toBe(
      "settings.hq.broadcasts.send",
    );
    expect(restoreSettingsWrite(store, "actor-session-b")).toBeUndefined();
  });
  it("corrupt recovery records stay fenced instead of silently permitting another dispatch", () => {
    const store = storage();
    store.setItem("scope", "not valid json");
    expect(restoreSettingsWrite(store, "scope")).toMatchObject({
      operation: "settings.unconfirmed",
      state: "unknown",
    });
  });
});

it("accepts the backend's canonicalized invitation email and refuses a different address", () => {
  const write = fixture("settings.team.invite", {
    body: { email: "Member@Example.test", role: "user_admin" },
  });
  expect(() =>
    assertSettingsReceipt(write, {
      invitation: { email: "member@example.test", role: "user_admin" },
    }),
  ).not.toThrow();
  expect(() =>
    assertSettingsReceipt(write, {
      invitation: { email: "other@example.test", role: "user_admin" },
    }),
  ).toThrow();
});
it("HQ resend binds a canonical admin email to the exact tenant and administrator role", () => {
  const write = fixture("settings.hq.tenants.resendInvitation", {
    params: { tenantId: "target" },
    body: { email: "Admin@Example.test" },
  });
  const receipt = {
    invitationId: "fresh",
    tenantId: "target",
    email: "admin@example.test",
    role: "user_admin",
  };
  expect(() => assertSettingsReceipt(write, receipt)).not.toThrow();
  for (const wrong of [
    { tenantId: "other" },
    { email: "other@example.test" },
    { role: "user" },
    { invitationId: "" },
  ])
    expect(() =>
      assertSettingsReceipt(write, { ...receipt, ...wrong }),
    ).toThrow("not confirmed");
});
it("unqualified security-write receipts never fall through to success", () => {
  expect(() =>
    assertSettingsReceipt(
      fixture("settings.hq.tenants.resendInvitation", {
        params: { tenantId: "target" },
        body: { email: "target@example.test" },
      }),
      { invitationId: "some-other-invitation" },
    ),
  ).toThrow("not confirmed");
});
it("a resend requires the returned invitation to belong to the originally reviewed email and role", async () => {
  const write = fixture("settings.team.resend", {
    params: { invitationId: "original" },
  });
  write.expectedInvitation = {
    email: "target@example.test",
    role: "user_admin",
  };
  assertSettingsReceipt(write, { invitationId: "new" });
  const request = vi
    .fn()
    .mockResolvedValueOnce([
      { id: "new", email: "other@example.test", role: "user_admin" },
    ])
    .mockResolvedValueOnce([
      { id: "new", email: "target@example.test", role: "user_admin" },
    ]);
  const api = { request } as unknown as Parameters<
    typeof reconcileSettingsWrite
  >[0];
  expect(
    await reconcileSettingsWrite(api, write, new AbortController().signal),
  ).toBe(false);
  expect(
    await reconcileSettingsWrite(api, write, new AbortController().signal),
  ).toBe(true);
});

it("a late completion cannot erase a newer recovery record", async () => {
  const store = storage();
  const first = fixture("settings.team.remove", {
    params: { userId: "first" },
  });
  const second = fixture("settings.team.remove", {
    params: { userId: "second" },
  });
  await persistSettingsWrite(store, "scope", second, second.input);
  clearSettingsWrite(store, "scope", first);
  expect(restoreSettingsWrite(store, "scope")?.input.params?.userId).toBe(
    "second",
  );
  clearSettingsWrite(store, "scope", second);
  expect(restoreSettingsWrite(store, "scope")).toBeUndefined();
});

it("a bulk decision freezes its reviewed IDs and stops after scope cancellation", async () => {
  const control = new AbortController();
  const mappings = [{ id: "first" }, { id: "second" }];
  const confirm = vi.fn(async (id: string) => {
    mappings[1]!.id = "unreviewed";
    control.abort();
    return { id, confirmed: true };
  });
  await expect(
    confirmReviewedMappings(mappings, control.signal, confirm),
  ).rejects.toThrow("1 mappings confirmed");
  expect(confirm.mock.calls).toHaveLength(1);
  expect(confirm.mock.calls[0]?.[0]).toBe("first");
});
