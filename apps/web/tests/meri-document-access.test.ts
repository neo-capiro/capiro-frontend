import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  receiveDocumentRequest as receiveOldRequest,
  receiveDocumentResponse as receiveOldResponse,
} from "@capiro/meri-contracts/document-application";
import { createArtifactAccess } from "../src/shared/meri-documents/artifact-access";
import { DocumentInspectionSummary } from "../src/features/meri/files/DocumentInspectionSummary";
import {
  accessBinary,
  accessFormats,
  accessInspection,
} from "./meri-document-access-fixtures";
import {
  documentBytes,
  ids,
  jsonBytes,
  jsonResponse,
  session,
} from "./meri-document-public-fixtures";

const signal = () => new AbortController().signal;
const token = `${"c".repeat(40)}.${"m".repeat(43)}`;
const issued = () =>
  jsonResponse({ versionId: ids.version, token, expiresAtMs: 9 });
const client = (fetcher: typeof fetch, lifetime = signal()) =>
  createArtifactAccess(session.credential, lifetime, fetcher);
afterEach(() => vi.useRealTimers());

describe("B2 artifact inspection and signed-link download", () => {
  it.each(accessFormats)(
    "admits %s inspection and exact bytes through the same receiver",
    async (format) => {
      const receipt = accessInspection(format);
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(jsonResponse(receipt))
        .mockResolvedValueOnce(jsonResponse(receipt))
        .mockResolvedValueOnce(issued())
        .mockResolvedValueOnce(accessBinary(receipt));
      const access = client(fetcher);
      expect(await access.inspect(ids.version, signal())).toMatchObject({
        ok: true,
        value: {
          filename: `Synthetic.${format}`,
          mimeType: receipt.version.mimeType,
          inspection: {
            format,
            nativeOpened: false,
            rendered: false,
            recalculated: false,
          },
          generationStatus: "draft",
          previewStatus: "pending",
        },
      });
      expect(await access.download(ids.version, signal())).toEqual({
        ok: true,
        value: {
          filename: receipt.version.filename,
          mimeType: receipt.version.mimeType,
          bytes: documentBytes,
        },
      });
      expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
        "/api/documents/inspect",
        "/api/documents/inspect",
        "/api/documents/links/issue",
        "/api/documents/links/redeem",
      ]);
      for (const [, init] of fetcher.mock.calls) {
        expect(init).toMatchObject({
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          redirect: "error",
        });
        expect(new Headers(init?.headers).get("X-Meri-Action-Session")).toBe(
          session.credential,
        );
        expect(new Headers(init?.headers).has("authorization")).toBe(false);
      }
      expect(fetcher.mock.calls[3]![1]!.body).toBe(JSON.stringify({ token }));
    },
  );

  it.each(["pptx", "pdf", "zip"] as const)(
    "does not broaden the legacy receiver to %s",
    async (format) => {
      const request = receiveOldRequest(
        "inspect",
        jsonBytes({ versionId: ids.version }),
      );
      await expect(
        receiveOldResponse(
          "inspect",
          200,
          jsonBytes(accessInspection(format)),
          request,
        ),
      ).rejects.toThrow();
    },
  );

  it.each(["shape", "version", "hash", "native", "render"])(
    "refuses malformed %s inspection before issuing a link",
    async (kind) => {
      const receipt = accessInspection("pptx");
      const malformed =
        kind === "shape"
          ? {}
          : kind === "version"
            ? {
                ...receipt,
                version: { ...receipt.version, versionId: ids.other },
              }
            : {
                ...receipt,
                inspection: {
                  ...receipt.inspection,
                  ...(kind === "hash"
                    ? { sha256: "a".repeat(64) }
                    : kind === "native"
                      ? { nativeOpened: true }
                      : { rendered: true }),
                },
              };
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(jsonResponse(malformed));
      expect(await client(fetcher).download(ids.version, signal())).toEqual({
        ok: false,
        code: "DOWNLOAD_UNAVAILABLE",
      });
      expect(fetcher).toHaveBeenCalledOnce();
    },
  );

  it.each(["hash", "short", "overflow"])(
    "refuses signed-download %s mismatch",
    async (kind) => {
      const receipt = accessInspection("pdf");
      const bytes =
        kind === "hash"
          ? new Uint8Array(documentBytes.length)
          : kind === "short"
            ? documentBytes.slice(1)
            : new Uint8Array(documentBytes.length + 1);
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(jsonResponse(receipt))
        .mockResolvedValueOnce(issued())
        .mockResolvedValueOnce(accessBinary(receipt, bytes));
      expect(await client(fetcher).download(ids.version, signal())).toEqual({
        ok: false,
        code: "DOWNLOAD_UNAVAILABLE",
      });
    },
  );

  it.each([401, 403])(
    "preserves access-loss mapping for malformed HTTP %s",
    async (status) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(jsonResponse({}, status));
      expect(await client(fetcher).inspect(ids.version, signal())).toEqual({
        ok: false,
        code: "SESSION_REFUSED",
      });
    },
  );

  it("preserves a validated remote refusal", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        jsonResponse(
          { error: { code: "ACCESS_DENIED", outcome: "READ_UNAVAILABLE" } },
          403,
        ),
      );
    expect(await client(fetcher).inspect(ids.version, signal())).toEqual({
      ok: false,
      code: "ACCESS_DENIED",
    });
  });

  it.each(["caller", "lifetime"])(
    "stops %s cancellation before link dispatch and prevents credential reuse",
    async (kind) => {
      const lifetime = new AbortController(),
        caller = new AbortController();
      const fetcher = vi.fn<typeof fetch>(async () => {
        (kind === "caller" ? caller : lifetime).abort();
        return jsonResponse(accessInspection("zip"));
      });
      const access = client(fetcher, lifetime.signal);
      expect(await access.download(ids.version, caller.signal)).toEqual({
        ok: false,
        code: "CANCELLED",
      });
      expect(fetcher).toHaveBeenCalledOnce();
      lifetime.abort();
      expect(await access.inspect(ids.version, signal())).toEqual({
        ok: false,
        code: "CANCELLED",
      });
      expect(fetcher).toHaveBeenCalledOnce();
    },
  );

  it("retains the bounded inspection deadline and cancels an unfinished response", async () => {
    vi.useFakeTimers();
    const cancel = vi.fn(() => new Promise<void>(() => {}));
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(new ReadableStream({ cancel }), {
        headers: { "Content-Type": "application/json" },
      }),
    );
    const pending = client(fetcher).inspect(ids.version, signal());
    await vi.advanceTimersByTimeAsync(30_001);
    expect(await pending).toEqual({ ok: false, code: "CANCELLED" });
    expect(cancel).toHaveBeenCalledOnce();
  });
});

describe("truthful structural inspection display", () => {
  it.each([
    ["docx", "Paragraphs"],
    ["txt", "UTF-8 text"],
    ["xlsx", "recalculation in Excel"],
    ["pptx", "Visual inspection"],
    ["pdf", "Render inspection"],
    ["zip", "Archive rows"],
  ] as const)(
    "labels %s structural facts without native or rendered claims",
    (format, expected) => {
      const html = renderToStaticMarkup(
        createElement(DocumentInspectionSummary, {
          inspection: accessInspection(format).inspection,
        }),
      );
      expect(html).toContain(expected);
      expect(html).toContain(
        "Native opening and rendering have not been verified",
      );
      expect(html).toContain("No rendered preview");
      if (format !== "txt") expect(html).not.toContain("UTF-8 text");
      if (format === "pptx" || format === "pdf")
        expect(html).toContain("Pending");
    },
  );
});
