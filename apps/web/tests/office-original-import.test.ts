import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createOfficeOriginalImport } from "../src/shared/meri-office/original-import";
import { accessInspection } from "./meri-document-access-fixtures";
import { ids, session } from "./meri-document-public-fixtures";
import type { ConversationContext } from "../src/shared/meri-conversations/session";

const cleanup: (() => void)[] = [];
afterEach(() => {
  cleanup.splice(0).forEach((stop) => stop());
  vi.useRealTimers();
});
function fixture(format: "docx" | "xlsx" | "pptx" = "docx") {
  const queries = new QueryClient(),
    document = accessInspection(format);
  const context: ConversationContext = { ...session.context };
  const selection = {
    uploadId: ids.other,
    sha256: document.version.object.sha256,
  };
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  let effect: (
    request: Record<string, unknown>,
  ) => Promise<Response> = async () =>
    Response.json({
      schema: "meri.office-application/1",
      ...selection,
      document,
    });
  let sessionDenied = false,
    pause: (() => Promise<void>) | null = null;
  const fetcher: typeof fetch = async (url, init) => {
    const body = JSON.parse(init!.body as string);
    calls.push({ url: String(url), body });
    if (String(url).endsWith("/session"))
      return sessionDenied
        ? new Response(null, { status: 403 })
        : Response.json({
            ...session,
            expiresAtMs: Date.now() + 120_000,
            context,
          });
    await pause?.();
    return effect(body);
  };
  const create = () => {
    const host = createOfficeOriginalImport({
      context,
      selection,
      queries,
      fetcher,
    });
    const detach = host.attach();
    cleanup.push(detach);
    return { host, detach };
  };
  cleanup.push(() => queries.clear());
  return {
    ...create(),
    create,
    context,
    document,
    selection,
    queries,
    calls,
    setEffect: (next: typeof effect) => {
      effect = next;
    },
    denySession: () => {
      sessionDenied = true;
    },
    pause: (next: () => Promise<void>) => {
      pause = next;
    },
  };
}

describe("retained Office original entry", () => {
  it.each(["docx", "xlsx", "pptx"] as const)(
    "imports %s using its selector and returns the exact immutable version",
    async (format) => {
      const f = fixture(format);
      await f.host.open();
      expect(f.host.getSnapshot().version?.versionId).toBe(
        f.document.version.versionId,
      );
      expect(f.host.getSnapshot().version?.object.sha256).toBe(
        f.selection.sha256,
      );
      expect(f.host.getSnapshot().runId).toBe(f.context.runId);
      expect(f.calls.map((call) => call.url)).toEqual([
        "/api/action-followthrough/session",
        "/api/meri/office/import",
      ]);
      expect(f.calls[1]!.body).toEqual({
        schema: "meri.office-application/1",
        ...f.selection,
        operation: "import",
      });
      await f.host.open();
      expect(f.calls.at(-1)!.body.operation).toBe("recover");
    },
  );
  it("lost acknowledgement and remount only recover the original identity", async () => {
    const f = fixture();
    f.setEffect(async () => {
      throw Error("lost");
    });
    await f.host.open();
    expect(f.host.getSnapshot().message).toContain("unconfirmed");
    f.detach();
    const next = f.create();
    f.setEffect(async () =>
      Response.json({
        schema: "meri.office-application/1",
        ...f.selection,
        document: f.document,
      }),
    );
    await next.host.open();
    expect(
      f.calls
        .filter((c) => c.url.endsWith("/import"))
        .map((c) => c.body.operation),
    ).toEqual(["import", "recover"]);
    expect(next.host.getSnapshot().version?.versionId).toBe(
      f.document.version.versionId,
    );
  });
  it("unresolved recovery never unlocks a second import", async () => {
    const f = fixture();
    f.setEffect(async () =>
      Response.json(
        {
          schema: "meri.office-application/1",
          error: { code: "IMPORT_UNRESOLVED", outcome: "UNKNOWN" },
        },
        { status: 409 },
      ),
    );
    await f.host.open();
    await f.host.open();
    await f.host.open();
    expect(
      f.calls
        .filter((c) => c.url.endsWith("/import"))
        .map((c) => c.body.operation),
    ).toEqual(["import", "recover", "recover"]);
    expect(f.host.getSnapshot().version).toBeNull();
  });
  it.each(["actor", "client", "conversation", "digest"])(
    "refuses mismatched %s without opening an editor",
    async (mismatch) => {
      const f = fixture(),
        document = structuredClone(f.document);
      if (mismatch === "actor")
        document.version.binding.actorId = "other-actor";
      if (mismatch === "client")
        document.version.scopes[0]!.resourceId = ids.other;
      if (mismatch === "conversation")
        document.version.binding.conversationId = ids.other;
      if (mismatch === "digest")
        document.version.object.sha256 = "f".repeat(64);
      f.setEffect(async () =>
        Response.json({
          schema: "meri.office-application/1",
          ...f.selection,
          document,
        }),
      );
      await f.host.open();
      expect(f.host.getSnapshot().version).toBeNull();
      expect(f.host.getSnapshot().attempted).toBe(true);
    },
  );
  it("cache retirement while awaiting the reply prevents stale release and further dispatch", async () => {
    const f = fixture();
    let release!: () => void;
    f.pause(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const work = f.host.open();
    await vi.waitFor(() => expect(release).toBeTypeOf("function"));
    f.queries.clear();
    release();
    await work;
    expect(f.host.getSnapshot().version).toBeNull();
    const count = f.calls.length;
    await f.host.open();
    expect(f.calls).toHaveLength(count);
  });
  it("coalesces repeated clicks and preserves a single dispatched selector", async () => {
    const f = fixture();
    let release!: () => void;
    f.pause(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const work = f.host.open();
    await vi.waitFor(() => expect(release).toBeTypeOf("function"));
    await f.host.open();
    release();
    await work;
    expect(f.calls.filter((c) => c.url.endsWith("/import"))).toHaveLength(1);
  });
  it("session refusal before dispatch leaves the initial explicit import available", async () => {
    const f = fixture();
    f.denySession();
    await f.host.open();
    expect(f.host.getSnapshot().attempted).toBe(false);
    expect(f.calls.every((c) => c.url.endsWith("/session"))).toBe(true);
  });
  it("renews native access and recovers without requiring a submitted chat turn", async () => {
    vi.useFakeTimers();
    const f = fixture();
    await f.host.open();
    await vi.advanceTimersByTimeAsync(76_000);
    await f.host.open();
    expect(f.calls.filter((c) => c.url.endsWith("/session"))).toHaveLength(2);
    expect(f.calls.at(-1)!.body.operation).toBe("recover");
    expect(
      f.calls.some(
        (c) => c.url.includes("transcript") || c.url.includes("/send"),
      ),
    ).toBe(false);
  });
});
