import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  beginMailAttempt,
  settleMailAttempt,
  mailAttemptKey,
  recoverMailAttempt,
} from "../src/features/portfolio/relationships/email/send-attempt";
import {
  MailSendError,
  type SendInput,
} from "../src/features/portfolio/relationships/email/send";

const values = new Map<string, string>();
const key = mailAttemptKey("tenant", "actor", "client", "contact");
const input = {
  clientId: "client",
  subject: "Private",
  bodyHtml: "Private body",
  to: [{ email: "private@example.test" }],
  appendSignature: false,
} as SendInput;
beforeEach(() => {
  values.clear();
  let queue = Promise.resolve();
  vi.stubGlobal("navigator", {
    locks: {
      request: (_key: string, run: () => unknown) => {
        const result = queue.then(run);
        queue = result.then(
          () => undefined,
          () => undefined,
        );
        return result;
      },
    },
  });
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => values.set(k, v),
    removeItem: (k: string) => values.delete(k),
  });
});
describe("single-mail durable browser identity", () => {
  it("two tabs reserve one identity and a fresh cache retains the uncertain send without storing content", async () => {
    const a = new QueryClient();
    const b = new QueryClient();
    const results = await Promise.allSettled([
      beginMailAttempt(a, key, input),
      beginMailAttempt(b, key, input),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    const token = (results[0] as PromiseFulfilledResult<string>).value;
    await settleMailAttempt(a, key, token, new MailSendError("unknown", true));
    await expect(
      beginMailAttempt(new QueryClient(), key, input),
    ).rejects.toMatchObject({ uncertain: true });
    const stored = [...values.values()].join("");
    expect(stored).toContain(token);
    expect(stored).not.toContain(input.bodyHtml);
    expect(stored).not.toContain(input.to[0]!.email);
  });
  it("a delayed old success or uncertain receipt never replaces a newer tab's durable request", async () => {
    const cache = new QueryClient();
    const token = await beginMailAttempt(cache, key, input);
    const storedKey = [...values.keys()][0]!;
    const newer = "55555555-5555-4555-8555-555555555555";
    values.set(storedKey, JSON.stringify({ token: newer }));
    for (const error of [undefined, new MailSendError("late unknown", true)]) {
      cache.setQueryData(key, { token, status: "pending" });
      await settleMailAttempt(cache, key, token, error);
      expect(values.get(storedKey)).toContain(newer);
    }
  });
  it("storage refusal makes zero send reservations", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("blocked");
      },
    });
    const cache = new QueryClient();
    await expect(beginMailAttempt(cache, key, input)).rejects.toMatchObject({
      uncertain: false,
    });
    expect(cache.getQueryData(key)).toBeUndefined();
  });
  it("recovered failed intent releases its identity while unknown and incomplete acceptance remain held", async () => {
    const cache = new QueryClient();
    const token = await beginMailAttempt(cache, key, input);
    for (const state of ["unknown", "pending", "sending", "accepted"]) {
      await recoverMailAttempt(cache, key, { requestKey: token, state });
      expect(cache.getQueryData(key)).toMatchObject({ token });
    }
    await recoverMailAttempt(cache, key, {
      requestKey: token,
      state: "failed",
    });
    expect(cache.getQueryData(key)).toBeNull();
    expect(values.size).toBe(0);
  });
});
