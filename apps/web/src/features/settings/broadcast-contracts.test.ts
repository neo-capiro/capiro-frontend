import { describe, expect, it } from "vitest";
import { broadcastOperations } from "../../shared/capiro/operations/settings-admin/broadcasts";
describe("Core recipient fixed operation contracts", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const pending = broadcastOperations["me.broadcasts.pending"];
  const ack = broadcastOperations["me.broadcasts.acknowledge"];
  const row = {
    id,
    title: "Synthetic",
    body: "Plain text",
    createdAt: "2026-10-24T12:00:00Z",
  };
  it("bounds pending reads to the canonical server batch and accepts no tenant override", () => {
    expect(pending.path).toBe("/me/broadcasts/pending");
    expect(
      pending.response.safeParse(Array.from({ length: 100 }, () => row))
        .success,
    ).toBe(true);
    expect(
      pending.response.safeParse(Array.from({ length: 101 }, () => row))
        .success,
    ).toBe(false);
    expect(pending.request.safeParse({ tenantId: id }).success).toBe(false);
    expect(pending.request.safeParse({}).success).toBe(true);
  });
  it("acknowledges only a fixed recipient route and requires the persisted exact-target receipt fields", () => {
    expect(ack.path).toBe("/me/broadcasts/:id/acknowledge");
    expect(ack.request.safeParse({ params: { id } }).success).toBe(true);
    expect(
      ack.request.safeParse({ params: { id, tenantId: id } }).success,
    ).toBe(false);
    expect(ack.response.safeParse({ ok: true }).success).toBe(false);
    expect(
      ack.response.safeParse({
        ok: true,
        broadcastId: id,
        acknowledgedAt: row.createdAt,
      }).success,
    ).toBe(true);
  });
});
