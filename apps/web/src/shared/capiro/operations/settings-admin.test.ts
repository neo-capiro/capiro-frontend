import { expect, it } from "vitest";
import { settingsAdminOperations as operations } from "./settings-admin";

const id = "f4a682fc-c378-4cc5-9a0e-4f75f94d0a51";

it("keeps exact correction values as strings and accepts the backend pending-approval receipt", () => {
  const operation = operations["settings.analyst.reconciliation.resolve"];
  const input = operation.request.parse({
    params: { id },
    body: {
      decision: "manual_value",
      manualValue: "12345678901234567890.123456789",
    },
  });
  expect(input.body.manualValue).toBe("12345678901234567890.123456789");
  expect(
    operation.request.safeParse({
      params: { id },
      body: { decision: "manual_value", manualValue: 1.25 },
    }).success,
  ).toBe(false);
  expect(
    operation.request.safeParse({
      params: { id },
      body: { decision: "manual_value" },
    }).success,
  ).toBe(false);
  const result = operation.response.parse({
    resolved: false,
    pendingApproval: true,
    id,
    decision: "manual_value",
    peCode: "0604134A",
    fy: 2027,
    fieldName: "enacted",
    proposedValue: "1.25",
    proposedOverrideId: id,
  });
  expect(result.resolved).toBe(false);
  expect(result.pendingApproval).toBe(true);
});

it("binds mapping identity to the path and refuses actor/tenant authority in its body", () => {
  const operation = operations["settings.mappings.confirmIndividual"];
  expect(
    operation.request.safeParse({
      params: { mappingId: id },
      body: { confirmed: true, relationshipType: "self", rollUpAwards: true },
    }).success,
  ).toBe(true);
  for (const field of ["id", "mappingId", "tenantId", "actorUserId"]) {
    expect(
      operation.request.safeParse({
        params: { mappingId: id },
        body: { confirmed: true, [field]: id },
      }).success,
    ).toBe(false);
  }
});

it("requires a current credential readback and accepts only the supported model action", () => {
  const operation = operations["settings.hq.ai.updateModel"];
  const base = {
    params: { tenantId: id },
    body: {
      provider: "openai",
      expectedModelOverride: null,
      expectedUpdatedAt: "2026-10-11T22:00:00.000Z",
    },
  };
  expect(
    operation.request.safeParse({
      ...base,
      body: { ...base.body, restoreDefault: true },
    }).success,
  ).toBe(true);
  expect(
    operation.request.safeParse({
      ...base,
      body: { ...base.body, modelOverride: "gpt-6.1-sol" },
    }).success,
  ).toBe(true);
  expect(operation.request.safeParse(base).success).toBe(false);
  expect(
    operation.request.safeParse({
      ...base,
      body: {
        ...base.body,
        restoreDefault: true,
        modelOverride: "gpt-6.1-sol",
      },
    }).success,
  ).toBe(false);
});

it("preserves source-specific search envelopes and never turns CAGE into a supported match", () => {
  const result = operations[
    "settings.mappings.searchContractors"
  ].response.parse({
    results: [],
    unsupportedIdentifier: "Catalog carries UEI but no CAGE",
  });
  expect(result.results).toEqual([]);
  expect(result.unsupportedIdentifier).toContain("no CAGE");
  expect(
    operations["settings.hq.customers.comp"].response.parse({
      status: "comped",
    }),
  ).toEqual({ status: "comped" });
  expect(
    operations["settings.hq.customers.comp"].response.safeParse({
      status: "active",
    }).success,
  ).toBe(false);
});
