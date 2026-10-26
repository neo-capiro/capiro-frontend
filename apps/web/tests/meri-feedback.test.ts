import { expect, it, vi } from "vitest";
import { createFeedbackAccess } from "../src/shared/meri-feedback/access";
import {
  feedbackRecovery,
  matchingFeedback,
} from "../src/shared/meri-feedback/recovery";
import {
  syncMeriTabIdentity,
  clearMeriConversationScope,
} from "../src/shared/meri-conversations/tab-journal";
import { proxyConversationRequest } from "../src/shared/meri-conversations/proxy";
import {
  feedbackContext as context,
  feedbackRequest as input,
  feedbackReceipt,
  feedbackStorage,
  feedbackId,
} from "./meri-feedback-fixtures";
const credential = `action_session_${"f".repeat(43)}`;
const controller = () => new AbortController();
function access(
  fetcher: typeof fetch,
  isCurrent = () => true,
  onAccessLost = vi.fn(),
) {
  return createFeedbackAccess({
    credential,
    context,
    lifetime: controller().signal,
    isCurrent,
    onAccessLost,
    fetcher,
  });
}
it("records through the existing opaque-session header and public receiver", async () => {
  const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
    expect(new Headers(init?.headers).get("x-meri-action-session")).toBe(
      credential,
    );
    expect(new Headers(init?.headers).has("Authorization")).toBe(false);
    expect(
      JSON.parse(new TextDecoder().decode(init?.body as Uint8Array)),
    ).toEqual(input);
    return Response.json({ receipt: feedbackReceipt(), replayed: false });
  });
  const port = access(fetcher),
    result = await port.record(input, controller().signal);
  expect(result.kind).toBe("ok");
  expect(port.pending()).toBe(false);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("lost acknowledgements and invalid success responses stay unknown", async () => {
  for (const fetcher of [
    async () => {
      throw new Error("Lost ACK");
    },
    async () =>
      Response.json({
        receipt: { ...feedbackReceipt(), actorId: "other" },
        replayed: false,
      }),
    async () =>
      Response.json({
        receipt: {
          ...feedbackReceipt(),
          signal: {
            kind: "recommendation",
            recommendation: "Different intent",
          },
        },
        replayed: false,
      }),
  ]) {
    expect(
      (await access(fetcher).record(input, controller().signal)).kind,
    ).toBe("unknown");
  }
});
it("definite stale revision is distinct from uncertain commit, and access loss retires the session", async () => {
  for (const [code, status, kind] of [
    ["FEEDBACK_REVISION_CHANGED", 409, "refused"],
    ["FEEDBACK_WRITE_UNKNOWN", 503, "unknown"],
  ] as const)
    expect(
      (
        await access(async () =>
          Response.json({ error: { code } }, { status }),
        ).record(input, controller().signal)
      ).kind,
    ).toBe(kind);
  const lost = vi.fn();
  await access(
    async () =>
      Response.json({ error: { code: "SESSION_CHANGED" } }, { status: 403 }),
    () => true,
    lost,
  ).read(context.runId, controller().signal);
  expect(lost).toHaveBeenCalledOnce();
});
it("an expired lifetime cannot dispatch or release private feedback", async () => {
  const fetcher = vi.fn<typeof fetch>();
  expect(
    (await access(fetcher, () => false).record(input, controller().signal))
      .kind,
  ).toBe("not_sent");
  expect(fetcher).not.toHaveBeenCalled();
  let current = true;
  const reply = await access(
    async () => {
      current = false;
      return Response.json({ receipt: feedbackReceipt(), replayed: false });
    },
    () => current,
  ).record(input, controller().signal);
  expect(reply.kind).toBe("unknown");
});
it("readback validates run and rejects duplicate or foreign receipts", async () => {
  for (const value of [
    { runId: feedbackId(999), receipts: [] },
    { runId: context.runId, receipts: [feedbackReceipt(), feedbackReceipt()] },
    {
      runId: context.runId,
      receipts: [{ ...feedbackReceipt(), conversationId: feedbackId(998) }],
    },
  ])
    expect(
      (
        await access(async () => Response.json(value)).read(
          context.runId,
          controller().signal,
        )
      ).kind,
    ).toBe("unknown");
});
it("tab recovery preserves exact input across recreation and refuses replacement", () => {
  const storage = feedbackStorage();
  syncMeriTabIdentity("synthetic identity", storage);
  feedbackRecovery(context, context.runId, storage).write(input);
  const recovered = feedbackRecovery(context, context.runId, storage);
  expect(recovered.read()).toEqual(input);
  expect(() =>
    recovered.write({ ...input, requestId: feedbackId(20) }),
  ).toThrow();
  recovered.clear();
  expect(recovered.read()).toBeUndefined();
});
it("unconfirmed readback cannot clear a changed request or lost-storage fence", async () => {
  expect(await matchingFeedback(input, [])).toBeUndefined();
  expect(await matchingFeedback(input, [feedbackReceipt()])).toEqual(
    feedbackReceipt(),
  );
  await expect(
    matchingFeedback(input, [
      {
        ...feedbackReceipt(),
        signal: { kind: "preference", value: "helpful", note: null },
      },
    ]),
  ).rejects.toThrow();
  const storage = feedbackStorage();
  syncMeriTabIdentity("synthetic identity", storage);
  const recovery = feedbackRecovery(context, context.runId, storage);
  recovery.write(input);
  clearMeriConversationScope(
    { ...context, clientId: context.selectedClientId },
    storage,
  );
  expect(recovery.current()).toBe(false);
  expect(() => recovery.read()).toThrow();
  expect(() =>
    feedbackRecovery(context, context.runId, storage).read(),
  ).toThrow();
});
it("existing same-origin proxy forwards only the two public feedback routes and refuses forged bodies", async () => {
  const origin = "https://frontend.example.test",
    configuration = {
      enabled: true,
      baseUrl: "https://meri.example.test",
      frontendOrigin: origin,
    };
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({ receipt: feedbackReceipt(), replayed: false }),
  );
  const request = (path: string, body: unknown) =>
    new Request(`${origin}/api/conversations/${path}`, {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        "x-meri-action-session": credential,
      },
      body: JSON.stringify(body),
    });
  for (const [route, body] of [
    ["feedback", input],
    ["feedback-read", { runId: context.runId }],
  ] as const)
    expect(
      (
        await proxyConversationRequest(
          request(route, body),
          route,
          configuration,
          async () => "native",
          fetcher,
        )
      ).status,
    ).toBe(200);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(
    (
      await proxyConversationRequest(
        request("feedback", { ...input, modelId: "forged" }),
        "feedback",
        configuration,
        async () => "native",
        fetcher,
      )
    ).status,
  ).toBe(400);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
