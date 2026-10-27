import { mailActorId } from "./mail-read-fixture";
import { describe, expect, it } from "vitest";
import { createApiClient } from "../src/shared/portfolio/api/http";
import {
  readTimelineThread,
  threadKey,
} from "../src/features/portfolio/relationships/thread/contracts";
import { orderedMessages } from "../src/features/portfolio/relationships/thread/recipients";
import {
  fullThread,
  threadId,
  threadClientId,
  threadTenantId,
} from "./thread-mail-fixture";
const scope = {
  tenantId: threadTenantId,
  userId: mailActorId,
  clientId: threadClientId,
  threadId,
};
describe("synced timeline thread", () => {
  it("reads the exact bounded stored thread source and preserves returned messages", async () => {
    const calls: string[] = [];
    const api = createApiClient(async (input) => {
      calls.push(String(input));
      return Response.json(fullThread);
    });
    expect((await readTimelineThread(api, scope)).messages).toHaveLength(2);
    expect(calls).toEqual([
      `/api/backend/core/engagement/mail-threads/${threadId}?clientId=${threadClientId}&limit=10`,
    ]);
  });
  it.each(["id", "clientId", "tenantId"] as const)(
    "refuses incorrect %s receipt",
    async (field) => {
      const api = createApiClient(async () =>
        Response.json({
          ...fullThread,
          [field]: "80000000-0000-4000-8000-000000000001",
        }),
      );
      await expect(readTimelineThread(api, scope)).rejects.toThrow();
    },
  );
  it("refuses cross-thread messages and duplicate message identities", async () => {
    for (const messages of [
      [{ ...fullThread.messages[0], threadId: threadClientId }],
      [fullThread.messages[0], fullThread.messages[0]],
    ]) {
      const api = createApiClient(async () =>
        Response.json({ ...fullThread, messages }),
      );
      await expect(readTimelineThread(api, scope)).rejects.toThrow();
    }
  });
  it("keys cached data by actor, tenant, client and thread", () => {
    for (const field of ["userId", "tenantId", "clientId", "threadId"] as const)
      expect(threadKey({ ...scope, [field]: "other" })).not.toEqual(
        threadKey(scope),
      );
  });
  it("orders received-only messages by actual effective date rather than server null ordering", () => {
    expect(orderedMessages(fullThread)[0]?.id).toBe(fullThread.messages[1]?.id);
    expect(fullThread.messages[0]?.sentAt).toBe("2026-10-10T14:00:00Z");
  });
});
