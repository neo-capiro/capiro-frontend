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
  it("accepts native per-chunk normalization and explicit skips, including unmatched nonpositive ids", async () => {
    const payload = {
      created: 1,
      items: [{ id, name: "Created", ldaClientId: 11 }],
      skipped: [
        { ldaClientId: 22, reason: "Already imported" },
        { ldaClientId: 0, reason: "Not a candidate" },
        { ldaClientId: -1, reason: "Not a candidate" },
      ],
    };
    const { core, fetcher } = consumer(payload);
    expect(await core.importClientChunk([11, 11, 22, 0, -1])).toEqual(payload);
    expect(JSON.parse(String(fetcher.mock.calls[0]![1]!.body))).toEqual({
      body: { ldaClientIds: [11, 11, 22, 0, -1] },
    });
    expect(fetcher).toHaveBeenCalledOnce();
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
      const { core, fetcher } = consumer(payload);
      await expect(core.importClientChunk([11, 22])).rejects.toMatchObject({
        status: 502,
      });
      expect(fetcher).toHaveBeenCalledOnce();
    },
  );
  it("captures the requested chunk before asynchronous receiving", async () => {
    const ids = [11];
    const { core } = consumer({
      created: 0,
      items: [],
      skipped: [{ ldaClientId: 11, reason: "Skipped" }],
    });
    const pending = core.importClientChunk(ids);
    ids[0] = 22;
    expect((await pending).skipped[0]!.ldaClientId).toBe(11);
  });
  it("leaves a second chunk's already-imported outcome valid", async () => {
    const { core } = consumer({
      created: 0,
      items: [],
      skipped: [{ ldaClientId: 11, reason: "Already imported" }],
    });
    expect((await core.importClientChunk([11])).created).toBe(0);
  });
  it("refuses a created import item without its native identifier", async () => {
    await expect(
      consumer({
        created: 1,
        items: [{ id: "", name: "Unknown", ldaClientId: 11 }],
        skipped: [],
      }).core.importClientChunk([11]),
    ).rejects.toMatchObject({ status: 502 });
  });
  it.each([0, 101])(
    "rejects an invalid batch of %i entries before transport",
    async (size) => {
      const { core, fetcher } = consumer({});
      await expect(
        core.importClientChunk(Array.from({ length: size }, (_, i) => i)),
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
