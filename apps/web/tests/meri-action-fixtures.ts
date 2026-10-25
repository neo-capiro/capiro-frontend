import { fixture, context, clock } from "./meri-action-wire-fixtures";
export {
  fixture,
  archivedFixture,
  context,
  clock,
  canonicalSha256,
} from "./meri-action-wire-fixtures";

import { receiveActionResponse } from "@capiro/meri-contracts/action-application";
import { GovernedActionWorkflow } from "../src/shared/meri-actions/workflow-adapter";
import { actionTransport } from "../src/shared/meri-actions/workflow-transport";
import {
  receiveSessionReceipt,
  type ActionContext,
} from "../src/shared/meri-actions/session-receipt";
import type {
  ActionAttempt,
  ActionAttemptJournal,
} from "../src/shared/meri-actions/attempt-journal";
import type { WorkflowReply } from "../src/shared/meri-actions/workflow-port";

export function accepted<T>(reply: WorkflowReply<T>): T {
  if (!reply.ok) throw new Error(`Expected admitted fixture: ${reply.problem}`);
  return reply.value;
}
export function cell(): ActionAttemptJournal {
  let state: ActionAttempt = { status: "idle" };
  return {
    read: () => state,
    write: (value) => {
      state = value;
    },
  };
}
export function harness(
  journal = cell(),
  contextOverride: Partial<ActionContext> = {},
) {
  const queue: Array<string | (() => Promise<Response>)> = [];
  const requests: Array<{ url: string; init: RequestInit; body: unknown }> = [];
  let lost = 0,
    now = clock;
  const lifetime = new AbortController();
  const session = receiveSessionReceipt(
    JSON.stringify({
      credential: `action_session_${"a".repeat(43)}`,
      expiresAtMs: clock + 60_000,
      context: {
        tenantId: context.tenantId,
        actorId: context.actorId,
        conversationId: context.conversationId,
        runId: context.runId,
        selectedClientId: context.clientId,
        ...contextOverride,
      },
    }),
    clock,
  );
  const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
    requests.push({
      url: String(url),
      init: init!,
      body: JSON.parse(String(init?.body)),
    });
    const next = queue.shift();
    if (!next) throw new Error("Unexpected fixture request");
    if (typeof next === "function") return next();
    const f = fixture(next);
    return new Response(JSON.stringify(f.response), {
      status: f.httpStatus,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  const port = new GovernedActionWorkflow({
    session,
    transport: actionTransport(session.credential, lifetime.signal, fetcher),
    journal,
    onAccessLost: () => {
      lost++;
      lifetime.abort();
    },
    now: () => now,
  });
  return {
    port,
    requests,
    journal,
    session,
    queue,
    signal: () => new AbortController().signal,
    lost: () => lost,
    setNow: (value: number) => {
      now = value;
    },
    receive: async (name: string) => {
      const f = fixture(name);
      return receiveActionResponse(
        f.route,
        f.httpStatus,
        JSON.stringify(f.response),
      );
    },
  };
}
export async function prepared(
  h: ReturnType<typeof harness>,
  names = ["query", "draft", "prepare"],
) {
  h.queue.push(...names);
  const page = accepted(await h.port.query(h.signal()));
  const draft = accepted(
    await h.port.draft(
      page.items[0]!.selection,
      { title: context.task.title, dueDate: null },
      h.signal(),
    ),
  );
  const proposal = accepted(await h.port.prepare(draft.handle, h.signal()));
  return { page, draft, proposal };
}
