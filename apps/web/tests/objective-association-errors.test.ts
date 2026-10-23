import { describe, expect, it } from "vitest";
import { serviceErrorResponse } from "../src/shared/capiro/gateway-errors";
import { createCapiroApi, CapiroApiError } from "../src/shared/capiro/http";
import { objectiveOperationalOperations as operations } from "../src/shared/capiro/operations/objective-operational";
import { objectiveAssociationFailure } from "../src/shared/capiro/objective-association-errors";
import wire from "./objective-operational-contract-fixtures.json";

const requestId = "a1000000-0000-4000-8000-000000000008";
const failure = {
  schemaVersion: 1,
  status: 409,
  code: "ASSOCIATION_VERSION_CONFLICT",
  outcome: "rejected",
  requestId,
};
const operation = operations["objectives.operational.link"];
const signal = new AbortController().signal;

describe("Objective association native error boundary", () => {
  it("preserves only the canonical disposition through gateway and client", async () => {
    const native = Response.json(failure, { status: 409 });
    const response = await serviceErrorResponse(
      native,
      operation,
      signal,
      false,
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    const api = createCapiroApi(operations, { fetcher: async () => response });
    const command = operation.request.shape.body.parse(
      wire.examples.find((row) => row.type === "AssociationCommand")!.value,
    );
    try {
      await api.request("objectives.operational.link", {
        params: { clientId: command.clientId },
        body: command,
      });
      throw new Error("Expected rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(CapiroApiError);
      expect((error as CapiroApiError).associationFailure).toEqual(failure);
    }
  });
  it.each([
    ["HTTP status mismatch", failure, 400],
    ["wrong code", { ...failure, code: "OWNER_UNAVAILABLE" }, 409],
    [
      "untrusted message",
      { ...failure, message: "private provider exception" },
      409,
    ],
    ["false refusal", { ...failure, status: 404, code: "NOT_AVAILABLE" }, 404],
    ["malformed identity", { ...failure, requestId: "secret" }, 409],
  ])("drops %s", async (_label, payload, status) => {
    expect(
      objectiveAssociationFailure(operation, status, payload),
    ).toBeUndefined();
    const response = await serviceErrorResponse(
      Response.json(payload, { status }),
      operation,
      signal,
      false,
    );
    const body = await response.json();
    expect(body).not.toHaveProperty("requestId");
    expect(body).not.toHaveProperty("outcome");
    expect(JSON.stringify(body)).not.toContain("private provider");
  });
  it("keeps canonical unknown outcomes unknown", async () => {
    const unknown = {
      ...failure,
      status: 404,
      code: "RECEIPT_NOT_AVAILABLE",
      outcome: "unknown",
    };
    const response = await serviceErrorResponse(
      Response.json(unknown, { status: 404 }),
      operations["objectives.operational.receipt"],
      signal,
      false,
    );
    expect(await response.json()).toEqual(unknown);
  });
  it("drops oversized, other-operation, and public-capability responses", async () => {
    const cases = [
      {
        body: " ".repeat(4096) + JSON.stringify(failure),
        op: operation,
        public: false,
      },
      {
        body: JSON.stringify(failure),
        op: operations["objectives.operational.read"],
        public: false,
      },
      { body: JSON.stringify(failure), op: operation, public: true },
    ];
    for (const value of cases) {
      const response = await serviceErrorResponse(
        new Response(value.body, { status: 409 }),
        value.op,
        signal,
        value.public,
      );
      expect(await response.json()).not.toHaveProperty("requestId");
    }
  });
});
