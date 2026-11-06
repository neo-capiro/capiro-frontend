import { expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import type { DocumentCanvasSource } from "@capiro/meri-contracts/document-canvas";
import { CanvasController } from "../src/features/meri/canvas/canvas-state";
import {
  canvasSelection,
  createCanvasAccess,
} from "../src/shared/meri-documents/canvas-access";
import { canvasQueryJournal } from "../src/shared/meri-documents/query-journal";
import {
  created,
  inspected,
  ids,
  session,
  jsonResponse,
} from "./meri-document-public-fixtures";

function source(versionId = ids.version): DocumentCanvasSource {
  const result = inspected();
  if ("kind" in result) throw Error("Unexpected fixture");
  return {
    ...result,
    version: { ...result.version, versionId },
    request: {
      operation: "create_word",
      title: "Synthetic",
      format: "txt",
      content: { text: "Synthetic document" },
    },
    headVersionId: versionId,
  };
}
const journal = () => canvasQueryJournal(new QueryClient(), session.context);

it("keeps a dirty draft when Meri publishes or another card opens, and only adopts after discard", async () => {
  const controller = new CanvasController(),
    original = source(),
    newer = source(ids.revision);
  controller.setAccess({
    read: vi.fn(async (selection) => ({
      ok: true as const,
      value: selection.versionId === ids.version ? original : newer,
    })),
    save: vi.fn(),
    checkSave: vi.fn(),
    readLatest: vi.fn(),
  });
  await controller.open(canvasSelection(original));
  controller.edit({ ...original.request, title: "My local edit" });
  controller.offer(canvasSelection(newer));
  await controller.open(canvasSelection(newer));
  expect(controller.getSnapshot().draft?.title).toBe("My local edit");
  expect(controller.getSnapshot().offered?.versionId).toBe(ids.revision);
  controller.discard();
  await controller.open(canvasSelection(newer));
  expect(controller.getSnapshot().source?.version.versionId).toBe(ids.revision);
});

it("adopts the canonical saved version before Ask Meri and preserves edits on an uncertain save", async () => {
  const controller = new CanvasController(),
    original = source(),
    saved = source(ids.revision);
  const save = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, value: saved })
    .mockResolvedValueOnce({
      ok: false,
      uncertain: true,
      message: "Unconfirmed",
    });
  controller.setAccess({
    read: async () => ({ ok: true, value: original }),
    save,
    checkSave: vi.fn(),
    readLatest: vi.fn(),
  });
  await controller.open(canvasSelection(original));
  controller.edit({ ...original.request, title: "Changed" });
  expect((await controller.save(journal()))?.version.versionId).toBe(
    ids.revision,
  );
  expect(controller.getSnapshot().dirty).toBe(false);
  controller.edit({ ...saved.request, title: "Keep this draft" });
  expect(await controller.save(journal())).toBeNull();
  expect(controller.getSnapshot()).toMatchObject({
    dirty: true,
    blocked: true,
    draft: { title: "Keep this draft" },
  });
});

it("ignores a source read completed after conversation access changes", async () => {
  let finish!: (value: { ok: true; value: DocumentCanvasSource }) => void;
  const controller = new CanvasController(),
    original = source();
  controller.setAccess({
    read: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
    save: vi.fn(),
    checkSave: vi.fn(),
    readLatest: vi.fn(),
  });
  const opening = controller.open(canvasSelection(original));
  controller.setAccess(null);
  finish({ ok: true, value: original });
  await opening;
  expect(controller.getSnapshot().source).toBeNull();
});

it("retains uncertain-save fencing across credential/run replacement and never dispatches again", async () => {
  const cache = new QueryClient(),
    original = source(),
    fetcher = vi.fn<typeof fetch>().mockRejectedValue(Error("lost response"));
  const make = () =>
    createCanvasAccess({
      session,
      lifetime: new AbortController().signal,
      isCurrent: () => true,
      onAccessLost: vi.fn(),
      now: () => 1_000,
      fetcher,
    });
  const first = canvasQueryJournal(cache, session.context);
  const failed = await make().save(
    original,
    original.request,
    first,
    new AbortController().signal,
  );
  expect(failed).toMatchObject({ ok: false, uncertain: true });
  const renewed = canvasQueryJournal(cache, { ...session.context });
  expect(renewed.read().status).toBe("unresolved");
  expect(
    await make().save(
      original,
      original.request,
      renewed,
      new AbortController().signal,
    ),
  ).toMatchObject({ ok: false, uncertain: true });
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it("rejects a source from another conversation and a definite save refusal leaves retries possible", async () => {
  const original = source(),
    foreign = source();
  foreign.version.binding.conversationId = ids.other;
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(jsonResponse(foreign))
    .mockResolvedValueOnce(
      jsonResponse(
        { error: { code: "ARTIFACT_STALE_PARENT", outcome: "NOT_DISPATCHED" } },
        409,
      ),
    );
  const access = createCanvasAccess({
    session,
    lifetime: new AbortController().signal,
    isCurrent: () => true,
    onAccessLost: vi.fn(),
    now: () => 1_000,
    fetcher,
  });
  expect(
    (await access.read(canvasSelection(foreign), new AbortController().signal))
      .ok,
  ).toBe(false);
  const attempt = journal();
  expect(
    await access.save(
      original,
      original.request,
      attempt,
      new AbortController().signal,
    ),
  ).toMatchObject({ ok: false, uncertain: false });
  expect(attempt.read().status).toBe("idle");
});

it("accepts a saved receipt only with the expected immutable parent and adopts its new id", async () => {
  const original = source(),
    result = created();
  result.version.versionId = ids.revision;
  result.version.parentVersionId = ids.version;
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(result));
  const access = createCanvasAccess({
    session,
    lifetime: new AbortController().signal,
    isCurrent: () => true,
    onAccessLost: vi.fn(),
    now: () => 1_000,
    fetcher,
  });
  const reply = await access.save(
    original,
    original.request,
    journal(),
    new AbortController().signal,
  );
  expect(reply).toMatchObject({
    ok: true,
    value: {
      version: { versionId: ids.revision },
      headVersionId: ids.revision,
    },
  });
});

it("clears private content through access-loss handling even when a 403 body is not JSON", async () => {
  const lost = vi.fn(),
    original = source();
  const access = createCanvasAccess({
    session,
    lifetime: new AbortController().signal,
    isCurrent: () => true,
    onAccessLost: lost,
    now: () => 1_000,
    fetcher: vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("Forbidden", { status: 403 })),
  });
  expect(
    (await access.read(canvasSelection(original), new AbortController().signal))
      .ok,
  ).toBe(false);
  expect(lost).toHaveBeenCalledOnce();
});

it("checks a lost save read-only against its captured fingerprint even after local discard", async () => {
  const original = source(),
    latest = source(ids.revision),
    attempt = journal();
  latest.version.parentVersionId = ids.version;
  latest.request = {
    operation: "create_word",
    format: "txt",
    title: "Synthetic",
    content: { text: "Edited text" },
  };
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(jsonResponse(original))
    .mockRejectedValueOnce(Error("lost acknowledgement"))
    .mockResolvedValueOnce(
      jsonResponse({ ...original, headVersionId: ids.revision }),
    )
    .mockResolvedValueOnce(
      jsonResponse({ version: latest.version, inspection: latest.inspection }),
    )
    .mockResolvedValueOnce(jsonResponse(latest));
  const access = createCanvasAccess({
    session,
    lifetime: new AbortController().signal,
    isCurrent: () => true,
    onAccessLost: vi.fn(),
    now: () => 1_000,
    fetcher,
  });
  const controller = new CanvasController();
  controller.setAccess(access);
  await controller.open(canvasSelection(original));
  controller.edit(latest.request);
  await controller.save(attempt);
  expect(controller.getSnapshot().blocked).toBe(true);
  controller.discard();
  await controller.checkSave(attempt);
  expect(controller.getSnapshot()).toMatchObject({
    blocked: false,
    dirty: false,
    source: { version: { versionId: ids.revision } },
  });
  expect(attempt.read().status).toBe("idle");
  expect(
    fetcher.mock.calls.filter(
      ([path]) => path === "/api/documents/canvas-save",
    ),
  ).toHaveLength(1);
});

it("an unchanged head cannot clear an uncertain save", async () => {
  const original = source(),
    attempt = journal();
  const fetcher = vi
    .fn<typeof fetch>()
    .mockRejectedValueOnce(Error("lost acknowledgement"))
    .mockResolvedValueOnce(jsonResponse(original));
  const access = createCanvasAccess({
    session,
    lifetime: new AbortController().signal,
    isCurrent: () => true,
    onAccessLost: vi.fn(),
    now: () => 1_000,
    fetcher,
  });
  await access.save(
    original,
    original.request,
    attempt,
    new AbortController().signal,
  );
  expect(
    await access.checkSave(original, attempt, new AbortController().signal),
  ).toMatchObject({ ok: false, uncertain: true });
  expect(attempt.read().status).toBe("unresolved");
});

it("keeps uncertain-save fencing after discard and never dispatches latest-version discovery", async () => {
  const controller = new CanvasController(),
    original = source();
  const readLatest = vi.fn();
  controller.setAccess({
    read: async () => ({ ok: true, value: original }),
    readLatest,
    save: async () => ({ ok: false, uncertain: true, message: "Unconfirmed" }),
    checkSave: vi.fn(),
  });
  await controller.open(canvasSelection(original));
  controller.edit({ ...original.request, title: "Unconfirmed change" });
  await controller.save(journal());
  controller.discard();
  await controller.openLatest();
  expect(readLatest).not.toHaveBeenCalled();
  expect(controller.getSnapshot()).toMatchObject({
    blocked: true,
    dirty: false,
    source: original,
  });
});

it("ignores a late latest-version response after access replacement or disposal", async () => {
  for (const dispose of [false, true]) {
    const controller = new CanvasController(),
      original = source(),
      latest = source(ids.revision);
    let finish!: (value: { ok: true; value: DocumentCanvasSource }) => void;
    const readLatest = vi.fn(
      () =>
        new Promise<{ ok: true; value: DocumentCanvasSource }>((resolve) => {
          finish = resolve;
        }),
    );
    const access = {
      read: async () => ({ ok: true as const, value: original }),
      readLatest,
      save: vi.fn(),
      checkSave: vi.fn(),
    };
    controller.setAccess(access);
    await controller.open(canvasSelection(original));
    const pending = controller.openLatest();
    await controller.openLatest();
    expect(readLatest).toHaveBeenCalledOnce();
    if (dispose) controller.dispose();
    else controller.setAccess({ ...access });
    finish({ ok: true, value: latest });
    await pending;
    expect(controller.getSnapshot()).toMatchObject({
      source: original,
      draft: original.request,
    });
  }
});
