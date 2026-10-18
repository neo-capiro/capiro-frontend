import { expect, it } from "vitest";
import { settingsOperations } from "./settings";

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
