import { installPlatform } from "./command-recovery-platform";
import { expect, it, vi } from "vitest";
import { createApiClient } from "../src/shared/portfolio/api/http";
import {
  bootstrapRoutineSession,
  bootstrapRoutineManagementSession,
} from "../src/shared/meri-routines/session";

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
  "explicit routine execution connection resolves an exact conversation for scope %s before session issuance",
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

it.each([clientId, null])(
  "cold management issues only explicit scope %s with no conversation or model request",
  async (selectedClientId) => {
    const owner = { tenantId, actorId, selectedClientId },
      at = Date.now(),
      fetcher = vi.fn<typeof fetch>(async (path, init) => {
        expect(path).toBe("/api/action-followthrough/routine-session");
        expect(JSON.parse(String(init?.body))).toEqual({
          clientId: selectedClientId,
        });
        return Response.json({
          kind: "routine-management",
          credential: `routine_session_${"m".repeat(43)}`,
          expiresAtMs: at + 30_000,
          context: owner,
        });
      });
    const receipt = await bootstrapRoutineManagementSession({
      api: identity(),
      owner,
      signal: new AbortController().signal,
      fetcher,
      now: () => at,
    });
    expect(receipt.context).toEqual(owner);
    expect(receipt.kind).toBe("routine-management");
    expect(fetcher).toHaveBeenCalledOnce();
    expect(receipt.context).not.toHaveProperty("conversationId");
  },
);

it.each(["scope", "actor", "expired", "execution"])(
  "management refuses a substituted %s receipt",
  async (changed) => {
    const owner = { tenantId, actorId, selectedClientId: clientId },
      at = Date.now(),
      value: Record<string, unknown> = {
        kind: "routine-management",
        credential: `routine_session_${"m".repeat(43)}`,
        expiresAtMs: at + 30_000,
        context: { ...owner },
      };
    if (changed === "scope")
      value.context = { ...owner, selectedClientId: otherId };
    if (changed === "actor") value.context = { ...owner, actorId: otherId };
    if (changed === "expired") value.expiresAtMs = at;
    if (changed === "execution")
      value.context = { ...owner, conversationId, runId };
    await expect(
      bootstrapRoutineManagementSession({
        api: identity(),
        owner,
        signal: new AbortController().signal,
        fetcher: vi.fn(async () => Response.json(value)),
        now: () => at,
      }),
    ).rejects.toThrow();
  },
);

it("changed current identity refuses management before any bootstrap request", async () => {
  const fetcher = vi.fn<typeof fetch>();
  await expect(
    bootstrapRoutineManagementSession({
      api: identity(otherId),
      owner: { tenantId, actorId, selectedClientId: null },
      signal: new AbortController().signal,
      fetcher,
    }),
  ).rejects.toThrow("Current routine account changed.");
  expect(fetcher).not.toHaveBeenCalled();
});

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
