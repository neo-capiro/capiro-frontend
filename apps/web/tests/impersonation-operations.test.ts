import { describe, expect, it } from "vitest";
import {
  impersonationOperations,
  startImpersonationSchema,
} from "../src/shared/capiro/operations/settings-admin/impersonation";
import { coreSessionAuthentication } from "../src/shared/preview/core-session-authentication";
const id = "10000000-0000-4000-8000-000000000001";
describe("audited support operation contracts", () => {
  it("requires immutable start identity and a recorded reason; refuses browser authority fields", () => {
    const input = {
      requestId: id,
      tenantId: id,
      reason: "Synthetic support reason",
    };
    expect(startImpersonationSchema.safeParse(input).success).toBe(true);
    expect(
      startImpersonationSchema.safeParse({ ...input, reason: "short" }).success,
    ).toBe(false);
    expect(
      startImpersonationSchema.safeParse({ ...input, actorId: id }).success,
    ).toBe(false);
    expect(
      startImpersonationSchema.safeParse({ tenantId: id, reason: input.reason })
        .success,
    ).toBe(false);
  });
  it("exit requires an exact session and workspace cannot accept a target-tenant override", () => {
    expect(
      impersonationOperations[
        "settings.hq.impersonation.end"
      ].request.safeParse({ body: {} }).success,
    ).toBe(false);
    expect(
      impersonationOperations[
        "settings.hq.impersonation.workspace"
      ].request.safeParse({
        params: { sessionId: id },
        query: { tenantId: id },
      }).success,
    ).toBe(false);
  });
  it.each(Object.values(impersonationOperations))(
    "uses the native session for $method $path on every Core host",
    (operation) => {
      const path = operation.path.replace(":sessionId", id);
      expect(
        coreSessionAuthentication(
          "core",
          "https://core.example.invalid/api",
          operation.method,
          path,
        ),
      ).toBe("clerk-session");
      expect(
        coreSessionAuthentication(
          "strategy",
          "https://core.example.invalid/api",
          operation.method,
          path,
        ),
      ).toBeUndefined();
    },
  );
});
