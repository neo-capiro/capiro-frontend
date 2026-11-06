import { createHash } from "node:crypto";
import { expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { CanvasController } from "../src/features/meri/canvas/canvas-state";
import { createCanvasAccess } from "../src/shared/meri-documents/canvas-access";
import { canvasQueryJournal } from "../src/shared/meri-documents/query-journal";
import { conversationFiles } from "../src/features/meri/conversation/intents/prepared-files";
import {
  created,
  inspected,
  ids,
  textContent,
  session,
  jsonResponse,
} from "./meri-document-public-fixtures";

if (textContent.format !== "txt") throw Error("Expected text fixture");
const originalContent = textContent;
const selection = ({ version }: ReturnType<typeof created>) => ({
  artifactId: version.artifactId,
  versionId: version.versionId,
  objectSha256: version.object.sha256,
});

/** Synthetic HTTP only. Real Canvas access, transport and public receivers own admission. */
function fixture() {
  const original = created();
  let saved: ReturnType<typeof created> | null = null;
  const edited = {
    ...originalContent,
    content: { text: "Synthetic saved revision marker" },
  };
  const calls: { route: string; versionId?: string }[] = [];
  let fault:
    | "forbidden"
    | "foreign-artifact"
    | "foreign-conversation"
    | "head-moved"
    | null = null;
  const lost = vi.fn();
  const life = new AbortController();
  const fetcher = vi.fn<typeof fetch>(async (url, init) => {
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("x-meri-action-session")).toBe(
      session.credential,
    );
    const body = JSON.parse(String(init?.body));
    const route = String(url).split("/").at(-1)!;
    calls.push({
      route,
      versionId: body.selection?.versionId ?? body.versionId,
    });
    if (route === "canvas-save") {
      expect(body.selection).toEqual(selection(original));
      expect(body.request).toEqual(edited);
      expect(saved).toBeNull();
      const bytes = Buffer.from(edited.content.text);
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      saved = structuredClone(original);
      saved.version.versionId = ids.revision;
      saved.version.parentVersionId = ids.version;
      saved.version.object = {
        ...saved.version.object,
        versionId: "synthetic-saved-object",
        bytes: bytes.length,
        sha256,
      };
      saved.inspection = { ...saved.inspection, bytes: bytes.length, sha256 };
      return jsonResponse(saved);
    }
    const versionId = body.selection?.versionId ?? body.versionId;
    const selected =
      versionId === ids.version
        ? original
        : versionId === ids.revision
          ? saved
          : null;
    if (!selected) throw Error("Unexpected synthetic version selection");
    if (route === "inspect") {
      if (fault === "forbidden")
        return new Response("Forbidden", { status: 403 });
      const receipt = structuredClone(inspected(selected));
      if ("kind" in receipt) throw Error("Unexpected native fixture");
      if (fault === "foreign-artifact") receipt.version.artifactId = ids.other;
      return jsonResponse(receipt);
    }
    if (route !== "canvas-read") throw Error("Unexpected synthetic route");
    expect(body.selection).toEqual(selection(selected));
    const receipt = structuredClone(inspected(selected));
    if (selected === saved && fault === "foreign-conversation")
      receipt.version.binding.conversationId = ids.other;
    return jsonResponse({
      ...receipt,
      request: selected === original ? textContent : edited,
      headVersionId:
        selected === saved && fault === "head-moved"
          ? ids.other
          : (saved?.version.versionId ?? ids.version),
    });
  });
  const access = () =>
    createCanvasAccess({
      session,
      lifetime: life.signal,
      isCurrent: () => !life.signal.aborted,
      onAccessLost: lost,
      now: () => 1_000,
      fetcher,
    });
  return {
    original,
    edited,
    calls,
    access,
    life,
    lost,
    setFault(value: typeof fault) {
      fault = value;
    },
    get saved() {
      return saved!;
    },
  };
}

async function savedThenReopened() {
  const f = fixture();
  const cache = new QueryClient();
  const first = new CanvasController();
  first.setAccess(f.access());
  const originalSelection = selection(f.original);
  const originalCard = conversationFiles([{ versionId: ids.version }], []);
  await first.open(originalSelection);
  expect(first.getSnapshot().draft).toEqual(textContent);
  first.edit(f.edited);
  const saved = await first.save(canvasQueryJournal(cache, session.context));
  expect(saved?.version.versionId).toBe(ids.revision);
  expect(first.getSnapshot().draft).toEqual(f.edited);
  expect(first.getSnapshot().dirty).toBe(false);
  expect(originalCard).toEqual([{ versionId: ids.version }]);
  first.dispose();
  cache.clear();
  const freshCache = new QueryClient();
  expect(canvasQueryJournal(freshCache, session.context).read().status).toBe(
    "idle",
  );
  const reopened = new CanvasController();
  reopened.setAccess(f.access());
  await reopened.open(originalSelection);
  expect(reopened.getSnapshot().source?.version.versionId).toBe(ids.version);
  expect(reopened.getSnapshot().source?.headVersionId).toBe(ids.revision);
  expect(reopened.getSnapshot().draft).toEqual(textContent);
  expect(f.calls.filter((call) => call.route === "canvas-save")).toHaveLength(
    1,
  );
  return {
    f,
    reopened,
    originalCard,
    cleanup: () => {
      reopened.dispose();
      freshCache.clear();
      f.life.abort();
    },
  };
}

it("proves canonical saved bytes remain readable while the original card and version remain immutable", async () => {
  const { f, reopened, originalCard, cleanup } = await savedThenReopened();
  try {
    // Control: the same admitted access can read v2 by its canonical selection.
    const read = await f
      .access()
      .read(selection(f.saved), new AbortController().signal);
    expect(read).toMatchObject({
      ok: true,
      value: { request: f.edited, headVersionId: ids.revision },
    });
    expect(reopened.getSnapshot().draft).toEqual(textContent);
    expect(originalCard).toEqual([{ versionId: ids.version }]);
    expect(f.lost).not.toHaveBeenCalled();
  } finally {
    cleanup();
  }
});

it("makes the newer saved version explicitly reachable after controller and cache are discarded, without changing the original card", async () => {
  const { f, reopened, originalCard, cleanup } = await savedThenReopened();
  try {
    // The user has explicitly asked to open the newer saved version indicated by the admitted source.
    // Initial Open above must still show v1 until this deliberate choice.
    await reopened.openLatest();
    expect(reopened.getSnapshot().source?.version.versionId).toBe(ids.revision);
    expect(reopened.getSnapshot().draft).toEqual(f.edited);
    expect(reopened.getSnapshot().dirty).toBe(false);
    expect(reopened.getSnapshot().message).toBeNull();
    expect(originalCard).toEqual([{ versionId: ids.version }]);
    expect(f.calls).toContainEqual({
      route: "inspect",
      versionId: ids.revision,
    });
    expect(f.calls.filter((call) => call.route === "canvas-save")).toHaveLength(
      1,
    );
    expect(f.lost).not.toHaveBeenCalled();
  } finally {
    cleanup();
  }
});

for (const fault of [
  "forbidden",
  "foreign-artifact",
  "foreign-conversation",
  "head-moved",
] as const) {
  it(`preserves the original document when latest-version admission encounters ${fault}`, async () => {
    const { f, reopened, cleanup } = await savedThenReopened();
    try {
      const before = reopened.getSnapshot();
      f.setFault(fault);
      await reopened.openLatest();
      expect(reopened.getSnapshot()).toMatchObject({
        source: before.source,
        draft: before.draft,
        dirty: false,
        busy: null,
      });
      expect(reopened.getSnapshot().message).toBeTruthy();
      expect(
        f.calls.filter((call) => call.route === "canvas-save"),
      ).toHaveLength(1);
      expect(f.lost).toHaveBeenCalledTimes(fault === "forbidden" ? 1 : 0);
      if (fault === "forbidden" || fault === "foreign-artifact")
        expect(
          f.calls.filter(
            (call) =>
              call.route === "canvas-read" && call.versionId === ids.revision,
          ),
        ).toHaveLength(0);
    } finally {
      cleanup();
    }
  });
}

it("does not read or overwrite a dirty draft, but permits an explicit latest read after discard", async () => {
  const { f, reopened, cleanup } = await savedThenReopened();
  try {
    reopened.edit({ ...originalContent, title: "Keep this local draft" });
    const count = f.calls.length;
    await reopened.openLatest();
    expect(f.calls).toHaveLength(count);
    expect(reopened.getSnapshot().draft?.title).toBe("Keep this local draft");
    reopened.discard();
    await reopened.openLatest();
    expect(reopened.getSnapshot().draft).toEqual(f.edited);
    expect(f.calls.filter((call) => call.route === "canvas-save")).toHaveLength(
      1,
    );
  } finally {
    cleanup();
  }
});

it("refuses a latest read after session lifetime ends without another request", async () => {
  const { f, reopened, cleanup } = await savedThenReopened();
  try {
    const before = reopened.getSnapshot();
    const count = f.calls.length;
    f.life.abort();
    await reopened.openLatest();
    expect(f.calls).toHaveLength(count);
    expect(reopened.getSnapshot()).toMatchObject({
      source: before.source,
      draft: before.draft,
      busy: null,
    });
  } finally {
    cleanup();
  }
});
