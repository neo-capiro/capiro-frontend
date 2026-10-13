import { describe, expect, it } from "vitest";
import type {
  DocumentDownloadView,
  DocumentReply,
  DocumentVersionView,
  DocumentWorkflowPort,
} from "../src/shared/meri-documents/workflow-port";
import type { DocumentAttempt } from "../src/shared/meri-documents/attempt-journal";
import { DocumentFilesController } from "../src/features/meri/files/document-workflow-state";
import { DocumentDownloadUrl } from "../src/features/meri/files/download-url";

function version(
  id: string,
  parent: string | null = null,
): DocumentVersionView {
  return Object.freeze({
    handle: Object.freeze({ synthetic: id }),
    metadata: Object.freeze({
      artifactId: "synthetic-artifact",
      versionId: id,
      parentVersionId: parent,
      filename: `${id}.txt`,
      mimeType: "text/plain; charset=utf-8",
      bytes: 4,
      sha256: "a".repeat(64),
      createdAt: "2026-10-13T00:00:00Z",
      format: "txt" as const,
    }),
    inspection: {
      format: "txt" as const,
      sha256: "a".repeat(64),
      bytes: 4,
      nativeOpened: false as const,
      rendered: false as const,
      recalculated: false as const,
      members: [],
      details: { encoding: "UTF-8" as const, whitespace: "unchanged" as const },
    },
  });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function fixture() {
  let attempt: DocumentAttempt = { status: "idle", fingerprints: [] };
  const calls: {
    operation: string;
    input?: unknown;
    handle?: object;
    signal: AbortSignal;
  }[] = [];
  const first = version("version-a");
  const handlers = {
    write: async (): Promise<DocumentReply<DocumentVersionView>> => ({
      ok: true,
      value: first,
    }),
    read: async (): Promise<DocumentReply<DocumentVersionView>> => ({
      ok: true,
      value: first,
    }),
    download: async (): Promise<DocumentReply<DocumentDownloadView>> => ({
      ok: true,
      value: { version: first, bytes: new TextEncoder().encode("text") },
    }),
  };
  const port: DocumentWorkflowPort = {
    async create(input, signal) {
      calls.push({ operation: "create", input, signal });
      attempt = {
        status: "pending",
        fingerprints: ["synthetic"],
        attemptId: "delivery-a",
      };
      const reply = await handlers.write();
      attempt =
        reply.ok || reply.problem === "not-dispatched"
          ? { status: "idle", fingerprints: [] }
          : {
              status: "unresolved",
              fingerprints: ["synthetic"],
              attemptId: "delivery-a",
              problem: reply.problem,
            };
      return reply;
    },
    async revise(handle, input, signal) {
      calls.push({ operation: "revise", handle, input, signal });
      attempt = {
        status: "pending",
        fingerprints: ["synthetic"],
        attemptId: "delivery-b",
      };
      const reply = await handlers.write();
      attempt = reply.ok
        ? { status: "idle", fingerprints: [] }
        : {
            status: "unresolved",
            fingerprints: ["synthetic"],
            problem: reply.problem,
          };
      return reply;
    },
    async inspect(handle, signal) {
      calls.push({ operation: "inspect", handle, signal });
      return handlers.read();
    },
    async inspectVersion(input, signal) {
      calls.push({ operation: "inspectVersion", input, signal });
      return handlers.read();
    },
    async download(handle, signal) {
      calls.push({ operation: "download", handle, signal });
      return handlers.download();
    },
    snapshot: () => attempt,
    dispose() {
      throw new Error("Feature must not dispose a borrowed port");
    },
  };
  const revoked: string[] = [];
  let allocations = 0;
  const urls = new DocumentDownloadUrl(
    () => `blob:verified-${++allocations}`,
    (url) => revoked.push(url),
  );
  const controller = new DocumentFilesController(port, "create_word", urls);
  const edit = (body = "text") =>
    controller.editWord({ title: "Report", format: "txt", body });
  return {
    controller,
    port,
    first,
    handlers,
    calls,
    edit,
    urls,
    revoked,
    allocations: () => allocations,
  };
}

describe("document presentation operation lifetime", () => {
  it("does not perform operations when attached or edited", () => {
    const f = fixture();
    f.controller.attach();
    f.edit();
    f.controller.setInspectId("known-version");
    expect(f.calls).toEqual([]);
    expect(f.controller.getSnapshot().selected).toBeNull();
  });

  it("captures input and freezes writing against pending edits/double submission", async () => {
    const f = fixture(),
      held = deferred<DocumentReply<DocumentVersionView>>();
    f.handlers.write = () => held.promise;
    f.edit("submitted");
    const pending = f.controller.submit();
    f.edit("later typing");
    await f.controller.submit();
    expect(f.calls).toHaveLength(1);
    expect(f.calls[0]?.input).toEqual({
      operation: "create_word",
      format: "txt",
      title: "Report",
      content: { text: "submitted" },
    });
    expect(f.controller.getSnapshot().word.body).toBe("submitted");
    held.resolve({ ok: true, value: f.first });
    await pending;
    expect(f.controller.getSnapshot().selected).toBe(f.first);
    expect(f.controller.getSnapshot().word.body).toBe("submitted");
  });

  it("requires explicit full-replacement acknowledgement and exact selected parent handle", async () => {
    const f = fixture();
    f.edit();
    await f.controller.submit();
    f.controller.beginRevision();
    f.edit("Full replacement");
    await f.controller.submit();
    expect(f.calls).toHaveLength(1);
    f.controller.acknowledge(true);
    const child = version("version-b", "version-a");
    f.handlers.write = async () => ({ ok: true, value: child });
    await f.controller.submit();
    expect(f.calls[1]).toMatchObject({
      operation: "revise",
      handle: f.first.handle,
      input: { content: { text: "Full replacement" } },
    });
    expect(f.calls[1]?.handle).toBe(f.first.handle);
    expect(f.controller.getSnapshot().selected?.metadata.parentVersionId).toBe(
      "version-a",
    );
    expect(f.controller.getSnapshot().versions).toEqual([f.first, child]);
  });

  it("renews replacement acknowledgement after editing", async () => {
    const f = fixture();
    f.edit();
    await f.controller.submit();
    f.controller.beginRevision();
    f.controller.acknowledge(true);
    f.edit("Changed full content");
    await f.controller.submit();
    expect(f.calls).toHaveLength(1);
    expect(f.controller.getSnapshot().acknowledged).toBe(false);
  });

  it("unknown writes stay blocked after a successful explicit inspection and remount", async () => {
    const f = fixture();
    f.edit();
    f.handlers.write = async () => ({ ok: false, problem: "unknown" });
    await f.controller.submit();
    f.controller.setInspectId("known-version");
    await f.controller.inspectKnownVersion();
    expect(f.controller.getSnapshot().selected).toBe(f.first);
    expect(f.controller.getSnapshot().attempt.status).toBe("unresolved");
    await f.controller.submit();
    const reopened = new DocumentFilesController(f.port, "create_word");
    reopened.editWord({
      title: "Replacement",
      body: "Do not replay",
      format: "txt",
    });
    await reopened.submit();
    expect(f.calls.map((call) => call.operation)).toEqual([
      "create",
      "inspectVersion",
    ]);
    expect(reopened.getSnapshot().writeBlocked).toBe(true);
  });

  it("keeps a conservative local write fence for an unexpected rejected port promise", async () => {
    const f = fixture();
    f.edit();
    f.handlers.write = async () => {
      throw new Error("Lost acknowledgement");
    };
    await f.controller.submit();
    expect(f.controller.getSnapshot().problem).toBe("unknown");
    expect(f.controller.getSnapshot().writeBlocked).toBe(true);
    expect(f.controller.getSnapshot().word.body).toBe("text");
    await f.controller.submit();
    expect(f.calls).toHaveLength(1);
  });

  it("permits a deliberate corrected submission only after known not-dispatched", async () => {
    const f = fixture();
    f.edit();
    f.handlers.write = async () => ({ ok: false, problem: "not-dispatched" });
    await f.controller.submit();
    expect(f.calls).toHaveLength(1);
    expect(f.controller.getSnapshot().writeBlocked).toBe(false);
    f.handlers.write = async () => ({ ok: true, value: f.first });
    f.edit("Corrected");
    await f.controller.submit();
    expect(f.calls).toHaveLength(2);
  });

  it("disposal aborts observation and cannot publish a held write into a replacement", async () => {
    const f = fixture(),
      held = deferred<DocumentReply<DocumentVersionView>>();
    f.handlers.write = () => held.promise;
    f.edit();
    const pending = f.controller.submit();
    f.controller.dispose();
    expect(f.calls[0]?.signal.aborted).toBe(true);
    const replacement = new DocumentFilesController(f.port, "create_word");
    expect(replacement.getSnapshot().attempt.status).toBe("pending");
    held.resolve({ ok: true, value: f.first });
    await pending;
    expect(f.controller.getSnapshot().versions).toEqual([]);
    expect(replacement.getSnapshot().versions).toEqual([]);
  });

  it("uses a supplied ID only after explicit inspect, without discovery or write", async () => {
    const f = fixture();
    f.controller.setInspectId("  known-version  ");
    expect(f.calls).toEqual([]);
    await f.controller.inspectKnownVersion();
    expect(f.calls[0]).toMatchObject({
      operation: "inspectVersion",
      input: "known-version",
    });
    expect(f.controller.getSnapshot().selected).toBe(f.first);
  });
});

describe("verified document download presentation", () => {
  it("releases only the selected version and revokes before another selection", async () => {
    const f = fixture();
    f.edit();
    await f.controller.submit();
    await f.controller.download();
    expect(f.controller.getSnapshot().download).toEqual({
      url: "blob:verified-1",
      filename: "version-a.txt",
    });
    f.controller.select("version-a");
    expect(f.controller.getSnapshot().download).toBeNull();
    expect(f.revoked).toEqual(["blob:verified-1"]);
  });

  it("late download bytes after selection change never allocate a URL", async () => {
    const f = fixture();
    f.edit();
    await f.controller.submit();
    const second = version("version-b");
    f.handlers.read = async () => ({ ok: true, value: second });
    f.controller.setInspectId("version-b");
    await f.controller.inspectKnownVersion();
    const held = deferred<DocumentReply<DocumentDownloadView>>();
    f.handlers.download = () => held.promise;
    const pending = f.controller.download();
    f.controller.select("version-a");
    held.resolve({
      ok: true,
      value: { version: second, bytes: new TextEncoder().encode("late") },
    });
    await pending;
    expect(f.allocations()).toBe(0);
    expect(f.controller.getSnapshot().selected).toBe(f.first);
  });

  it("rejects a version substitution without a Blob URL", async () => {
    const f = fixture();
    f.edit();
    await f.controller.submit();
    f.handlers.download = async () => ({
      ok: true,
      value: {
        version: version("foreign"),
        bytes: new TextEncoder().encode("text"),
      },
    });
    await f.controller.download();
    expect(f.allocations()).toBe(0);
    expect(f.controller.getSnapshot().problem).toBe("invalid-response");
    expect(f.controller.getSnapshot().selected).toBeNull();
  });

  for (const problem of [
    "read-unavailable",
    "access-lost",
    "invalid-response",
  ] as const) {
    it(`removes prior download and selected actions on ${problem}`, async () => {
      const f = fixture();
      f.edit();
      await f.controller.submit();
      await f.controller.download();
      f.handlers.read = async () => ({ ok: false, problem });
      await f.controller.inspect();
      expect(f.controller.getSnapshot().selected).toBeNull();
      expect(f.controller.getSnapshot().versions).toEqual([]);
      expect(f.controller.getSnapshot().download).toBeNull();
      expect(f.revoked).toEqual(["blob:verified-1"]);
    });
  }

  it("disposal revokes the owned URL once and never disposes the borrowed port", async () => {
    const f = fixture();
    f.edit();
    await f.controller.submit();
    await f.controller.download();
    f.controller.dispose();
    f.controller.dispose();
    expect(f.revoked).toEqual(["blob:verified-1"]);
    expect(f.controller.getSnapshot().download).toBeNull();
  });
});

describe("server-configured Excel presentation lifetime", () => {
  it("submits Excel intent and revises the exact XLSX handle without exposing Word choice", async () => {
    const f = fixture();
    const workbook: DocumentVersionView = Object.freeze({
      handle: Object.freeze({ synthetic: "workbook" }),
      metadata: {
        ...f.first.metadata,
        versionId: "xlsx-a",
        filename: "book.xlsx",
        format: "xlsx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
      inspection: {
        sha256: "a".repeat(64),
        bytes: 4,
        format: "xlsx",
        nativeOpened: false,
        rendered: false,
        recalculated: false,
        members: [],
        details: {
          sheets: ["Facts"],
          formulas: 1,
          formulaCache: "unverified-zero-placeholder; recalculation required",
        },
      },
    });
    f.handlers.write = async () => ({ ok: true, value: workbook });
    const excel = new DocumentFilesController(f.port, "create_excel", f.urls);
    excel.editWorkbook({
      title: "Book",
      sheets:
        '[{"name":"Facts","rows":[[{"value":"=1+1"},{"formula":"=1+1"}]]}]',
    });
    // A local Word edit cannot change the trusted operation chosen by the host.
    excel.editWord({ title: "Ignored Word", format: "txt", body: "Ignored" });
    await excel.submit();
    expect(f.calls[0]?.input).toMatchObject({
      operation: "create_excel",
      format: "xlsx",
      title: "Book",
      content: {
        sheets: [
          { name: "Facts", rows: [[{ value: "=1+1" }, { formula: "=1+1" }]] },
        ],
      },
    });
    excel.beginRevision();
    excel.acknowledge(true);
    await excel.submit();
    expect(f.calls[1]?.operation).toBe("revise");
    expect(f.calls[1]?.handle).toBe(workbook.handle);
    expect(f.calls[1]?.input).toMatchObject({
      operation: "create_excel",
      format: "xlsx",
    });
  });
});
