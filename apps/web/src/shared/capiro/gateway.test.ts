import { expect, it, vi } from "vitest";
import { z } from "zod";
import type { CapiroConfig } from "./config";
import { defineOperation } from "./contracts";
import { handleCapiroRequest } from "./gateway";
import {
  intelligenceOperations,
  normalizeBillId,
} from "./operations/intelligence";

const registry = {
  "people.read": defineOperation({
    service: "core",
    method: "GET",
    path: "/directory/members/:id",
    request: z
      .object({
        params: z.object({ id: z.string() }).strict(),
        query: z
          .object({
            q: z.string().optional(),
            party: z.array(z.string()).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.object({ id: z.string(), name: z.string() }),
    source: "test fixture controller",
  }),
  "people.update": defineOperation({
    service: "core",
    method: "PATCH",
    path: "/directory/members/:id",
    request: z
      .object({
        params: z.object({ id: z.string() }).strict(),
        body: z.object({ name: z.string().min(1) }).strict(),
      })
      .strict(),
    response: z.object({ id: z.string(), name: z.string() }),
    source: "test fixture controller",
  }),
  "people.delete": defineOperation({
    service: "core",
    method: "DELETE",
    path: "/directory/members/:id",
    request: z
      .object({ params: z.object({ id: z.string() }).strict() })
      .strict(),
    response: z.null(),
    source: "test fixture controller",
  }),
};
const config: CapiroConfig = {
  services: { core: "https://api.example.test/api" },
  authConfigured: true,
  issues: [],
};
const token = vi.fn(async () => "existing-clerk-token");
const result = { id: "person-1", name: "Test Person" };
function read(input: unknown, key = "people.read") {
  return new Request(
    `https://frontend.example.test/api/capiro/${key}?input=${encodeURIComponent(JSON.stringify(input))}`,
  );
}
function write(
  input: unknown,
  method = "PATCH",
  origin = "https://frontend.example.test",
) {
  return new Request("https://frontend.example.test/api/capiro/people.update", {
    method,
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(input),
  });
}

it("maps only registered paths and preserves the trusted bearer without browser scope headers", async () => {
  const fetcher = vi.fn(async () => Response.json(result));
  const response = await handleCapiroRequest(
    read({
      params: { id: "person-1" },
      query: { q: "policy & finance", party: ["D", "R"] },
    }),
    "people.read",
    registry,
    config,
    token,
    fetcher,
  );
  expect(response.status).toBe(200);
  const [url, options] = fetcher.mock.calls[0]! as unknown as [
    URL,
    RequestInit,
  ];
  expect(url.href).toBe(
    "https://api.example.test/api/directory/members/person-1?q=policy+%26+finance&party=D&party=R",
  );
  expect(options.headers).toEqual({
    Authorization: "Bearer existing-clerk-token",
    Accept: "application/json",
    "Content-Type": "application/json",
  });
  expect(options.redirect).toBe("error");
  expect(options.cache).toBe("no-store");
  expect(response.headers.get("cache-control")).toBe("no-store");
});
it.each(["unknown.operation", "__proto__", "constructor"])(
  "rejects unknown operation %s before auth/network",
  async (key) => {
    const fetcher = vi.fn();
    const auth = vi.fn();
    expect(
      (
        await handleCapiroRequest(
          read({}, key),
          key,
          registry,
          config,
          auth,
          fetcher,
        )
      ).status,
    ).toBe(404);
    expect(auth).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  },
);
it("rejects mismatched methods, extra scope authority and malformed JSON", async () => {
  const fetcher = vi.fn();
  expect(
    (
      await handleCapiroRequest(
        write({}),
        "people.read",
        registry,
        config,
        token,
        fetcher,
      )
    ).status,
  ).toBe(405);
  expect(
    (
      await handleCapiroRequest(
        read({ params: { id: "p" }, tenantId: "other-tenant" }),
        "people.read",
        registry,
        config,
        token,
        fetcher,
      )
    ).status,
  ).toBe(400);
  const invalid = new Request(
    "https://frontend.example.test/api/capiro/people.read?input=not-json",
  );
  expect(
    (
      await handleCapiroRequest(
        invalid,
        "people.read",
        registry,
        config,
        token,
        fetcher,
      )
    ).status,
  ).toBe(400);
  expect(fetcher).not.toHaveBeenCalled();
});
it.each([
  "../me",
  "..",
  ".",
  "path/segment",
  "%2fme",
  "abc?role=admin",
  "bad\\path",
])("rejects parameter traversal %s", async (id) => {
  const fetcher = vi.fn();
  expect(
    (
      await handleCapiroRequest(
        read({ params: { id } }),
        "people.read",
        registry,
        config,
        token,
        fetcher,
      )
    ).status,
  ).toBe(400);
  expect(fetcher).not.toHaveBeenCalled();
});
it("rejects writes without the same origin and forwards the validated backend body only", async () => {
  const fetcher = vi.fn(async () => Response.json(result));
  const input = { params: { id: "person-1" }, body: { name: "Updated" } };
  expect(
    (
      await handleCapiroRequest(
        write(input, "PATCH", "https://other.example.test"),
        "people.update",
        registry,
        config,
        token,
        fetcher,
      )
    ).status,
  ).toBe(403);
  expect(fetcher).not.toHaveBeenCalled();
  expect(
    (
      await handleCapiroRequest(
        write(input),
        "people.update",
        registry,
        config,
        token,
        fetcher,
      )
    ).status,
  ).toBe(200);
  const options = (fetcher.mock.calls[0] as unknown as [URL, RequestInit])?.[1];
  expect(options?.body).toBe('{"name":"Updated"}');
});
it("fails closed without configured auth, service or a verified session", async () => {
  const fetcher = vi.fn();
  const auth = vi.fn(async () => null);
  const request = () => read({ params: { id: "person-1" } });
  expect(
    (
      await handleCapiroRequest(
        request(),
        "people.read",
        registry,
        { ...config, authConfigured: false },
        auth,
        fetcher,
      )
    ).status,
  ).toBe(503);
  expect(
    (
      await handleCapiroRequest(
        request(),
        "people.read",
        registry,
        { ...config, services: {} },
        auth,
        fetcher,
      )
    ).status,
  ).toBe(503);
  expect(auth).not.toHaveBeenCalled();
  expect(
    (
      await handleCapiroRequest(
        request(),
        "people.read",
        registry,
        config,
        auth,
        fetcher,
      )
    ).status,
  ).toBe(401);
  expect(fetcher).not.toHaveBeenCalled();
});
it("handles unavailable auth and cancelled requests without upstream dispatch", async () => {
  const fetcher = vi.fn();
  expect(
    (
      await handleCapiroRequest(
        read({ params: { id: "p" } }),
        "people.read",
        registry,
        config,
        async () => {
          throw new Error("internal auth detail");
        },
        fetcher,
      )
    ).status,
  ).toBe(401);
  const controller = new AbortController();
  controller.abort();
  const request = new Request(read({ params: { id: "p" } }), {
    signal: controller.signal,
  });
  expect(
    (
      await handleCapiroRequest(
        request,
        "people.read",
        registry,
        config,
        token,
        fetcher,
      )
    ).status,
  ).toBe(408);
  expect(fetcher).not.toHaveBeenCalled();
});
it("strips upstream error diagnostics and refuses malformed successful responses", async () => {
  const failure = await handleCapiroRequest(
    read({ params: { id: "p" } }),
    "people.read",
    registry,
    config,
    token,
    async () =>
      Response.json({ message: "secret provider stack" }, { status: 500 }),
  );
  expect(failure.status).toBe(500);
  expect(await failure.text()).not.toContain("secret");
  const invalid = await handleCapiroRequest(
    read({ params: { id: "p" } }),
    "people.read",
    registry,
    config,
    token,
    async () => Response.json({ id: 123 }),
  );
  expect(invalid.status).toBe(502);
  const offline = await handleCapiroRequest(
    read({ params: { id: "p" } }),
    "people.read",
    registry,
    config,
    token,
    async () => {
      throw new Error("network secret");
    },
  );
  expect(offline.status).toBe(502);
  expect(await offline.text()).not.toContain("secret");
});
it("bounds input size before dispatch and preserves acknowledged 204 responses", async () => {
  const fetcher = vi.fn();
  const large = write({
    params: { id: "p" },
    body: { name: "x".repeat(2_000_001) },
  });
  expect(
    (
      await handleCapiroRequest(
        large,
        "people.update",
        registry,
        config,
        token,
        fetcher,
      )
    ).status,
  ).toBe(400);
  expect(fetcher).not.toHaveBeenCalled();
  const request = write({ params: { id: "p" } }, "DELETE");
  const deleted = await handleCapiroRequest(
    request,
    "people.delete",
    registry,
    config,
    token,
    async () => new Response(null, { status: 204 }),
  );
  expect(deleted.status).toBe(204);
  expect(await deleted.text()).toBe("");
});

/**
 * Bill detail receiver: an identifier-only report link resolves the existing global
 * factual dossier. These cover the operation, path, auth forwarding and the negative
 * response/auth cases; the page route and its Clerk matcher are checked separately.
 */
const dossierRegistry = {
  "intelligence.bills.dossier":
    intelligenceOperations["intelligence.bills.dossier"],
};
const dossierConfig: CapiroConfig = {
  services: {
    core: "https://api.example.test/api",
    intelligence: "https://intel.example.test/api",
  },
  authConfigured: true,
  issues: [],
};
const dossier = {
  bill: {
    id: "119-hr-1234",
    num: "H.R. 1234",
    title: "An illustrative official title",
    statusLabel: "Referred to Committee",
    statusAt: "2025-03-04",
    jurisdiction: "federal",
    isState: false,
    url: "https://www.congress.gov/bill/119th-congress/house-bill/1234",
  },
  latest: { text: "Referred to the Committee on Rules.", date: "2025-03-04" },
  provenance: { lastSyncedAt: "2025-03-05T00:00:00.000Z", sourceCheckedAt: null },
};

it.each([
  ["119-hr-1234", "federal"],
  ["tx-2025-hb1234", "state"],
])(
  "reads the one global dossier for a canonical %s id",
  async (billId) => {
    const fetcher = vi.fn(async () =>
      Response.json({
        ...dossier,
        bill: {
          ...dossier.bill,
          id: billId,
          isState: billId.startsWith("tx-"),
        },
      }),
    );
    const response = await handleCapiroRequest(
      read({ params: { billId } }, "intelligence.bills.dossier"),
      "intelligence.bills.dossier",
      dossierRegistry,
      dossierConfig,
      token,
      fetcher,
    );
    expect(response.status).toBe(200);
    const [url, options] = fetcher.mock.calls[0]! as unknown as [
      URL,
      RequestInit,
    ];
    expect(url.toString()).toBe(
      `https://intel.example.test/api/bills/${billId}/dossier`,
    );
    expect(options.method).toBe("GET");
    const headers = new Headers(options.headers);
    expect(headers.get("Authorization")).toBe("Bearer existing-clerk-token");
    expect(headers.get("X-Capiro-Tenant")).toBeNull();
    expect(await response.json()).toEqual({
      ...dossier,
      bill: { ...dossier.bill, id: billId, isState: billId.startsWith("tx-") },
    });
  },
);

it.each([
  ["119-hr", "an incomplete federal id"],
  ["119-hr-1234/records", "a trailing path segment"],
  ["119-hr-1234?section=votes", "query text"],
  ["119%2Fhr-1234", "an encoded separator"],
  ["119-hr-12.34", "a dot separator"],
  ["../hr-1234", "traversal"],
  ["119-HR-1234", "non-canonical casing"],
  ["tx-2025-hb", "an incomplete state key"],
  ["", "an empty id"],
  ["1".repeat(65), "an over-long id"],
])("refuses %s before transport (%s)", async (billId) => {
  const fetcher = vi.fn();
  const response = await handleCapiroRequest(
    read({ params: { billId } }, "intelligence.bills.dossier"),
    "intelligence.bills.dossier",
    dossierRegistry,
    dossierConfig,
    token,
    fetcher,
  );
  expect(response.status).toBe(400);
  expect(fetcher).not.toHaveBeenCalled();
});

it("rejects an anonymous read without calling the service", async () => {
  const fetcher = vi.fn();
  const response = await handleCapiroRequest(
    read({ params: { billId: "119-hr-1234" } }, "intelligence.bills.dossier"),
    "intelligence.bills.dossier",
    dossierRegistry,
    dossierConfig,
    async () => null,
    fetcher,
  );
  expect(response.status).toBe(401);
  expect(fetcher).not.toHaveBeenCalled();
});

it.each([404, 403, 500])(
  "preserves a %s dossier outcome instead of rendering facts",
  async (status) => {
    const fetcher = vi.fn(async () =>
      Response.json({ message: "denied" }, { status }),
    );
    const response = await handleCapiroRequest(
      read({ params: { billId: "119-hr-1234" } }, "intelligence.bills.dossier"),
      "intelligence.bills.dossier",
      dossierRegistry,
      dossierConfig,
      token,
      fetcher,
    );
    expect(response.status).toBe(status);
  },
);

it("reports a malformed dossier as an upstream failure and accepts nullable facts", async () => {
  const malformed = vi.fn(async () => Response.json({ bill: { id: "x" } }));
  expect(
    (
      await handleCapiroRequest(
        read({ params: { billId: "119-hr-1234" } }, "intelligence.bills.dossier"),
        "intelligence.bills.dossier",
        dossierRegistry,
        dossierConfig,
        token,
        malformed,
      )
    ).status,
  ).toBe(502);

  const nullable = vi.fn(async () =>
    Response.json({
      bill: {
        id: "119-hr-1234",
        num: "H.R. 1234",
        title: "An illustrative official title",
        statusLabel: "Referred to Committee",
        statusAt: null,
        jurisdiction: null,
        isState: false,
        url: null,
      },
      latest: { text: null, date: null },
      provenance: { lastSyncedAt: null, sourceCheckedAt: null },
    }),
  );
  const ok = await handleCapiroRequest(
    read({ params: { billId: "119-hr-1234" } }, "intelligence.bills.dossier"),
    "intelligence.bills.dossier",
    dossierRegistry,
    dossierConfig,
    token,
    nullable,
  );
  expect(ok.status).toBe(200);
  const body = (await ok.json()) as { bill: { url: null }; latest: { text: null } };
  expect(body.bill.url).toBeNull();
  expect(body.latest.text).toBeNull();
});

it("normalizes canonical bill ids and rejects everything else", () => {
  expect(normalizeBillId(" 119-HR-1234 ")).toBe("119-hr-1234");
  expect(normalizeBillId("tx-2025-hb1234")).toBe("tx-2025-hb1234");
  expect(normalizeBillId("119-hr-1234/records")).toBeNull();
  expect(normalizeBillId("119%2Fhr-1234")).toBeNull();
  expect(normalizeBillId("../bills")).toBeNull();
  expect(normalizeBillId("")).toBeNull();
});
