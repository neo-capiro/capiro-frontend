import { installPlatform } from "./command-recovery-platform";
import { expect, it, vi } from "vitest";
import { createApiClient } from "../src/shared/portfolio/api/http";
import { bootstrapRoutineSession } from "../src/shared/meri-routines/session";

installPlatform();

const tenantId = "10000000-0000-4000-8000-000000000010";
const actorId = "10000000-0000-4000-8000-000000000011";
const clientId = "10000000-0000-4000-8000-000000000012";
const conversationId = "10000000-0000-4000-8000-000000000013";
const runId = "10000000-0000-4000-8000-000000000014";
const otherId = "10000000-0000-4000-8000-000000000015";
const credential = `action_session_${"s".repeat(43)}`;

function identity(tenant = tenantId, actor = actorId) {
  return createApiClient(
    vi.fn(async () =>
      Response.json({
        user: { id: actor, email: null },
        tenant: { id: tenant, name: "Synthetic" },
        role: "standard_user",
      }),
    ),
  );
}

it.each([clientId, null])(
  "cold routine connection resolves an exact conversation for scope %s before session issuance",
  async (selectedClientId) => {
    const owner = { tenantId, actorId, selectedClientId };
    const signal = new AbortController().signal;
    const resolveConversation = vi.fn(async () => conversationId);
    const fetcher = vi.fn<typeof fetch>(async (path, init) => {
      expect(path).toBe("/api/action-followthrough/session");
      expect(resolveConversation).toHaveBeenCalledOnce();
      const hints = JSON.parse(String(init?.body));
      // Native session issuance requires the resolved conversation in both scopes.
      if (hints.conversationId !== conversationId)
        return Response.json(
          { error: { code: "SESSION_REFUSED" } },
          { status: 401 },
        );
      expect(hints).toEqual({ clientId: selectedClientId, conversationId });
      return Response.json({
        credential,
        expiresAtMs: Date.now() + 60_000,
        context: { ...owner, conversationId, runId },
      });
    });
    const receipt = await bootstrapRoutineSession({
      api: identity(),
      owner,
      signal,
      resolveConversation,
      fetcher,
    });
    expect(receipt.context).toEqual({ ...owner, conversationId, runId });
    expect(resolveConversation).toHaveBeenCalledWith(signal);
    expect(fetcher).toHaveBeenCalledOnce();
  },
);

it.each([
  ["tenant", otherId, actorId],
  ["actor", tenantId, otherId],
])(
  "changed %s refuses before resolving or issuing a routine session",
  async (_field, tenant, actor) => {
    const resolveConversation = vi.fn(async () => conversationId);
    const fetcher = vi.fn<typeof fetch>(async () => {
      throw new Error("Session issuance must not start");
    });
    await expect(
      bootstrapRoutineSession({
        api: identity(tenant, actor),
        owner: { tenantId, actorId, selectedClientId: clientId },
        signal: new AbortController().signal,
        resolveConversation,
        fetcher,
      }),
    ).rejects.toThrow("Current routine account changed.");
    expect(resolveConversation).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  },
);
