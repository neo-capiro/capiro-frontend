import { afterEach, describe, expect, it, vi } from "vitest";
import {
  receiveDocumentRequest,
  receiveDocumentResponse,
  type AdmittedDocumentVersion,
} from "@capiro/meri-contracts/document-application";
import { documentTransport } from "../src/shared/meri-documents/workflow-transport";
import {
  binary,
  created,
  deferred,
  documentBytes,
  ids,
  jsonBytes,
  jsonResponse,
  session,
  signal,
  textContent,
} from "./meri-document-fixtures";

const createRequest = () =>
  receiveDocumentRequest(
    "create",
    jsonBytes({ deliveryId: "synthetic-delivery", request: textContent }),
  );
const downloadRequest = () =>
  receiveDocumentRequest("download", jsonBytes({ versionId: ids.version }));
async function admittedVersion(): Promise<AdmittedDocumentVersion> {
  const reply = await receiveDocumentResponse(
    "create",
    200,
    jsonBytes(created()),
    createRequest(),
  );
  if ("error" in reply) throw new Error("Fixture refused");
  return reply.version;
}
function heldBody() {
  const cancel = vi.fn(async () => {});
  const response = new Response(new ReadableStream({ cancel }), {
    headers: { "Content-Type": "application/json" },
  });
  return { cancel, response };
}
afterEach(() => vi.useRealTimers());

describe("fixed document transport and JSON cleanup", () => {
  it("sends only the documented POST path, opaque session header and same-origin credentials", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(created()));
    const transport = documentTransport(session.credential, signal(), fetcher);
    expect(
      (await transport.request("create", createRequest(), signal())).status,
    ).toBe(200);
    expect(fetcher.mock.calls[0]![0]).toBe("/api/documents/create");
    expect(fetcher.mock.calls[0]![1]).toMatchObject({
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      headers: {
        "X-Meri-Action-Session": session.credential,
        "Content-Type": "application/json",
      },
    });
    expect(JSON.parse(fetcher.mock.calls[0]![1]!.body as string)).toMatchObject(
      { deliveryId: "synthetic-delivery", request: textContent },
    );
  });
  it("refuses a runtime forged route before fetch", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const transport = documentTransport(session.credential, signal(), fetcher);
    await expect(
      transport.request("../private" as "create", createRequest(), signal()),
    ).rejects.toThrow("Unknown document route");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(["content-type", "content-length"])(
    "cancels an unconsumed body after %s refusal",
    async (header) => {
      const body = heldBody();
      body.response.headers.set(
        header,
        header === "content-type" ? "text/html" : String(16 * 1024 * 1024 + 1),
      );
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(body.response);
      await expect(
        documentTransport(session.credential, signal(), fetcher).request(
          "create",
          createRequest(),
          signal(),
        ),
      ).rejects.toThrow();
      expect(body.cancel).toHaveBeenCalledTimes(1);
    },
  );
  it("rejects fatal UTF8 before the public JSON receiver", async () => {
    const response = new Response(new Uint8Array([0xc3, 0x28]), {
      headers: { "Content-Type": "application/json" },
    });
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
    await expect(
      documentTransport(session.credential, signal(), fetcher).request(
        "create",
        createRequest(),
        signal(),
      ),
    ).rejects.toThrow();
  });
  it("cancels incrementally over-limit JSON even when Content-Length is absent", async () => {
    const cancel = vi.fn();
    let reads = 0;
    const stream = new ReadableStream({
      pull(controller) {
        reads++;
        controller.enqueue(new Uint8Array(1024 * 1024));
      },
      cancel,
    });
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(stream, {
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(
      documentTransport(session.credential, signal(), fetcher).request(
        "create",
        createRequest(),
        signal(),
      ),
    ).rejects.toThrow();
    expect(reads).toBeLessThanOrEqual(19);
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it("does not fetch with an already-aborted caller or lifetime", async () => {
    const aborted = new AbortController();
    aborted.abort();
    const fetcher = vi.fn<typeof fetch>();
    await expect(
      documentTransport(session.credential, signal(), fetcher).request(
        "create",
        createRequest(),
        aborted.signal,
      ),
    ).rejects.toThrow();
    await expect(
      documentTransport(session.credential, aborted.signal, fetcher).request(
        "create",
        createRequest(),
        signal(),
      ),
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("cancels a response acquired after the deadline without awaiting hanging cancellation", async () => {
    vi.useFakeTimers();
    const held = deferred<Response>();
    const cancel = vi.fn(() => new Promise<void>(() => {}));
    const fetcher = vi.fn<typeof fetch>().mockReturnValue(held.promise);
    const pending = documentTransport(
      session.credential,
      signal(),
      fetcher,
    ).request("create", createRequest(), signal());
    const rejected = expect(pending).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(30_001);
    await rejected;
    held.resolve(
      new Response(new ReadableStream({ cancel }), {
        headers: { "Content-Type": "application/json" },
      }),
    );
    await vi.advanceTimersByTimeAsync(1);
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it("ends a hanging JSON stream on deadline even if cancel never resolves", async () => {
    vi.useFakeTimers();
    const cancel = vi.fn(() => new Promise<void>(() => {}));
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(new ReadableStream({ cancel }), {
        headers: { "Content-Type": "application/json" },
      }),
    );
    const pending = documentTransport(
      session.credential,
      signal(),
      fetcher,
    ).request("create", createRequest(), signal());
    const rejected = expect(pending).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(30_001);
    await rejected;
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});

describe("public binary admission", () => {
  it("refuses mismatched request/version identity before binary delivery", async () => {
    const version = await admittedVersion();
    const request = receiveDocumentRequest(
      "download",
      jsonBytes({ versionId: ids.other }),
    );
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(binary());
    await expect(
      documentTransport(session.credential, signal(), fetcher).download(
        request,
        version,
        signal(),
      ),
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("releases exact receiver-verified bytes and exact branded version", async () => {
    const version = await admittedVersion();
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(binary());
    const reply = await documentTransport(
      session.credential,
      signal(),
      fetcher,
    ).download(downloadRequest(), version, signal());
    expect("error" in reply.value).toBe(false);
    if ("error" in reply.value) return;
    expect(reply.value.version).toBe(version);
    expect(reply.value.bytes).toEqual(documentBytes);
    expect(fetcher.mock.calls[0]![0]).toBe("/api/documents/download");
    expect(JSON.parse(fetcher.mock.calls[0]![1]!.body as string)).toEqual({
      versionId: ids.version,
    });
  });
  it.each([
    "Content-Type",
    "Content-Disposition",
    "Content-Length",
    "Cache-Control",
    "X-Content-Type-Options",
    "Content-Encoding",
  ])("refuses and cancels invalid binary %s", async (header) => {
    const version = await admittedVersion();
    const cancel = vi.fn();
    const response = new Response(new ReadableStream({ cancel }), {
      headers: binary().headers,
    });
    response.headers.set(header, "wrong");
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
    await expect(
      documentTransport(session.credential, signal(), fetcher).download(
        downloadRequest(),
        version,
        signal(),
      ),
    ).rejects.toThrow();
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it("does not admit a clone of a branded version", async () => {
    const version = await admittedVersion();
    const cancel = vi.fn();
    const response = new Response(new ReadableStream({ cancel }), {
      headers: binary().headers,
    });
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
    await expect(
      documentTransport(session.credential, signal(), fetcher).download(
        downloadRequest(),
        { ...version },
        signal(),
      ),
    ).rejects.toThrow("UNADMITTED_VERSION");
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it.each(["hash", "short", "overflow"])(
    "refuses incorrect binary %s",
    async (kind) => {
      const version = await admittedVersion();
      const bytes =
        kind === "hash"
          ? new Uint8Array(documentBytes.length)
          : kind === "short"
            ? documentBytes.slice(1)
            : new Uint8Array(documentBytes.length + 1);
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(binary(created(), bytes));
      await expect(
        documentTransport(session.credential, signal(), fetcher).download(
          downloadRequest(),
          version,
          signal(),
        ),
      ).rejects.toThrow();
    },
  );
  it("aborts an unfinished binary stream without waiting for its cancel promise", async () => {
    const version = await admittedVersion();
    const cancel = vi.fn(() => new Promise<void>(() => {}));
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(new ReadableStream({ cancel }), {
        headers: binary().headers,
      }),
    );
    const caller = new AbortController();
    const pending = documentTransport(
      session.credential,
      signal(),
      fetcher,
    ).download(downloadRequest(), version, caller.signal);
    const rejected = expect(pending).rejects.toThrow();
    await Promise.resolve();
    caller.abort();
    await rejected;
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it("receives finite binary-route errors using the request-bound JSON receiver", async () => {
    const version = await admittedVersion();
    const value = {
      error: { code: "DOCUMENT_REFUSED", outcome: "READ_UNAVAILABLE" },
    };
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(value, 502));
    expect(
      (
        await documentTransport(session.credential, signal(), fetcher).download(
          downloadRequest(),
          version,
          signal(),
        )
      ).value,
    ).toEqual(value);
  });
});
