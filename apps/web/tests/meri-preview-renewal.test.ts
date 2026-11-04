import { expect, it, vi } from "vitest";
import { DocumentPreviewController } from "../src/features/meri/files/preview-state";
import { createPreviewAccess } from "../src/shared/meri-documents/preview-access";
import {
  memoryStorage,
  previewResponse,
  previewSource,
} from "./meri-preview-revision-fixtures";
import { ids, session } from "./meri-document-public-fixtures";

function connection() {
  const lifetime = new AbortController();
  const fetcher = vi.fn<typeof fetch>(async (url) =>
    String(url).endsWith("/inspect")
      ? Response.json(previewSource())
      : previewResponse(),
  );
  return {
    lifetime,
    fetcher,
    port: createPreviewAccess(session.credential, lifetime.signal, fetcher),
  };
}
const urls = () => ({
  create: vi.fn(() => "blob:synthetic-preview"),
  revoke: vi.fn(),
});

it("reads through the renewed library connection without remounting or publishing", async () => {
  const original = connection(),
    renewed = connection(),
    links = urls();
  const controller = new DocumentPreviewController(
    original.port,
    session.context,
    ids.version,
    memoryStorage(),
    links,
  );
  const detach = controller.attach();
  try {
    original.lifetime.abort();
    controller.bind(renewed.port, session.context);
    expect(renewed.fetcher).not.toHaveBeenCalled();
    await controller.read();
    expect(controller.getSnapshot().url).toBe("blob:synthetic-preview");
    expect(controller.getSnapshot().message).toBe(
      "PDF bytes verified for this saved version.",
    );
    expect(original.fetcher).not.toHaveBeenCalled();
    expect(renewed.fetcher.mock.calls.map(([url]) => url)).toEqual([
      "/api/documents/inspect",
      "/api/documents/preview",
    ]);
  } finally {
    detach();
  }
});

it("discards a late read from the replaced connection and accepts the fresh one", async () => {
  const renewed = connection(),
    links = urls();
  let finish!: (
    reply: Awaited<ReturnType<typeof renewed.port.readPreview>>,
  ) => void;
  const read = vi.fn(
    () =>
      new Promise<Awaited<ReturnType<typeof renewed.port.readPreview>>>(
        (resolve) => {
          finish = resolve;
        },
      ),
  );
  const controller = new DocumentPreviewController(
    { ...renewed.port, readPreview: read },
    session.context,
    ids.version,
    memoryStorage(),
    links,
  );
  const detach = controller.attach();
  try {
    const previousRead = controller.read();
    controller.bind(renewed.port, session.context);
    expect(controller.getSnapshot().busy).toBe(false);
    const fresh = await renewed.port.readPreview(
      ids.version,
      new AbortController().signal,
    );
    finish(fresh);
    await previousRead;
    expect(links.create).not.toHaveBeenCalled();
    await controller.read();
    expect(links.create).toHaveBeenCalledTimes(1);
  } finally {
    detach();
  }
});

it("preserves an uncertain publication across renewal and never automatically repeats it", async () => {
  const renewed = connection(),
    links = urls();
  let finish!: (reply: { ok: false; code: string }) => void;
  const publish = vi.fn(
    () =>
      new Promise<{ ok: false; code: string }>((resolve) => {
        finish = resolve;
      }),
  );
  const controller = new DocumentPreviewController(
    { ...renewed.port, publishPreview: publish },
    session.context,
    ids.version,
    memoryStorage(),
    links,
  );
  const detach = controller.attach();
  try {
    const pending = controller.publish();
    expect(controller.getSnapshot().publication).toBe("unresolved");
    controller.bind(renewed.port, session.context);
    finish({ ok: false, code: "PREVIEW_PUBLICATION_UNKNOWN" });
    await pending;
    await controller.publish();
    expect(publish).toHaveBeenCalledTimes(1);
    expect(renewed.fetcher).not.toHaveBeenCalled();
    expect(controller.getSnapshot().publication).toBe("unresolved");
    await controller.read();
    expect(controller.getSnapshot().publication).toBe("complete");
  } finally {
    detach();
  }
});

it("refuses to rebind a preview to another conversation or account", () => {
  const original = connection(),
    renewed = connection();
  const controller = new DocumentPreviewController(
    original.port,
    session.context,
    ids.version,
    memoryStorage(),
    urls(),
  );
  const detach = controller.attach();
  try {
    for (const changed of [
      { ...session.context, tenantId: "another-tenant" },
      { ...session.context, actorId: "another-actor" },
      { ...session.context, conversationId: ids.other },
    ])
      expect(() => controller.bind(renewed.port, changed)).toThrow(
        "Preview context changed",
      );
    expect(renewed.fetcher).not.toHaveBeenCalled();
  } finally {
    detach();
  }
});
