/**
 * VQA-021: the closed diagnostic class of a locally produced 401.
 *
 * Only the producing boundary may name the class, only the closed vocabulary is
 * admitted, and nothing else about the exchange changes: status, body and every
 * other header stay exactly as they were.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { proxyRequest } from "../src/shared/portfolio/api/proxy";
import { readConfig } from "../src/shared/portfolio/config/config";
import { handleCapiroRequest } from "../src/shared/capiro/gateway";
import { serviceErrorResponse } from "../src/shared/capiro/gateway-errors";
import { objectiveOperationalOperations } from "../src/shared/capiro/operations/objective-operational";
import { defineOperation } from "../src/shared/capiro/contracts";
import type { CapiroConfig } from "../src/shared/capiro/config";
import { proxyPreviewRead } from "../src/shared/preview/read-proxy.server";
import { proxyPreviewNotetakerWrite } from "../src/shared/preview/notetaker-write-proxy.server";
import { createApiClient } from "../src/shared/portfolio/api/http";
import { createCapiroApi } from "../src/shared/capiro/http";
import {
  admitAuthFailure,
  authFailureHeader,
  authFailureHeaders,
} from "../src/shared/session/auth-failure";

const klass = (response: Response) => response.headers.get(authFailureHeader);

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("closed vocabulary", () => {
  it("admits the three producer classes and nothing else", () => {
    expect(admitAuthFailure("credential-unverified")).toBe(
      "credential-unverified",
    );
    expect(admitAuthFailure("no-session")).toBe("no-session");
    expect(admitAuthFailure("upstream-rejected")).toBe("upstream-rejected");
    expect(admitAuthFailure("unknown")).toBe("unknown");
  });

  it.each([
    ["absent", null],
    ["empty", ""],
    ["unrecognized", "expired"],
    ["case-shifted", "No-Session"],
    ["padded", " no-session"],
    ["joined values", "no-session, upstream-rejected"],
    ["header-shaped", "no-session;q=1"],
  ])("falls back to unknown for a %s class", (_label, value) => {
    expect(admitAuthFailure(value)).toBe("unknown");
  });

  it("replaces an inherited class of the same name in any case", () => {
    const spoofed = new Headers({ "x-capiro-auth-class": "no-session" });
    const headers = authFailureHeaders("upstream-rejected", spoofed);
    expect(headers.get(authFailureHeader)).toBe("upstream-rejected");
    expect(
      [...headers.entries()].filter(([name]) => name === "x-capiro-auth-class"),
    ).toHaveLength(1);
  });
});

const portfolioConfig = readConfig({
  CORE_API_BASE_URL: "https://core.example.test/api",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_c3ludGhldGlj",
  CLERK_SECRET_KEY: "sk_test_synthetic",
});
const portfolioUrl = "http://localhost:5190/api/backend/core/me";
const proxy = (getToken: () => Promise<string | null>, fetcher: typeof fetch) =>
  proxyRequest(
    new Request(portfolioUrl),
    "core",
    ["me"],
    portfolioConfig,
    getToken,
    fetcher,
  );

const capiroConfig: CapiroConfig = {
  services: { core: "https://api.example.test/api" },
  authConfigured: true,
  issues: [],
};
const capiroRegistry = {
  "synthetic.read": defineOperation({
    service: "core",
    method: "GET",
    path: "/me",
    request: z.object({}).strict(),
    response: z.object({ id: z.string() }),
    source: "test fixture",
  }),
};
const gateway = (
  getToken: () => Promise<string | null>,
  fetcher: typeof fetch,
) =>
  handleCapiroRequest(
    new Request(
      "https://frontend.example.test/api/capiro/synthetic.read?input=%7B%7D",
    ),
    "synthetic.read",
    capiroRegistry,
    capiroConfig,
    getToken,
    fetcher,
  );

const previewOrigin = "https://frontend.synthetic.invalid";
const previewTarget = "https://first-chat-preview.app-dev.capiro.ai/api";
const previewEnv = {
  CAPIRO_PREVIEW_READ_ONLY: "true",
  CAPIRO_PREVIEW_READ_API_BASE_URL: previewTarget,
  CAPIRO_PREVIEW_READ_BACKEND_SOURCE:
    "6542f5b089656b6d255465edd464d06c2a0b408f",
  CAPIRO_REQUEST_ORIGIN: previewOrigin,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_c3ludGhldGljJA==",
  CLERK_SECRET_KEY: "***",
};
const preview = (
  getToken: () => Promise<string | null>,
  fetcher: typeof fetch,
) =>
  proxyPreviewRead(
    new Request(`${previewOrigin}/api/backend/core/me`),
    previewEnv,
    "/api/backend/core/me",
    getToken,
    fetcher,
  );
const meetingId = "90000000-0000-4000-8000-000000000001";
const notetaker = (
  getToken: () => Promise<string | null>,
  fetcher: typeof fetch,
) =>
  proxyPreviewNotetakerWrite(
    new Request(
      `${previewOrigin}/api/backend/core/engagement/meetings/${meetingId}/notetaker`,
      { method: "POST", headers: { "content-type": "application/json" } },
    ),
    previewEnv,
    getToken,
    fetcher,
  );

describe("producer boundaries name their own class", () => {
  it.each([
    ["portfolio proxy", proxy],
    ["capiro gateway", gateway],
  ] as const)(
    "%s: a failed credential retrieval is unverified, not expired",
    async (_label, call) => {
      const response = await call(
        async () => {
          throw new Error("synthetic credential timeout");
        },
        async () => Response.json({ message: "unused" }),
      );
      expect(response.status).toBe(401);
      expect(klass(response)).toBe("credential-unverified");
    },
  );

  it.each([
    ["preview read proxy", preview],
    ["preview note-taker write", notetaker],
  ] as const)(
    "%s: a credential retrieval exception stays the existing untagged 502",
    async (_label, call) => {
      const response = await call(
        async () => {
          throw new Error("synthetic credential timeout");
        },
        async () => Response.json({ message: "unused" }),
      );
      expect(response.status).toBe(502);
      expect(klass(response)).toBeNull();
    },
  );

  it.each([
    ["portfolio proxy", proxy],
    ["capiro gateway", gateway],
    ["preview read proxy", preview],
    ["preview note-taker write", notetaker],
  ] as const)("%s: an absent session is no-session", async (_label, call) => {
    const response = await call(
      async () => null,
      async () => Response.json({ message: "unused" }),
    );
    expect(response.status).toBe(401);
    expect(klass(response)).toBe("no-session");
  });

  it.each([
    ["portfolio proxy", proxy],
    ["capiro gateway", gateway],
    ["preview read proxy", preview],
    ["preview note-taker write", notetaker],
  ] as const)(
    "%s: a downstream 401 is upstream-rejected and cannot spoof the class",
    async (_label, call) => {
      const response = await call(
        async () => "synthetic-token",
        async () =>
          Response.json(
            { message: "Synthetic upstream refusal" },
            { status: 401, headers: { [authFailureHeader]: "no-session" } },
          ),
      );
      expect(response.status).toBe(401);
      expect(klass(response)).toBe("upstream-rejected");
      expect(await response.json()).toMatchObject({
        message: expect.any(String),
      });
    },
  );

  it.each([
    ["portfolio proxy", proxy],
    ["capiro gateway", gateway],
    ["preview read proxy", preview],
    ["preview note-taker write", notetaker],
  ] as const)(
    "%s: a downstream 401 with an unreadable body keeps its class",
    async (_label, call) => {
      const response = await call(
        async () => "synthetic-token",
        async () => new Response("<html>gateway", { status: 401 }),
      );
      expect(response.status).toBe(401);
      expect(klass(response)).toBe("upstream-rejected");
    },
  );

  it("leaves every non-401 response unmarked and unchanged", async () => {
    for (const [call, status] of [
      [proxy, 403],
      [gateway, 500],
      [preview, 502],
      [notetaker, 422],
    ] as const) {
      const response = await call(
        async () => "synthetic-token",
        async () =>
          Response.json(
            { message: "Synthetic refusal" },
            { status, headers: { [authFailureHeader]: "no-session" } },
          ),
      );
      expect(klass(response)).toBeNull();
    }
  });

  it("drops a spoofed class from a successful forwarded response", async () => {
    const response = await proxy(
      async () => "synthetic-token",
      async () =>
        Response.json(
          { id: "synthetic" },
          { headers: { [authFailureHeader]: "no-session" } },
        ),
    );
    expect(response.status).toBe(200);
    expect(klass(response)).toBeNull();
  });

  it("keeps the existing 401 body and the other headers byte-identical", async () => {
    const response = await proxy(
      async () => null,
      async () => Response.json({ message: "unused" }),
    );
    expect(await response.text()).toBe('{"message":"Sign in to continue."}');
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect([...response.headers.keys()].sort()).toEqual([
      "cache-control",
      "content-type",
      "x-capiro-auth-class",
    ]);
  });

  it("keeps a cancelled credential retrieval on the existing untagged 408", async () => {
    const controller = new AbortController();
    const response = await handleCapiroRequest(
      new Request(
        "https://frontend.example.test/api/capiro/synthetic.read?input=%7B%7D",
        { signal: controller.signal },
      ),
      "synthetic.read",
      capiroRegistry,
      capiroConfig,
      async () => {
        // Cancelled while the credential is being obtained: the request signal ends
        // first, so the existing 408 classification wins and no class is attached.
        controller.abort();
        return null;
      },
      async () => Response.json({ message: "unused" }),
    );
    expect(response.status).toBe(408);
    expect(klass(response)).toBeNull();
  });
});

describe("transports admit only the closed class", () => {
  const respond = (init: ResponseInit) => async () => new Response("{}", init);

  it.each([
    ["credential-unverified", "credential-unverified"],
    ["no-session", "no-session"],
    ["upstream-rejected", "upstream-rejected"],
    ["unknown", "unknown"],
    [null, "unknown"],
    ["expired", "unknown"],
    ["no-session, upstream-rejected", "unknown"],
  ])("portfolio transport reports %s as %s", async (wire, admitted) => {
    const expired = vi.fn();
    const client = createApiClient(
      respond({
        status: 401,
        headers: wire ? { [authFailureHeader]: wire } : {},
      }),
      expired,
      () => new AbortController().signal,
    );
    await expect(client.request("core", "me", z.unknown())).rejects.toThrow(
      "Your session expired. Sign in again.",
    );
    expect(expired).toHaveBeenCalledExactlyOnceWith(admitted);
  });

  it.each([
    ["credential-unverified", "credential-unverified"],
    [null, "unknown"],
    ["synthetic-value", "unknown"],
  ])("capiro transport reports %s as %s", async (wire, admitted) => {
    const expired = vi.fn();
    const api = createCapiroApi(
      {
        "synthetic.read": defineOperation({
          service: "core",
          method: "GET",
          path: "/me",
          request: z.object({}).strict(),
          response: z.object({ id: z.string() }),
          source: "test fixture",
        }),
      },
      {
        fetcher: respond({
          status: 401,
          headers: wire ? { [authFailureHeader]: wire } : {},
        }),
        onSessionExpired: expired,
      },
    );
    await expect(api.request("synthetic.read", {})).rejects.toThrow();
    expect(expired).toHaveBeenCalledExactlyOnceWith(admitted);
  });

  it("never reports expiry for capability reads or non-401 responses", async () => {
    const expired = vi.fn();
    const capability = createCapiroApi(
      {
        "synthetic.read": defineOperation({
          service: "core",
          method: "GET",
          path: "/me",
          request: z.object({}).strict(),
          response: z.object({ id: z.string() }),
          source: "test fixture",
        }),
      },
      {
        fetcher: respond({
          status: 401,
          headers: { [authFailureHeader]: "no-session" },
        }),
        onSessionExpired: expired,
        credentials: "omit",
      },
    );
    await expect(capability.request("synthetic.read", {})).rejects.toThrow();
    for (const status of [403, 404, 500]) {
      const client = createApiClient(
        respond({ status }),
        expired,
        () => new AbortController().signal,
      );
      await expect(client.request("core", "me", z.unknown())).rejects.toThrow();
    }
    expect(expired).not.toHaveBeenCalled();
  });

  it("never reports expiry for a response that a scope replacement superseded", async () => {
    const expired = vi.fn();
    const controller = new AbortController();
    controller.abort();
    const client = createApiClient(
      respond({
        status: 401,
        headers: { [authFailureHeader]: "no-session" },
      }),
      expired,
      () => controller.signal,
    );
    await expect(client.request("core", "me", z.unknown())).rejects.toThrow();
    expect(expired).not.toHaveBeenCalled();
  });
});

/**
 * The objective-association branch of the Capiro gateway returns the native refusal
 * envelope before the generic error shaper. The public Error contract admits 401
 * UNAUTHENTICATED there, so that existing early return is itself a producer boundary.
 */
describe("admitted association refusal names its upstream 401", () => {
  const unauthorized = {
    schemaVersion: 1,
    status: 401,
    code: "UNAUTHENTICATED",
    outcome: "rejected",
    requestId: null,
  };
  const malformed = {
    schemaVersion: 1,
    status: 400,
    code: "MALFORMED_REQUEST",
    outcome: "rejected",
    requestId: null,
  };
  it.each([
    "objectives.operational.link",
    "objectives.operational.receipt",
  ] as const)(
    "%s keeps its admitted 401 envelope and names upstream-rejected",
    async (key) => {
      const response = await serviceErrorResponse(
        Response.json(unauthorized, {
          status: 401,
          headers: { [authFailureHeader]: "no-session" },
        }),
        objectiveOperationalOperations[key],
        new AbortController().signal,
        false,
      );
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual(unauthorized);
      expect(klass(response)).toBe("upstream-rejected");
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
      // Owned header only: no upstream value, nothing else added.
      expect([...response.headers.keys()].sort()).toEqual([
        "cache-control",
        "content-type",
        "referrer-policy",
        "x-capiro-auth-class",
      ]);
    },
  );

  it.each([
    "objectives.operational.link",
    "objectives.operational.receipt",
  ] as const)("%s: a non-401 admitted refusal stays unmarked", async (key) => {
    const response = await serviceErrorResponse(
      Response.json(malformed, { status: 400 }),
      objectiveOperationalOperations[key],
      new AbortController().signal,
      false,
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(malformed);
    expect(klass(response)).toBeNull();
  });
});
