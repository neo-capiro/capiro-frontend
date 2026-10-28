import { expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NATIVE_RESULTS_MAX } from "@capiro/meri-client/document-access";
import type { ArtifactPreview } from "../../src/shared/meri-documents/artifact-access";
import type { DocumentLibraryAccess } from "../../src/shared/meri-documents/library-access";
import type { NativeResultsPage } from "../../src/shared/meri-documents/native-results-access";
import {
  NativeResultFiles,
  NativeResultRows,
} from "../../src/features/meri/files/NativeResultFiles";
import {
  digest,
  hostilePath,
  nativeResultRow,
  nativeResultsPage,
  versionId,
} from "./native-results-fixtures";

/**
 * Rendering must not read anything: opening the surface is not a request, and the port stub records
 * any call so an automatic read would fail this suite.
 */
const stubPort = () => {
  const calls: string[] = [];
  const port = {
    context: {
      tenantId: "synthetic-tenant",
      actorId: "synthetic-actor",
      conversationId: "11111111-1111-4111-8111-111111111111",
      runId: "22222222-2222-4222-8222-222222222222",
      selectedClientId: null,
    },
    pending: () => false,
    list: vi.fn(),
    history: vi.fn(),
    inspect: vi.fn(async () => {
      calls.push("inspect");
      return { ok: false as const, code: "UNUSED" };
    }),
    download: vi.fn(async () => {
      calls.push("download");
      return { ok: false as const, code: "UNUSED" };
    }),
    readPreview: vi.fn(),
    publishPreview: vi.fn(),
    results: vi.fn(async () => {
      calls.push("results");
      return { ok: false as const, code: "UNUSED" };
    }),
    dispose: vi.fn(),
  } as unknown as DocumentLibraryAccess;
  return { port, calls };
};
const rows = (
  page: NativeResultsPage,
  extra: {
    busy?: boolean;
    inspection?: { versionId: string; preview: ArtifactPreview } | null;
    download?: { versionId: string; url: string; filename: string } | null;
  } = {},
) =>
  renderToStaticMarkup(
    createElement(NativeResultRows, {
      page,
      busy: extra.busy ?? false,
      inspection: extra.inspection ?? null,
      download: extra.download ?? null,
      onInspect: () => undefined,
      onDownload: () => undefined,
    }),
  );

it("opens without reading anything and claims no chat, file or library", () => {
  const { port, calls } = stubPort();
  const markup = renderToStaticMarkup(
    createElement(NativeResultFiles, { port }),
  );
  expect(calls).toEqual([]);
  expect(markup).toContain("Read captured run results");
  expect(markup).toContain("A name grants nothing by itself");
  expect(markup).toContain("does not start a chat or generate a file");
  expect(markup).not.toContain("<li>");
  expect(markup).not.toContain("<a ");
  expect(markup).not.toContain("Download");
});

it("labels one bounded page as a page and never as the whole library", () => {
  const bounded = rows(
    nativeResultsPage([nativeResultRow(1, "analysis/a.txt")], true),
  );
  expect(bounded).toContain(`bound of ${NATIVE_RESULTS_MAX} entries`);
  expect(bounded).toContain(
    "not the whole library: later entries were not returned",
  );
  const whole = rows(nativeResultsPage([nativeResultRow(1, "analysis/a.txt")]));
  expect(whole).toContain(
    `one bounded page (at most ${NATIVE_RESULTS_MAX} entries) of the captured run, not a complete conversation library`,
  );
});

it("keeps an empty page distinct from a page that reached the bound", () => {
  const empty = rows(nativeResultsPage([]));
  const bounded = rows(nativeResultsPage([], true));
  expect(empty).toContain("no workspace entry on this page");
  expect(empty).not.toContain("reached its bound");
  expect(bounded).toContain(
    "reached its bound without returning an entry on this page",
  );
  expect(bounded).not.toContain("has no workspace entry");
});

it("renders an entry name as text, never as markup or as an executable document", () => {
  const markup = rows(
    nativeResultsPage([
      { ...nativeResultRow(1, hostilePath), sha256: digest("b") },
    ]),
  );
  expect(markup).toContain("&lt;img");
  expect(markup).toContain("&quot;");
  expect(markup).not.toContain("<img");
  expect(markup).not.toContain("<script");
  expect(markup).not.toContain('onerror="alert');
  expect(markup).not.toContain("<iframe");
  expect(markup).toContain(digest("b").slice(0, 16));
  expect(markup).toContain("Inspect current bytes");
  expect(markup).toContain("Verify download");
});

it("shows verified details only for the entry that was explicitly read, and never claims a preview", () => {
  const markup = rows(
    nativeResultsPage([
      nativeResultRow(1, "analysis/a.txt"),
      { ...nativeResultRow(2, "analysis/b.txt", 2048, true) },
    ]),
    {
      inspection: {
        versionId: versionId(1),
        preview: {
          versionId: versionId(1),
          filename: "a.txt",
          mimeType: "application/octet-stream",
          bytes: 7,
          createdAt: "2026-10-28T10:00:00.000Z",
          kind: "native-file",
          path: "analysis/a.txt",
          currentBytesVerified: true,
        },
      },
      download: {
        versionId: versionId(2),
        url: "blob:verified",
        filename: "b.txt",
      },
    },
  );
  expect(markup).toContain("Current bytes verified for a.txt");
  expect(markup).toContain("does not claim a rendered preview");
  expect(markup.match(/href=/gu)?.length).toBe(1);
  expect(markup).toContain('href="blob:verified"');
  expect(markup).toContain('download="b.txt"');
  expect(markup).toContain("executable");
  expect(markup).toContain("2048 bytes");
});
