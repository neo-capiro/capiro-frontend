import { describe, expect, it } from "vitest";
import { integrationSchema } from "../../../shared/capiro/operations/settings-schemas";
import { assertRegistrationReceipt } from "./registration";

const submitted = Object.freeze({
  provider: "google_workspace" as const,
  accountEmail: "Synthetic@Example.Test",
  displayName: "  Synthetic account  ",
});
const receipt = {
  id: "10000000-0000-4000-8000-000000000001",
  provider: "google_workspace" as const,
  accountEmail: "synthetic@example.test",
  displayName: "Synthetic account",
  status: "needs_configuration" as const,
  scopes: [],
  lastSyncAt: null,
  lastError: null,
};

describe("registration receipt binding", () => {
  it("accepts Core's normalized email and display name for either supported provider", () => {
    for (const provider of ["google_workspace", "microsoft_365"] as const)
      expect(() =>
        assertRegistrationReceipt(
          { ...submitted, provider },
          integrationSchema.parse({ ...receipt, provider }),
        ),
      ).not.toThrow();
    expect(submitted.accountEmail).toBe("Synthetic@Example.Test");
    expect(submitted.displayName).toBe("  Synthetic account  ");
  });

  it.each([undefined, "", "   "])(
    "matches an omitted or blank display name to Core's null value: %s",
    (displayName) => {
      expect(() =>
        assertRegistrationReceipt(
          { ...submitted, displayName },
          integrationSchema.parse({ ...receipt, displayName: null }),
        ),
      ).not.toThrow();
    },
  );

  it.each([
    ["provider", { provider: "microsoft_365" }],
    ["email", { accountEmail: "another@example.test" }],
    ["missing email", { accountEmail: null }],
    ["display name", { displayName: "Another account" }],
    ["missing display name", { displayName: null }],
    ["connected state", { status: "connected" }],
    ["error state", { status: "error" }],
    ["disabled state", { status: "disabled" }],
  ] as const)(
    "rejects a schema-valid receipt with mismatched %s",
    (_, patch) => {
      // These pass the transport contract but cannot confirm the submitted registration.
      const result = integrationSchema.parse({ ...receipt, ...patch });
      expect(() => assertRegistrationReceipt(submitted, result)).toThrow(
        "The registration response did not match this account",
      );
    },
  );
});
