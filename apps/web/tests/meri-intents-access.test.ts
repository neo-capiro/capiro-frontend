import { readFileSync } from "node:fs";
import { expect, it, vi } from "vitest";
import { createIntentsAccess } from "../src/shared/meri-intents/access";

/** Wires recorded from the actual Meri intent owners (see fixtures/meri-intents/provenance.json). */
const wire = (name: string) =>
  JSON.parse(
    readFileSync(
      new URL(`./fixtures/meri-intents/${name}.json`, import.meta.url),
      "utf8",
    ),
  );
const credential = `action_session_${"a".repeat(43)}`;
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
function replay(...answers: Response[]) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetcher = vi.fn(
    async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      const next = answers.shift();
      if (!next) throw new Error("no answer");
      return next;
    },
  );
  return { fetcher: fetcher as unknown as typeof fetch, calls };
}
const live = () => new AbortController().signal;

it("lists through the same-origin route with the opaque session header and admits the actual answer", async () => {
  const listed = wire("listAwaiting");
  const { fetcher, calls } = replay(json(listed.httpStatus, listed.response));
  const reply = await createIntentsAccess(credential, live(), fetcher).list(
    listed.request,
    live(),
  );
  expect(reply.kind).toBe("ok");
  if (reply.kind !== "ok") return;
  expect(reply.value.intents[0]).toMatchObject({
    state: "prepared",
    kind: "proposal",
    phase: "awaiting_approval",
  });
  expect(calls[0]?.url).toBe("/api/conversations/intents/list");
  const headers = new Headers(calls[0]?.init.headers);
  expect(headers.get("X-Meri-Action-Session")).toBe(credential);
  expect(headers.has("authorization")).toBe(false);
  expect(calls[0]?.init).toMatchObject({
    method: "POST",
    credentials: "same-origin",
    redirect: "error",
    cache: "no-store",
  });
  expect(JSON.parse(String(calls[0]?.init.body))).toEqual(listed.request);
});

it("decides with exactly the retained request and admits executed, rejected and repeated answers", async () => {
  for (const name of [
    "decideExecuted",
    "decideRejected",
    "decideRepeat",
    "decideRecovered",
  ]) {
    const exchange = wire(name);
    const { fetcher, calls } = replay(
      json(exchange.httpStatus, exchange.response),
    );
    const reply = await createIntentsAccess(credential, live(), fetcher).decide(
      exchange.request,
      exchange.proposal,
      live(),
    );
    expect(reply.kind, name).toBe("ok");
    expect(JSON.parse(String(calls[0]?.init.body)), name).toEqual(
      exchange.request,
    );
  }
});

it("keeps UNKNOWN and definite refusals apart", async () => {
  const unknown = wire("decideUnknown"),
    expired = wire("decideExpired");
  const a = await createIntentsAccess(
    credential,
    live(),
    replay(json(unknown.httpStatus, unknown.response)).fetcher,
  ).decide(unknown.request, unknown.proposal, live());
  expect(a).toEqual({
    kind: "refused",
    status: 502,
    code: "APPROVAL_DECISION_UNKNOWN",
    outcome: "UNKNOWN",
    field: null,
  });
  const b = await createIntentsAccess(
    credential,
    live(),
    replay(json(expired.httpStatus, expired.response)).fetcher,
  ).decide(expired.request, expired.proposal, live());
  expect(b).toMatchObject({
    kind: "refused",
    status: 409,
    code: "INTENT_EXPIRED",
    outcome: "NOT_DISPATCHED",
  });
});

it("treats a decide answer that does not describe the request as possibly dispatched, never as a result", async () => {
  const executed = wire("decideExecuted");
  const tampered = structuredClone(executed.response);
  tampered.outcome.receipt.binding.conversationId =
    "00000000-0000-4000-8000-000000000999";
  const reply = await createIntentsAccess(
    credential,
    live(),
    replay(json(200, tampered)).fetcher,
  ).decide(executed.request, executed.proposal, live());
  expect(reply).toEqual({ kind: "unavailable", dispatched: true });
  const other = await createIntentsAccess(
    credential,
    live(),
    replay(json(200, executed.response)).fetcher,
  ).decide(
    { ...executed.request, decision: "rejected" },
    executed.proposal,
    live(),
  );
  expect(other).toEqual({ kind: "unavailable", dispatched: true });
});

it("separates the frontend adapter's own refusals (nothing sent) from a lost forward (maybe sent)", async () => {
  const executed = wire("decideExecuted");
  const access = (answer: Response) =>
    createIntentsAccess(credential, live(), replay(answer).fetcher);
  for (const status of [400, 401, 404, 405, 503])
    expect(
      await access(
        json(status, { error: { code: "FRONTEND_INTENTS_UNAVAILABLE" } }),
      ).decide(executed.request, executed.proposal, live()),
    ).toEqual({ kind: "unavailable", dispatched: false });
  expect(
    await access(
      json(502, { error: { code: "FRONTEND_INTENTS_UNAVAILABLE" } }),
    ).decide(executed.request, executed.proposal, live()),
  ).toEqual({ kind: "unavailable", dispatched: true });
  const failing = createIntentsAccess(credential, live(), (async () => {
    throw new TypeError("network");
  }) as unknown as typeof fetch);
  expect(
    await failing.decide(executed.request, executed.proposal, live()),
  ).toEqual({ kind: "unavailable", dispatched: true });
});

it("sends nothing after the session lifetime ended or for a request the contract refuses", async () => {
  const executed = wire("decideExecuted");
  const ended = new AbortController();
  ended.abort();
  const { fetcher, calls } = replay(json(200, executed.response));
  expect(
    await createIntentsAccess(credential, ended.signal, fetcher).decide(
      executed.request,
      executed.proposal,
      live(),
    ),
  ).toEqual({ kind: "unavailable", dispatched: false });
  expect(
    await createIntentsAccess(credential, live(), fetcher).decide(
      { ...executed.request, decision: "maybe" },
      executed.proposal,
      live(),
    ),
  ).toEqual({ kind: "unavailable", dispatched: false });
  expect(calls).toHaveLength(0);
});
