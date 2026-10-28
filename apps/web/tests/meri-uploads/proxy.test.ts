import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { UPLOAD_LIMITS } from "../../src/shared/meri-uploads/facade";
import { readUploadConfig } from "../../src/shared/meri-uploads/config";
import {
  proxyUploadOriginal,
  proxyUploadRequest,
} from "../../src/shared/meri-uploads/proxy";

/**
 * The fixed proxy leaves this app added for attachments.
 *
 * Every case drives the real leaf with a browser-shaped request and a transport stand-in for the
 * remote application, so the checks that decide whether anything is forwarded are what is asserted.
 * The credential is a placeholder shape, never a real session.
 */

const encoder = new TextEncoder();
const credential = `action_session_${"A".repeat(43)}`;
const nativeToken = async () => "clerk-token";
const appOrigin = "https://app.example";
const baseUrl = "https://meri.example";
const uploadId = "11111111-1111-4111-8111-111111111111";
const pdf = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55, 10, 1, 2, 3]);
const pdfSha256 = createHash("sha256").update(pdf).digest("hex");
/** The canonical original-download headers a read reply carries. */
const downloadHeaders = {
  "content-type": "application/pdf",
  "content-length": String(pdf.byteLength),
  "content-disposition": `attachment; filename="${uploadId}.pdf"`,
  "x-meri-upload-id": uploadId,
  "x-meri-upload-sha256": pdfSha256,
  "x-meri-upload-version": "3",
};
const config = {
  enabled: true,
  baseUrl,
  requestOrigin: undefined,
} satisfies ReturnType<typeof readUploadConfig>;

type Forwarded = Readonly<{
  url: string;
  method: string;
  body: Uint8Array | null;
  authorization: string | null;
}>;

const upstream = (status = 200, body: unknown = { ok: true }) => {
  const forwarded: Forwarded[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    forwarded.push(
      Object.freeze({
        url: String(input),
        method: init?.method ?? "GET",
        body:
          init?.body instanceof Uint8Array
            ? init.body
            : typeof init?.body === "string"
              ? encoder.encode(init.body)
              : null,
        authorization: new Headers(init?.headers).get("authorization"),
      }),
    );
    return Response.json(body, { status });
  };
  return { fetcher, forwarded };
};

const jsonRequest = (
  operation: string,
  body: unknown,
  headers: Record<string, string> = {},
) =>
  new Request(`${appOrigin}/api/uploads/${operation}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      origin: appOrigin,
      "x-meri-action-session": credential,
      ...headers,
    },
  });

const originalRequest = (
  headers: Record<string, string | undefined> = {},
  bytes: Uint8Array<ArrayBuffer> = pdf,
) =>
  new Request(`${appOrigin}/api/uploads/original/${uploadId}`, {
    method: "PUT",
    body: bytes,
    headers: {
      "content-type": "application/octet-stream",
      "content-length": String(bytes.byteLength),
      "x-meri-upload-sha256": pdfSha256,
      origin: appOrigin,
      "x-meri-action-session": credential,
      ...headers,
    },
  });

const bodyOf = async (response: Response) =>
  (await response.json()) as {
    error: { code: string; outcome: string };
  };

/** A binary read reply; captures only the forwarded URL because the read path relays bytes. */
const readUpstream = (
  status: number,
  bytes: Uint8Array<ArrayBuffer>,
  headers: Record<string, string> = downloadHeaders,
) => {
  const calls: string[] = [];
  const fetcher: typeof fetch = async (input) => {
    calls.push(String(input));
    return new Response(bytes, { status, headers });
  };
  return { fetcher, calls };
};

describe("the fixed upload proxy", () => {
  it("forwards one admitted command to the configured application origin", async () => {
    const { fetcher, forwarded } = upstream(200, {
      uploadId,
      storageStatus: "stored",
    });
    const response = await proxyUploadRequest(
      jsonRequest("status", { uploadId }),
      "status",
      config,
      nativeToken,
      fetcher,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      uploadId,
      storageStatus: "stored",
    });
    // Local response headers are always the no-store JSON ones, never the upstream's.
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(forwarded).toHaveLength(1);
    expect(forwarded[0]!.url).toBe(`${baseUrl}/api/uploads/status`);
    expect(forwarded[0]!.method).toBe("POST");
    // The opaque session becomes the bearer the application expects; the native token never travels.
    expect(forwarded[0]!.authorization).toBe(`Bearer ${credential}`);
    expect(new TextDecoder().decode(forwarded[0]!.body!)).toBe(
      JSON.stringify({ uploadId }),
    );
  });

  it("forwards one inspect for the saved source and relays only the JSON shape", async () => {
    const { fetcher, forwarded } = upstream(200, {
      uploadId,
      storageStatus: "stored",
      originalBytesAvailable: true,
    });
    const response = await proxyUploadRequest(
      jsonRequest("inspect", { uploadId }),
      "inspect",
      config,
      nativeToken,
      fetcher,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      uploadId,
      storageStatus: "stored",
      originalBytesAvailable: true,
    });
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(forwarded).toHaveLength(1);
    expect(forwarded[0]!.url).toBe(`${baseUrl}/api/uploads/inspect`);
    expect(forwarded[0]!.method).toBe("POST");
  });

  it("relays the original bytes with exactly the six canonical download headers", async () => {
    const { fetcher, calls } = readUpstream(200, pdf, {
      ...downloadHeaders,
      "x-upstream-private": "never-relayed",
    });
    const response = await proxyUploadRequest(
      jsonRequest("read", { uploadId }),
      "read",
      config,
      nativeToken,
      fetcher,
    );
    expect(calls).toEqual([`${baseUrl}/api/uploads/read`]);
    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(pdf);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-length")).toBe(String(pdf.byteLength));
    expect(response.headers.get("content-disposition")).toBe(
      downloadHeaders["content-disposition"],
    );
    expect(response.headers.get("x-meri-upload-id")).toBe(uploadId);
    expect(response.headers.get("x-meri-upload-sha256")).toBe(pdfSha256);
    expect(response.headers.get("x-meri-upload-version")).toBe("3");
    // The no-store/nosniff pair stays; nothing the upstream added survives the relay.
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-upstream-private")).toBeNull();
  });

  it("reports a lost read reply as READ_UNAVAILABLE without inventing a dispatch outcome", async () => {
    let attempts = 0;
    const fetcher: typeof fetch = async () => {
      attempts += 1;
      throw new Error("socket closed");
    };
    const response = await proxyUploadRequest(
      jsonRequest("read", { uploadId }),
      "read",
      config,
      nativeToken,
      fetcher,
    );
    expect(attempts).toBe(1);
    expect(response.status).toBe(503);
    expect(await bodyOf(response)).toEqual({
      error: { code: "UPLOAD_UNAVAILABLE", outcome: "READ_UNAVAILABLE" },
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("refuses anything that is not this fixed, enabled, authenticated leaf", async () => {
    const { fetcher, forwarded } = upstream();
    const refused = async (
      response: Response,
      status: number,
      code: string,
      outcome: string,
    ) => {
      expect(response.status).toBe(status);
      expect(await bodyOf(response)).toEqual({ error: { code, outcome } });
    };
    // An operation outside the five reachable leaves stays unreachable; "purge" is not canonical.
    await refused(
      await proxyUploadRequest(
        jsonRequest("purge", { uploadId }),
        "purge",
        config,
        nativeToken,
        fetcher,
      ),
      404,
      "NOT_FOUND",
      "NOT_DISPATCHED",
    );
    await refused(
      await proxyUploadRequest(
        new Request(`${appOrigin}/api/uploads/status`, {
          method: "GET",
          headers: { origin: appOrigin, "x-meri-action-session": credential },
        }),
        "status",
        config,
        nativeToken,
        fetcher,
      ),
      405,
      "METHOD_NOT_ALLOWED",
      "NOT_DISPATCHED",
    );
    await refused(
      await proxyUploadRequest(
        new Request(`${appOrigin}/api/uploads/status?all=1`, {
          method: "POST",
          body: JSON.stringify({ uploadId }),
          headers: {
            "content-type": "application/json",
            origin: appOrigin,
            "x-meri-action-session": credential,
          },
        }),
        "status",
        config,
        nativeToken,
        fetcher,
      ),
      404,
      "NOT_FOUND",
      "NOT_DISPATCHED",
    );
    await refused(
      await proxyUploadRequest(
        jsonRequest(
          "status",
          { uploadId },
          { origin: "https://attacker.example" },
        ),
        "status",
        config,
        nativeToken,
        fetcher,
      ),
      404,
      "NOT_FOUND",
      "NOT_DISPATCHED",
    );
    // A browser bearer would shadow the native cookie; this leaf never accepts one.
    await refused(
      await proxyUploadRequest(
        jsonRequest(
          "status",
          { uploadId },
          { authorization: "Bearer browser" },
        ),
        "status",
        config,
        nativeToken,
        fetcher,
      ),
      404,
      "NOT_FOUND",
      "NOT_DISPATCHED",
    );
    await refused(
      await proxyUploadRequest(
        jsonRequest("status", { uploadId }),
        "status",
        { ...config, enabled: false },
        nativeToken,
        fetcher,
      ),
      503,
      "UPLOAD_UNAVAILABLE",
      "UNKNOWN",
    );
    const signedOut = async () => null;
    await refused(
      await proxyUploadRequest(
        jsonRequest("status", { uploadId }),
        "status",
        config,
        signedOut,
        fetcher,
      ),
      401,
      "UPLOAD_ACCESS_DENIED",
      "NOT_DISPATCHED",
    );
    await refused(
      await proxyUploadRequest(
        jsonRequest("status", { uploadId }, { "x-meri-action-session": "" }),
        "status",
        config,
        nativeToken,
        fetcher,
      ),
      401,
      "UPLOAD_ACCESS_DENIED",
      "NOT_DISPATCHED",
    );
    await refused(
      await proxyUploadRequest(
        jsonRequest("status", { uploadId: "not-a-uuid" }),
        "status",
        config,
        nativeToken,
        fetcher,
      ),
      400,
      "INVALID_BODY",
      "NOT_DISPATCHED",
    );
    expect(forwarded).toEqual([]);
  });

  it("bounds the original write and refuses before anything is forwarded", async () => {
    const { fetcher, forwarded } = upstream();
    const held = async (response: Response, status: number, code: string) => {
      expect(response.status).toBe(status);
      const body = await bodyOf(response);
      expect(body.error.code).toBe(code);
      expect(body.error.outcome).toBe("NOT_DISPATCHED");
    };
    await held(
      await proxyUploadOriginal(
        new Request(`${appOrigin}/api/uploads/original/not-a-uuid`, {
          method: "PUT",
          body: pdf,
          headers: {
            "content-type": "application/octet-stream",
            origin: appOrigin,
            "x-meri-action-session": credential,
          },
        }),
        "not-a-uuid",
        config,
        nativeToken,
        fetcher,
      ),
      404,
      "NOT_FOUND",
    );
    await held(
      await proxyUploadOriginal(
        new Request(`${appOrigin}/api/uploads/original/${uploadId}`, {
          method: "POST",
          body: pdf,
          headers: { origin: appOrigin, "x-meri-action-session": credential },
        }),
        uploadId,
        config,
        nativeToken,
        fetcher,
      ),
      405,
      "METHOD_NOT_ALLOWED",
    );
    await held(
      await proxyUploadOriginal(
        originalRequest({ "content-type": "application/json" }),
        uploadId,
        config,
        nativeToken,
        fetcher,
      ),
      400,
      "UPLOAD_FORMAT",
    );
    // A missing or non-canonical length is never guessed from the arrival.
    await held(
      await proxyUploadOriginal(
        new Request(`${appOrigin}/api/uploads/original/${uploadId}`, {
          method: "PUT",
          body: pdf,
          headers: {
            "content-type": "application/octet-stream",
            origin: appOrigin,
            "x-meri-action-session": credential,
            "x-meri-upload-sha256": pdfSha256,
          },
        }),
        uploadId,
        config,
        nativeToken,
        fetcher,
      ),
      400,
      "INVALID_CONTENT_LENGTH",
    );
    await held(
      await proxyUploadOriginal(
        originalRequest({
          "content-length": String(UPLOAD_LIMITS.originalBytes + 1),
        }),
        uploadId,
        config,
        nativeToken,
        fetcher,
      ),
      413,
      "UPLOAD_SIZE",
    );
    await held(
      await proxyUploadOriginal(
        originalRequest({ "x-meri-upload-sha256": undefined }),
        uploadId,
        config,
        nativeToken,
        fetcher,
      ),
      400,
      "UPLOAD_HASH",
    );
    // A substituted body is refused here, and custody still re-verifies it upstream.
    await held(
      await proxyUploadOriginal(
        originalRequest({ "x-meri-upload-sha256": "b".repeat(64) }),
        uploadId,
        config,
        nativeToken,
        fetcher,
      ),
      400,
      "UPLOAD_ORIGINAL_MISMATCH",
    );
    // A body that disagrees with its own declared length is a truncated or enlarged original.
    await held(
      await proxyUploadOriginal(
        new Request(`${appOrigin}/api/uploads/original/${uploadId}`, {
          method: "PUT",
          body: pdf,
          headers: {
            "content-type": "application/octet-stream",
            "content-length": String(pdf.byteLength - 1),
            "x-meri-upload-sha256": pdfSha256,
            origin: appOrigin,
            "x-meri-action-session": credential,
          },
        }),
        uploadId,
        config,
        nativeToken,
        fetcher,
      ),
      413,
      "UPLOAD_SIZE",
    );
    await held(
      await proxyUploadOriginal(
        originalRequest({}, new Uint8Array(UPLOAD_LIMITS.originalBytes + 1)),
        uploadId,
        config,
        nativeToken,
        fetcher,
      ),
      413,
      "UPLOAD_SIZE",
    );
    expect(forwarded).toEqual([]);
  });

  it("writes the verified original exactly once to the application origin", async () => {
    const { fetcher, forwarded } = upstream(200, {
      uploadId,
      storageStatus: "stored",
      originalBytesAvailable: false,
    });
    const response = await proxyUploadOriginal(
      originalRequest(),
      uploadId,
      config,
      nativeToken,
      fetcher,
    );
    expect(response.status).toBe(200);
    expect(forwarded).toHaveLength(1);
    expect(forwarded[0]!.url).toBe(
      `${baseUrl}/api/uploads/original/${uploadId}`,
    );
    expect(forwarded[0]!.method).toBe("PUT");
    expect(forwarded[0]!.authorization).toBe(`Bearer ${credential}`);
    // The forwarded bytes are the verified original, so the length Meri sees is the declared one.
    expect(forwarded[0]!.body).toEqual(pdf);
    expect(forwarded[0]!.body!.byteLength).toBe(pdf.byteLength);
  });

  it("keeps the family closed until the conversation deployment is configured", () => {
    expect(readUploadConfig({})).toEqual({
      enabled: false,
      baseUrl: undefined,
      requestOrigin: undefined,
    });
    // The family flag alone never enables it: the Meri service origin is what carries the calls.
    expect(
      readUploadConfig({ MERI_CONVERSATION_WORKFLOW_ENABLED: "true" }).enabled,
    ).toBe(false);
  });
});
