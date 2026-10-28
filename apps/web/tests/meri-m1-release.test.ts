import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  m1ReleaseSchema,
  readM1LiveRelease,
} from "../test/browser/meri-m1-release";

const approved = () => ({
  schema: "meri.m1.release/1",
  deployment: {
    origin: "https://portfolio-preview.app.capiro.ai",
    profile: "restricted-preview",
    testOnly: true,
    operatorApprovalReceiptId: "synthetic-approval",
    sourceAndConfigurationReceiptId: "synthetic-image-config-receipt",
  },
  sources: Object.fromEntries(
    ["frontend", "meri", "core"].map((key) => [
      key,
      {
        commit: "a".repeat(40),
        image: `sha256:${"b".repeat(64)}`,
      },
    ]),
  ),
  contracts: {
    applicationPackage: "0.1.10",
    eventWire: "0.1.0",
    lifecycleWire: "0.1.0",
    installedHashesReceiptId: "synthetic-contract-receipt",
  },
  identity: {
    issuer: "https://issuer.example.test",
    audience: "synthetic-audience",
    nativeSubject: "synthetic-subject",
    actorId: "synthetic-actor",
    tenantId: "synthetic-tenant",
    clientId: "10000000-0000-4000-8000-000000000001",
    otherClientId: "10000000-0000-4000-8000-000000000002",
    mappingReceiptId: "synthetic-mapping",
  },
  prerequisites: {
    migrationsAndGrants: ["synthetic-migrations"],
    workerCompositionReceiptId: "synthetic-worker",
    secretReferenceInventoryReceiptId: "synthetic-secret-references",
    rollbackReceiptId: "synthetic-rollback",
  },
  slices: [
    {
      id: "conversation",
      enabled: true,
      positiveReceiptIds: [],
      negativeReceiptIds: [],
      unknownRecoveryReceiptIds: [],
    },
  ],
});

describe("M1 preview opt-in and receipt gate", () => {
  it("is inert without explicit opt-in, even if operator paths were supplied", () => {
    let reads = 0;
    for (const value of [undefined, "", "true", "0"])
      expect(
        readM1LiveRelease(
          {
            MERI_M1_LIVE: value,
            MERI_M1_LIVE_MANIFEST: "/unused",
            MERI_M1_STORAGE_STATE: "/unused",
          },
          () => {
            reads++;
            return "{}";
          },
        ),
      ).toBeNull();
    expect(reads).toBe(0);
  });
  it("refuses incomplete operator input and the deliberately unqualified template", () => {
    expect(() => readM1LiveRelease({ MERI_M1_LIVE: "1" })).toThrow();
    const template = JSON.parse(
      readFileSync(
        new URL(
          "../../../docs/m1-ui-20261021/release-receipt.template.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    expect(m1ReleaseSchema.safeParse(template).success).toBe(false);
    const manifest = approved();
    expect(
      readM1LiveRelease(
        {
          MERI_M1_LIVE: "1",
          MERI_M1_LIVE_MANIFEST: "/approved",
          MERI_M1_STORAGE_STATE: "/test-state",
        },
        (path) => {
          expect(path).toBe("/approved");
          return JSON.stringify(manifest);
        },
      ),
    ).toEqual(manifest);
  });
  it("refuses production, stale pins, unapproved identity and enabled slices without negative/unknown receipts", () => {
    const invalid = [
      {
        ...approved(),
        deployment: {
          ...approved().deployment,
          origin: "https://os.capiro.ai",
        },
      },
      {
        ...approved(),
        deployment: { ...approved().deployment, operatorApprovalReceiptId: "" },
      },
      {
        ...approved(),
        sources: {
          ...approved().sources,
          meri: { commit: "main", image: "latest" },
        },
      },
      {
        ...approved(),
        identity: {
          ...approved().identity,
          otherClientId: approved().identity.clientId,
        },
      },
      {
        ...approved(),
        slices: [
          ...approved().slices,
          {
            id: "documents",
            enabled: true,
            positiveReceiptIds: ["positive-only"],
            negativeReceiptIds: [],
            unknownRecoveryReceiptIds: [],
          },
        ],
      },
    ];
    for (const manifest of invalid)
      expect(m1ReleaseSchema.safeParse(manifest).success).toBe(false);
  });
});
