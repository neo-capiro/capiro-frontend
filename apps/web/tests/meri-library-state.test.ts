import { expect, it, vi } from "vitest";
import { DocumentLibraryController } from "../src/features/meri/files/document-library-state";
import { DocumentDownloadUrl } from "../src/features/meri/files/download-url";
import type {
  DocumentLibraryAccess,
  LibraryVersion,
} from "../src/shared/meri-documents/library-access";
import type { ArtifactReply } from "../src/shared/meri-documents/artifact-access";
import type {
  DocumentHistoryResponse,
  DocumentListResponse,
} from "@capiro/meri-client/document-access";
import {
  created,
  documentBytes,
  ids,
  session,
} from "./meri-document-public-fixtures";

const good = <T>(value: T) => ({ ok: true as const, value });
const refusal = () => ({
  ok: false as const,
  code: "ACCESS_DENIED",
  accessDenied: true as const,
});
const original = () => created().version;
function port(): DocumentLibraryAccess {
  return {
    context: session.context,
    pending: () => false,
    readPreview: vi.fn(async () => refusal()),
    publishPreview: vi.fn(async () => refusal()),
    results: vi.fn(async () => refusal()),
    dispose: vi.fn(),
    list: vi.fn(async () =>
      good({
        scope: "owner" as const,
        versions: [original()],
        nextCursor: null,
      }),
    ),
    history: vi.fn<DocumentLibraryAccess["history"]>(async () =>
      good({
        artifactId: ids.artifact,
        anchorVersionId: ids.version,
        headVersionId: ids.version,
        versions: [original()],
        nextCursor: null,
      }),
    ),
    inspect: vi.fn(async () => refusal()),
    download: vi.fn(async () =>
      good({
        filename: "Synthetic.txt",
        mimeType: "text/plain",
        bytes: documentBytes,
      }),
    ),
  };
}

it("continues an entirely denied page to an available artifact and only stops at null continuation", async () => {
  const p = port(),
    list = vi.mocked(p.list);
  list.mockResolvedValueOnce(
    good({ scope: "owner", versions: [], nextCursor: "a".repeat(64) }),
  );
  const c = new DocumentLibraryController(p, { scope: "owner" });
  await c.loadMore();
  expect(c.getSnapshot().versions).toEqual([]);
  expect(c.getSnapshot().nextCursor).not.toBeNull();
  await c.loadMore();
  expect(c.getSnapshot().versions).toHaveLength(1);
  expect(c.getSnapshot().nextCursor).toBeNull();
  await c.loadMore();
  expect(list).toHaveBeenCalledTimes(2);
  expect(list.mock.calls[1]?.[0].cursor).toBe("a".repeat(64));
  c.attach()();
});

it.each(["parent", "head", "duplicate"])(
  "withholds a %s-mismatched history continuation",
  async (mismatch) => {
    const p = port(),
      root = original(),
      head: LibraryVersion = {
        ...root,
        versionId: ids.revision,
        parentVersionId: root.versionId,
      };
    const first: DocumentHistoryResponse = {
      artifactId: ids.artifact,
      anchorVersionId: ids.version,
      headVersionId: ids.revision,
      versions: [head],
      nextCursor: "a".repeat(64),
    };
    const second: DocumentHistoryResponse = {
      ...first,
      versions: [
        mismatch === "duplicate"
          ? head
          : {
              ...root,
              versionId: mismatch === "parent" ? ids.other : root.versionId,
            },
      ],
      headVersionId: mismatch === "head" ? ids.other : first.headVersionId,
      nextCursor: null,
    };
    vi.mocked(p.history)
      .mockResolvedValueOnce(good(first))
      .mockResolvedValueOnce(good(second));
    const c = new DocumentLibraryController(p, { anchor: root });
    await c.loadMore();
    await c.loadMore();
    expect(c.getSnapshot().versions).toEqual([]);
    expect(c.getSnapshot().problem).not.toBeNull();
    c.attach()();
  },
);

it("keeps exact newest-to-oldest history across pages and clears a verified URL on selection and detach", async () => {
  const p = port(),
    root = original(),
    head = {
      ...root,
      versionId: ids.revision,
      parentVersionId: root.versionId,
    };
  vi.mocked(p.history)
    .mockResolvedValueOnce(
      good({
        artifactId: ids.artifact,
        anchorVersionId: ids.version,
        headVersionId: ids.revision,
        versions: [head],
        nextCursor: "a".repeat(64),
      }),
    )
    .mockResolvedValueOnce(
      good({
        artifactId: ids.artifact,
        anchorVersionId: ids.version,
        headVersionId: ids.revision,
        versions: [root],
        nextCursor: null,
      }),
    );
  const revoke = vi.fn(),
    urls = new DocumentDownloadUrl(() => "blob:verified", revoke),
    c = new DocumentLibraryController(p, { anchor: root }, urls),
    detach = c.attach();
  await c.loadMore();
  await c.loadMore();
  expect(c.getSnapshot().versions.map((v) => v.versionId)).toEqual([
    head.versionId,
    root.versionId,
  ]);
  c.select(head);
  await c.download();
  expect(c.getSnapshot().download?.url).toBe("blob:verified");
  c.select(root);
  expect(revoke).toHaveBeenCalledOnce();
  expect(c.getSnapshot().download).toBeNull();
  await c.download();
  detach();
  expect(revoke).toHaveBeenCalledTimes(2);
  expect(c.getSnapshot().versions).toEqual([]);
});

it("a late page cannot restore file details after lifetime disposal", async () => {
  const p = port();
  let resolve!: (value: ArtifactReply<DocumentListResponse>) => void;
  vi.mocked(p.list).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const c = new DocumentLibraryController(p, { scope: "owner" }),
    detach = c.attach(),
    pending = c.loadMore();
  detach();
  resolve(good({ scope: "owner", versions: [original()], nextCursor: null }));
  await pending;
  expect(c.getSnapshot().versions).toEqual([]);
  expect(c.getSnapshot().loaded).toBe(false);
});

it("release denial removes prior metadata and downloads; reload starts with a new cursor", async () => {
  const p = port(),
    revoke = vi.fn(),
    c = new DocumentLibraryController(
      p,
      { scope: "owner" },
      new DocumentDownloadUrl(() => "blob:verified", revoke),
    );
  await c.loadMore();
  c.select(original());
  await c.download();
  vi.mocked(p.inspect).mockResolvedValue(refusal());
  await c.inspect();
  expect(c.getSnapshot().versions).toEqual([]);
  expect(c.getSnapshot().download).toBeNull();
  expect(revoke).toHaveBeenCalledOnce();
  await c.reload();
  expect(vi.mocked(p.list).mock.lastCall?.[0].cursor).toBeNull();
  c.attach()();
});

it("binds a renewed port for the same context without clearing the loaded page, and refuses another context", async () => {
  const first = port();
  const controller = new DocumentLibraryController(first, { scope: "owner" });
  const detach = controller.attach();
  await controller.loadMore();
  expect(controller.getSnapshot().versions).toHaveLength(1);
  const renewed = port();
  controller.bind(renewed);
  expect(controller.getSnapshot().versions).toHaveLength(1);
  expect(controller.getSnapshot().problem).toBeNull();
  controller.select(controller.getSnapshot().versions[0]!);
  await controller.download();
  expect(renewed.download).toHaveBeenCalledTimes(1);
  expect(first.download).not.toHaveBeenCalled();
  // Binding the same port again is a no-op; a port for another conversation is never accepted.
  controller.bind(renewed);
  expect(() =>
    controller.bind({
      ...port(),
      context: { ...session.context, tenantId: "another-tenant" },
    }),
  ).toThrow("Library context changed");
  detach();
});

it("keeps at most one history request in flight per library; a renewal's port swap aborts it without re-issuing, and the next read is explicit", async () => {
  const first = port();
  let release: (() => void) | null = null;
  const signals: AbortSignal[] = [];
  vi.mocked(first.history).mockImplementation(
    (_request, signal) =>
      new Promise((resolve) => {
        signals.push(signal);
        release = () =>
          resolve(
            good({
              artifactId: ids.artifact,
              anchorVersionId: ids.version,
              headVersionId: ids.version,
              versions: [original()],
              nextCursor: null,
            }),
          );
      }),
  );
  const controller = new DocumentLibraryController(first, {
    anchor: original(),
  });
  const detach = controller.attach();
  const reads = [
    controller.loadMore(),
    controller.loadMore(),
    controller.loadMore(),
  ];
  expect(first.history).toHaveBeenCalledTimes(1);
  expect(controller.getSnapshot().busy).toBe(true);
  // The session renewed while the read was in flight: the old port's request is cut, nothing is re-issued on its own.
  const renewed = port();
  controller.bind(renewed);
  expect(signals[0]!.aborted).toBe(true);
  expect(controller.getSnapshot().busy).toBe(false);
  release!();
  await Promise.all(reads);
  expect(renewed.history).not.toHaveBeenCalled();
  expect(controller.getSnapshot().versions).toEqual([]);
  expect(controller.getSnapshot().problem).toBeNull();
  // The next read goes to the renewed port, once.
  await controller.loadMore();
  expect(renewed.history).toHaveBeenCalledTimes(1);
  expect(controller.getSnapshot().versions).toHaveLength(1);
  detach();
});
