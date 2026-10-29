import { expect, it, vi } from "vitest";
import type { ConversationHistoryDeletionStatusResponse } from "@capiro/meri-contracts/conversation-history";
import {
  MANAGEMENT_VERSION,
  listConversationDeletions,
  readConversationDeletionStatus,
} from "../src/shared/meri-conversations/history-client";
import {
  conversationHistoryRoute,
  proxyConversationHistory,
} from "../src/shared/meri-conversations/history-proxy";
import { deletionStatusView } from "../src/features/meri/privacy/deletion-status-view";
const reference = {
  requestId: "10000000-0000-4000-8000-000000000003",
  conversationId: "10000000-0000-4000-8000-000000000004",
  revision: "1",
  createdAt: "2026-09-01T00:00:00.000Z",
  restoreUntil: "2026-10-01T00:00:00.000Z",
};
const completed: ConversationHistoryDeletionStatusResponse = {
  version: MANAGEMENT_VERSION,
  ...reference,
  state: "completed" as const,
  reasons: [],
  retainedSharedCopies: true,
  checkedAtMs: Date.parse("2026-10-29T00:00:00.000Z"),
};
it("routes both public deletion reads through the existing native credential proxy", async () => {
  expect(conversationHistoryRoute("deletions/list")).toBe("deletions");
  expect(conversationHistoryRoute("deletions/status")).toBe("deletionStatus");
  expect(conversationHistoryRoute("deletions/delete")).toBeUndefined();
  const upstream = vi.fn(async (_url: unknown, init?: RequestInit) => {
    expect(new Headers(init?.headers).get("authorization")).toBe(
      "Bearer synthetic-native",
    );
    return Response.json(completed);
  });
  const input = { version: MANAGEMENT_VERSION, requestId: reference.requestId };
  const request = new Request(
    "https://frontend.example/api/conversations/deletions/status",
    {
      method: "POST",
      headers: {
        origin: "https://frontend.example",
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );
  const response = await proxyConversationHistory(
    request,
    "deletionStatus",
    {
      enabled: true,
      baseUrl: "https://meri.example",
      frontendOrigin: "https://frontend.example",
    },
    async () => "synthetic-native",
    upstream as typeof fetch,
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(completed);
});
it("uses installed public bytes for exact request history and refuses stale or leaked status shapes", async () => {
  const signal = new AbortController().signal;
  const page = {
    version: MANAGEMENT_VERSION,
    requests: [reference],
    olderRequestsUnavailable: true,
    nextBefore: null,
  };
  expect(
    await listConversationDeletions(
      { version: MANAGEMENT_VERSION, before: null },
      signal,
      vi.fn(async () => Response.json(page)) as typeof fetch,
    ),
  ).toEqual(page);
  const input = { version: MANAGEMENT_VERSION, requestId: reference.requestId };
  expect(
    await readConversationDeletionStatus(
      input,
      signal,
      vi.fn(async () => Response.json(completed)) as typeof fetch,
    ),
  ).toEqual(completed);
  for (const value of [
    { ...completed, title: "private" },
    { ...completed, requestId: reference.conversationId },
    { ...completed, reasons: ["legal_hold"] },
  ])
    await expect(
      readConversationDeletionStatus(
        input,
        signal,
        vi.fn(async () => Response.json(value)) as typeof fetch,
      ),
    ).rejects.toThrow();
  await expect(
    readConversationDeletionStatus(
      input,
      signal,
      vi.fn(
        async () => new Response("private denial", { status: 403 }),
      ) as typeof fetch,
    ),
  ).rejects.toMatchObject({ status: 403, code: "CONVERSATION_ACCESS_DENIED" });
});
it("describes only verified completion and explicitly retains independent shared copies", () => {
  const view = deletionStatusView(completed);
  expect(view.label).toBe("Cleanup verified complete");
  expect(view.retained).toContain("remain retained");
  expect(
    deletionStatusView({
      ...completed,
      state: "unknown",
      reasons: ["verification_unavailable"],
    }).detail,
  ).toContain("not a deletion confirmation");
  expect(
    deletionStatusView({
      ...completed,
      state: "blocked",
      reasons: ["legal_hold"],
    }).detail,
  ).toContain("last cleanup check");
  expect(
    deletionStatusView({ ...completed, state: "superseded", reasons: [] })
      .detail,
  ).toContain("does not confirm deletion");
});
