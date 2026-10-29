import { describe, expect, it, vi } from "vitest";
import { OfficeEditorController } from "../src/shared/meri-office/editor-controller";
import type {
  OfficeSnapshot,
  OfficeResponseMap,
  OfficeRoute,
  OfficeLaunch,
} from "@capiro/meri-contracts/office-application";
import type {
  OfficeInput,
  OfficeTransport,
} from "../src/shared/meri-office/transport";

const selection = {
  versionId: "00000000-0000-4000-8000-000000000001",
  draftId: "00000000-0000-4000-8000-000000000002",
  editorId: "00000000-0000-4000-8000-000000000003",
};
const launch: OfficeLaunch = {
  edition: "collabora-code",
  editorOrigin: "https://office.example.test",
  actionUrl: "https://office.example.test/browser/hash/cool.html",
  method: "POST",
  fields: {
    access_token: "synthetic-secret",
    access_token_ttl: "1800000060000",
  },
  expiresAtMs: 1800000060000,
};
function snapshot(
  sequence = 0,
  editorId: string | null = null,
): OfficeSnapshot {
  return {
    schema: "meri.office-application/1",
    draft: {
      ...selection,
      conversationId: "chat",
      artifactId: "artifact",
      baseVersionId: selection.versionId,
      baseSha256: "a".repeat(64),
      format: "docx",
      filename: "test.docx",
      sequence,
      sha256: sequence ? "b".repeat(64) : null,
      byteLength: sequence ? 20 : 0,
      state: "draft",
      publishIntent: null,
      publishedVersionId: null,
      savedAt: "2026-10-29T00:00:00Z",
      expiresAt: "2026-11-05T00:00:00Z",
    },
    editor: {
      editorId,
      epoch: editorId ? 1 : 0,
      expiresAt: editorId ? "2026-10-29T00:10:00Z" : null,
    },
    launch: null,
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function fixture() {
  const frame = {
    launch: vi.fn(),
    renew: vi.fn(),
    save: vi.fn(async (signal: AbortSignal): Promise<void> => {
      signal.throwIfAborted();
    }),
    dispose: vi.fn(),
  };
  let saved = snapshot();
  const calls: { route: OfficeRoute; input: unknown }[] = [];
  const port: OfficeTransport = {
    pending: () => false,
    dispose: vi.fn(),
    async request<R extends OfficeRoute>(route: R, input: OfficeInput<R>) {
      calls.push({ route, input });
      if (route === "launch" || route === "renew")
        saved = { ...saved, editor: snapshot(0, selection.editorId).editor };
      if (route === "release")
        saved = {
          ...saved,
          editor: {
            editorId: null,
            epoch: saved.editor.epoch,
            expiresAt: null,
          },
        };
      const value =
        route === "publish"
          ? {
              schema: saved.schema,
              draft: {
                ...saved.draft,
                state: "published",
                publishedVersionId: "published",
              },
              publication: {
                version: { versionId: "published" },
                inspection: { format: "docx" },
              },
            }
          : route === "discard"
            ? { schema: saved.schema, discarded: true }
            : {
                ...saved,
                launch: route === "launch" || route === "renew" ? launch : null,
              };
      return { status: 200, value: value as OfficeResponseMap[R] };
    },
  };
  const published = vi.fn(),
    discarded = vi.fn();
  const editor = new OfficeEditorController({
    selection,
    frame,
    onPublished: published,
    onDiscarded: discarded,
  });
  editor.bind(port);
  return {
    editor,
    frame,
    port,
    calls,
    published,
    discarded,
    setSaved: (value: OfficeSnapshot) => {
      saved = value;
    },
  };
}

describe("attended Office state", () => {
  it("Save waits for frame acknowledgement and a current Core read; Publish needs a separate released-editor action", async () => {
    const f = fixture();
    await f.editor.open();
    f.editor.ready();
    const ack = deferred<void>();
    f.frame.save.mockImplementationOnce(() => ack.promise);
    const save = f.editor.save();
    await Promise.resolve();
    expect(f.calls.map((c) => c.route)).toEqual(["open", "launch"]);
    await f.editor.publish();
    expect(f.published).not.toHaveBeenCalled();
    f.setSaved(snapshot(1, selection.editorId));
    ack.resolve();
    await save;
    expect(f.calls.map((c) => c.route)).toEqual(["open", "launch", "read"]);
    expect(f.editor.getSnapshot().snapshot?.draft.sequence).toBe(1);
    expect(JSON.stringify(f.editor.getSnapshot())).not.toContain(
      "synthetic-secret",
    );
    f.editor.modified(true);
    await f.editor.finish();
    expect(f.calls.at(-1)?.route).toBe("read");
    f.editor.modified(false);
    await f.editor.finish();
    expect(f.calls.at(-1)?.route).toBe("release");
    expect(f.published).not.toHaveBeenCalled();
    await f.editor.publish();
    expect(f.calls.at(-1)).toEqual({
      route: "publish",
      input: {
        versionId: selection.versionId,
        draftId: selection.draftId,
        sequence: 1,
        sha256: "b".repeat(64),
      },
    });
    expect(f.published).toHaveBeenCalledTimes(1);
    await f.editor.publish();
    expect(f.published).toHaveBeenCalledTimes(1);
  });
  it("a successful frame response cannot invent a saved revision", async () => {
    const f = fixture();
    await f.editor.open();
    f.editor.ready();
    await f.editor.save();
    expect(f.editor.getSnapshot()).toMatchObject({
      frame: false,
      uncertain: true,
    });
    await f.editor.publish();
    expect(f.calls.some((c) => c.route === "publish")).toBe(false);
  });
  it("access loss aborts pending work, clears metadata, and refuses a late result", async () => {
    const f = fixture(),
      delayed = deferred<Awaited<ReturnType<OfficeTransport["request"]>>>();
    f.port.request = vi.fn(() => delayed.promise) as OfficeTransport["request"];
    const opening = f.editor.open();
    f.editor.accessLost();
    delayed.resolve({ status: 200, value: snapshot(1) });
    await opening;
    f.editor.ready();
    expect(f.editor.getSnapshot()).toMatchObject({
      connected: false,
      frame: false,
      snapshot: null,
      publication: null,
      ready: false,
    });
    expect(f.frame.launch).not.toHaveBeenCalled();
  });
  it("a routine connection renewal keeps the frame and sends a freshly received launch only after readiness", async () => {
    const f = fixture();
    await f.editor.open();
    f.editor.suspend();
    const renewed = { ...f.port };
    f.editor.bind(renewed);
    expect(f.frame.renew).not.toHaveBeenCalled();
    expect(f.editor.getSnapshot().frame).toBe(true);
    f.editor.ready();
    await vi.waitFor(() => expect(f.frame.renew).toHaveBeenCalledWith(launch));
    expect(f.frame.launch).toHaveBeenCalledTimes(1);
    expect(f.calls.at(-1)?.route).toBe("renew");
    expect(f.editor.getSnapshot().snapshot?.launch).toBeNull();
  });
  it("another active editor requires explicit takeover and never releases it accidentally", async () => {
    const f = fixture();
    f.setSaved(snapshot(1, "another-editor"));
    await f.editor.open();
    await f.editor.finish();
    expect(f.calls.map((c) => c.route)).toEqual(["open"]);
    expect(f.editor.ownsEditor()).toBe(false);
    await f.editor.open(true);
    expect(f.calls.at(-1)).toMatchObject({
      route: "launch",
      input: { operation: "takeover", expectedEpoch: 1 },
    });
  });
  it("unknown writes are not retried and need current recovery before another explicit action", async () => {
    const f = fixture();
    f.setSaved(snapshot(1));
    await f.editor.recover();
    const request = f.port.request;
    f.port.request = vi.fn(async () => {
      throw new Error("response lost");
    });
    await f.editor.publish();
    expect(f.port.request).toHaveBeenCalledTimes(1);
    expect(f.editor.getSnapshot().uncertain).toBe(true);
    await f.editor.publish();
    expect(f.port.request).toHaveBeenCalledTimes(1);
    f.port.request = request;
    await f.editor.recover();
    expect(f.editor.getSnapshot().uncertain).toBe(false);
  });
  it("frame expiry retires a pending operation before its fresh metadata can return", async () => {
    const f = fixture();
    await f.editor.open();
    f.editor.ready();
    const read = deferred<Awaited<ReturnType<OfficeTransport["request"]>>>();
    f.port.request = vi.fn(() => read.promise) as OfficeTransport["request"];
    const saving = f.editor.save();
    await Promise.resolve();
    f.editor.frameUnavailable("expired");
    read.resolve({ status: 200, value: snapshot(3, selection.editorId) });
    await saving;
    expect(f.editor.getSnapshot()).toMatchObject({
      frame: false,
      busy: null,
      uncertain: true,
    });
    expect(f.editor.getSnapshot().snapshot?.draft.sequence).toBe(0);
  });
  it("recover and discard remain explicit and do not open or publish an editor", async () => {
    const f = fixture();
    f.setSaved(snapshot(2));
    await f.editor.recover();
    await f.editor.discard();
    expect(f.calls.map((c) => c.route)).toEqual(["read", "discard"]);
    expect(f.frame.launch).not.toHaveBeenCalled();
    expect(f.discarded).toHaveBeenCalledTimes(1);
    expect(f.editor.getSnapshot().snapshot).toBeNull();
  });
});
