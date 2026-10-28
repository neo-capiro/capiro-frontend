import { describe, expect, it, vi } from "vitest";
import { createCapiroApi } from "../src/shared/capiro/http";
import { memoryReviewOperations } from "../src/shared/capiro/operations/memory-review";
const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("canonical memory notification acknowledgements", () => {
  it("sends one acknowledgement and rejects an unconfirmed response without a retry", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ ok: false }));
    const api = createCapiroApi(memoryReviewOperations, { fetcher });
    await expect(
      api.request("memory.notifications.read", { params: { id } }),
    ).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({
      params: { id },
    });
  });
  it("accepts the actual unread count and acknowledgement receipts", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ enabled: true, count: 27 }))
      .mockResolvedValueOnce(Response.json({ ok: true, updated: 27 }));
    const api = createCapiroApi(memoryReviewOperations, { fetcher });
    expect(await api.request("memory.notifications.unread", {})).toEqual({
      enabled: true,
      count: 27,
    });
    expect(await api.request("memory.notifications.readAll", {})).toEqual({
      ok: true,
      updated: 27,
    });
  });
  it("does not accept caller-selected authority or a fabricated unread count", () => {
    expect(
      memoryReviewOperations["memory.notifications.read"].request.safeParse({
        params: { id },
        body: { tenantId: id },
      }).success,
    ).toBe(false);
    for (const count of [-1, 0.5, "4"])
      expect(
        memoryReviewOperations[
          "memory.notifications.unread"
        ].response.safeParse({ enabled: true, count }).success,
      ).toBe(false);
  });
  it("retires the authenticated API lifetime on an expired session", async () => {
    const expired = vi.fn(),
      fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          Response.json({ message: "Expired" }, { status: 401 }),
        );
    const api = createCapiroApi(memoryReviewOperations, {
      fetcher,
      onSessionExpired: expired,
    });
    await expect(
      api.request("memory.notifications.readAll", {}),
    ).rejects.toThrow();
    expect(expired).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
