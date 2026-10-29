import { expect, it } from "vitest";
import {
  defenseChangesOperations as operations,
  budgetChange,
  clientDefenseWatch,
} from "../src/shared/capiro/operations/defense-changes";
it("keeps fiscal-year and authority inputs within each real owner", () => {
  expect(
    operations["defenseChanges.congressional"].request.safeParse({
      params: { peCode: "synthetic" },
      query: { fy: 2027 },
    }).success,
  ).toBe(false);
  expect(
    operations["defenseChanges.attention"].request.safeParse({
      query: { fy: 1999, minScore: 0.4, limit: 100 },
    }).success,
  ).toBe(false);
  expect(
    operations["defenseChanges.monitored"].request.safeParse({
      params: { clientId: "10000000-0000-4000-8000-000000000001" },
      tenantId: "caller-controlled",
    }).success,
  ).toBe(false);
  expect(
    Object.values(operations).every((operation) => operation.method === "GET"),
  ).toBe(true);
});
it("retains decimal source amounts without conversion or invented unit", () => {
  const row = budgetChange.parse({
    id: "delta",
    peCode: "synthetic",
    assertedFy: 2027,
    deltaType: "mark_vs_request",
    fromRef: "request",
    toRef: "mark",
    amountFrom: "9007199254740993.12",
    amountTo: "0.00",
    deltaAbs: "-9007199254740993.12",
    deltaPct: -1,
    explanation: null,
    materialityScore: 1,
    computedAt: "synthetic",
    evidence: { internal: "not a public locator" },
  });
  expect(row.amountFrom).toBe("9007199254740993.12");
  expect(row.amountTo).toBe("0.00");
  expect(row).not.toHaveProperty("evidence");
});
it("receives only the watch presentation projection", () => {
  const clientId = "10000000-0000-4000-8000-000000000001";
  const row = clientDefenseWatch.parse({
    id: "watch",
    clientId,
    targetType: "pe",
    targetKey: "synthetic",
    clientReason: "Synthetic reason",
    createdAt: "synthetic",
    tenantId: "private",
    createdByUserId: "private",
    events: [
      {
        id: "event",
        clientId,
        watchId: "watch",
        eventType: "material_update",
        updateEventId: null,
        materialReason: "Source changed",
        createdAt: "synthetic",
        evidence: { private: true },
        actorUserId: "private",
      },
    ],
  });
  expect(row).not.toHaveProperty("tenantId");
  expect(row.events[0]).not.toHaveProperty("evidence");
  expect(row.events[0]).not.toHaveProperty("actorUserId");
});
