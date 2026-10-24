import { expect, it } from "vitest";
import { settingsOperations } from "./settings";
import {
  integrationSchema,
  integrationSyncResponseSchema,
} from "./settings-schemas";

it("binds Microsoft subscriptions to one connection and drops secret Graph details", () => {
  const operation =
    settingsOperations["settings.integrations.configureMicrosoftSubscriptions"];
  const connectionId = "40000000-0000-4000-8000-000000000001";
  expect(operation.request.parse({ params: { connectionId } })).toEqual({
    params: { connectionId },
  });
  expect(
    operation.request.safeParse({
      params: { connectionId },
      body: { tenantId: "untrusted-tenant" },
    }).success,
  ).toBe(false);
  expect(
    operation.response.parse({
      configured: true,
      subscriptions: [{ clientState: "server-only-secret" }],
    }),
  ).toEqual({ configured: true });
});

it("accepts existing connection responses without inventing verified grants or health", () => {
  const connection = integrationSchema.parse({
    id: "synthetic",
    provider: "google_workspace",
    accountEmail: null,
    displayName: null,
    status: "connected",
    scopes: ["requested"],
    lastSyncAt: null,
    lastError: null,
  });
  expect(connection.permissions).toBeUndefined();
  expect(connection.health).toBeUndefined();
  expect(connection.mailCoverage).toBeUndefined();
});

it("preserves per-resource failures and bounded continuation in additive health", () => {
  const health = {
    attemptedAt: "2026-10-24T12:00:00Z",
    lastSuccessAt: null,
    lastCompleteAt: null,
    outcome: "failed",
    hasMore: true,
    failed: 0,
  };
  expect(
    integrationSyncResponseSchema.parse({
      connectionId: "synthetic",
      health: { mail: health },
      privateToken: "never-retained",
    }),
  ).toEqual({ connectionId: "synthetic", health: { mail: health } });
});

it("preserves the actual Google revoke outcome without implying provider success", () => {
  const response =
    settingsOperations["settings.integrations.disconnectGoogle"].response;
  expect(
    response.parse({
      disconnected: true,
      connectionId: "synthetic",
      providerRevocation: "unconfirmed",
    }).providerRevocation,
  ).toBe("unconfirmed");
  expect(
    response.parse({ disconnected: true, connectionId: "synthetic" })
      .providerRevocation,
  ).toBeUndefined();
});

it("retains held record counts so a batch cannot be presented as complete", () => {
  expect(
    integrationSyncResponseSchema.parse({
      connectionId: "synthetic",
      mail: {
        inbox: {
          scanned: 1,
          matched: 0,
          skipped: 0,
          removed: 0,
          failed: 0,
          held: 1,
          pages: 1,
          hasMore: false,
        },
      },
    }).mail?.inbox?.held,
  ).toBe(1);
});
