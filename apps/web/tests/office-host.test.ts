import type { OfficeLaunch } from "@capiro/meri-contracts/office-application";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { officeDraftSelection } from "../src/shared/meri-office/draft-selection";
import { createOfficeEditorHost } from "../src/shared/meri-office/editor-host";
import {
  officeCredential,
  officeIds,
  officeWireSnapshot,
} from "./office-wire-fixture";
const bootstrap = vi.hoisted(() => vi.fn());
const conversationBootstrap = vi.hoisted(() => vi.fn());
vi.mock("../src/shared/meri-conversations/session", () => ({
  bootstrapConversationSession: conversationBootstrap,
}));
vi.mock("../src/shared/meri-documents/library-session", () => ({
  bootstrapLibrarySession: bootstrap,
}));
const cleanup: (() => void)[] = [];
afterEach(() => {
  for (const stop of cleanup.splice(0)) stop();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  bootstrap.mockReset();
  conversationBootstrap.mockReset();
});
async function fixture(sessionRunId?: string) {
  vi.useFakeTimers();
  vi.setSystemTime(Date.parse("2026-10-29T00:00:00Z"));
  const queries = new QueryClient(),
    account = { tenantId: officeIds.editorId, actorId: officeIds.versionId },
    origin = { conversationId: officeIds.conversationId, clientId: null };
  const recovery = officeDraftSelection(queries, {
    ...account,
    ...origin,
    versionId: officeIds.versionId,
  });
  bootstrap.mockImplementation(async () => ({
    credential: officeCredential,
    expiresAtMs: Date.now() + 120_000,
    context: { ...account, ...origin },
  }));
  conversationBootstrap.mockImplementation(bootstrap.getMockImplementation()!);
  const frame = {
    launch: vi.fn<(launch: OfficeLaunch) => void>(),
    renew: vi.fn<(launch: OfficeLaunch) => void>(),
    save: vi.fn(async (signal: AbortSignal): Promise<void> => {
      signal.throwIfAborted();
    }),
    dispose: vi.fn(),
  };
  let editor = officeWireSnapshot().editor;
  const fetcher = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    const request = JSON.parse(init?.body as string),
      route = String(_url).split("/").at(-1);
    let snapshot = officeWireSnapshot();
    snapshot = {
      ...snapshot,
      draft: { ...snapshot.draft, draftId: recovery.selection.draftId },
      editor,
    };
    if (route === "launch" || route === "renew") {
      const expiresAtMs = Date.now() + 120_000;
      snapshot = {
        ...snapshot,
        editor: {
          editorId: recovery.selection.editorId,
          epoch: 1,
          expiresAt: new Date(expiresAtMs).toISOString(),
        },
      };
      editor = snapshot.editor;
      snapshot = {
        ...snapshot,
        launch: {
          edition: "collabora-code",
          editorOrigin: "https://office.example.test",
          actionUrl: `https://office.example.test/browser/test/cool.html?WOPISrc=${encodeURIComponent(`https://meri.example.test/api/meri/office/wopi/files/${request.draftId}`)}`,
          method: "POST",
          fields: {
            access_token: `synthetic.${"a".repeat(43)}`,
            access_token_ttl: String(expiresAtMs),
          },
          expiresAtMs,
        },
      };
    }
    return Response.json(snapshot);
  });
  vi.stubGlobal("fetch", fetcher);
  const host = createOfficeEditorHost({
    account,
    origin,
    recovery,
    frame,
    sessionRunId,
  });
  const detach = host.attach();
  cleanup.push(detach, () => queries.clear());
  await vi.waitFor(() =>
    expect(host.session.getSnapshot().status).toBe("ready"),
  );
  await host.editor.open();
  host.editor.ready();
  expect(host.editor.getSnapshot().frame).toBe(true);
  return { host, frame, fetcher, queries, detach };
}
describe("Office native session composition", () => {
  it("a newly imported original uses current native access before any submitted transcript exists", async () => {
    const runId = officeIds.draftId;
    await fixture(runId);
    expect(bootstrap).not.toHaveBeenCalled();
    expect(conversationBootstrap).toHaveBeenCalledWith(
      { conversationId: officeIds.conversationId, clientId: null, runId },
      { tenantId: officeIds.editorId, actorId: officeIds.versionId },
      expect.any(AbortSignal),
    );
  });
  it("the existing owner renews early without replacing a loaded frame", async () => {
    const f = await fixture();
    const firstTtl = f.frame.launch.mock.calls[0]![0].expiresAtMs;
    await vi.advanceTimersByTimeAsync(75_000);
    expect(bootstrap).toHaveBeenCalledTimes(2);
    expect(f.frame.launch).toHaveBeenCalledTimes(1);
    expect(f.frame.renew).toHaveBeenCalledTimes(1);
    expect(f.frame.renew.mock.calls[0]![0].expiresAtMs).toBeGreaterThan(
      firstTtl,
    );
    expect(f.host.editor.getSnapshot()).toMatchObject({
      connected: true,
      frame: true,
      ready: true,
    });
  });
  it("pending Save delays early renewal but never extends the native hard expiry", async () => {
    const f = await fixture();
    let acknowledge!: () => void;
    f.frame.save.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          acknowledge = resolve;
        }),
    );
    const saving = f.host.editor.save();
    await vi.advanceTimersByTimeAsync(75_000);
    expect(bootstrap).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(45_000);
    expect(f.host.editor.getSnapshot()).toMatchObject({
      connected: false,
      snapshot: null,
      frame: false,
      busy: null,
    });
    acknowledge();
    await saving;
    expect(f.frame.save).toHaveBeenCalledTimes(1);
    expect(f.fetcher).toHaveBeenCalledTimes(3);
  });
  it("cache clear and detach retire the frame; reattach starts from cleared local state", async () => {
    const f = await fixture();
    f.detach();
    expect(f.host.editor.getSnapshot().snapshot).toBeNull();
    const detachAgain = f.host.attach();
    cleanup.push(detachAgain);
    await vi.waitFor(() =>
      expect(f.host.editor.getSnapshot().connected).toBe(true),
    );
    await f.host.editor.open();
    f.host.editor.ready();
    f.queries.clear();
    expect(f.host.editor.getSnapshot()).toMatchObject({
      frame: false,
      snapshot: null,
      connected: false,
    });
    expect(f.host.session.getExpirationReason()).toBe("access-lost");
  });
  it("unavailable renewal clears the frame when the session owner stops issuance", async () => {
    const f = await fixture();
    bootstrap.mockRejectedValue(new Error("native source unavailable"));
    await vi.advanceTimersByTimeAsync(75_000);
    expect(f.host.session.getSnapshot().status).toBe("unavailable");
    expect(f.host.editor.getSnapshot()).toMatchObject({
      frame: false,
      snapshot: null,
      connected: false,
    });
  });
});
