import { describe, expect, it, vi } from "vitest";
import {
  receiveConversationHistoryRequest,
  receiveConversationHistoryResponse,
} from "@capiro/meri-contracts/conversation-history";
import {
  MANAGEMENT_VERSION,
  summarizeConversations,
  type ConversationHistoryManageRequest,
  type ConversationSummary,
} from "../src/shared/meri-conversations/history-client";
import {
  managementJournal,
  submitManagementChange,
} from "../src/shared/meri-conversations/management-journal";
import {
  pendingManagementScopes,
  syncMeriTabIdentity,
  clearMeriConversationScope,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";
import {
  conversationHistoryRoute,
  proxyConversationHistory,
} from "../src/shared/meri-conversations/history-proxy";
import { recentTitle } from "../src/shared/meri-conversations/recent-titles";
import { conversation } from "../test/browser/meri-history-fixtures";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const scope = {
  ...conversation.owner,
  clientId: conversation.scopes[0]!.resourceId,
  conversationId: conversation.conversationId,
};
const at = "2026-10-24T12:00:00.000Z";
const command: ConversationHistoryManageRequest = {
  version: MANAGEMENT_VERSION,
  requestId: id(1),
  conversationId: scope.conversationId,
  expectedRevision: "0",
  operation: "trash",
};
const row: ConversationSummary = {
  conversationId: scope.conversationId,
  title: "My chosen title",
  revision: "1",
  scopeKind: "client",
  clientId: scope.clientId,
  status: "active",
  updatedAt: at,
  archivedAt: null,
  trashedAt: null,
  restoreUntil: null,
  hasTranscript: true,
  canManage: true,
};
const receipt = () => ({
  version: MANAGEMENT_VERSION,
  requestId: command.requestId,
  conversation: {
    ...(({ hasTranscript, canManage, ...metadata }) => {
      void hasTranscript;
      void canManage;
      return metadata;
    })(row),
    status: "trashed",
    trashedAt: at,
    restoreUntil: "2026-11-23T12:00:00.000Z",
  },
});
const signal = () => new AbortController().signal;
const bytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value));
function storage() {
  const data = new Map<string, string>();
  const store: TabStorage = {
    get length() {
      return data.size;
    },
    key: (n) => [...data.keys()][n] ?? null,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
  syncMeriTabIdentity("verified-synthetic-account", store);
  return store;
}

describe("canonical management recovery", () => {
  it("retains exact command across lost reply/reload even after Trash removed its summary row", async () => {
    const store = storage(),
      journal = managementJournal(scope, store),
      calls: string[] = [];
    const lost = vi.fn(async (_url: unknown, init?: RequestInit) => {
      calls.push(new TextDecoder().decode(init!.body as Uint8Array));
      throw Error("lost ACK");
    });
    await expect(
      submitManagementChange(journal, scope.clientId, command, signal(), lost),
    ).rejects.toThrow();
    expect(pendingManagementScopes(scope, store)).toEqual([scope]);
    const reloaded = managementJournal(scope, store),
      retained = reloaded.read()!;
    const recovered = vi.fn(async (_url: unknown, init?: RequestInit) => {
      calls.push(new TextDecoder().decode(init!.body as Uint8Array));
      return Response.json(receipt());
    });
    await submitManagementChange(
      reloaded,
      scope.clientId,
      retained,
      signal(),
      recovered,
    );
    expect(calls[0]).toBe(calls[1]);
    expect(reloaded.read()).toBeUndefined();
    expect(pendingManagementScopes(scope, store)).toEqual([]);
  });
  it.each(["UNKNOWN", "RESULT_NOT_RELEASED"])(
    "keeps %s and denied replies recoverable, without a fresh command",
    async (outcome) => {
      const store = storage(),
        journal = managementJournal(scope, store);
      for (const response of [
        Response.json(
          { error: { code: "CONVERSATION_UNAVAILABLE", outcome } },
          { status: 503 },
        ),
        new Response("denied", { status: 403 }),
      ]) {
        await expect(
          submitManagementChange(
            journal,
            scope.clientId,
            command,
            signal(),
            vi.fn(async () => response),
          ),
        ).rejects.toThrow();
        expect(journal.read()).toEqual(command);
      }
    },
  );
  it("clears only definitive CAS refusal; correlation or scope mismatch never clears", async () => {
    const store = storage(),
      journal = managementJournal(scope, store);
    for (const value of [
      { ...receipt(), requestId: id(9) },
      {
        ...receipt(),
        conversation: { ...receipt().conversation, clientId: id(9) },
      },
    ]) {
      await expect(
        submitManagementChange(
          journal,
          scope.clientId,
          command,
          signal(),
          vi.fn(async () => Response.json(value)),
        ),
      ).rejects.toThrow();
      expect(journal.read()).toEqual(command);
    }
    await expect(
      submitManagementChange(
        journal,
        scope.clientId,
        command,
        signal(),
        vi.fn(async () =>
          Response.json(
            {
              error: {
                code: "CONVERSATION_MANAGEMENT_CONFLICT",
                outcome: "NOT_DISPATCHED",
              },
            },
            { status: 409 },
          ),
        ),
      ),
    ).rejects.toThrow();
    expect(journal.read()).toBeUndefined();
  });
  it("rejects scope-switched stored commands and invalidated identity before release", async () => {
    const store = storage(),
      journal = managementJournal(scope, store);
    expect(() =>
      journal.write({ ...command, conversationId: id(9) }),
    ).toThrow();
    await expect(
      submitManagementChange(
        journal,
        scope.clientId,
        command,
        signal(),
        vi.fn(async () => {
          clearMeriConversationScope(scope, store);
          return Response.json(receipt());
        }),
      ),
    ).rejects.toThrow();
    expect(pendingManagementScopes(scope, store)).toEqual([]);
    syncMeriTabIdentity("other-account", store);
    expect(() => journal.read()).toThrow();
  });
  it("clears only the canonical terminal Restore expiry, preserving unknown expiry-shaped replies", async () => {
    const store = storage(),
      journal = managementJournal(scope, store);
    const restore = { ...command, operation: "restore" as const };
    for (const outcome of ["UNKNOWN", "NOT_DISPATCHED"] as const) {
      await expect(
        submitManagementChange(
          journal,
          scope.clientId,
          restore,
          signal(),
          vi.fn(async () =>
            Response.json(
              { error: { code: "CONVERSATION_RESTORE_EXPIRED", outcome } },
              { status: 410 },
            ),
          ),
        ),
      ).rejects.toThrow();
      expect(journal.read()).toEqual(
        outcome === "UNKNOWN" ? restore : undefined,
      );
    }
  });
  it("does not dispatch when durable tab storage fails", async () => {
    const store = storage(),
      journal = managementJournal(scope, store);
    store.setItem = () => {
      throw Error("quota");
    };
    const fetcher = vi.fn();
    await expect(
      submitManagementChange(
        journal,
        scope.clientId,
        command,
        signal(),
        fetcher,
      ),
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not acknowledge journal retirement when storage silently retains the command", async () => {
    const store = storage(),
      journal = managementJournal(scope, store);
    store.removeItem = () => undefined;
    await expect(
      submitManagementChange(
        journal,
        scope.clientId,
        command,
        signal(),
        async () => Response.json(receipt()),
      ),
    ).rejects.toThrow();
    expect(journal.read()).toEqual(command);
  });
  it.each(["success", "conflict", "expired"])(
    "a late old %s cannot clear a newer unresolved command",
    async (outcome) => {
      const store = storage(),
        rowJournal = managementJournal(scope, store),
        recoveryJournal = managementJournal(scope, store),
        next = {
          ...command,
          requestId: id(2),
          expectedRevision: "1",
          operation: "restore" as const,
        };
      let release!: (response: Response) => void;
      const delayed = submitManagementChange(
        rowJournal,
        scope.clientId,
        command,
        signal(),
        async () =>
          new Promise<Response>((resolve) => {
            release = resolve;
          }),
      ).catch(() => undefined);
      await submitManagementChange(
        recoveryJournal,
        scope.clientId,
        command,
        signal(),
        async () => Response.json(receipt()),
      );
      expect(rowJournal.read()).toBeUndefined();
      await expect(
        submitManagementChange(
          recoveryJournal,
          scope.clientId,
          next,
          signal(),
          async () => {
            throw Error("new response lost");
          },
        ),
      ).rejects.toThrow();
      release(
        outcome === "success"
          ? Response.json(receipt())
          : Response.json(
              {
                error: {
                  code:
                    outcome === "conflict"
                      ? "CONVERSATION_MANAGEMENT_CONFLICT"
                      : "CONVERSATION_RESTORE_EXPIRED",
                  outcome: "NOT_DISPATCHED",
                },
              },
              { status: outcome === "conflict" ? 409 : 410 },
            ),
      );
      await delayed;
      expect(rowJournal.read()).toEqual(next);
    },
  );
  it("refuses a stale retry or changed same-ID payload before overwriting the pending intent", async () => {
    const store = storage(),
      journal = managementJournal(scope, store);
    const pending = {
      ...command,
      operation: "rename" as const,
      title: "Current title",
    };
    journal.write(pending);
    for (const stale of [
      command,
      { ...pending, title: "Old title" },
      { ...pending, expectedRevision: "9" },
    ]) {
      const fetcher = vi.fn();
      await expect(
        submitManagementChange(
          managementJournal(scope, store),
          scope.clientId,
          stale,
          signal(),
          fetcher,
        ),
      ).rejects.toThrow();
      expect(fetcher).not.toHaveBeenCalled();
      expect(journal.read()).toEqual(pending);
    }
  });
});

describe("fixed history transport and Recents titles", () => {
  it.each(["summaries", "manage"] as const)(
    "%s retains method/origin/server-credential and sign-in boundaries",
    async (route) => {
      const config = {
        enabled: true,
        baseUrl: "https://meri.example",
        frontendOrigin: "https://frontend.example",
      };
      for (const [method, origin, extra, token, status] of [
        ["GET", "https://frontend.example", {}, "native-user", 405],
        ["POST", "https://foreign.example", {}, "native-user", 400],
        [
          "POST",
          "https://frontend.example",
          { Authorization: "Bearer forged" },
          "native-user",
          400,
        ],
        ["POST", "https://frontend.example", {}, null, 401],
      ] as const) {
        const fetcher = vi.fn();
        const response = await proxyConversationHistory(
          new Request(`https://frontend.example/api/conversations/${route}`, {
            method,
            headers: {
              Origin: origin,
              "Content-Type": "application/json",
              ...extra,
            },
            ...(method === "POST" ? { body: JSON.stringify(command) } : {}),
          }),
          route,
          config,
          async () => token,
          fetcher,
        );
        expect(response.status).toBe(status);
        expect(fetcher).not.toHaveBeenCalled();
      }
    },
  );
  it("adds only the two fixed routes and preserves the closed old list response", async () => {
    expect(conversationHistoryRoute("summaries")).toBe("summaries");
    expect(conversationHistoryRoute("manage")).toBe("manage");
    for (const route of ["manage/", "manage?actor=x", "../manage"])
      expect(conversationHistoryRoute(route)).toBeUndefined();
    const admitted = receiveConversationHistoryRequest("list", bytes({})),
      old = {
        schema: "meri.conversation-list/1",
        conversations: [conversation],
        nextBefore: null,
      };
    expect(
      await receiveConversationHistoryResponse(
        "list",
        200,
        bytes(old),
        admitted,
      ),
    ).toEqual(old);
    await expect(
      receiveConversationHistoryResponse(
        "list",
        200,
        bytes({ ...old, metadata: [] }),
        admitted,
      ),
    ).rejects.toThrow();
  });
  it("a dispatched management timeout remains UNKNOWN through the same-origin proxy", async () => {
    const request = new Request(
      "https://frontend.example/api/conversations/manage",
      {
        method: "POST",
        headers: {
          Origin: "https://frontend.example",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      },
    );
    const fetcher = vi.fn(async () => {
      throw Error("response lost");
    });
    const response = await proxyConversationHistory(
      request,
      "manage",
      {
        enabled: true,
        baseUrl: "https://meri.example",
        frontendOrigin: "https://frontend.example",
      },
      async () => "synthetic-user",
      fetcher,
    );
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: { code: "PRODUCT_UNAVAILABLE", outcome: "UNKNOWN" },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("fetches one bounded summary, keeps scheduled/missing rows and never labels another scope", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        version: MANAGEMENT_VERSION,
        conversations: [row],
        nextBefore: null,
      }),
    );
    const result = await summarizeConversations(
      {
        version: MANAGEMENT_VERSION,
        status: "active",
        title: "",
        before: null,
      },
      signal(),
      fetcher,
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(recentTitle(conversation, result.conversations)).toBe(row.title);
    expect(
      recentTitle(conversation, [{ ...row, title: "Changed title" }]),
    ).toBe("Changed title");
    for (const summaries of [
      undefined,
      [],
      [{ ...row, clientId: id(9) }],
      [{ ...row, conversationId: id(9) }],
    ])
      expect(recentTitle(conversation, summaries)).toBeUndefined();
    const scheduled = { ...conversation, conversationId: id(8) };
    const discovery = [conversation, scheduled];
    expect(discovery.map((c) => recentTitle(c, result.conversations))).toEqual([
      row.title,
      undefined,
    ]);
    expect(discovery[1]).toBe(scheduled);
  });
  it("General labels require the actual actor private-user scope", () => {
    const general: typeof conversation = {
      ...conversation,
      scopes: [
        {
          ...conversation.scopes[0]!,
          kind: "private-user" as const,
          resourceId: conversation.owner.actorId,
        },
      ],
    };
    const title = { ...row, scopeKind: "general" as const, clientId: null };
    expect(recentTitle(general, [title])).toBe(row.title);
    expect(
      recentTitle(
        { ...general, owner: { ...general.owner, actorId: "another-actor" } },
        [title],
      ),
    ).toBeUndefined();
  });
});
