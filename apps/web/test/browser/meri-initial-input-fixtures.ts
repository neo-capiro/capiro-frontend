import { createHash } from "node:crypto";
import canonicalize from "canonicalize";
import type { Page, Route } from "@playwright/test";
import type { ConversationSubmitRequest } from "@capiro/meri-contracts/conversation-application";
import {
  binding,
  clientId,
  event,
  history,
  reply,
  runFor,
  scopes,
  sse,
  status,
} from "./meri-conversation-fixtures";
import { conversation, stored, turn } from "./meri-history-fixtures";

/** Synthetic owner only. No production consumer hashes, allocates or manufactures a receipt. */
const hash = (value: unknown) => {
  const text = canonicalize(value);
  if (typeof text !== "string")
    throw new Error("Synthetic canonical input required");
  return createHash("sha256").update(text).digest("hex");
};
const generalScopes: typeof scopes = [
  {
    tenantId: binding.tenantId,
    kind: "private-user",
    resourceId: binding.actorId,
    policyRevision: "policy1",
  },
];
const makeAllocation = (
  input: ConversationSubmitRequest,
  general: boolean,
) => ({
  binding,
  scopes: general ? generalScopes : scopes,
  versions: runFor().versions,
  selectedClientId: general ? null : clientId,
  requestId: input.requestId,
  inputSha256: hash(input),
  requestSha256: hash(stored(input.requestId, input.prompt)),
  allocatedAtMs: Date.now() - 1000,
  expiresAtMs: Date.now() + 60_000,
});

export async function installInitialInput(
  page: Page,
  running = false,
  general = false,
) {
  const selectedScopes = general ? generalScopes : scopes;
  const selectedRun = (...args: Parameters<typeof runFor>) => ({
    ...runFor(...args),
    scopes: selectedScopes,
  });
  const selectedConversation = { ...conversation, scopes: selectedScopes };
  const native: {
    input?: ConversationSubmitRequest;
    allocation?: ReturnType<typeof makeAllocation>;
    accepted: boolean;
    submitted: boolean;
  } = { accepted: false, submitted: false };
  const calls = {
    allocate: [] as string[],
    admit: [] as string[],
    submit: [] as string[],
    cancel: 0,
  };
  const events = () =>
    (native.submitted
      ? running
        ? [status(1, "queued"), status(2, "running")]
        : [
            status(1, "queued"),
            event(2, "Initial synthetic answer"),
            status(3, "completed"),
          ]
      : [status(1, "queued")]
    ).map((item) => ({ ...item, scopes: selectedScopes }));
  const state = () =>
    native.submitted
      ? running
        ? ("running" as const)
        : ("completed" as const)
      : ("queued" as const);
  const capture = (
    route: Route,
    kind: keyof Pick<typeof calls, "allocate" | "admit" | "submit">,
  ) => {
    const raw = route.request().postData()!;
    calls[kind].push(raw);
    return route.request().postDataJSON() as ConversationSubmitRequest;
  };
  const allocationResponse = (route: Route) => {
    const input = capture(route, "allocate"),
      created = !native.allocation;
    if (native.input && hash(input) !== hash(native.input))
      throw new Error("Synthetic allocation identity conflict");
    native.input ??= structuredClone(input);
    native.allocation ??= makeAllocation(input, general);
    return {
      allocation: native.allocation,
      state: native.accepted ? ("ACCEPTED" as const) : ("RESERVED" as const),
      created,
    };
  };
  const admissionResponse = (route: Route) => {
    const input = capture(route, "admit"),
      replayed = native.accepted;
    if (!native.allocation || hash(input) !== native.allocation.inputSha256)
      throw new Error("Synthetic allocation required");
    native.accepted = true;
    return {
      run: selectedRun(state()),
      request: stored(input.requestId, input.prompt),
      lastSequence: events().length,
      replayed,
    };
  };
  const submitResponse = (route: Route) => {
    const input = capture(route, "submit"),
      replayed = native.submitted;
    if (!native.accepted || hash(input) !== native.allocation!.inputSha256)
      throw new Error("Synthetic positive input required");
    native.submitted = true;
    return {
      run: selectedRun(replayed ? state() : "running"),
      requestId: input.requestId,
      lastSequence: events().length,
      replayed,
    };
  };
  await page.route("**/api/conversations/input/allocate", (route) =>
    reply(route, allocationResponse(route)),
  );
  await page.route("**/api/conversations/input/admit", (route) =>
    reply(route, admissionResponse(route)),
  );
  await page.route("**/api/conversations/submit", (route) =>
    reply(route, submitResponse(route)),
  );
  await page.route("**/api/conversations/history", (route) =>
    !native.accepted
      ? reply(route, { error: { code: "NOT_FOUND" } }, 404)
      : reply(route, {
          ...history(events(), {
            state: state(),
            prompt: native.input!.prompt,
          }),
          run: selectedRun(state()),
          request: stored(native.input!.requestId, native.input!.prompt),
        }),
  );
  await page.route("**/api/conversations/list", (route) =>
    reply(route, {
      schema: "meri.conversation-list/1",
      conversations: native.accepted ? [selectedConversation] : [],
      nextBefore: null,
    }),
  );
  await page.route("**/api/conversations/transcript", (route) => {
    if (!native.accepted)
      return reply(route, { error: { code: "CONVERSATION_NOT_FOUND" } }, 404);
    const input = route.request().postDataJSON();
    const all = events(),
      page = all
        .filter((item) => item.sequence > input.after)
        .slice(0, input.limit);
    const current = {
      ...turn(
        binding,
        native.input!.requestId,
        native.input!.prompt,
        0,
        all.length,
      ),
      run: selectedRun(state()),
    };
    return reply(route, {
      schema: "meri.conversation-transcript/1",
      conversation: selectedConversation,
      latestRun: current.run,
      latestSequenceBase: 0,
      turns: page.length ? [current] : [],
      events: page.map((event) => ({ sequence: event.sequence, event })),
      nextSequence: page.at(-1)?.sequence ?? input.after,
      lastSequence: all.length,
      hasMore: (page.at(-1)?.sequence ?? input.after) < all.length,
      pendingTurn: null,
    });
  });
  await page.route("**/api/conversations/events", (route) =>
    sse(route, events()),
  );
  await page.route(
    `**/api/conversations/events/${binding.conversationId}/stream`,
    (route) => {
      const after = Number(
        route.request().headers()["x-meri-resume-sequence"] ?? 0,
      );
      return sse(
        route,
        events().filter((item) => item.sequence > after),
      );
    },
  );
  await page.route("**/api/conversations/cancel", (route) => {
    calls.cancel++;
    return reply(route, { state: state() });
  });
  return {
    native,
    calls,
    allocationResponse,
    admissionResponse,
    submitResponse,
  };
}
