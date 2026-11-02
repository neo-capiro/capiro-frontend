import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
      if (route === "publish")
        saved = {
          ...saved,
          draft: {
            ...saved.draft,
            state: "published",
            publishedVersionId: "published",
          },
        };
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
    discarded = vi.fn(),
    closed = vi.fn();
  const editor = new OfficeEditorController({
    selection,
    frame,
    onPublished: published,
    onDiscarded: discarded,
    onClosed: closed,
  });
  editor.bind(port);
  return {
    editor,
    frame,
    port,
    calls,
    published,
    discarded,
    closed,
    setSaved: (value: OfficeSnapshot) => {
      saved = value;
    },
  };
}

describe("attended Office state", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  it("Save waits for frame acknowledgement and a current Core read; closing publishes the saved draft once and Publish never repeats it", async () => {
    const f = fixture();
    await f.editor.open();
    f.editor.ready();
    const ack = deferred<void>();
    f.frame.save.mockImplementationOnce(() => ack.promise);
    const save = f.editor.save();
    await Promise.resolve();
    expect(f.calls.map((c) => c.route)).toEqual(["open", "launch", "read"]);
    await f.editor.publish();
    expect(f.published).not.toHaveBeenCalled();
    f.setSaved(snapshot(1, selection.editorId));
    ack.resolve();
    await save;
    expect(f.calls.map((c) => c.route)).toEqual([
      "open",
      "launch",
      "read",
      "read",
    ]);
    expect(f.editor.getSnapshot().snapshot?.draft.sequence).toBe(1);
    expect(JSON.stringify(f.editor.getSnapshot())).not.toContain(
      "synthetic-secret",
    );
    f.editor.modified(false);
    await f.editor.close();
    expect(f.calls.slice(-2).map((c) => c.route)).toEqual([
      "release",
      "publish",
    ]);
    // The close published the saved draft without telling the route to reopen; the person only closed.
    expect(f.published).not.toHaveBeenCalled();
    expect(f.closed).toHaveBeenCalledTimes(1);
    expect(f.calls.at(-1)).toEqual({
      route: "publish",
      input: {
        versionId: selection.versionId,
        draftId: selection.draftId,
        sequence: 1,
        sha256: "b".repeat(64),
      },
    });
    await f.editor.publish();
    expect(f.calls.filter((c) => c.route === "publish")).toHaveLength(1);
    expect(f.published).not.toHaveBeenCalled();
  });
  it("a successful frame response cannot invent a saved revision", async () => {
    const f = fixture();
    await f.editor.open();
    f.editor.ready();
    const saving = f.editor.save();
    await vi.advanceTimersByTimeAsync(5_000);
    await saving;
    expect(f.editor.getSnapshot()).toMatchObject({
      frame: false,
      uncertain: true,
    });
    await f.editor.publish();
    expect(f.calls.some((c) => c.route === "publish")).toBe(false);
  });
  it("a local CODE Save acknowledgement cannot confirm an older stored draft after editing", async () => {
    const f = fixture();
    f.setSaved(snapshot(1));
    await f.editor.open();
    f.editor.ready();
    f.editor.modified(true);
    f.frame.save.mockImplementationOnce(async () => f.editor.modified(false));
    const saving = f.editor.save();
    await vi.advanceTimersByTimeAsync(5_000);
    await saving;
    expect(f.editor.getSnapshot()).toMatchObject({
      frame: false,
      uncertain: true,
    });
    expect(f.editor.getSnapshot().notice).not.toContain("Save confirmed");
    await f.editor.publish();
    expect(f.published).not.toHaveBeenCalled();
  });
  it("late modified status during Save still requires a newer stored revision", async () => {
    const f = fixture();
    f.setSaved(snapshot(1));
    await f.editor.open();
    f.editor.ready();
    f.frame.save.mockImplementationOnce(async () => {
      f.editor.modified(true);
      f.editor.modified(false);
    });
    const saving = f.editor.save();
    await vi.advanceTimersByTimeAsync(5_000);
    await saving;
    expect(f.editor.getSnapshot().uncertain).toBe(true);
  });
  it("waits for a delayed Core commit after CODE acknowledgement without sending Save again", async () => {
    const f = fixture();
    await f.editor.open();
    f.editor.ready();
    f.editor.modified(true);
    const saving = f.editor.save();
    await vi.advanceTimersByTimeAsync(500);
    expect(f.editor.getSnapshot()).toMatchObject({
      frame: true,
      uncertain: false,
    });
    expect(f.editor.getSnapshot().snapshot?.draft.sequence).toBe(0);
    f.setSaved(snapshot(1, selection.editorId));
    await vi.advanceTimersByTimeAsync(250);
    await saving;
    expect(f.editor.getSnapshot().notice).toContain("Save confirmed");
    expect(f.editor.getSnapshot().snapshot?.draft.sequence).toBe(1);
    expect(f.frame.save).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("refuses an epoch replacement while waiting for the commit", async () => {
    const f = fixture();
    await f.editor.open();
    f.editor.ready();
    const saving = f.editor.save();
    await vi.advanceTimersByTimeAsync(250);
    const replacement = snapshot(1, selection.editorId);
    f.setSaved({ ...replacement, editor: { ...replacement.editor, epoch: 2 } });
    await vi.advanceTimersByTimeAsync(250);
    await saving;
    expect(f.editor.getSnapshot()).toMatchObject({
      frame: false,
      uncertain: true,
    });
    expect(vi.getTimerCount()).toBe(0);
  });
  it("does not retry a failed authoritative read while waiting for the commit", async () => {
    const f = fixture();
    await f.editor.open();
    f.editor.ready();
    const saving = f.editor.save();
    await vi.advanceTimersByTimeAsync(250);
    f.port.request = vi.fn(async () => {
      throw new Error("Current access unavailable");
    });
    await vi.advanceTimersByTimeAsync(250);
    await saving;
    await vi.advanceTimersByTimeAsync(5_000);
    expect(f.port.request).toHaveBeenCalledTimes(1);
    expect(f.editor.getSnapshot()).toMatchObject({
      frame: false,
      uncertain: true,
    });
    expect(vi.getTimerCount()).toBe(0);
  });
  it("access loss cancels the commit wait and prevents further reads", async () => {
    const f = fixture();
    await f.editor.open();
    f.editor.ready();
    const saving = f.editor.save();
    await vi.advanceTimersByTimeAsync(250);
    const count = f.calls.length;
    f.editor.accessLost();
    await saving;
    await vi.advanceTimersByTimeAsync(5_000);
    expect(f.calls).toHaveLength(count);
    expect(f.editor.getSnapshot()).toMatchObject({
      frame: false,
      snapshot: null,
    });
    expect(vi.getTimerCount()).toBe(0);
  });
  it("an editor replacement during Save cannot confirm another editor's revision", async () => {
    const f = fixture();
    await f.editor.open();
    f.editor.ready();
    f.frame.save.mockImplementationOnce(async () =>
      f.setSaved(snapshot(2, "another-editor")),
    );
    await f.editor.save();
    expect(f.editor.getSnapshot().uncertain).toBe(true);
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
    await f.editor.close();
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
  it("a refusal the service never received names its reason and asks for a retry, not a recovery", async () => {
    const f = fixture();
    const request = f.port.request;
    f.port.request = vi.fn(async () => ({
      status: 502,
      value: {
        schema: "meri.office-application/1",
        error: { code: "REFUSED", outcome: "NOT_DISPATCHED" },
      },
    })) as OfficeTransport["request"];
    await expect(f.editor.open()).resolves.toBe(false);
    expect(f.editor.getSnapshot()).toMatchObject({
      frame: false,
      uncertain: false,
      notice:
        "The request did not reach the document service. Nothing changed; try again.",
    });
    f.port.request = request;
    await expect(f.editor.open()).resolves.toBe(true);
    expect(f.frame.launch).toHaveBeenCalledTimes(1);
    // A refusal after dispatch may have taken effect: it names its reason and still needs recovery.
    const g = fixture();
    g.port.request = vi.fn(async () => ({
      status: 503,
      value: {
        schema: "meri.office-application/1",
        error: { code: "UNAVAILABLE", outcome: "UNKNOWN" },
      },
    })) as OfficeTransport["request"];
    await g.editor.open();
    expect(g.editor.getSnapshot()).toMatchObject({
      uncertain: true,
      notice:
        "Document editing is unavailable right now. Recover the saved draft before continuing.",
    });
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
  it("CODE's Save As publishes the next revision through the same confirmed Save, release and publish sequence", async () => {
    const f = fixture();
    await f.editor.open();
    f.editor.ready();
    f.editor.modified(true);
    f.frame.save.mockImplementationOnce(async () => {
      f.setSaved(snapshot(1, selection.editorId));
    });
    await f.editor.publishRevision();
    expect(f.calls.map((c) => c.route)).toEqual([
      "open",
      "launch",
      "read",
      "read",
      "release",
      "publish",
    ]);
    expect(f.frame.save).toHaveBeenCalledTimes(1);
    expect(f.published).toHaveBeenCalledTimes(1);
    expect(f.editor.getSnapshot()).toMatchObject({
      frame: false,
      notice: "Revision published.",
    });
    // Nothing more to publish from this draft: a repeated request neither saves nor publishes again.
    await f.editor.publishRevision();
    expect(f.published).toHaveBeenCalledTimes(1);
    expect(f.calls.filter((c) => c.route === "publish")).toHaveLength(1);
  });
  it("CODE's close saves pending changes, releases the editor and reports the close; an unmodified close only releases", async () => {
    const f = fixture();
    await f.editor.open();
    f.editor.ready();
    f.editor.modified(true);
    f.frame.save.mockImplementationOnce(async () => {
      f.setSaved(snapshot(1, selection.editorId));
    });
    await f.editor.close();
    expect(f.calls.map((c) => c.route)).toEqual([
      "open",
      "launch",
      "read",
      "read",
      "release",
      "publish",
    ]);
    expect(f.closed).toHaveBeenCalledTimes(1);
    expect(f.frame.dispose).toHaveBeenCalled();
    expect(f.editor.getSnapshot()).toMatchObject({
      frame: false,
      modified: false,
    });
    expect(f.published).not.toHaveBeenCalled();
    await f.editor.open();
    f.editor.ready();
    await f.editor.close();
    // A released lease is gone: reopening acquires a new launch; a published, unmodified draft only releases.
    expect(f.calls.slice(6).map((c) => c.route)).toEqual([
      "open",
      "launch",
      "release",
    ]);
    expect(f.closed).toHaveBeenCalledTimes(2);
  });
  it("the leave guard's close keeps the host's navigation out and reports whether it was confirmed; edits count as unsaved while a Save is in flight", async () => {
    const f = fixture();
    await f.editor.open();
    f.editor.ready();
    f.editor.modified(true);
    const ack = deferred<void>();
    f.frame.save.mockImplementationOnce(() => ack.promise);
    const closing = f.editor.close(false);
    await vi.waitFor(() => expect(f.frame.save).toHaveBeenCalledTimes(1));
    expect(f.editor.getSnapshot().saving).toBe(true);
    f.setSaved(snapshot(1, selection.editorId));
    ack.resolve();
    await expect(closing).resolves.toBe(true);
    expect(f.editor.getSnapshot().saving).toBe(false);
    expect(f.closed).not.toHaveBeenCalled();
    expect(f.calls.map((c) => c.route)).toEqual([
      "open",
      "launch",
      "read",
      "read",
      "release",
      "publish",
    ]);
    // A close the service did not confirm resolves false, closes the frame and leaves the recovery notice.
    const g = fixture();
    await g.editor.open();
    g.editor.ready();
    g.editor.modified(true);
    const failing = g.editor.close(false);
    await vi.advanceTimersByTimeAsync(5_000);
    await expect(failing).resolves.toBe(false);
    expect(g.closed).not.toHaveBeenCalled();
    expect(g.editor.getSnapshot()).toMatchObject({
      frame: false,
      uncertain: true,
      saving: false,
    });
    expect(g.calls.filter((c) => c.route === "release")).toHaveLength(0);
    // A leave while a Save is in flight is refused with the busy notice, never silently.
    const i = fixture();
    await i.editor.open();
    i.editor.ready();
    i.editor.modified(true);
    const held = deferred<void>();
    i.frame.save.mockImplementationOnce(() => held.promise);
    const inFlight = i.editor.save();
    await vi.waitFor(() => expect(i.frame.save).toHaveBeenCalledTimes(1));
    await expect(i.editor.close(false)).resolves.toBe(false);
    expect(i.editor.getSnapshot().notice).toBe(
      "Saving… Wait for it to finish before leaving.",
    );
    expect(i.closed).not.toHaveBeenCalled();
    i.setSaved(snapshot(1, selection.editorId));
    held.resolve();
    await inFlight;
    // A Save without modified edits never counts as unsaved work.
    const h = fixture();
    await h.editor.open();
    h.editor.ready();
    const ready = deferred<void>();
    h.frame.save.mockImplementationOnce(() => ready.promise);
    const saving = h.editor.save();
    await vi.waitFor(() => expect(h.frame.save).toHaveBeenCalledTimes(1));
    expect(h.editor.getSnapshot().saving).toBe(false);
    h.setSaved(snapshot(1, selection.editorId));
    ready.resolve();
    await saving;
  });
  it("an earlier revision opens read-only: a view launch, and Save, Save As and Publish do nothing", async () => {
    const f = fixture();
    await f.editor.open(false, "view");
    expect(f.calls.at(-1)).toMatchObject({
      route: "launch",
      input: { mode: "view", operation: "acquire" },
    });
    f.editor.ready();
    expect(f.editor.getSnapshot().mode).toBe("view");
    await f.editor.save();
    await f.editor.publishRevision();
    expect(f.frame.save).not.toHaveBeenCalled();
    expect(f.calls.filter((c) => c.route === "publish")).toHaveLength(0);
    await f.editor.close();
    expect(f.calls.map((c) => c.route)).toEqual(["open", "launch", "release"]);
    expect(f.closed).toHaveBeenCalledTimes(1);
  });
});
