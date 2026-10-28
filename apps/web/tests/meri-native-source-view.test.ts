import { createHash } from "node:crypto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import {
  createArtifactAccess,
  type ArtifactAccess,
  type ArtifactPreview,
} from "../src/shared/meri-documents/artifact-access";
import {
  readArtifactSource,
  sourceViewMaxBytes,
} from "../src/shared/meri-documents/source-access";
import {
  DocumentSourcePanel,
  DocumentSourceText,
} from "../src/features/meri/files/DocumentSourcePanel";
import { nativeInspection } from "./meri-document-access-fixtures";
import { ids, session } from "./meri-document-public-fixtures";

const source =
  '<script>fetch("https://synthetic.invalid/private")</script>\n<h1>Literal & source</h1>';
const bytes = new TextEncoder().encode(source);
const preview = (
  data = bytes,
): Extract<ArtifactPreview, { kind: "native-file" }> => ({
  kind: "native-file",
  versionId: ids.version,
  filename: "report.html",
  path: "exports/report.html",
  mimeType: "application/octet-stream",
  bytes: data.length,
  createdAt: "2026-10-28T00:00:00Z",
  currentBytesVerified: true,
});
function access(data = bytes): ArtifactAccess {
  return {
    pending: () => false,
    inspect: vi.fn(),
    download: vi.fn<ArtifactAccess["download"]>(async () => ({
      ok: true,
      value: {
        filename: "report.html",
        mimeType: "application/octet-stream",
        bytes: data,
      },
    })),
  };
}
const signal = () => new AbortController().signal;

it("renders HTML and code as escaped text without an executable element", () => {
  const markup = renderToStaticMarkup(
    createElement(DocumentSourceText, { text: source }),
  );
  expect(markup).toContain("&lt;script&gt;");
  expect(markup).toContain("Literal &amp; source");
  expect(markup).not.toMatch(/<script|<iframe|<h1|srcdoc=/u);
});
it("does no reads, renders, writes or model work just by opening the native source panel", () => {
  const port = access();
  expect(
    renderToStaticMarkup(
      createElement(DocumentSourcePanel, { access: port, preview: preview() }),
    ),
  ).toContain("View source");
  expect(port.download).not.toHaveBeenCalled();
  expect(port.inspect).not.toHaveBeenCalled();
});
it("reads through fresh canonical native inspect, signed link and byte receiver only", async () => {
  const receipt = nativeInspection("exports/report.html");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  receipt.version.object = {
    ...receipt.version.object,
    bytes: bytes.length,
    sha256,
  };
  receipt.integrity = { ...receipt.integrity, bytes: bytes.length, sha256 };
  const fetcher = vi.fn<typeof fetch>(async (url) => {
    if (String(url).endsWith("/inspect")) return Response.json(receipt);
    if (String(url).endsWith("/issue"))
      return Response.json({
        versionId: ids.version,
        token: `${"c".repeat(40)}.${"m".repeat(43)}`,
        expiresAtMs: 9,
      });
    return new Response(bytes, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": 'attachment; filename="report.html"',
        "Content-Length": String(bytes.length),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
  const port = createArtifactAccess(session.credential, signal(), fetcher);
  expect(await readArtifactSource(port, preview(), signal())).toEqual({
    ok: true,
    value: source,
  });
  expect(fetcher.mock.calls.map(([url]) => String(url))).toEqual([
    "/api/documents/inspect",
    "/api/documents/links/issue",
    "/api/documents/links/redeem",
  ]);
});
it("a stale source selection cannot bypass current access revocation", async () => {
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({ error: { code: "ACCESS_DENIED" } }, { status: 403 }),
  );
  const port = createArtifactAccess(session.credential, signal(), fetcher);
  expect((await readArtifactSource(port, preview(), signal())).ok).toBe(false);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it.each([new Uint8Array([0xff, 0xfe]), new Uint8Array([97, 0, 98])])(
  "refuses invalid UTF-8 or binary control bytes",
  async (data) => {
    expect(
      (await readArtifactSource(access(data), preview(data), signal())).ok,
    ).toBe(false);
  },
);
it("refuses oversized source without truncating or starting a download", async () => {
  const port = access();
  expect(
    await readArtifactSource(
      port,
      { ...preview(), bytes: sourceViewMaxBytes + 1 },
      signal(),
    ),
  ).toEqual({ ok: false, code: "SOURCE_TOO_LARGE" });
  expect(port.download).not.toHaveBeenCalled();
});
it("does not treat arbitrary binary extensions as executable previews", async () => {
  const port = access();
  expect(
    await readArtifactSource(
      port,
      { ...preview(), filename: "report.exe" },
      signal(),
    ),
  ).toEqual({ ok: false, code: "SOURCE_UNSUPPORTED" });
  expect(port.download).not.toHaveBeenCalled();
});
it.each([{ filename: "other.html" }, { bytes: bytes.length - 1 }])(
  "rejects stale version metadata without displaying substituted content",
  async (change) => {
    expect(
      await readArtifactSource(access(), { ...preview(), ...change }, signal()),
    ).toEqual({ ok: false, code: "SOURCE_MISMATCH" });
  },
);
it("does not release a late read after its owning view is cancelled", async () => {
  const pending =
    Promise.withResolvers<Awaited<ReturnType<ArtifactAccess["download"]>>>();
  const port = access();
  port.download = vi.fn(() => pending.promise);
  const controller = new AbortController();
  const result = readArtifactSource(port, preview(), controller.signal);
  controller.abort();
  pending.resolve({
    ok: true,
    value: {
      filename: "report.html",
      mimeType: "application/octet-stream",
      bytes,
    },
  });
  expect(await result).toEqual({ ok: false, code: "CANCELLED" });
});
it("an already aborted view never starts a read", async () => {
  const port = access(),
    controller = new AbortController();
  controller.abort();
  expect(await readArtifactSource(port, preview(), controller.signal)).toEqual({
    ok: false,
    code: "CANCELLED",
  });
  expect(port.download).not.toHaveBeenCalled();
});
