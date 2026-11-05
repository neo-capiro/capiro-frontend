/**
 * Contract tests for the explicit opt-in procurement action-detail receiver.
 * TDD order: positive native-fixture test first (RED), then implementation (GREEN),
 * then negative cases in vertical slices.
 */
import nativeFixture from "./fixtures/procurement-action-details-native.json";
import { describe, expect, it } from "vitest";
import {
  procurementActionDetailsScope,
  procurementActionDetailsResponse,
  procurementActionDetailsOperations,
  actionDetailSchema,
} from "../src/shared/capiro/operations/procurement-action-details";
import {
  procurementMoneyFlow,
  procurementScope,
  procurementOperations,
} from "../src/shared/capiro/operations/procurement-money-flow";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const key1 = "usaspending|award|CONT_AWD_0001_2100_-NONE-_-NONE-";
const key2 = "usaspending|award|CONT_AWD_0001_9700_-NONE-_-NONE-";
const instant = "2026-11-01T00:00:00.000000Z";

function expectInvalid(
  schema: { safeParse: (v: unknown) => { success: boolean } },
  value: unknown,
) {
  expect(() => schema.safeParse(value)).not.toThrow();
  expect(schema.safeParse(value).success).toBe(false);
}

// ---------------------------------------------------------------------------
// 1. POSITIVE: native fixture must parse
// ---------------------------------------------------------------------------
describe("positive native fixture", () => {
  it("parses the actual PostgreSQL function output (4 actions, signed amounts, precision stress)", () => {
    const result = procurementActionDetailsResponse.safeParse(nativeFixture);
    if (!result.success) {
      // Print issues to aid debugging if this fails (RED phase expectation)
      console.error(
        "Parse errors:",
        JSON.stringify(result.error.issues, null, 2),
      );
    }
    expect(result.success).toBe(true);
    expect(result.data?.actionDetails).toHaveLength(4);
  });

  it("preserves literal strings: no numeric conversion of obligations", () => {
    const result = procurementActionDetailsResponse.parse(nativeFixture);
    // Large precision-stress value must not be coerced
    const largeObligation = result.actionDetails.find(
      (d) => d.obligationUsd === "70368744177665.00",
    );
    expect(largeObligation).toBeDefined();
    expect(typeof largeObligation!.obligationUsd).toBe("string");
  });

  it("preserves negative obligation (-500000.00) without sign conversion", () => {
    const result = procurementActionDetailsResponse.parse(nativeFixture);
    const negative = result.actionDetails.find(
      (d) => d.obligationUsd === "-500000.00",
    );
    expect(negative).toBeDefined();
  });

  it("preserves null actionDate and null fiscalYear for undated actions", () => {
    const result = procurementActionDetailsResponse.parse(nativeFixture);
    const undated = result.actionDetails.find((d) => d.actionDate === null);
    expect(undated).toBeDefined();
    expect(undated!.fiscalYear).toBeNull();
  });

  it("preserves complete funding and contracting org hierarchy with null codes/names", () => {
    const result = procurementActionDetailsResponse.parse(nativeFixture);
    const first = result.actionDetails[0]!;
    expect(first.fundingOrganization.office.code).toBeNull();
    expect(first.fundingOrganization.subtier.code).toMatch(/^[A-Z0-9]+S$/);
    expect(first.contractingOrganization.department.code).toBeDefined();
  });

  it("preserves canonical transaction identity keys without normalization", () => {
    const result = procurementActionDetailsResponse.parse(nativeFixture);
    for (const detail of result.actionDetails) {
      expect(detail.transactionIdentityKey).toMatch(/^sam_gov\|modification\|/);
    }
  });

  it("summary still accepted by existing procurementMoneyFlow schema (no unsolicited details)", () => {
    // Remove actionDetails — the base schema must still accept it.
    const summaryOnly = { ...nativeFixture } as Record<string, unknown>;
    delete summaryOnly["actionDetails"];
    expect(procurementMoneyFlow.safeParse(summaryOnly).success).toBe(true);
    // Base schema must reject the payload with actionDetails (unknown field, strict).
    expect(procurementMoneyFlow.safeParse(nativeFixture).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. Request schema: explicit opt-in
// ---------------------------------------------------------------------------
describe("request schema requires literal true opt-in", () => {
  it("accepts includeActionDetails:true with valid scope", () => {
    expect(
      procurementActionDetailsScope.safeParse({
        awardIdentityKeys: [key1],
        includeActionDetails: true,
      }).success,
    ).toBe(true);
  });

  it("rejects false", () => {
    expectInvalid(procurementActionDetailsScope, {
      awardIdentityKeys: [key1],
      includeActionDetails: false,
    });
  });

  it("rejects string 'true'", () => {
    expectInvalid(procurementActionDetailsScope, {
      awardIdentityKeys: [key1],
      includeActionDetails: "true",
    });
  });

  it("rejects missing opt-in", () => {
    expectInvalid(procurementActionDetailsScope, {
      awardIdentityKeys: [key1],
    });
  });

  it("rejects 1 (numeric truthy)", () => {
    expectInvalid(procurementActionDetailsScope, {
      awardIdentityKeys: [key1],
      includeActionDetails: 1,
    });
  });

  it("rejects empty scope and duplicate keys", () => {
    expectInvalid(procurementActionDetailsScope, {
      awardIdentityKeys: [],
      includeActionDetails: true,
    });
    expectInvalid(procurementActionDetailsScope, {
      awardIdentityKeys: [key1, key1],
      includeActionDetails: true,
    });
  });

  it("rejects >25 keys", () => {
    expectInvalid(procurementActionDetailsScope, {
      awardIdentityKeys: Array.from({ length: 26 }, (_, i) =>
        key1.replace("0001", String(i).padStart(4, "0")),
      ),
      includeActionDetails: true,
    });
  });

  it("rejects malformed UTC clocks", () => {
    for (const knownAt of [
      "2026-11-01",
      "2026-11-01T12:00:00.123Z",
      "2026-11-01T12:00:00.123456+00:00",
    ]) {
      expectInvalid(procurementActionDetailsScope, {
        awardIdentityKeys: [key1],
        includeActionDetails: true,
        knownAt,
      });
    }
  });

  it("original procurementScope does not require includeActionDetails", () => {
    expect(
      procurementScope.safeParse({ awardIdentityKeys: [key1] }).success,
    ).toBe(true);
    // Original scope must reject the literal true (strict)
    expect(
      procurementScope.safeParse({
        awardIdentityKeys: [key1],
        includeActionDetails: true,
      }).success,
    ).toBe(false);
  });

  it("operation definition uses authenticated Core POST with source attribution", () => {
    const op = procurementActionDetailsOperations["procurement.actionDetails"];
    expect(op.service).toBe("core");
    expect(op.method).toBe("POST");
    // The owner exposes the existing endpoint with an explicit opt-in, not a new route.
    expect(op.path).toBe("/defense-budget/procurement/money-flow");
    // Account-declaration successor preserves the action contract and runtime bytes.
    expect(op.source).toContain("07582f2e4c97887daf6458f4fd98ef725c42110f");
    expect(op.authentication).toBeUndefined();
    // Request must require includeActionDetails:true in body
    expect(
      op.request.safeParse({
        body: { awardIdentityKeys: [key1], includeActionDetails: true },
      }).success,
    ).toBe(true);
    expect(
      op.request.safeParse({ body: { awardIdentityKeys: [key1] } }).success,
    ).toBe(false);
    // Original operations must NOT include the detail path
    expect(
      Object.values(procurementOperations).map((o) => o.path),
    ).not.toContain("/defense-budget/procurement/money-flow-details");
  });
});

// ---------------------------------------------------------------------------
// 3. Response schema: required actionDetails field
// ---------------------------------------------------------------------------
describe("response schema requires actionDetails array", () => {
  function richFixture() {
    return JSON.parse(JSON.stringify(nativeFixture)) as typeof nativeFixture;
  }

  it("accepts the native fixture with all details", () => {
    expect(
      procurementActionDetailsResponse.safeParse(richFixture()).success,
    ).toBe(true);
  });

  it("rejects missing actionDetails (omission)", () => {
    const without = { ...richFixture() } as Record<string, unknown>;
    delete without["actionDetails"];
    expectInvalid(procurementActionDetailsResponse, without);
  });

  it("rejects null actionDetails", () => {
    expectInvalid(procurementActionDetailsResponse, {
      ...richFixture(),
      actionDetails: null,
    });
  });

  it("accepts empty [] for unavailable state", () => {
    const f = richFixture() as Record<string, unknown>;
    const unavailable = {
      ...f,
      state: "unavailable",
      totals: null,
      groups: [],
      provenance: [],
      coverage: { unqualified: "3" },
      actionDetails: [],
    };
    expect(
      procurementActionDetailsResponse.safeParse(unavailable).success,
    ).toBe(true);
  });

  it("rejects empty [] for partial state with totals", () => {
    expectInvalid(procurementActionDetailsResponse, {
      ...richFixture(),
      actionDetails: [],
    });
  });

  it("rejects unknown top-level fields", () => {
    expectInvalid(procurementActionDetailsResponse, {
      ...richFixture(),
      unexpectedField: "injected",
    });
  });

  it("Hub summary (procurementHubSummary) contract unchanged — no actionDetails field", () => {
    // The hub summary schema is not touched.
    const withoutDetails = { ...richFixture() } as Record<string, unknown>;
    delete withoutDetails["actionDetails"];
    delete withoutDetails["groups"];
    const hubPayload = {
      ...withoutDetails,
      groupCount: (nativeFixture.groups as unknown[]).length,
    };
    // Should be accepted by the hub summary schema (but that's from the other module)
    // We just verify our response schema does NOT accept it (missing groups)
    expect(procurementActionDetailsResponse.safeParse(hubPayload).success).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// 4. Detail schema: field-level validation
// ---------------------------------------------------------------------------
describe("detail schema field validation", () => {
  const validDetail = JSON.parse(
    JSON.stringify(nativeFixture.actionDetails[0]),
  );

  it("accepts a valid detail from the native fixture", () => {
    expect(actionDetailSchema.safeParse(validDetail).success).toBe(true);
  });

  it("rejects invalid transaction identity format", () => {
    expectInvalid(actionDetailSchema, {
      ...validDetail,
      transactionIdentityKey: "invalid|format|abc",
    });
  });

  it("rejects numeric obligation (must be string)", () => {
    expectInvalid(actionDetailSchema, {
      ...validDetail,
      obligationUsd: 800000,
    });
  });

  it("rejects negative-zero money", () => {
    expectInvalid(actionDetailSchema, {
      ...validDetail,
      obligationUsd: "-0.00",
    });
  });

  it("rejects non-null outlay (must always be null)", () => {
    expectInvalid(actionDetailSchema, {
      ...validDetail,
      outlayUsd: "0.00",
    });
  });

  it("rejects invalid awardType (not A/B/C/D)", () => {
    expectInvalid(actionDetailSchema, {
      ...validDetail,
      awardType: "E",
    });
  });

  it("rejects invalid action date format", () => {
    for (const actionDate of ["2025/06/01", "2025-13-01", "2025-06-32"]) {
      expectInvalid(actionDetailSchema, { ...validDetail, actionDate });
    }
  });

  it("accepts null actionDate and null fiscalYear", () => {
    expect(
      actionDetailSchema.safeParse({
        ...validDetail,
        actionDate: null,
        fiscalYear: null,
      }).success,
    ).toBe(true);
  });

  it("rejects non-hex-64 payload hash", () => {
    expectInvalid(actionDetailSchema, {
      ...validDetail,
      sourcePayloadHash: "not-a-hash",
    });
  });

  it("rejects non-https source URL", () => {
    for (const sourceUrl of [
      "javascript:alert(1)",
      "http://api.sam.gov/",
      "ftp://example.gov",
    ]) {
      expectInvalid(actionDetailSchema, { ...validDetail, sourceUrl });
    }
  });

  it("rejects URL with credentials", () => {
    expectInvalid(actionDetailSchema, {
      ...validDetail,
      sourceUrl: "https://user:pass@api.sam.gov/",
    });
  });

  it("accepts null sourceUrl", () => {
    expect(
      actionDetailSchema.safeParse({ ...validDetail, sourceUrl: null }).success,
    ).toBe(true);
  });

  it("rejects invalid UEI (lowercase, wrong length)", () => {
    for (const recipientUei of ["abc123", "ABC123456DE", "ABC123456DEF1"]) {
      expectInvalid(actionDetailSchema, { ...validDetail, recipientUei });
    }
  });

  it("rejects unknown fields (strict schema)", () => {
    expectInvalid(actionDetailSchema, {
      ...validDetail,
      raw_jsonb: { injected: true },
    });
  });
});

// ---------------------------------------------------------------------------
// 5. Cross-check: scope membership
// ---------------------------------------------------------------------------
describe("scope membership and award identity", () => {
  function richFixture() {
    return JSON.parse(JSON.stringify(nativeFixture)) as Record<string, unknown>;
  }

  it("rejects foreign award identity key in detail", () => {
    const f = richFixture();
    const details = JSON.parse(
      JSON.stringify(nativeFixture.actionDetails),
    ) as Record<string, unknown>[];
    const foreignKey = "usaspending|award|CONT_AWD_9999_1700_-NONE-_-NONE-";
    details[0] = {
      ...details[0]!,
      awardIdentityKey: foreignKey,
      awardUniqueId: "CONT_AWD_9999_1700_-NONE-_-NONE-",
      vendorKey: `award:${foreignKey}`,
      vendorIdentityState: "unresolved",
      recipientUei: null,
    };
    expectInvalid(procurementActionDetailsResponse, {
      ...f,
      actionDetails: details,
    });
  });

  it("rejects altered PIID/agency/full-ID tuple inconsistency", () => {
    // awardIdentityKey changed but scope not updated — foreign key
    const f = richFixture();
    const details = JSON.parse(
      JSON.stringify(nativeFixture.actionDetails),
    ) as Record<string, unknown>[];
    details[0] = {
      ...details[0]!,
      awardIdentityKey: "usaspending|award|CONT_AWD_0001_1500_-NONE-_-NONE-",
      vendorKey: "award:usaspending|award|CONT_AWD_0001_1500_-NONE-_-NONE-",
      recipientUei: null,
      vendorIdentityState: "unresolved",
    };
    expectInvalid(procurementActionDetailsResponse, {
      ...f,
      actionDetails: details,
    });
  });
});

// ---------------------------------------------------------------------------
// 6. Cross-check: duplicate detection
// ---------------------------------------------------------------------------
describe("duplicate detection", () => {
  it("rejects duplicate transactionIdentityKey", () => {
    const f = JSON.parse(JSON.stringify(nativeFixture)) as Record<
      string,
      unknown
    >;
    const details = JSON.parse(
      JSON.stringify(nativeFixture.actionDetails),
    ) as typeof nativeFixture.actionDetails;
    details[1] = {
      ...details[1]!,
      transactionIdentityKey: details[0]!.transactionIdentityKey,
    };
    expectInvalid(procurementActionDetailsResponse, {
      ...f,
      actionDetails: details,
    });
  });

  it("rejects duplicate selectedRevisionId", () => {
    const f = JSON.parse(JSON.stringify(nativeFixture)) as Record<
      string,
      unknown
    >;
    const details = JSON.parse(
      JSON.stringify(nativeFixture.actionDetails),
    ) as typeof nativeFixture.actionDetails;
    details[2] = {
      ...details[2]!,
      selectedRevisionId: details[0]!.selectedRevisionId,
    };
    expectInvalid(procurementActionDetailsResponse, {
      ...f,
      actionDetails: details,
    });
  });
});

// ---------------------------------------------------------------------------
// 7. Vendor identity cross-checks
// ---------------------------------------------------------------------------
describe("vendor identity cross-checks", () => {
  it("rejects source_uei detail with mismatched recipientUei/vendorKey", () => {
    const f = JSON.parse(JSON.stringify(nativeFixture)) as Record<
      string,
      unknown
    >;
    const details = JSON.parse(
      JSON.stringify(nativeFixture.actionDetails),
    ) as typeof nativeFixture.actionDetails;
    // Find a source_uei detail and break the vendorKey
    const ueiDetail = details.find(
      (d) => d.vendorIdentityState === "source_uei",
    )!;
    const idx = details.indexOf(ueiDetail);
    details[idx] = {
      ...ueiDetail,
      vendorKey: "uei:WRONGKEY12345",
    };
    expectInvalid(procurementActionDetailsResponse, {
      ...f,
      actionDetails: details,
    });
  });

  it("rejects unresolved detail with null recipientUei but wrong vendorKey", () => {
    const f = JSON.parse(JSON.stringify(nativeFixture)) as Record<
      string,
      unknown
    >;
    const details = JSON.parse(
      JSON.stringify(nativeFixture.actionDetails),
    ) as typeof nativeFixture.actionDetails;
    // Find an unresolved detail
    const unresolvedDetail = details.find(
      (d) => d.vendorIdentityState === "unresolved",
    )!;
    const idx = details.indexOf(unresolvedDetail);
    details[idx] = {
      ...unresolvedDetail,
      vendorKey: `award:${key2}`, // wrong: belongs to key1
    };
    expectInvalid(procurementActionDetailsResponse, {
      ...f,
      actionDetails: details,
    });
  });
});

// ---------------------------------------------------------------------------
// 8. Money reconciliation
// ---------------------------------------------------------------------------
describe("obligation reconciliation", () => {
  it("rejects mismatched total obligation (sign tamper)", () => {
    const f = JSON.parse(JSON.stringify(nativeFixture)) as Record<
      string,
      unknown
    >;
    const details = JSON.parse(
      JSON.stringify(nativeFixture.actionDetails),
    ) as typeof nativeFixture.actionDetails;
    // Flip sign of the negative detail to tamper the sum
    const negIdx = details.findIndex((d) => d.obligationUsd.startsWith("-"));
    details[negIdx] = {
      ...details[negIdx]!,
      obligationUsd: details[negIdx]!.obligationUsd.slice(1),
    };
    expectInvalid(procurementActionDetailsResponse, {
      ...f,
      actionDetails: details,
    });
  });

  it("rejects numeric money in details even when totals still sum", () => {
    const f = JSON.parse(JSON.stringify(nativeFixture)) as Record<
      string,
      unknown
    >;
    const details = JSON.parse(
      JSON.stringify(nativeFixture.actionDetails),
    ) as typeof nativeFixture.actionDetails;
    details[0] = { ...details[0]!, obligationUsd: 800000 as unknown as string };
    expectInvalid(procurementActionDetailsResponse, {
      ...f,
      actionDetails: details,
    });
  });

  it("rejects mismatched per-vendor/fiscal group amounts when whole totals still agree", () => {
    // Swap obligations between two details with different (fy, vendorKey) groups.
    // Total sum remains the same, but per-group reconciliation fails.
    const f = JSON.parse(JSON.stringify(nativeFixture)) as Record<
      string,
      unknown
    >;
    const details = JSON.parse(
      JSON.stringify(nativeFixture.actionDetails),
    ) as typeof nativeFixture.actionDetails;
    // detail[0]: fy2025, vendorKey=award:CONT_AWD_0001_2100... obligation=800000.00
    // detail[1]: fy2025, vendorKey=uei:ABC123456DEF obligation=70368744177665.00
    // Swap their obligations; totals and per-vendor sum will mismatch
    const d0Obligation = details[0]!.obligationUsd;
    const d1Obligation = details[1]!.obligationUsd;
    details[0] = { ...details[0]!, obligationUsd: d1Obligation };
    details[1] = { ...details[1]!, obligationUsd: d0Obligation };
    expectInvalid(procurementActionDetailsResponse, {
      ...f,
      actionDetails: details,
    });
  });

  it("rejects mismatched per-group action counts even when total count agrees", () => {
    // This is hard to trigger with the 4-action fixture without also breaking totals,
    // so we test count validation directly via the superRefine path:
    // Copy a detail, giving it a different transactionIdentityKey but same group key.
    const f = JSON.parse(JSON.stringify(nativeFixture)) as Record<
      string,
      unknown
    >;
    const details = JSON.parse(
      JSON.stringify(nativeFixture.actionDetails),
    ) as typeof nativeFixture.actionDetails;
    // Remove detail[0] and add two copies of detail[1] (same fy+vendorKey group),
    // keeping total count at 4 but group count wrong.
    details[0] = {
      ...details[1]!,
      transactionIdentityKey: "sam_gov|modification|extra-key-synthetic",
      selectedRevisionId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
      obligationUsd: "0.00",
    };
    // Now the group for key1/2100 has 2 items but summary group says 1
    expectInvalid(procurementActionDetailsResponse, {
      ...f,
      actionDetails: details,
    });
  });
});

// ---------------------------------------------------------------------------
// 9. Source timeline
// ---------------------------------------------------------------------------
describe("source timeline cross-checks", () => {
  it("rejects detail recordedAt exceeding knownAt", () => {
    const f = JSON.parse(JSON.stringify(nativeFixture)) as Record<
      string,
      unknown
    >;
    const details = JSON.parse(
      JSON.stringify(nativeFixture.actionDetails),
    ) as typeof nativeFixture.actionDetails;
    // Set a future recordedAt (beyond knownAt=2026-11-01)
    details[0] = { ...details[0]!, recordedAt: "2026-11-02T00:00:00.000000Z" };
    expectInvalid(procurementActionDetailsResponse, {
      ...f,
      actionDetails: details,
    });
  });

  it("rejects detail sourceRevisionOrder exceeding sourceThrough when set", () => {
    const f = JSON.parse(JSON.stringify(nativeFixture)) as Record<
      string,
      unknown
    >;
    const details = JSON.parse(
      JSON.stringify(nativeFixture.actionDetails),
    ) as typeof nativeFixture.actionDetails;
    // Add a sourceThrough constraint to the base fixture
    const withCutoff = {
      ...f,
      sourceThrough: "2025-06-01T00:00:00.000000Z",
      actionDetails: details.map((d) => ({
        ...d,
        sourceRevisionOrder: "2025-09-01T00:00:00.000000Z",
      })),
    };
    expectInvalid(procurementActionDetailsResponse, withCutoff);
  });

  it("rejects malformed clock in detail sourceRevisionOrder", () => {
    const f = JSON.parse(JSON.stringify(nativeFixture)) as Record<
      string,
      unknown
    >;
    const details = JSON.parse(
      JSON.stringify(nativeFixture.actionDetails),
    ) as typeof nativeFixture.actionDetails;
    details[0] = { ...details[0]!, sourceRevisionOrder: "not-a-timestamp" };
    expectInvalid(procurementActionDetailsResponse, {
      ...f,
      actionDetails: details,
    });
  });

  it("rejects future clock (past knownAt) in detail recordedAt", () => {
    const f = JSON.parse(JSON.stringify(nativeFixture)) as Record<
      string,
      unknown
    >;
    const details = JSON.parse(
      JSON.stringify(nativeFixture.actionDetails),
    ) as typeof nativeFixture.actionDetails;
    details[0] = { ...details[0]!, recordedAt: "2027-01-01T00:00:00.000000Z" };
    expectInvalid(procurementActionDetailsResponse, {
      ...f,
      actionDetails: details,
    });
  });
});

// ---------------------------------------------------------------------------
// 10. Array bounds
// ---------------------------------------------------------------------------
describe("array bounds", () => {
  it("rejects >2500 detail rows", () => {
    const f = JSON.parse(JSON.stringify(nativeFixture)) as Record<
      string,
      unknown
    >;
    // Build a fake 2501-row array
    const largeDetails = Array.from({ length: 2501 }, (_, i) => ({
      ...nativeFixture.actionDetails[0]!,
      transactionIdentityKey: `sam_gov|modification|synthetic-${i}`,
      selectedRevisionId: `${String(i).padStart(8, "0")}-0000-4000-8000-000000000000`,
    }));
    const parsed = procurementActionDetailsResponse.safeParse({
      ...f,
      actionDetails: largeDetails,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success)
      expect(
        parsed.error.issues.some(
          (issue) =>
            issue.code === "too_big" &&
            issue.path.length === 1 &&
            issue.path[0] === "actionDetails",
        ),
      ).toBe(true);
  });

  it("rejects an otherwise valid synthetic body above one MiB for that exact reason", () => {
    const value = structuredClone(nativeFixture),
      count = 48,
      source = nativeFixture.actionDetails[0]!;
    value.scope.awardIdentityKeys = [source.awardIdentityKey];
    value.actionDetails = Array.from({ length: count }, (_, index) => {
      const modificationNumber = `P${String(index).padStart(5, "0")}`;
      return {
        ...source,
        modificationNumber,
        selectedRevisionId: `${String(index).padStart(8, "0")}-0000-4000-8000-000000000000`,
        transactionIdentityKey:
          "sam_gov|modification|" +
          encodeURIComponent(
            JSON.stringify([
              "sam-contract-action/v2",
              source.awardIdentityKey,
              modificationNumber,
              source.transactionNumber,
            ]),
          ),
      };
    });
    const obligationUsd = `${BigInt(count) * 800000n}.00`;
    value.totals = {
      ...value.totals,
      actions: String(count),
      obligationKnown: String(count),
      obligationUsd,
    };
    value.coverage.selected = String(count);
    value.groups = [
      {
        ...value.groups.find((group) => group.vendorKey === source.vendorKey)!,
        ...value.totals,
      },
    ];
    value.provenance = [
      {
        ...value.provenance.find(
          (row) => row.awardIdentityKey === source.awardIdentityKey,
        )!,
        selectedActions: String(count),
      },
    ];
    expect(procurementActionDetailsResponse.safeParse(value).success).toBe(
      true,
    );
    const level = { code: null, name: "X".repeat(4096) };
    for (const detail of value.actionDetails) {
      const organization = { department: level, subtier: level, office: level };
      Object.assign(detail, {
        fundingOrganization: organization,
        contractingOrganization: organization,
      });
    }
    expect(
      new TextEncoder().encode(JSON.stringify(value)).length,
    ).toBeGreaterThan(1_048_576);
    const parsed = procurementActionDetailsResponse.safeParse(value);
    expect(parsed.success).toBe(false);
    if (!parsed.success)
      expect(parsed.error.issues).toEqual([
        expect.objectContaining({
          code: "custom",
          message: "Procurement response with action details exceeds one MiB",
        }),
      ]);
  });
});

// ---------------------------------------------------------------------------
// 11. Existing procurement tests must not be disturbed
// ---------------------------------------------------------------------------
describe("existing procurement contracts preserved", () => {
  it("existing procurementMoneyFlow schema unchanged", () => {
    expect(
      procurementMoneyFlow.safeParse({
        contract: "defproc-scoped-money-flow/v1",
        state: "partial",
        measure: "qualified_observed_actions",
        currency: "USD",
        knownAt: instant,
        sourceThrough: null,
        scope: { awardIdentityKeys: [key1], includesDescendants: false },
        totals: {
          actions: "1",
          obligationUsd: "100.00",
          outlayUsd: null,
          obligationKnown: "1",
          outlayKnown: "0",
        },
        coverage: { selected: "1" },
        groups: [
          {
            actions: "1",
            obligationUsd: "100.00",
            outlayUsd: null,
            obligationKnown: "1",
            outlayKnown: "0",
            fiscalYear: 2025,
            awardingAgency: "Test Agency",
            awardingSubTier: "Test SubTier",
            contractorName: "Test Vendor",
            recipientUei: "SYNTH1234567",
            vendorIdentityState: "source_uei",
            vendorKey: "uei:SYNTH1234567",
            attributeState: "latest_known_catalog_observation",
            latestSourceRevision: instant,
            latestSourceObservedAt: instant,
            latestRecordedAt: instant,
            latestAttributeRecordedAt: instant,
          },
        ],
        provenance: [
          {
            awardIdentityKey: key1,
            contract: "sam-contract-action/v2",
            producerCommit: "a".repeat(40),
            imageDigest: `sha256:${"b".repeat(64)}`,
            runId: "synthetic-run",
            targetId: "synthetic-target",
            selectedActions: "1",
            sourceUrl: "https://api.sam.gov/contract-awards/v1/search",
            catalogRevisionId: "10000000-0000-4000-8000-000000000001",
            catalogSourceUrl: null,
            attributeRecordedAt: instant,
          },
        ],
        sources: [
          {
            system: "sam_gov",
            documentationUrl: "https://open.gsa.gov/api/contract-awards/",
            semantics: "test",
          },
          {
            system: "usaspending",
            documentationUrl: "https://www.usaspending.gov/",
            semantics: "test",
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("original operation paths not affected", () => {
    expect(Object.values(procurementOperations).map((o) => o.path)).toEqual([
      "/defense-budget/procurement/money-flow",
      "/hub/procurement/summary",
    ]);
  });
});

describe("parent source-tuple and grouped reconciliation regressions", () => {
  it("rejects reported detail amounts that disagree with known-obligation counts", () => {
    const value = structuredClone(nativeFixture);
    value.groups[0]!.obligationKnown = String(
      BigInt(value.groups[0]!.obligationKnown) - 1n,
    );
    value.totals.obligationKnown = String(
      BigInt(value.totals.obligationKnown) - 1n,
    );
    expect(
      procurementMoneyFlow.safeParse(
        (({ actionDetails: _details, ...summary }) => summary)(value),
      ).success,
    ).toBe(true);
    expectInvalid(procurementActionDetailsResponse, value);
  });
  it("rejects a catalog fork that still claims resolved vendor facts", () => {
    const value = structuredClone(nativeFixture);
    value.actionDetails[0]!.attributeState = "award_observation_fork";
    expectInvalid(procurementActionDetailsResponse, value);
  });
  it("rejects control characters in detail vendor labels", () => {
    const value = structuredClone(nativeFixture);
    value.actionDetails[0]!.contractorName = "bad\u0001label";
    expectInvalid(procurementActionDetailsResponse, value);
  });
  it.each([
    ["piid", "9999"],
    ["submittingAgencyCode", "1700"],
    ["awardUniqueId", "CONT_AWD_9999_2100_-NONE-_-NONE-"],
    ["modificationNumber", "P00099"],
    ["transactionNumber", "2"],
    ["parentPiid", "PARENT"],
    ["parentAgencyCode", "9700"],
  ])(
    "rejects %s that disagrees with the unchanged full identity",
    (field, replacement) => {
      const value = structuredClone(nativeFixture);
      Object.assign(value.actionDetails[0]!, { [field]: replacement });
      expectInvalid(procurementActionDetailsResponse, value);
    },
  );

  it("aggregates multiple awarding-agency groups for the same fiscal year and vendor", () => {
    // Synthetic receiver variant: move the negative action to a third award with the same UEI.
    const value = structuredClone(nativeFixture);
    const negative = value.actionDetails.find(
      (action) => action.obligationUsd === "-500000.00",
    )!;
    const previousKey = negative.awardIdentityKey;
    const uniqueId = "CONT_AWD_0002_9700_-NONE-_-NONE-";
    const key = `usaspending|award|${uniqueId}`;
    Object.assign(negative, {
      awardIdentityKey: key,
      awardUniqueId: uniqueId,
      piid: "0002",
      sourcePayloadHash: "c".repeat(64),
      sourceUrl: "https://api.sam.gov/contract-awards/v1/search?piid=0002",
    });
    negative.transactionIdentityKey =
      "sam_gov|modification|" +
      encodeURIComponent(
        JSON.stringify([
          "sam-contract-action/v2",
          key,
          negative.modificationNumber,
          negative.transactionNumber,
        ]),
      );
    value.scope.awardIdentityKeys.push(key);
    const provenance = value.provenance.find(
      (row) => row.awardIdentityKey === previousKey,
    )!;
    provenance.selectedActions = "2";
    value.provenance.push({
      ...provenance,
      awardIdentityKey: key,
      selectedActions: "1",
      catalogRevisionId: "10000000-0000-4000-8000-000000000099",
      sourceUrl: negative.sourceUrl,
    });
    const group = value.groups[0]!;
    value.groups.splice(
      0,
      1,
      {
        ...group,
        actions: "1",
        obligationKnown: "1",
        obligationUsd: "70368744177665.00",
      },
      {
        ...group,
        awardingAgency: "Another synthetic agency",
        actions: "1",
        obligationKnown: "1",
        obligationUsd: "-500000.00",
      },
    );
    expect(procurementActionDetailsResponse.safeParse(value).success).toBe(
      true,
    );
  });
});
