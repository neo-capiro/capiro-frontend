import { expect, it } from "vitest";
import {
  OUTREACH_START_NOT_CONFIRMED,
  OUTREACH_START_REFUSED,
  OUTREACH_START_SIGNED_OUT,
  startOutreachGeneration,
} from "../src/shared/meri-conversations/outreach-start";

// 2 Nov preview: when the frontend's own proxy refused the start (UNAUTHENTICATED, INVALID_REQUEST, or a gateway
// answer with outcome UNKNOWN), the outreach receiver rejected the envelope and the person saw the raw
// OUTREACH_GENERATION_WIRE_INVALID instead of a plain state.
const input = {
  generationJobId: "11111111-1111-4111-8111-111111111111",
  itemId: "22222222-2222-4222-8222-222222222222",
};
const answering =
  (status: number, body: unknown): typeof fetch =>
  async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
const start = (status: number, body: unknown) =>
  startOutreachGeneration(
    input,
    new AbortController().signal,
    answering(status, body),
  );

it("maps the proxy's own refusals to plain states, never a wire code", async () => {
  await expect(
    start(401, { error: { code: "UNAUTHENTICATED" } }),
  ).rejects.toThrow(OUTREACH_START_SIGNED_OUT);
  await expect(
    start(400, { error: { code: "INVALID_REQUEST" } }),
  ).rejects.toThrow(OUTREACH_START_REFUSED);
  for (const [status, body] of [
    [502, { error: { code: "PRODUCT_UNAVAILABLE", outcome: "UNKNOWN" } }],
    [503, { error: { code: "CONVERSATION_UNAVAILABLE" } }],
    [400, { error: { code: "INVALID_REQUEST", outcome: "UNKNOWN" } }],
    [202, { state: "requested" }],
    [500, "not an envelope"],
  ] as const)
    await expect(start(status, body), String(status)).rejects.toThrow(
      OUTREACH_START_NOT_CONFIRMED,
    );
});

it("keeps Core's own answers on their existing plain states", async () => {
  await expect(
    start(503, { error: { code: "OUTREACH_GENERATION_UNKNOWN" } }),
  ).rejects.toThrow(OUTREACH_START_NOT_CONFIRMED);
  await expect(
    start(400, { error: { code: "OUTREACH_GENERATION_REFUSED" } }),
  ).rejects.toThrow(OUTREACH_START_REFUSED);
  await expect(
    start(401, { error: { code: "SESSION_REFUSED" } }),
  ).rejects.toThrow(OUTREACH_START_REFUSED);
});

it("never shows a wire code", async () => {
  const error = await start(401, { error: { code: "UNAUTHENTICATED" } }).catch(
    (cause: Error) => cause,
  );
  expect(String(error)).not.toMatch(/WIRE_INVALID|UNAUTHENTICATED/);
});
