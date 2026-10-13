import { describe, expect, it } from "vitest";
import { receiveSessionReceipt } from "../src/shared/meri-actions/session-receipt";

const now = Date.parse("2026-10-13T05:00:00.000Z");
const receipt = () => ({
  credential: `action_session_${"a".repeat(43)}`,
  expiresAtMs: now + 60_000,
  context: {
    tenantId: "synthetic-tenant",
    actorId: "native-user-id-not-clerk-subject",
    conversationId: "00000000-0000-4000-8000-000000000001",
    runId: "00000000-0000-4000-8000-000000000002",
    selectedClientId: "00000000-0000-4000-8000-000000000003",
  },
});

describe("Meri minimal server-selected session receipt", () => {
  it("returns detached frozen exact fields without inventing run authority", () => {
    const raw = receipt();
    const accepted = receiveSessionReceipt(JSON.stringify(raw), now);
    expect(accepted).toEqual(raw);
    expect(accepted).not.toBe(raw);
    expect(Object.keys(accepted).sort()).toEqual([
      "context",
      "credential",
      "expiresAtMs",
    ]);
    expect(Object.isFrozen(accepted)).toBe(true);
    expect(Object.isFrozen(accepted.context)).toBe(true);
    expect(() =>
      Object.assign(accepted.context, { actorId: "changed" }),
    ).toThrow();
    raw.context.actorId = "later caller edit";
    expect(accepted.context.actorId).toBe("native-user-id-not-clerk-subject");
  });
  it.each([1, 300_000])(
    "accepts future expiry at inclusive TTL boundary %i",
    (ttl) => {
      const value = { ...receipt(), expiresAtMs: now + ttl };
      expect(receiveSessionReceipt(JSON.stringify(value), now)).toEqual(value);
    },
  );
  it.each([-1, 0, 300_001])("refuses expired or excessive TTL %i", (ttl) => {
    expect(() =>
      receiveSessionReceipt(
        JSON.stringify({ ...receipt(), expiresAtMs: now + ttl }),
        now,
      ),
    ).toThrow();
  });
  it.each([NaN, Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1])(
    "refuses invalid supplied clock %s",
    (clock) =>
      expect(() =>
        receiveSessionReceipt(JSON.stringify(receipt()), clock),
      ).toThrow(),
  );
  it.each([null, "soon", 0, -1, now + 0.5, Number.MAX_SAFE_INTEGER + 1])(
    "refuses noncanonical expiry %s",
    (expiresAtMs) =>
      expect(() =>
        receiveSessionReceipt(
          JSON.stringify({ ...receipt(), expiresAtMs }),
          now,
        ),
      ).toThrow(),
  );
  it.each([
    "",
    "Bearer native-jwt",
    `action_session_${"a".repeat(42)}`,
    `action_session_${"a".repeat(44)}`,
    `action_session_${"a".repeat(42)}=`,
  ])("refuses noncanonical action credential %#", (credential) =>
    expect(() =>
      receiveSessionReceipt(JSON.stringify({ ...receipt(), credential }), now),
    ).toThrow(),
  );
  it("accepts the exact URL-safe opaque alphabet", () => {
    const value = {
      ...receipt(),
      credential: `action_session_A_-${"z".repeat(40)}`,
    };
    expect(receiveSessionReceipt(JSON.stringify(value), now).credential).toBe(
      value.credential,
    );
  });
  it.each(["credential", "expiresAtMs", "context"])(
    "refuses missing receipt field %s",
    (field) => {
      const value: Record<string, unknown> = receipt();
      delete value[field];
      expect(() => receiveSessionReceipt(JSON.stringify(value), now)).toThrow();
    },
  );
  it.each([
    "tenantId",
    "actorId",
    "conversationId",
    "runId",
    "selectedClientId",
  ])("refuses missing and empty context field %s", (field) => {
    const value = receipt();
    const context: Record<string, unknown> = value.context;
    delete context[field];
    expect(() => receiveSessionReceipt(JSON.stringify(value), now)).toThrow();
    context[field] = "";
    expect(() => receiveSessionReceipt(JSON.stringify(value), now)).toThrow();
  });
  it.each(["conversationId", "runId", "selectedClientId"])(
    "refuses malformed context UUID %s",
    (field) => {
      const value = receipt();
      Object.assign(value.context, { [field]: "caller-selected-label" });
      expect(() => receiveSessionReceipt(JSON.stringify(value), now)).toThrow();
    },
  );
  it.each([
    "binding",
    "attemptId",
    "workerId",
    "writerFence",
    "approved",
    "policyRevision",
  ])("refuses extra authority field %s at either level", (field) => {
    expect(() =>
      receiveSessionReceipt(
        JSON.stringify({ ...receipt(), [field]: true }),
        now,
      ),
    ).toThrow();
    const value = receipt();
    Object.assign(value.context, { [field]: true });
    expect(() => receiveSessionReceipt(JSON.stringify(value), now)).toThrow();
  });
  it.each(["{", "null", "[]", '{"error":{"code":"ACCESS_DENIED"}}'])(
    "never turns malformed JSON or the separate error contract into a session %#",
    (text) => expect(() => receiveSessionReceipt(text, now)).toThrow(),
  );
});
