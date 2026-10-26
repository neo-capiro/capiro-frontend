import { expect, it, vi } from "vitest";
import { createIntentsAccess } from "../src/shared/meri-intents/access";
import { ConversationHostController } from "../src/shared/meri-conversations/host-controller";
import { nativeTaskIntent } from "./meri-intents-native-fixtures";

const credential = `action_session_${"a".repeat(43)}`;
const live = () => new AbortController().signal;
const denials = [
  [401, "UNAUTHENTICATED"],
  [403, "ACCESS_DENIED"],
  [403, "MEMBERSHIP_REVOKED"],
  [409, "MEMBERSHIP_CHANGED"],
] as const;

function task(update: boolean) {
  const fixture = nativeTaskIntent(update);
  const item = fixture.response.intents[0];
  return {
    fixture,
    proposal: item.proposal,
    request: {
      conversationId: fixture.request.conversationId,
      deliveryId: item.deliveryId,
      proposalId: item.proposal.proposalId,
      commandSha256: item.proposal.commandSha256,
      decision: "approved" as const,
    },
  };
}

for (const update of [false, true]) {
  for (const route of ["list", "decide"] as const) {
    it.each(denials)(
      `task.${update ? "update" : "create"} ${route} retires current access on %s %s`,
      async (status, code) => {
        const f = task(update),
          lost = vi.fn();
        const fetcher = vi.fn(async () =>
          Response.json({ error: { code } }, { status }),
        );
        const access = createIntentsAccess(
          credential,
          live(),
          fetcher,
          undefined,
          lost,
        );
        const reply =
          route === "list"
            ? await access.list(f.fixture.request, live())
            : await access.decide(f.request, f.proposal, live());
        expect(reply).toMatchObject({ kind: "refused", code });
        expect(lost).toHaveBeenCalledTimes(1);
        expect(await access.list(f.fixture.request, live())).toEqual({
          kind: "unavailable",
          dispatched: false,
        });
        expect(await access.decide(f.request, f.proposal, live())).toEqual({
          kind: "unavailable",
          dispatched: false,
        });
        expect(fetcher).toHaveBeenCalledTimes(1);
      },
    );
  }
}

it.each([
  [502, "PRODUCT_UNAVAILABLE"],
  [409, "INTENT_EXPIRED"],
  [502, "APPROVAL_DECISION_UNKNOWN"],
])(
  "keeps an available lifetime after the task decision returns %s %s",
  async (status, code) => {
    const f = task(true),
      lost = vi.fn();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ error: { code } }, { status: Number(status) }),
      )
      .mockResolvedValueOnce(Response.json(f.fixture.response));
    const access = createIntentsAccess(
      credential,
      live(),
      fetcher,
      undefined,
      lost,
    );
    expect(await access.decide(f.request, f.proposal, live())).toMatchObject({
      kind: "refused",
      code,
    });
    expect(lost).not.toHaveBeenCalled();
    expect((await access.list(f.fixture.request, live())).kind).toBe("ok");
  },
);

it("retires the actual conversation host and its old task port after a decision denial", async () => {
  const f = task(true),
    binding = f.proposal.command.binding;
  const context = {
    tenantId: binding.tenantId,
    actorId: binding.actorId,
    conversationId: binding.conversationId,
    runId: binding.runId,
    selectedClientId:
      f.fixture.response.intents[0].execution.outcome.result.clientId,
  };
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({ credential, expiresAtMs: Date.now() + 60_000, context }),
    )
    .mockResolvedValueOnce(
      Response.json({ error: { code: "ACCESS_DENIED" } }, { status: 403 }),
    );
  const host = new ConversationHostController({
    hints: {
      clientId: context.selectedClientId,
      conversationId: context.conversationId,
      runId: context.runId,
    },
    account: context,
    fetcher,
  });
  const detach = host.attach();
  try {
    await host.connect();
    const ready = host.getSnapshot();
    expect(ready.status).toBe("ready");
    if (ready.status !== "ready") throw new Error("Host did not connect");
    await ready.port.intents.decide(f.request, f.proposal, live());
    expect(host.getSnapshot()).toEqual({ status: "expired" });
    expect(host.getExpirationReason()).toBe("access-lost");
    expect(ready.port.intents.routines?.signal.aborted).toBe(true);
    expect(await ready.port.intents.list(f.fixture.request, live())).toEqual({
      kind: "unavailable",
      dispatched: false,
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  } finally {
    detach();
  }
});

it("ignores a late task denial from a retired identity", async () => {
  const f = task(true),
    lifetime = new AbortController(),
    lost = vi.fn();
  let finish!: (response: Response) => void;
  const fetcher = vi.fn(
    () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
  );
  const access = createIntentsAccess(
    credential,
    lifetime.signal,
    fetcher,
    undefined,
    lost,
  );
  const pending = access.list(f.fixture.request, live());
  await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  lifetime.abort();
  finish(
    Response.json({ error: { code: "MEMBERSHIP_REVOKED" } }, { status: 403 }),
  );
  expect(await pending).toEqual({ kind: "unavailable", dispatched: true });
  expect(lost).not.toHaveBeenCalled();
});

it("withholds an in-flight successful task list after another request loses access", async () => {
  const f = task(true),
    lost = vi.fn();
  let finish!: (response: Response) => void;
  const fetcher = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValueOnce(
      Response.json({ error: { code: "ACCESS_DENIED" } }, { status: 403 }),
    );
  const access = createIntentsAccess(
    credential,
    live(),
    fetcher,
    undefined,
    lost,
  );
  const pending = access.list(f.fixture.request, live());
  await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  await access.decide(f.request, f.proposal, live());
  finish(Response.json(f.fixture.response));
  expect(await pending).toEqual({ kind: "unavailable", dispatched: true });
  expect(lost).toHaveBeenCalledTimes(1);
});
