/**
 * Contract tests for the procurement.observedActionDetails receiver.
 * TDD: positive (GREEN) then negative (schema rejection) verticals.
 */
import { describe, expect, it } from "vitest";
import {
  procurementObservedActionDetailsScope,
  observedActionDetailSchema,
  procurementObservedMoneyFlowBase,
  procurementObservedActionDetailsResponse,
  procurementObservedOperations,
} from "../src/shared/capiro/operations/procurement-observed";
import {
  procurementMoneyFlow,
  procurementScope,
  procurementOperations as mfOperations,
} from "../src/shared/capiro/operations/procurement-money-flow";
import { procurementActionDetailsResponse } from "../src/shared/capiro/operations/procurement-action-details";
import { procurementOperations } from "../src/shared/capiro/operations/procurement";
import {
  syntheticObservedFlow,
  syntheticObservedFlowNoDetails,
  syntheticObservedDetailNullLabel,
  syntheticObservedDetailOlderLabel,
} from "./fixtures/procurement-observed-synthetic";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function expectInvalid(
  schema: { safeParse: (v: unknown) => { success: boolean } },
  value: unknown,
) {
  expect(() => schema.safeParse(value)).not.toThrow();
  expect(schema.safeParse(value).success).toBe(false);
}

// ---------------------------------------------------------------------------
// 1. POSITIVE: synthetic fixture must parse
// ---------------------------------------------------------------------------
describe("positive synthetic fixture", () => {
  it("parses a minimal valid observed response with actionDetails", () => {
    const result = procurementObservedActionDetailsResponse.safeParse(
      syntheticObservedFlow(),
    );
    if (!result.success) {
      console.error(
        "Parse errors:",
        JSON.stringify(result.error.issues, null, 2),
      );
    }
    expect(result.success).toBe(true);
    expect(result.data?.actionDetails).toHaveLength(1);
  });

  it("parses a valid observed response without actionDetails (base only)", () => {
    const result = procurementObservedMoneyFlowBase.safeParse(
      syntheticObservedFlowNoDetails(),
    );
    expect(result.success).toBe(true);
  });

  it("accepts sourceRevisionLabel as null (label not reported by publisher)", () => {
    const result = procurementObservedActionDetailsResponse.safeParse(
      syntheticObservedDetailNullLabel(),
    );
    expect(result.success).toBe(true);
    expect(result.data?.actionDetails[0]?.sourceRevisionLabel).toBeNull();
  });

  it("accepts an older-looking publisher label string with a later retrieval clock (no ordering enforced)", () => {
    const result = procurementObservedActionDetailsResponse.safeParse(
      syntheticObservedDetailOlderLabel(),
    );
    expect(result.success).toBe(true);
    // Label is retained verbatim, not parsed or reordered
    expect(result.data?.actionDetails[0]?.sourceRevisionLabel).toBe(
      "2020-01-01",
    );
  });

  it.each(["x".repeat(257), "bad\nlabel", "bad\u007flabel"])(
    "rejects a publisher label outside the producer contract: %j",
    (sourceRevisionLabel) => {
      const base = syntheticObservedFlow();
      expectInvalid(procurementObservedActionDetailsResponse, {
        ...base,
        actionDetails: base.actionDetails.map((d) => ({
          ...d,
          sourceRevisionLabel,
        })),
      });
    },
  );

  it("accepts arbitrary non-UTC label strings verbatim", () => {
    const base = syntheticObservedFlow();
    const modified = {
      ...base,
      actionDetails: base.actionDetails.map((d) => ({
        ...d,
        sourceRevisionLabel: "some-vendor-internal-label-v42",
      })),
    };
    expect(
      procurementObservedActionDetailsResponse.safeParse(modified).success,
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. REQUEST SCHEMA: sourceThrough must be rejected
// ---------------------------------------------------------------------------
describe("request schema rejects sourceThrough", () => {
  it("rejects a request that includes sourceThrough (valid UTC string)", () => {
    expectInvalid(procurementObservedActionDetailsScope, {
      awardIdentityKeys: [
        "usaspending|award|CONT_AWD_OBSERVED01_9700_-NONE-_-NONE-",
      ],
      revisionBasis: "latest_observed",
      includeActionDetails: true,
      sourceThrough: "2026-11-01T00:00:00.000000Z",
    });
  });

  it("rejects a request that omits includeActionDetails", () => {
    expectInvalid(procurementObservedActionDetailsScope, {
      awardIdentityKeys: [
        "usaspending|award|CONT_AWD_OBSERVED01_9700_-NONE-_-NONE-",
      ],
      revisionBasis: "latest_observed",
    });
  });

  it("rejects a request with wrong revisionBasis", () => {
    expectInvalid(procurementObservedActionDetailsScope, {
      awardIdentityKeys: [
        "usaspending|award|CONT_AWD_OBSERVED01_9700_-NONE-_-NONE-",
      ],
      revisionBasis: "qualified_observed",
      includeActionDetails: true,
    });
  });

  it("accepts a valid minimal observed scope request", () => {
    expect(
      procurementObservedActionDetailsScope.safeParse({
        awardIdentityKeys: [
          "usaspending|award|CONT_AWD_OBSERVED01_9700_-NONE-_-NONE-",
        ],
        revisionBasis: "latest_observed",
        includeActionDetails: true,
      }).success,
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. RESPONSE SCHEMA: must reject old-contract fields
// ---------------------------------------------------------------------------
describe("response schema strict separation from old contracts", () => {
  it("rejects a response that has sourceRevisionOrder (old field) in actionDetails", () => {
    const base = syntheticObservedFlow();
    const invalid = {
      ...base,
      actionDetails: base.actionDetails.map((d) => ({
        ...d,
        sourceRevisionLabel: "2026-10-14",
        sourceRevisionOrder: "2026-10-14T00:00:00.000000Z",
      })),
    };
    expectInvalid(procurementObservedActionDetailsResponse, invalid);
  });

  it("rejects a response that has latestSourceRevision in groups (old group field)", () => {
    const base = syntheticObservedFlow();
    const invalid = {
      ...base,
      actionDetails: undefined,
      groups: base.groups.map((g) => ({
        ...g,
        latestSourceRevision: "2026-10-14T00:00:00.000000Z",
      })),
    };
    expectInvalid(procurementObservedMoneyFlowBase, invalid);
  });

  it("rejects the old contract literal 'defproc-scoped-money-flow/v1'", () => {
    const base = syntheticObservedFlow();
    expectInvalid(procurementObservedActionDetailsResponse, {
      ...base,
      contract: "defproc-scoped-money-flow/v1",
      measure: "qualified_observed_actions",
    });
  });

  it("old procurementMoneyFlow schema rejects observed contract 'defproc-observed-money-flow/v1'", () => {
    expectInvalid(procurementMoneyFlow, syntheticObservedFlowNoDetails());
  });

  it("old procurementActionDetailsResponse rejects observed contract", () => {
    expectInvalid(procurementActionDetailsResponse, syntheticObservedFlow());
  });
});

// ---------------------------------------------------------------------------
// 4. NEGATIVE: corrupt identity cases must be rejected
// ---------------------------------------------------------------------------
describe("corrupt identity/count/amount cases rejected", () => {
  it("rejects a wrong transaction identity key (v2 prefix instead of observed-v1)", () => {
    const base = syntheticObservedFlow();
    const wrongTxKey =
      "sam_gov|modification|" +
      encodeURIComponent(
        JSON.stringify([
          "sam-contract-action/v2",
          base.actionDetails[0]!.awardIdentityKey,
          base.actionDetails[0]!.modificationNumber,
          base.actionDetails[0]!.transactionNumber,
        ]),
      );
    expectInvalid(procurementObservedActionDetailsResponse, {
      ...base,
      actionDetails: base.actionDetails.map((d) => ({
        ...d,
        transactionIdentityKey: wrongTxKey,
      })),
    });
  });

  it("rejects a wrong PIID/agency mismatch with awardUniqueId", () => {
    const base = syntheticObservedFlow();
    expectInvalid(procurementObservedActionDetailsResponse, {
      ...base,
      actionDetails: base.actionDetails.map((d) => ({
        ...d,
        awardUniqueId: "CONT_AWD_WRONG_9700_-NONE-_-NONE-",
      })),
    });
  });

  it("rejects count mismatch between actionDetails and totals", () => {
    const base = syntheticObservedFlow();
    expectInvalid(procurementObservedActionDetailsResponse, {
      ...base,
      totals: { ...base.totals!, actions: "2", obligationKnown: "2" },
    });
  });

  it("rejects amount mismatch between actionDetails and totals", () => {
    const base = syntheticObservedFlow();
    expectInvalid(procurementObservedActionDetailsResponse, {
      ...base,
      totals: { ...base.totals!, obligationUsd: "999999.00" },
    });
  });

  it("rejects group count mismatch with totals", () => {
    const base = syntheticObservedFlowNoDetails();
    expectInvalid(procurementObservedMoneyFlowBase, {
      ...base,
      totals: { ...base.totals!, actions: "2", obligationKnown: "2" },
    });
  });

  it("rejects response exceeding 2500 action detail rows", () => {
    const base = syntheticObservedFlow();
    const detail = base.actionDetails[0]!;
    const manyDetails = Array.from({ length: 2501 }, (_, i) => ({
      ...detail,
      transactionNumber: String(i + 1),
      transactionIdentityKey:
        "sam_gov|modification|" +
        encodeURIComponent(
          JSON.stringify([
            "sam-contract-action/observed-v1",
            detail.awardIdentityKey,
            detail.modificationNumber,
            String(i + 1),
          ]),
        ),
      selectedRevisionId: `30000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
      obligationUsd: "100000.00",
    }));
    expectInvalid(procurementObservedActionDetailsResponse, {
      ...base,
      actionDetails: manyDetails,
    });
  });
});

// ---------------------------------------------------------------------------
// 5. OPERATION REGISTRATION
// ---------------------------------------------------------------------------
describe("operation registration", () => {
  it("registers 'procurement.observedActionDetails' in the observed operations object", () => {
    expect(
      "procurement.observedActionDetails" in procurementObservedOperations,
    ).toBe(true);
  });

  it("the observed operation uses POST /defense-budget/procurement/money-flow", () => {
    const op =
      procurementObservedOperations["procurement.observedActionDetails"];
    expect(op.method).toBe("POST");
    expect(op.path).toBe("/defense-budget/procurement/money-flow");
  });

  it("the observed operation is included in the full procurement barrel", () => {
    expect("procurement.observedActionDetails" in procurementOperations).toBe(
      true,
    );
  });

  it("existing operations are preserved in the barrel", () => {
    expect("procurement.moneyFlow" in procurementOperations).toBe(true);
    expect("procurement.actionDetails" in procurementOperations).toBe(true);
    expect("procurement.hubSummary" in procurementOperations).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 6. NATIVE FIXTURE (parent SQL qualification now complete)
// ---------------------------------------------------------------------------
describe("native fixture — pending parent SQL qualification", () => {
  it("parses the actual PostgreSQL function output when native fixture is provided", async () => {
    // Native fixture provided by parent at apps/web/tests/fixtures/procurement-observed-native.json
    // Testing actual bytes; not faked.
    const nativeFixture = await import(
      "./fixtures/procurement-observed-native.json",
      {
        with: { type: "json" },
      }
    );
    const result = procurementObservedActionDetailsResponse.safeParse(
      nativeFixture.default,
    );
    if (!result.success) {
      throw new Error(
        "Native observed fixture failed schema validation: " +
          JSON.stringify(result.error.issues.slice(0, 5), null, 2),
      );
    }
    expect(result.success).toBe(true);
  });
});
