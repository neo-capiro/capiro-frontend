import { afterEach, describe, expect, it, vi } from "vitest";
import { createOfficeTransport } from "../src/shared/meri-office/transport";
import {
  officeCredential,
  officeIds,
  officeWireSnapshot,
} from "./office-wire-fixture";
const input = { draftId: officeIds.draftId, versionId: officeIds.versionId };
afterEach(() => vi.useRealTimers());
function fixture(
  fetcher: typeof fetch = vi.fn(async () =>
    Response.json(officeWireSnapshot()),
  ),
) {
  const lifetime = new AbortController(),
    lost = vi.fn();
  let current = true;
  const port = createOfficeTransport({
    credential: officeCredential,
    lifetime: lifetime.signal,
    isCurrent: () => current,
    onAccessLost: lost,
    fetcher,
  });
  return {
    port,
    lifetime,
    lost,
    fetcher,
    retire: () => {
      current = false;
    },
  };
}
describe("Office receiving transport", () => {
  it("uses the existing opaque header and admits only the selected public response", async () => {
    const f = fixture(),
      reply = await f.port.request("read", input, new AbortController().signal);
    expect(reply.value).toEqual(officeWireSnapshot());
    expect(f.port.pending()).toBe(false);
    const [url, init] = vi.mocked(f.fetcher).mock.calls[0]!;
    expect(url).toBe("/api/meri/office/read");
    expect(init).toMatchObject({
      method: "POST",
      credentials: "same-origin",
      redirect: "error",
      cache: "no-store",
    });
    const headers = new Headers(init?.headers);
    expect(headers.get("x-meri-action-session")).toBe(officeCredential);
    expect(headers.has("authorization")).toBe(false);
    expect(JSON.parse(init?.body as string)).toEqual({
      schema: "meri.office-application/1",
      ...input,
    });
    f.port.dispose();
  });
  it("rejects mismatched selectors and private bytes even in a successful response", async () => {
    for (const value of [
      { ...officeWireSnapshot(), bytes: "private" },
      {
        ...officeWireSnapshot(),
        draft: { ...officeWireSnapshot().draft, draftId: officeIds.editorId },
      },
    ]) {
      const f = fixture(vi.fn(async () => Response.json(value)));
      await expect(
        f.port.request("read", input, new AbortController().signal),
      ).rejects.toThrow();
      f.port.dispose();
    }
  });
  it("revocation is reported and no expired credential is sent after disposal", async () => {
    const f = fixture(
      vi.fn(async () =>
        Response.json(
          {
            schema: "meri.office-application/1",
            error: { code: "ACCESS_DENIED", outcome: "READ_UNAVAILABLE" },
          },
          { status: 403 },
        ),
      ),
    );
    await f.port.request("read", input, new AbortController().signal);
    expect(f.lost).toHaveBeenCalledTimes(1);
    f.lifetime.abort();
    await expect(
      f.port.request("read", input, new AbortController().signal),
    ).rejects.toThrow();
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });
  it("current scope is checked again after receiving, and unknown Publish is never retried", async () => {
    const f = fixture(
      vi.fn(async () => {
        f.retire();
        return Response.json(officeWireSnapshot());
      }),
    );
    await expect(
      f.port.request("read", input, new AbortController().signal),
    ).rejects.toThrow();
    const writing = fixture(
      vi.fn(async () => {
        throw new Error("lost response");
      }),
    );
    await expect(
      writing.port.request(
        "publish",
        { ...input, sequence: 1, sha256: "b".repeat(64) },
        new AbortController().signal,
      ),
    ).rejects.toThrow();
    expect(writing.fetcher).toHaveBeenCalledTimes(1);
    writing.port.dispose();
  });
  it("enforces the deadline while receiving and cancels a stalled body", async () => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    const f = fixture(
      vi.fn(
        async () =>
          new Response(new ReadableStream({ cancel }), {
            headers: { "content-type": "application/json" },
          }),
      ),
    );
    const result = f.port.request("read", input, new AbortController().signal),
      rejected = expect(result).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(30_000);
    await rejected;
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(f.port.pending()).toBe(false);
    f.port.dispose();
  });
});
