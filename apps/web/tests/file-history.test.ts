import { QueryClient } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "../src/shared/portfolio/api/http";
import { DataProvider } from "../src/shared/portfolio/api/provider";
import { FileVersionHistory } from "../src/features/portfolio/files/FileVersionHistory";
import { FilePreview } from "../src/features/portfolio/files/FilePreview";
import { attachmentSchema } from "../src/features/portfolio/files/contracts";
import {
  assertFileReader,
  currentFileReader,
  currentFilesKey,
} from "../src/features/portfolio/files/file-reader";
import {
  currentFileHistoryDestination,
  readFileHistory,
} from "../src/features/portfolio/files/history-access";
import {
  fileHistorySchema,
  type FileHistoryPage,
} from "../src/features/portfolio/files/history-contract";

// Render the real preview body without a DOM portal; browser focus/visual proof is separate.
vi.mock("../src/shared/portfolio/ui/Dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) =>
    createElement("section", null, children),
}));

// Synthetic attachment rows, never artifact IDs or S3 versions.
const id = (n: number) =>
  `60000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const clientId = id(100);
const anchor = id(25);
const first = { attachmentId: anchor, cursor: null, offset: 0 };
function page(offset = 0): FileHistoryPage {
  const count = Math.min(20, 25 - offset);
  return {
    attachmentId: anchor,
    originalId: id(1),
    headId: id(25),
    versionCount: 25,
    pageSize: 20,
    offset,
    hasMore: offset + count < 25,
    nextCursor: offset + count < 25 ? "synthetic-opaque-continuation" : null,
    versions: Array.from({ length: count }, (_, index) => {
      const ordinal = offset + index + 1;
      return {
        attachmentId: id(ordinal),
        versionIndex: ordinal,
        isOriginal: ordinal === 1,
        isCurrent: ordinal === 25,
        fileName: `Synthetic version ${ordinal}.txt`,
        contentType: "text/plain",
        byteSize: 4,
        createdAt: "2026-10-28T00:00:00Z",
        folder: null,
        uploadedByUserId: "synthetic-actor",
        uploadedByName: "Synthetic author",
        source: "upload",
        sourceEntityType: null,
        sourceEntityId: null,
        contentHash: "a".repeat(64),
        lifecycleStatus: "ready",
        scanStatus: "clean",
        usable: true,
        downloadUrl: null,
        previewUrl: null,
        supersededByAttachmentId: ordinal === 25 ? null : id(ordinal + 1),
      };
    }),
  };
}
function fixture() {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  cache.setQueryData(["identity"], {
    user: { id: "synthetic-actor", email: null },
    tenant: { id: "synthetic-tenant", name: "Synthetic tenant" },
  });
  const actor = currentFileReader(cache)!;
  cache.setQueryData(currentFilesKey(cache, clientId), [{ id: anchor }]);
  const controller = new AbortController();
  const execution = {
    actor,
    signal: controller.signal,
    guard() {
      controller.signal.throwIfAborted();
      assertFileReader(cache, actor);
    },
  };
  return { cache, controller, execution };
}

describe("current native attachment history", () => {
  it("mounts history in the existing preview without starting another file operation", () => {
    const fetcher = vi.fn<typeof fetch>();
    const file = attachmentSchema.parse({
      id: anchor,
      clientId,
      fileName: "Synthetic current.txt",
      contentType: "text/plain",
      byteSize: 4,
      source: "upload",
      folder: null,
      viewerMode: "all",
      viewerUserIds: [],
      uploadedByUserId: "synthetic-actor",
      createdAt: "2026-10-28T00:00:00Z",
      lifecycleStatus: "ready",
      scanStatus: "clean",
      extractionStatus: "extracted",
      indexedAt: null,
    });
    const props = {
      api: createApiClient(fetcher),
      children: createElement(FilePreview, { clientId, file, onClose() {} }),
    };
    const html = renderToStaticMarkup(createElement(DataProvider, props));
    expect(html).toContain("Version history");
    expect(html).toContain("Read extracted text");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not read or allocate work when the history panel is mounted", () => {
    const fetcher = vi.fn<typeof fetch>();
    const props = {
      api: createApiClient(fetcher),
      children: createElement(FileVersionHistory, {
        clientId,
        attachmentId: anchor,
      }),
    };
    const html = renderToStaticMarkup(createElement(DataProvider, props));
    expect(html).toContain("Load history");
    expect(html).toContain("Issued links expire after five minutes");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("reads both bounded pages through the existing GET owner and only sends opaque selectors", async () => {
    const { cache, execution } = fixture();
    const fetcher = vi.fn<typeof fetch>(async (input, options) => {
      expect(options?.method).toBe("GET");
      expect(options?.body).toBeUndefined();
      const url = new URL(String(input), "https://synthetic.invalid");
      expect(url.pathname).toBe("/api/backend/core/engagement/attachments");
      expect(url.searchParams.get("historyOf")).toBe(anchor);
      expect(url.searchParams.get("historyPageSize")).toBe("20");
      expect([...url.searchParams.keys()]).not.toContain("clientId");
      return Response.json(
        page(url.searchParams.has("historyCursor") ? 20 : 0),
      );
    });
    const api = createApiClient(fetcher);
    const one = await readFileHistory(api, cache, clientId, first, execution);
    const two = await readFileHistory(
      api,
      cache,
      clientId,
      {
        ...first,
        cursor: one.nextCursor,
        offset: 20,
        previous: one,
      },
      execution,
    );
    expect(one.versions).toHaveLength(20);
    expect(two.versions).toHaveLength(5);
    expect(two.hasMore).toBe(false);
    expect(two.nextCursor).toBeNull();
    expect(two.versions.at(-1)?.isCurrent).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(two).not.toHaveProperty("downloadUrl");
  });

  it.each([
    [
      "wrong anchor",
      (value: FileHistoryPage) => {
        value.attachmentId = id(99);
      },
    ],
    [
      "wrong offset",
      (value: FileHistoryPage) => {
        value.offset = 20;
      },
    ],
    [
      "duplicate version",
      (value: FileHistoryPage) => {
        value.versions[1]!.attachmentId = id(1);
      },
    ],
    [
      "broken parent chain",
      (value: FileHistoryPage) => {
        value.versions[0]!.supersededByAttachmentId = id(9);
      },
    ],
    [
      "false terminal page",
      (value: FileHistoryPage) => {
        value.hasMore = false;
        value.nextCursor = null;
      },
    ],
    [
      "false current row",
      (value: FileHistoryPage) => {
        value.versions[0]!.isCurrent = true;
      },
    ],
    [
      "wrong original",
      (value: FileHistoryPage) => {
        value.originalId = id(4);
      },
    ],
    [
      "missing continuation",
      (value: FileHistoryPage) => {
        value.nextCursor = null;
      },
    ],
  ] as const)("refuses %s from the response receiver", async (_, mutate) => {
    const value = page();
    mutate(value);
    const { cache, execution } = fixture();
    await expect(
      readFileHistory(
        createApiClient(async () => Response.json(value)),
        cache,
        clientId,
        first,
        execution,
      ),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("refuses a changed chain on continuation instead of mixing generations", () => {
    const value = page(20);
    value.originalId = id(99);
    expect(
      fileHistorySchema({
        ...first,
        cursor: "opaque",
        offset: 20,
        previous: page(),
      }).safeParse(value).success,
    ).toBe(false);
  });
  it("refuses a reused nonterminal cursor instead of looping over hidden progress", () => {
    expect(
      fileHistorySchema({ ...first, cursor: page().nextCursor }).safeParse(
        page(),
      ).success,
    ).toBe(false);
  });

  it("requires the selected anchor to remain in the current client view before dispatch", async () => {
    const { cache, execution } = fixture();
    const fetcher = vi.fn<typeof fetch>();
    await expect(
      readFileHistory(
        createApiClient(fetcher),
        cache,
        id(101),
        first,
        execution,
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("keeps old metadata-only responses readable without inventing links", () => {
    const legacy = page();
    const rows = legacy.versions.map((row) =>
      Object.fromEntries(
        Object.entries(row).filter(
          ([key]) => key !== "downloadUrl" && key !== "previewUrl",
        ),
      ),
    );
    const parsed = fileHistorySchema(first).parse({
      ...legacy,
      versions: rows,
    });
    expect(
      parsed.versions.every(
        (row) => row.downloadUrl === null && row.previewUrl === null,
      ),
    ).toBe(true);
  });

  it.each([
    "javascript:alert(1)",
    "http://synthetic.invalid/file",
    "https://user:secret@synthetic.invalid/file",
  ])("refuses an unsafe original-version link %s", (url) => {
    const value = page();
    value.versions[0]!.downloadUrl = url;
    expect(fileHistorySchema(first).safeParse(value).success).toBe(false);
  });

  it("re-reads original-version links through Core for each navigation without writing or using a cached URL", async () => {
    const { cache, execution } = fixture();
    let read = 0;
    const fetcher = vi.fn<typeof fetch>(async (_input, options) => {
      expect(options?.method).toBe("GET");
      expect(options?.body).toBeUndefined();
      const value = page();
      value.versions[0]!.downloadUrl = `https://synthetic.invalid/original?read=${++read}`;
      value.versions[0]!.previewUrl = `https://synthetic.invalid/preview?read=${read}`;
      return Response.json(value);
    });
    const api = createApiClient(fetcher);
    const selected = { id: id(1), source: "upload" };
    const request = { ...first, previous: page() };
    const download = await currentFileHistoryDestination(
      api,
      cache,
      clientId,
      request,
      selected,
      "download",
      execution,
    );
    expect(download.url).toBe("https://synthetic.invalid/original?read=1");
    const preview = await currentFileHistoryDestination(
      api,
      cache,
      clientId,
      request,
      selected,
      "preview",
      execution,
    );
    expect(preview.url).toBe("https://synthetic.invalid/preview?read=2");
    expect(fetcher).toHaveBeenCalledTimes(2);
    cache.setQueryData(currentFilesKey(cache, clientId), []);
    expect(() => preview.guard()).toThrow();
  });

  it.each([
    "missing link",
    "blocked",
    "wrong source",
    "removed version",
    "revoked",
    "late identity",
  ])(
    "refuses historical navigation after %s without falling back to a stored link",
    async (kind) => {
      const { cache, execution } = fixture();
      const api = createApiClient(async () => {
        if (kind === "revoked") return Response.json({}, { status: 403 });
        const value = page();
        value.versions[0]!.downloadUrl =
          kind === "missing link" ? null : "https://synthetic.invalid/original";
        if (kind === "blocked") value.versions[0]!.usable = false;
        if (kind === "wrong source") value.versions[0]!.source = "other";
        if (kind === "late identity")
          cache.setQueryData(["identity"], {
            user: { id: "other" },
            tenant: { id: "synthetic-tenant" },
          });
        return Response.json(value);
      });
      await expect(
        currentFileHistoryDestination(
          api,
          cache,
          clientId,
          { ...first, previous: page() },
          { id: kind === "removed version" ? id(99) : id(1), source: "upload" },
          "download",
          execution,
        ),
      ).rejects.toThrow();
    },
  );

  it.each(["identity", "files", "abort"] as const)(
    "withholds a late response after %s changes",
    async (kind) => {
      const { cache, execution, controller } = fixture();
      const api = createApiClient(async () => {
        if (kind === "identity")
          cache.setQueryData(["identity"], {
            user: { id: "other-actor", email: null },
            tenant: { id: "synthetic-tenant", name: "Synthetic tenant" },
          });
        if (kind === "files")
          cache.setQueryData(currentFilesKey(cache, clientId), []);
        if (kind === "abort") controller.abort();
        return Response.json(page());
      });
      await expect(
        readFileHistory(api, cache, clientId, first, execution),
      ).rejects.toThrow();
    },
  );

  it.each([403, 404, 409])(
    "preserves current Core refusal %i without retrying or returning metadata",
    async (status) => {
      const { cache, execution } = fixture();
      const fetcher = vi.fn<typeof fetch>(async () =>
        Response.json({ message: "History unavailable" }, { status }),
      );
      await expect(
        readFileHistory(
          createApiClient(fetcher),
          cache,
          clientId,
          first,
          execution,
        ),
      ).rejects.toMatchObject({ status });
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );
});
