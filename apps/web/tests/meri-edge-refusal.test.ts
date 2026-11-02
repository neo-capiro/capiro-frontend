import { expect, it, vi } from "vitest";
import {
  createMeriConversation,
  ConversationUnavailable,
  EDGE_REFUSED,
} from "@capiro/meri-client/conversation";

const context = {
  tenantId: "synthetic-tenant",
  actorId: "synthetic-actor",
  conversationId: "20000000-0000-4000-8000-000000000002",
  runId: "30000000-0000-4000-8000-000000000003",
  selectedClientId: "10000000-0000-4000-8000-000000000001",
};
const request = {
  requestId: "40000000-0000-4000-8000-000000000004",
  prompt: "SELECT * FROM nothing; a message the edge dislikes",
};

/** One synthetic session whose answers are scripted per path; no real service is involved. */
function conversation(
  answer: (path: string) => Response,
  onAccessLost = vi.fn(),
) {
  const paths: string[] = [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
    const path = String(input);
    paths.push(path);
    return answer(path);
  }) as unknown as typeof fetch;
  const client = createMeriConversation({
    context,
    credential: `action_session_${"s".repeat(43)}`,
    expiresAtMs: Date.now() + 60_000,
    signal: new AbortController().signal,
    isCurrent: () => true,
    onAccessLost,
    fetchImpl,
  });
  return { client, paths, onAccessLost };
}
const html = () =>
  new Response("<html><body>Forbidden</body></html>", {
    status: 403,
    headers: { "content-type": "text/html" },
  });
const envelope = (code: string) =>
  new Response(JSON.stringify({ error: { code } }), {
    status: 403,
    headers: { "content-type": "application/json" },
  });
const rejection = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (cause) {
    return cause as ConversationUnavailable;
  }
  throw new Error("expected a rejection");
};

it("the edge's 403 on the input route refuses the request without revoking the session", async () => {
  const { client, paths, onAccessLost } = conversation(() => html());
  const cause = await rejection(client.submit(request));
  expect(cause).toBeInstanceOf(ConversationUnavailable);
  expect(cause.code).toBe(EDGE_REFUSED);
  expect(cause.status).toBe(403);
  expect(paths).toEqual(["/api/conversations/input/admit"]);
  expect(onAccessLost).not.toHaveBeenCalled();
  // The same request stays retained for the person's explicit retry; nothing was admitted.
  expect(client.getSnapshot().submit).toBe("unknown");
  const empty = conversation(() => new Response(null, { status: 403 }));
  expect((await rejection(empty.client.submit(request))).code).toBe(
    EDGE_REFUSED,
  );
  expect(empty.onAccessLost).not.toHaveBeenCalled();
});

it("control's own 403 envelope on the input route still revokes the session", async () => {
  const { client, onAccessLost } = conversation(() =>
    envelope("SESSION_REFUSED"),
  );
  const cause = await rejection(client.submit(request));
  expect(cause.code).not.toBe(EDGE_REFUSED);
  expect(onAccessLost).toHaveBeenCalledOnce();
  // A JSON body that is not control's envelope is still the edge's answer.
  const other = conversation(
    () =>
      new Response(JSON.stringify({ message: "blocked" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      }),
  );
  expect((await rejection(other.client.submit(request))).code).toBe(
    EDGE_REFUSED,
  );
  expect(other.onAccessLost).not.toHaveBeenCalled();
});

it("a 403 on any other route revokes as before, whatever its body", async () => {
  for (const answer of [html, () => envelope("SESSION_REFUSED")]) {
    const { client, paths, onAccessLost } = conversation(answer);
    const cause = await rejection(client.history({ after: 0, limit: 100 }));
    expect(cause).toBeInstanceOf(ConversationUnavailable);
    expect(cause.code).not.toBe(EDGE_REFUSED);
    expect(paths).toEqual(["/api/conversations/history"]);
    expect(onAccessLost).toHaveBeenCalledOnce();
  }
});
