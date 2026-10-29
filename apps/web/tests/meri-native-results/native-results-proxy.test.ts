import { expect, it, vi } from "vitest";
import {
  receiveNativeResultsRequest,
  receiveNativeResultsResponse,
} from "@capiro/meri-client/document-access";
import { proxyDocumentRequest } from "../../src/shared/meri-documents/proxy";
import {
  closedRequestBody,
  jsonResponse,
  nativeResultsPage,
  nativeResultRow,
} from "./native-results-fixtures";

const origin = "https://native-results.synthetic.invalid";
const credential = `action_session_${"n".repeat(43)}`;
/** Generation stays disabled: a bounded metadata read is a read, not a document family write. */
const config = {
  enabled: false,
  readEnabled: true,
  operation: null,
  baseUrl: "https://meri.synthetic.invalid",
  requestOrigin: origin,
};
const request = (
  body: string | null = closedRequestBody,
  init: RequestInit = {},
  suffix = "",
) =>
  new Request(`${origin}/api/documents/results${suffix}`, {
    method: "POST",
    ...(body === null ? {} : { body }),
    ...init,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "X-Meri-Action-Session": credential,
      ...Object.fromEntries(new Headers(init.headers)),
    },
  });
const token = async () => "native";
const closedRequest = () =>
  receiveNativeResultsRequest(new TextEncoder().encode(closedRequestBody));

it("forwards the closed results read while generation is disabled, and the canonical receiver admits it", async () => {
  const fetcher = vi.fn<typeof fetch>(async () =>
    jsonResponse(
      nativeResultsPage([
        nativeResultRow(1, "analysis/a.txt"),
        nativeResultRow(2, "analysis/b.txt", 2048, true),
      ]),
    ),
  );
  const response = await proxyDocumentRequest(
    request(),
    "results",
    config,
    token,
    fetcher,
  );
  const bytes = new Uint8Array(await response.arrayBuffer());
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("application/json");
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  const [url, init] = fetcher.mock.calls[0]!;
  expect(url).toBe("https://meri.synthetic.invalid/api/documents/results");
  expect(init!.method).toBe("POST");
  expect(new Headers(init!.headers).get("Authorization")).toBe(
    `Bearer ${credential}`,
  );
  // The forwarded bytes are the contract's closed empty request, not the correlation token.
  expect(new TextDecoder().decode(init!.body as Uint8Array)).toBe(
    closedRequestBody,
  );
  // The browser's own receiver is the gate on what this proxy returns.
  const admitted = receiveNativeResultsResponse(
    response.status,
    bytes,
    closedRequest(),
  );
  expect(admitted.results.map((row) => row.path)).toEqual([
    "analysis/a.txt",
    "analysis/b.txt",
  ]);
  expect(admitted.results[1]!.executable).toBe(true);
  expect("admittedVersion" in admitted).toBe(false);
});

it.each([
  '{"scope":"conversation"}',
  '{"limit":5}',
  '{"route":"results"}',
  "[]",
  "null",
  "",
])(
  "a request body %s is not the closed empty request and never reaches Meri",
  async (body) => {
    const fetcher = vi.fn<typeof fetch>();
    const response = await proxyDocumentRequest(
      request(body),
      "results",
      config,
      token,
      fetcher,
    );
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: { code: "FRONTEND_DOCUMENT_UNAVAILABLE" },
    });
    expect(fetcher).not.toHaveBeenCalled();
  },
);

it("a malformed answer is forwarded but never admitted by the receiver", async () => {
  const fetcher = vi.fn<typeof fetch>(async () =>
    jsonResponse(nativeResultsPage([nativeResultRow(1, "/etc/passwd")])),
  );
  const response = await proxyDocumentRequest(
    request(),
    "results",
    config,
    token,
    fetcher,
  );
  const bytes = new Uint8Array(await response.arrayBuffer());
  expect(() =>
    receiveNativeResultsResponse(response.status, bytes, closedRequest()),
  ).toThrow(/NATIVE_RESULTS_OUTPUT/u);
});

it("a body over the receiver's own request bound never reaches Meri", async () => {
  const fetcher = vi.fn<typeof fetch>();
  const response = await proxyDocumentRequest(
    request(`{"pad":"${"x".repeat(70 * 1024)}"}`),
    "results",
    config,
    token,
    fetcher,
  );
  expect(response.status).toBe(502);
  expect(fetcher).not.toHaveBeenCalled();
});

it("the results read is unavailable when reads are disabled and never dispatches", async () => {
  const fetcher = vi.fn<typeof fetch>();
  const response = await proxyDocumentRequest(
    request(),
    "results",
    { ...config, readEnabled: false },
    token,
    fetcher,
  );
  expect(response.status).toBe(503);
  expect(fetcher).not.toHaveBeenCalled();
});

it.each([
  ["a query string", () => request(closedRequestBody, {}, "?scope=owner"), 400],
  ["a method other than POST", () => request(null, { method: "GET" }), 405],
  [
    "a substituted Origin",
    () =>
      request(closedRequestBody, {
        headers: { Origin: "https://foreign.example.test" },
      }),
    400,
  ],
  [
    "no session header",
    () =>
      request(closedRequestBody, { headers: { "X-Meri-Action-Session": "" } }),
    401,
  ],
] as readonly [string, () => Request, number][])(
  "%s is refused before dispatch",
  async (_name, build, status) => {
    const fetcher = vi.fn<typeof fetch>();
    const response = await proxyDocumentRequest(
      build(),
      "results",
      config,
      token,
      fetcher,
    );
    expect(response.status).toBe(status);
    expect(fetcher).not.toHaveBeenCalled();
  },
);

it("an unallocated route around results is refused before credentials", async () => {
  const fetcher = vi.fn<typeof fetch>();
  const nativeToken = vi.fn(async () => "native");
  for (const operation of ["results/../create", "RESULTS", "results-read"]) {
    const response = await proxyDocumentRequest(
      request(),
      operation,
      config,
      nativeToken,
      fetcher,
    );
    expect(response.status).toBe(404);
  }
  expect(nativeToken).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
});

it("no write, allocation or publication route is dispatched by any results read", async () => {
  const fetcher = vi.fn<typeof fetch>(async () =>
    jsonResponse(nativeResultsPage([nativeResultRow(1, "analysis/a.txt")])),
  );
  await proxyDocumentRequest(request(), "results", config, token, fetcher);
  expect(fetcher).toHaveBeenCalledOnce();
  expect(
    fetcher.mock.calls.some(([url]) =>
      /create|revise|preview-publish|first-chat|next-turn/u.test(String(url)),
    ),
  ).toBe(false);
});
