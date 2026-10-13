import { afterEach, describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "../src/shared/portfolio/api/http";
import {
  MailSendError,
  type SendInput,
} from "../src/features/portfolio/relationships/email/send";
import {
  beginMailAttempt,
  mailAttemptKey,
  settleMailAttempt,
} from "../src/features/portfolio/relationships/email/send-attempt";
import {
  beginContactCreate,
  contactCreateAttemptKey,
  settleContactCreate,
} from "../src/features/portfolio/relationships/contact-create-attempt";

const caches: QueryClient[] = [];
function scope() {
  const cache = new QueryClient();
  caches.push(cache);
  return cache;
}
afterEach(() => caches.splice(0).forEach((cache) => cache.clear()));
const input: SendInput = {
  clientId: "10000000-0000-4000-8000-000000000001",
  to: [{ email: "synthetic@example.test" }],
  subject: "Synthetic retained intent",
  bodyHtml: "<p>Synthetic</p>",
  appendSignature: false,
};
const change = {
  kind: "save" as const,
  body: {
    name: "Synthetic contact",
    title: "",
    email: null,
    phone: "",
    role: "",
    notes: "",
  },
};

describe("mail send scope survives presentation disposal", () => {
  it("reserves synchronously and retains submitted input rather than later mutable draft", () => {
    const cache = scope();
    const key = mailAttemptKey("tenant", "actor", input.clientId, "person:one");
    const draft = structuredClone(input);
    beginMailAttempt(cache, key, draft);
    draft.subject = "Later draft";
    expect(cache.getQueryData(key)).toMatchObject({
      status: "pending",
      input: { subject: input.subject },
    });
    expect(() => beginMailAttempt(cache, key, draft)).toThrow(/pending/);
  });
  it("retains uncertainty through observer replacement and unrelated successful reads", () => {
    const cache = scope();
    const key = mailAttemptKey("tenant", "actor", input.clientId, "person:one");
    const token = beginMailAttempt(cache, key, input);
    settleMailAttempt(
      cache,
      key,
      token,
      new MailSendError("No delivery receipt", true),
    );
    cache.setQueryData(["contact-mail", input.clientId], []);
    expect(() => beginMailAttempt(cache, [...key], input)).toThrow(/uncertain/);
    expect(cache.getQueryData(key)).toMatchObject({ status: "unknown" });
  });
  it("releases only verified success or definite rejection for another deliberate attempt", () => {
    const cache = scope();
    const key = mailAttemptKey("tenant", "actor", input.clientId, "person:one");
    let token = beginMailAttempt(cache, key, input);
    settleMailAttempt(
      cache,
      key,
      token,
      new MailSendError("Preflight refused", false),
    );
    expect(cache.getQueryData(key)).toBeNull();
    token = beginMailAttempt(cache, key, input);
    settleMailAttempt(cache, key, token);
    expect(cache.getQueryData(key)).toBeNull();
  });
  it("does not revive a cleared scope or settle a newer attempt", () => {
    const cache = scope();
    const key = mailAttemptKey("tenant", "actor", input.clientId, "person:one");
    const old = beginMailAttempt(cache, key, input);
    cache.clear();
    settleMailAttempt(cache, key, old, new MailSendError("Late", true));
    expect(cache.getQueryData(key)).toBeUndefined();
    const current = beginMailAttempt(cache, key, input);
    settleMailAttempt(cache, key, old);
    expect(cache.getQueryData(key)).toMatchObject({
      token: current,
      status: "pending",
    });
  });
  it.each([
    ["other-tenant", "actor", input.clientId, "person:one"],
    ["tenant", "other-actor", input.clientId, "person:one"],
    ["tenant", "actor", "other-client", "person:one"],
    ["tenant", "actor", input.clientId, "thread:two"],
  ])(
    "does not borrow another scope's attempt: %s/%s/%s/%s",
    (tenant, actor, client, entity) => {
      const cache = scope();
      beginMailAttempt(
        cache,
        mailAttemptKey("tenant", "actor", input.clientId, "person:one"),
        input,
      );
      expect(() =>
        beginMailAttempt(
          cache,
          mailAttemptKey(tenant, actor, client, entity),
          input,
        ),
      ).not.toThrow();
    },
  );
});

describe("contact create scope survives stale drawer disposal", () => {
  it("blocks pending and uncertain create after successful roster readback", () => {
    const cache = scope();
    const key = contactCreateAttemptKey("tenant", "actor", input.clientId);
    const token = beginContactCreate(cache, key, change);
    expect(() => beginContactCreate(cache, [...key], change)).toThrow(
      /pending/,
    );
    settleContactCreate(cache, key, token, new ApiError(503, "Unknown create"));
    cache.setQueryData(["client-people", input.clientId], []);
    expect(cache.getQueryData(key)).toMatchObject({
      status: "unknown",
      change,
    });
    expect(() => beginContactCreate(cache, key, change)).toThrow(
      /may have completed/,
    );
  });
  it("keeps definite rejection editable and verified success available for a new contact", () => {
    const cache = scope();
    const key = contactCreateAttemptKey("tenant", "actor", input.clientId);
    const rejected = beginContactCreate(cache, key, change);
    settleContactCreate(
      cache,
      key,
      rejected,
      new ApiError(409, "Review input"),
    );
    expect(cache.getQueryData(key)).toBeNull();
    const accepted = beginContactCreate(cache, key, change);
    settleContactCreate(cache, key, accepted);
    expect(cache.getQueryData(key)).toBeNull();
  });
  it("keeps malformed or transport-loss receipts uncertain", () => {
    const cache = scope();
    const key = contactCreateAttemptKey("tenant", "actor", input.clientId);
    const token = beginContactCreate(cache, key, change);
    settleContactCreate(cache, key, token, new Error("Connection lost"));
    expect(cache.getQueryData(key)).toMatchObject({ status: "unknown" });
  });
  it("ignores settlement after cache clearing and after a replacement token", () => {
    const cache = scope();
    const key = contactCreateAttemptKey("tenant", "actor", input.clientId);
    const old = beginContactCreate(cache, key, change);
    cache.clear();
    settleContactCreate(cache, key, old, new ApiError(503, "Late"));
    expect(cache.getQueryData(key)).toBeUndefined();
    const current = beginContactCreate(cache, key, change);
    settleContactCreate(cache, key, old);
    expect(cache.getQueryData(key)).toMatchObject({
      token: current,
      status: "pending",
    });
  });
});
