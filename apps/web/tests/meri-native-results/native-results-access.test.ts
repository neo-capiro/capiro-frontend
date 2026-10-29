import { expect, it, vi } from "vitest";
import {
  NATIVE_RESULTS_MAX,
  receiveNativeResultsRequest,
  receiveNativeResultsResponse,
} from "@capiro/meri-client/document-access";
import { createDocumentLibraryAccess } from "../../src/shared/meri-documents/library-access";
import { createNativeResultsAccess } from "../../src/shared/meri-documents/native-results-access";
import { session } from "../meri-document-public-fixtures";
import {
  closedRequestBody,
  hostilePath,
  jsonResponse,
  nativeResultIds,
  nativeResultRow,
  nativeResultsPage,
  digest,
  unparsableResponse,
  versionId,
} from "./native-results-fixtures";

const signal = () => new AbortController().signal;
const request = () =>
  receiveNativeResultsRequest(new TextEncoder().encode("{}"));

it("sends the contract's closed request to the fixed results route and admits the canonical answer", async () => {
  const fetcher = vi.fn<typeof fetch>(async () =>
    jsonResponse(
      nativeResultsPage([
        nativeResultRow(1, "analysis/a.txt"),
        nativeResultRow(2, "analysis/b.txt", 1024, true),
      ]),
    ),
  );
  const port = createNativeResultsAccess(session.credential, signal(), fetcher);
  const reply = await port.results(signal());
  const [url, init] = fetcher.mock.calls[0]!;
  expect(url).toBe("/api/documents/results");
  expect(init!.method).toBe("POST");
  // The browser supplies no scope, run, actor, client or path: only the closed empty object.
  expect(init!.body).toBe(closedRequestBody);
  expect(new Headers(init!.headers).get("X-Meri-Action-Session")).toBe(
    session.credential,
  );
  expect(init!.credentials).toBe("same-origin");
  expect(reply.ok).toBe(true);
  if (!reply.ok) return;
  expect(reply.value.manifestId).toBe(nativeResultIds.manifest);
  expect(reply.value.truncated).toBe(false);
  expect(reply.value.results.map((row) => row.path)).toEqual([
    "analysis/a.txt",
    "analysis/b.txt",
  ]);
  expect(reply.value.results.map((row) => row.bytes)).toEqual([7, 1024]);
  expect(reply.value.results[1]!.executable).toBe(true);
  expect(Object.isFrozen(reply.value.results)).toBe(true);
  expect(Object.isFrozen(reply.value.results[0])).toBe(true);
  // A selector is not an admitted version: nothing is admitted for inspect or download.
  expect(Object.keys(reply.value.results[0]!).sort()).toEqual([
    "bytes",
    "executable",
    "path",
    "sha256",
    "versionId",
  ]);
  expect("artifactId" in reply.value).toBe(false);
  expect("admittedVersion" in reply.value).toBe(false);
  expect(port.pending()).toBe(false);
});

it.each([
  [
    "status",
    () => jsonResponse(nativeResultsPage([]), 201),
    "NATIVE_RESULTS_STATUS",
  ],
  ["format", () => unparsableResponse(), "NATIVE_RESULTS_RESPONSE"],
  [
    "foreignTopLevel",
    () => jsonResponse({ ...nativeResultsPage([]), artifactId: versionId(3) }),
    "NATIVE_RESULTS_OUTPUT",
  ],
  [
    "hostPath",
    () => jsonResponse(nativeResultsPage([nativeResultRow(1, "/etc/passwd")])),
    "NATIVE_RESULTS_OUTPUT",
  ],
  [
    "traversal",
    () => jsonResponse(nativeResultsPage([nativeResultRow(1, "../secret")])),
    "NATIVE_RESULTS_OUTPUT",
  ],
  [
    "duplicatePath",
    () =>
      jsonResponse(
        nativeResultsPage([
          nativeResultRow(1, "analysis/a.txt"),
          nativeResultRow(2, "analysis/a.txt"),
        ]),
      ),
    "NATIVE_RESULTS_DUPLICATE",
  ],
  [
    "unordered",
    () =>
      jsonResponse(
        nativeResultsPage([
          nativeResultRow(1, "analysis/b.txt"),
          nativeResultRow(2, "analysis/a.txt"),
        ]),
      ),
    "NATIVE_RESULTS_ORDER",
  ],
  [
    "overLimit",
    () =>
      jsonResponse(
        nativeResultsPage(
          Array.from({ length: NATIVE_RESULTS_MAX + 1 }, (_, index) =>
            nativeResultRow(
              index + 1,
              `p${String(index).padStart(2, "0")}.txt`,
            ),
          ),
        ),
      ),
    "NATIVE_RESULTS_OUTPUT",
  ],
  [
    "badDigest",
    () =>
      jsonResponse(
        nativeResultsPage([
          { ...nativeResultRow(1, "analysis/a.txt"), sha256: "short" },
        ]),
      ),
    "NATIVE_RESULTS_OUTPUT",
  ],
] as readonly [string, () => Response, string][])(
  "a %s answer refuses with the receiver's own code and admits no row",
  async (_name, answer, code) => {
    const port = createNativeResultsAccess(
      session.credential,
      signal(),
      vi.fn(async () => answer()),
    );
    const reply = await port.results(signal());
    expect(reply).toEqual({ ok: false, code });
  },
);

it("distinguishes an empty page from a page that reached the receiver's bound", async () => {
  const read = (truncated: boolean) =>
    createNativeResultsAccess(
      session.credential,
      signal(),
      vi.fn(async () => jsonResponse(nativeResultsPage([], truncated))),
    ).results(signal());
  const empty = await read(false);
  const bounded = await read(true);
  expect(empty.ok && empty.value.results).toEqual([]);
  expect(empty.ok && empty.value.truncated).toBe(false);
  expect(bounded.ok && bounded.value.results).toEqual([]);
  expect(bounded.ok && bounded.value.truncated).toBe(true);
});

it("a current refusal ends the read, reports the access loss and leaks no upstream text", async () => {
  const fetcher = vi.fn<typeof fetch>(
    async () =>
      new Response("private upstream detail", {
        status: 403,
        headers: { "Content-Type": "text/plain" },
      }),
  );
  const port = createNativeResultsAccess(session.credential, signal(), fetcher);
  const reply = await port.results(signal());
  expect(reply).toEqual({
    ok: false,
    code: "SESSION_REFUSED",
    accessDenied: true,
  });
  expect(JSON.stringify(reply)).not.toContain("private upstream");
});

it("an unavailable read is not reported as an access loss", async () => {
  const port = createNativeResultsAccess(
    session.credential,
    signal(),
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({ error: { code: "FRONTEND_DOCUMENT_UNAVAILABLE" } }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        ),
    ),
  );
  expect(await port.results(signal())).toEqual({
    ok: false,
    code: "NATIVE_RESULTS_STATUS",
  });
});

it("cancels on the session lifetime and never admits the late answer", async () => {
  const lifetime = new AbortController();
  let settled = false;
  const fetcher = vi.fn<typeof fetch>(
    (_url, init) =>
      new Promise<Response>((resolve, reject) => {
        init!.signal?.addEventListener("abort", () =>
          reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
        );
        // A well formed answer arriving after the session was cleared must never be committed.
        lifetime.signal.addEventListener("abort", () => {
          settled = true;
          resolve(
            jsonResponse(
              nativeResultsPage([nativeResultRow(1, "analysis/a.txt")]),
            ),
          );
        });
      }),
  );
  const port = createNativeResultsAccess(
    session.credential,
    lifetime.signal,
    fetcher,
  );
  const read = port.results(signal());
  expect(port.pending()).toBe(true);
  lifetime.abort();
  expect(await read).toEqual({ ok: false, code: "CANCELLED" });
  expect(settled).toBe(true);
  expect(port.pending()).toBe(false);
});

it("reading the page performs no byte read; inspect and download keep the existing routes", async () => {
  const calls: string[] = [];
  const fetcher = vi.fn<typeof fetch>(async (url) => {
    const target = String(url);
    calls.push(target);
    return target === "/api/documents/results"
      ? jsonResponse(
          nativeResultsPage([nativeResultRow(1, "analysis/report.md")]),
        )
      : new Response(
          JSON.stringify({ error: { code: "DOCUMENT_NOT_FOUND" } }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        );
  });
  const port = createDocumentLibraryAccess({
    credential: session.credential,
    context: session.context,
    lifetime: signal(),
    onAccessLost: vi.fn(),
    fetcher,
  });
  const page = await port.results(signal());
  expect(page.ok).toBe(true);
  // Metadata only: the page read fetched no bytes and touched no other route.
  expect(calls).toEqual(["/api/documents/results"]);
  let bytes = 0;
  if (page.ok)
    bytes = page.value.results.reduce((sum, row) => sum + row.bytes, 0);
  expect(bytes).toBe(7);
  await port.inspect(versionId(1), signal());
  await port.download(versionId(1), signal());
  expect(calls.slice(1)).toEqual([
    "/api/documents/inspect",
    "/api/documents/inspect",
  ]);
  // No write, allocation or publication route is reachable from this surface.
  expect(
    calls.some((url) =>
      /create|revise|preview-publish|first-chat|next-turn|model/u.test(url),
    ),
  ).toBe(false);
  port.dispose();
});

it("the library port ends its connection when the results read is refused", async () => {
  const lost = vi.fn();
  const port = createDocumentLibraryAccess({
    credential: session.credential,
    context: session.context,
    lifetime: signal(),
    onAccessLost: lost,
    fetcher: async () =>
      new Response("no", {
        status: 403,
        headers: { "Content-Type": "text/plain" },
      }),
  });
  expect(await port.results(signal())).toEqual({
    ok: false,
    code: "SESSION_REFUSED",
    accessDenied: true,
  });
  expect(lost).toHaveBeenCalledOnce();
  port.dispose();
});

it("the canonical receiver admits a hostile markup name as a name, not as a document", () => {
  const admitted = receiveNativeResultsResponse(
    200,
    new TextEncoder().encode(
      JSON.stringify(
        nativeResultsPage([
          { ...nativeResultRow(1, hostilePath), sha256: digest("b") },
        ]),
      ),
    ),
    request(),
  );
  // The receiver's path rule bounds traversal and host shape; markup is a name the UI must escape.
  expect(admitted.results[0]!.path).toBe(hostilePath);
  expect(admitted.results[0]!.sha256).toBe(digest("b"));
});
