import { describe, expect, it } from "vitest";
import { requireBroadcastAcknowledgment } from "./broadcast-receipt";
describe("Recipient acknowledgment", () => {
  const receipt = {
    ok: true,
    broadcastId: "reviewed",
    acknowledgedAt: "2026-10-24T15:00:00.000Z",
  };
  it("accepts the exact persisted acknowledgment, including an idempotent duplicate", () => {
    expect(() =>
      requireBroadcastAcknowledgment("reviewed", receipt),
    ).not.toThrow();
    expect(() =>
      requireBroadcastAcknowledgment("reviewed", receipt),
    ).not.toThrow();
  });
  it.each([
    null,
    {},
    { ok: true },
    { ...receipt, broadcastId: "other" },
    { ...receipt, acknowledgedAt: null },
    { ...receipt, acknowledgedAt: "invalid" },
    { ...receipt, ok: false },
  ])("refuses a missing, wrong-target or malformed receipt %#", (value) => {
    expect(() => requireBroadcastAcknowledgment("reviewed", value)).toThrow(
      "not confirmed",
    );
  });
});
