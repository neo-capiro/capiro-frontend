import { describe, expect, it, vi } from "vitest";
import { createCapiroApi } from "./http";
import { capiroOperations } from "./registry";
import { publicOnboardOperations } from "./operations/onboard-public";
import { createOnboardCoreApi } from "./onboard-core-api";
import { createOnboardFunnelApi } from "./onboard-funnel-api";
import { createOnboardSetupApi } from "./onboard-setup-api";
import { createOnboardPublicApi } from "./onboard-public-api";
import {
  validateOnboardConsentUrl,
  validateOnboardInvoiceUrl,
} from "./onboard-navigation";

const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const token = "a".repeat(64);
const base = "https://api.example.test/prefix/";
const requestId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const jobId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

/** Durable job summary Core derives from the exact normalized selection. */
function jobFor(
  payload: {
    created: number;
    items: Array<{ id: string; name: string; ldaClientId: number }>;
    skipped: Array<{ ldaClientId: number; reason: string }>;
  },
  ids: number[],
) {
  const total = new Set(ids.filter((value) => value > 0)).size;
  const created = payload.items.length;
  const rejected = payload.skipped.length;
  const processed = created + rejected;
  const counts = {
    total,
    processed,
    successful: created,
    rejected,
    outstanding: total - processed,
    created,
    alreadyPresent: 0,
  };
  const status =
    counts.outstanding === 0
      ? rejected === total
        ? "failed"
        : rejected > 0
          ? "partially_completed"
          : "completed"
      : "running";
  return { id: jobId, requestId, status, stale: false, counts };
}
function consumer(payload: unknown, status = 200) {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json(payload, { status }));
  const api = createCapiroApi(capiroOperations, { fetcher });
  return {
    api,
    fetcher,
    core: createOnboardCoreApi(api),
    setup: createOnboardSetupApi(api),
    funnel: createOnboardFunnelApi(api),
  };
}
function consent(provider: "google" | "microsoft" = "google") {
  const url = new URL(
    provider === "google"
      ? "https://accounts.google.com/o/oauth2/v2/auth"
      : "https://login.microsoftonline.com/organizations/adminconsent",
  );
  url.searchParams.set(
    "redirect_uri",
    `${base.replace(/\/$/, "")}/onboard-api/it/${provider}/callback`,
  );
  url.searchParams.set("state", "opaque-synthetic-state");
  return url.href;
}

describe("Onboard native request and receipt correlation", () => {
  it.each([
    { id: "", name: "Submitted" },
    { id: "not-a-native-client-id", name: "Submitted" },
    { id, name: "Another client" },
  ])(
    "refuses an unbound client creation receipt without retry",
    async (identity) => {
      const { core, fetcher } = consumer({
        ...identity,
        profileStatus: "client",
        status: "active",
      });
      await expect(
        core.createClient({ name: "Submitted" }),
      ).rejects.toMatchObject({ status: 502 });
      expect(fetcher).toHaveBeenCalledOnce();
    },
  );
  it("binds client creation to the captured submitted name without inventing normalization", async () => {
    const body = { name: " Submitted " };
    const receipt = {
      id,
      name: body.name,
      profileStatus: "client",
      status: "active",
    };
    const { core, fetcher } = consumer(receipt);
    const pending = core.createClient(body);
    body.name = "Replacement";
    expect(await pending).toEqual(receipt);
    expect(JSON.parse(String(fetcher.mock.calls[0]![1]!.body))).toEqual({
      body: { name: " Submitted " },
    });
  });
  it("accepts Core's normalized per-chunk receipt bound to the retained request identity", async () => {
    const payload = {
      created: 1,
      items: [{ id, name: "Created", ldaClientId: 11 }],
      skipped: [{ ldaClientId: 22, reason: "Already imported" }],
    };
    const full = { ...payload, job: jobFor(payload, [11, 11, 22]) };
    const { core, fetcher } = consumer(full);
    expect(await core.importClientChunk([11, 11, 22], requestId)).toEqual(full);
    expect(JSON.parse(String(fetcher.mock.calls[0]![1]!.body))).toEqual({
      body: { ldaClientIds: [11, 11, 22], requestId },
    });
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("does not require non-positive submitted ids in Core's normalized response", async () => {
    const payload = {
      created: 1,
      items: [{ id, name: "Created", ldaClientId: 11 }],
      skipped: [],
    };
    const { core } = consumer({
      ...payload,
      job: jobFor(payload, [11, 0, -1]),
    });
    expect((await core.importClientChunk([11, 0, -1], requestId)).created).toBe(
      1,
    );
  });
  it.each([
    {
      created: 2,
      items: [{ id, name: "Created", ldaClientId: 11 }],
      skipped: [],
    },
    {
      created: 1,
      items: [{ id, name: "Created", ldaClientId: 33 }],
      skipped: [{ ldaClientId: 22, reason: "Skipped" }],
    },
    {
      created: 1,
      items: [{ id, name: "Created", ldaClientId: 11 }],
      skipped: [{ ldaClientId: 11, reason: "Skipped" }],
    },
    {
      created: 0,
      items: [],
      skipped: [{ ldaClientId: 22, reason: "Skipped" }],
    },
  ])(
    "refuses incomplete/mismatched import receipts without replay",
    async (payload) => {
      const { core, fetcher } = consumer({
        ...payload,
        job: jobFor(payload, [11, 22]),
      });
      await expect(
        core.importClientChunk([11, 22], requestId),
      ).rejects.toMatchObject({
        status: 502,
      });
      expect(fetcher).toHaveBeenCalledOnce();
    },
  );
  it("refuses a receipt whose durable job names a different request identity", async () => {
    const payload = {
      created: 0,
      items: [],
      skipped: [{ ldaClientId: 11, reason: "Skipped" }],
    };
    const job = jobFor(payload, [11]);
    const { core, fetcher } = consumer({
      ...payload,
      job: { ...job, requestId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" },
    });
    await expect(core.importClientChunk([11], requestId)).rejects.toMatchObject(
      { status: 502 },
    );
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("captures the requested chunk before asynchronous receiving", async () => {
    const ids = [11];
    const payload = {
      created: 0,
      items: [],
      skipped: [{ ldaClientId: 11, reason: "Skipped" }],
    };
    const { core } = consumer({ ...payload, job: jobFor(payload, ids) });
    const pending = core.importClientChunk(ids, requestId);
    ids[0] = 22;
    expect((await pending).skipped[0]!.ldaClientId).toBe(11);
  });
  it("leaves a second chunk's already-imported outcome valid", async () => {
    const payload = {
      created: 0,
      items: [],
      skipped: [{ ldaClientId: 11, reason: "Already imported" }],
    };
    const { core } = consumer({ ...payload, job: jobFor(payload, [11]) });
    expect((await core.importClientChunk([11], requestId)).created).toBe(0);
  });
  it("refuses a created import item without its native identifier", async () => {
    const payload = {
      created: 1,
      items: [{ id: "", name: "Unknown", ldaClientId: 11 }],
      skipped: [],
    };
    await expect(
      consumer({
        ...payload,
        job: jobFor(payload, [11]),
      }).core.importClientChunk([11], requestId),
    ).rejects.toMatchObject({ status: 502 });
  });
  it.each([0, 101])(
    "rejects an invalid batch of %i entries before transport",
    async (size) => {
      const { core, fetcher } = consumer({});
      await expect(
        core.importClientChunk(
          Array.from({ length: size }, (_, i) => i),
          requestId,
        ),
      ).rejects.toMatchObject({ status: 400 });
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it("binds registrant changes", async () => {
    await expect(
      consumer({
        ldaRegistrantId: 22,
        ldaRegistrantName: "Other",
      }).core.setRegistrant(11),
    ).rejects.toMatchObject({ status: 502 });
  });
  it("reuses the team owner and binds normalized recipient and role", async () => {
    const receipt = {
      status: "invited",
      invitation: {
        id: "invite-1",
        email: "person@example.test",
        role: "standard_user",
        createdAt: "2026-10-13T00:00:00Z",
        expiresAt: null,
      },
    };
    const { core, fetcher } = consumer(receipt);
    const body = {
      email: "Person@Example.Test",
      role: "standard_user" as const,
      redirectUrl: "https://untrusted.example.test",
    };
    expect(await core.inviteTeamMember(body)).toEqual(receipt);
    expect(fetcher.mock.calls[0]![0]).toBe("/api/capiro/settings.team.invite");
    expect(JSON.parse(String(fetcher.mock.calls[0]![1]!.body))).toEqual({
      body: { email: body.email, role: body.role },
    });
    await expect(
      consumer(receipt).core.inviteTeamMember({
        email: "other@example.test",
        role: "standard_user",
      }),
    ).rejects.toMatchObject({ status: 502 });
  });
  it("matches task transition receipts without allowing skipped as an outgoing state", async () => {
    const { setup } = consumer({ task: "import", status: "waiting" });
    await expect(
      setup.transitionTask("import", "waiting", "done"),
    ).rejects.toMatchObject({ status: 502 });
  });
  it("binds payment-method confirmation", async () => {
    await expect(
      consumer({ ok: true, method: "ach" }).funnel.trialComplete({
        method: "card",
        setupIntentId: "synthetic-setup",
      }),
    ).rejects.toMatchObject({ status: 502 });
  });
});

describe("Onboard public transport and deliberate external navigation", () => {
  it("omits credentials and does not expire the user on a public capability refusal", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ message: "Capability expired" }, { status: 401 }),
      );
    const onSessionExpired = vi.fn();
    const api = createCapiroApi(publicOnboardOperations, {
      fetcher,
      credentials: "omit",
      onSessionExpired,
    });
    await expect(
      createOnboardPublicApi(api, base).getInvite(token),
    ).rejects.toMatchObject({ status: 401, message: "Capability expired" });
    expect(fetcher.mock.calls[0]![1]!.credentials).toBe("omit");
    expect(fetcher.mock.calls[0]![1]!.headers).toBeUndefined();
    expect(onSessionExpired).not.toHaveBeenCalled();
  });
  it("still expires an authenticated request on 401", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({}, { status: 401 }));
    const onSessionExpired = vi.fn();
    await expect(
      createOnboardFunnelApi(
        createCapiroApi(capiroOperations, { fetcher, onSessionExpired }),
      ).getSession(),
    ).rejects.toMatchObject({ status: 401 });
    expect(fetcher.mock.calls[0]![1]!.credentials).toBe("same-origin");
    expect(onSessionExpired).toHaveBeenCalledOnce();
  });
  it.each(["google", "microsoft"] as const)(
    "preserves an opaque %s consent URL tied to the exact configured callback prefix",
    (provider) => {
      expect(validateOnboardConsentUrl(consent(provider), provider, base)).toBe(
        consent(provider),
      );
    },
  );
  it.each(["provider", "origin", "path", "duplicate", "state"])(
    "rejects consent mismatch: %s",
    (kind) => {
      const url = new URL(consent());
      if (kind === "origin")
        url.searchParams.set(
          "redirect_uri",
          "https://evil.example.test/onboard-api/it/google/callback",
        );
      if (kind === "path")
        url.searchParams.set(
          "redirect_uri",
          "https://api.example.test/onboard-api/it/google/callback",
        );
      if (kind === "duplicate")
        url.searchParams.append(
          "redirect_uri",
          url.searchParams.get("redirect_uri")!,
        );
      if (kind === "state") url.searchParams.delete("state");
      expect(
        validateOnboardConsentUrl(
          url.href,
          kind === "provider" ? "microsoft" : "google",
          base,
        ),
      ).toBeNull();
    },
  );
  it("validates selected provider again after public receiving", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ url: consent("microsoft") }));
    const itApi = createOnboardPublicApi(
      createCapiroApi(publicOnboardOperations, {
        fetcher,
        credentials: "omit",
      }),
      base,
    );
    await expect(itApi.getConsentUrl(token, "google")).rejects.toMatchObject({
      status: 502,
    });
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it.each([
    null,
    "http://invoice.stripe.com/i/test",
    "https://invoice.stripe.com.evil.test/i/test",
    "https://invoice.stripe.com/other",
    "https://user@invoice.stripe.com/i/test",
    "https://invoice.stripe.com/i/test#fragment",
    " https://invoice.stripe.com/i/test",
    "https://invoice.stripe.com/i/test\n",
  ])("refuses unsupported invoice URL %j", (value) => {
    expect(validateOnboardInvoiceUrl(value)).toBeNull();
  });
  it("preserves the accepted hosted invoice URL without following or rewriting it", () => {
    const value =
      "https://invoice.stripe.com/i/acct_synthetic/test_opaque?s=em";
    expect(validateOnboardInvoiceUrl(value)).toBe(value);
  });
});
