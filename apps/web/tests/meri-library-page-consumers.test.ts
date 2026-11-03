import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { DocumentLibraryState } from "../src/features/meri/files/document-library-state";
import type {
  DocumentLibraryAccess,
  LibraryVersion,
} from "../src/shared/meri-documents/library-access";

/** The loaded page each mount below reads; the controller itself is replaced, not the page. */
const page = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("../src/features/meri/files/document-library-state", () => ({
  DocumentLibraryController: class {
    attach() {}
    bind() {}
    loadMore() {}
    reload() {}
    select() {}
    subscribe = () => () => {};
    getSnapshot = () => page.current;
  },
}));
const { LibraryPage } =
  await import("../src/features/meri/files/DocumentLibrary");

const version = (mimeType: string, versionId: string): LibraryVersion =>
  ({
    versionId,
    artifactId: "a",
    parentVersionId: null,
    filename: "f",
    mimeType,
    binding: {
      tenantId: "t",
      actorId: "u",
      conversationId: "00000000-0000-4000-8000-000000000001",
    },
    scopes: [{ kind: "private-user", resourceId: "u" }],
    object: { bytes: 1, sha256: "a".repeat(64) },
    createdAt: "2026-11-02T00:00:00.000Z",
  }) as unknown as LibraryVersion;
const pdf = version("application/pdf", "00000000-0000-4000-8000-00000000000c");
const docx = version(
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "00000000-0000-4000-8000-00000000000a",
);
const loaded = (
  versions: readonly LibraryVersion[],
  nextCursor: string | null = null,
): DocumentLibraryState =>
  ({
    versions,
    selected: null,
    nextCursor,
    loaded: true,
    busy: false,
    problem: null,
    inspection: null,
    download: null,
  }) as unknown as DocumentLibraryState;
const port = {
  context: { tenantId: "t", actorId: "u", selectedClientId: null },
} as unknown as DocumentLibraryAccess;
/** The shared results page as each consumer renders it: officeOpen is the Workspace's Office list. */
const render = (office: boolean) =>
  renderToStaticMarkup(
    createElement(LibraryPage, {
      port,
      query: { scope: "owner" },
      ...(office ? { officeOpen: () => {} } : {}),
      onHistory: () => {},
    }),
  );

describe("the shared library page in each consumer", () => {
  it("keeps the Office list's own wording when its only returned version is a PDF", () => {
    page.current = loaded([pdf]);
    const html = render(true);
    expect(html).toContain(
      "No Office document is currently available in this scope.",
    );
    expect(html).not.toContain("No PDF or other non-Office file");
    expect(html).not.toContain("Modules → Workspace");
  });
  it("keeps the Office list's own wording while later pages remain", () => {
    page.current = loaded([pdf], "next");
    const html = render(true);
    expect(html).toContain(
      "No available files on this page. Continue to check later pages.",
    );
    expect(html).not.toContain("Modules → Workspace");
  });
  it("has the Files library report the version it filtered out and name the Office list", () => {
    page.current = loaded([docx]);
    const html = render(false);
    expect(html).toContain(
      "No PDF or other non-Office file is currently available in this scope.",
    );
    expect(html).toContain("Modules → Workspace under Office documents");
    expect(html).not.toContain(
      "No Office document is currently available in this scope.",
    );
  });
  it("lists a PDF in the Files library and ends only the page's own formats", () => {
    page.current = loaded([pdf]);
    const html = render(false);
    expect(html).toContain("application/pdf");
    expect(html).toContain(
      "End of the currently available PDF and other non-Office files.",
    );
    expect(html).not.toContain("Modules → Workspace");
  });
});
