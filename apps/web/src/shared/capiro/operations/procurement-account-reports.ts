import type {
  ProcurementAccountReports,
  ProcurementAccountScopeRequest,
} from "@capiro/shared";
import { z } from "zod";
import { defineOperation } from "../contracts";
import { procurementScope } from "./procurement-money-flow";

export const procurementAccountScope = procurementScope
  .pick({ awardIdentityKeys: true, knownAt: true })
  .strict() satisfies z.ZodType<ProcurementAccountScopeRequest>;
const instant = procurementScope.shape.knownAt.unwrap();
const awardKey = procurementScope.shape.awardIdentityKeys.element;
const text = z
  .string()
  .max(4096)
  .regex(/^[^\u0000-\u001f\u007f]*$/)
  .nullable();
// Preserve publisher decimal precision, as the existing procurement money receiver does.
const money = z
  .string()
  .regex(/^-?(?:0|[1-9]\d{0,127})(?:\.\d{1,128})?$/)
  .refine((value) => !/^-0(?:\.0+)?$/.test(value))
  .nullable();
const row = z
  .object({
    sourceRowIndex: z.number().int().min(0).max(99),
    federalAccount: text,
    accountTitle: text,
    treasuryAccountSymbol: z.null(),
    programActivityCode: text,
    programActivityName: text,
    objectClass: text,
    objectClassName: text,
    disasterEmergencyFundCode: text,
    fundingAgencyName: text,
    awardingAgencyName: text,
    reportingFiscalYear: z.number().int().min(1900).max(9999).nullable(),
    reportingFiscalQuarter: z.number().int().min(1).max(4).nullable(),
    reportingFiscalMonth: z.number().int().min(1).max(12).nullable(),
    isQuarterlySubmission: z.boolean().nullable(),
    reportedObligationUsd: money,
    reportedGrossOutlayUsd: money,
  })
  .strict();
const report = z
  .object({
    awardIdentityKey: awardKey,
    state: z.enum(["reported", "unavailable", "conflict"]),
    snapshotId: z.string().uuid().nullable(),
    sourceObservedAt: instant.nullable(),
    recordedAt: instant.nullable(),
    sourcePayloadSha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .nullable(),
    sourceUrl: z.string().max(2048),
    rows: z.array(row).max(100),
  })
  .strict()
  .superRefine((value, ctx) => {
    const invalid = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    const id = value.awardIdentityKey.slice("usaspending|award|".length);
    if (
      value.sourceUrl !==
      `https://www.usaspending.gov/award/${encodeURIComponent(id)}`
    )
      invalid("Account source URL must identify this exact award");
    const metadata = [
      value.snapshotId,
      value.sourceObservedAt,
      value.recordedAt,
      value.sourcePayloadSha256,
    ];
    if (value.state === "reported") {
      if (metadata.some((item) => item === null))
        invalid("Reported rows require the original observation receipt");
    } else if (metadata.some((item) => item !== null) || value.rows.length) {
      invalid(
        "Missing or conflicting observations cannot carry selected financial rows",
      );
    }
    if (value.rows.some((item, index) => item.sourceRowIndex !== index))
      invalid("Source row positions must be contiguous and preserved");
  });

export const procurementAccountReports = z
  .object({
    contract: z.literal("defproc-account-reports/v1"),
    knownAt: instant,
    scope: z
      .object({
        awardIdentityKeys: procurementScope.shape.awardIdentityKeys,
        includesDescendants: z.literal(false),
      })
      .strict(),
    coverage: z.literal("source_reported_rows_only"),
    reports: z.array(report).min(1).max(25),
  })
  .strict()
  .superRefine((value, ctx) => {
    const invalid = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    const expected = [...value.scope.awardIdentityKeys].sort();
    const actual = value.reports.map((item) => item.awardIdentityKey).sort();
    if (JSON.stringify(expected) !== JSON.stringify(actual))
      invalid(
        "Account observations must cover exactly the selected award scope",
      );
    if (
      value.reports.some(
        (item) => item.recordedAt !== null && item.recordedAt > value.knownAt,
      )
    )
      invalid("Account observation is newer than the knowledge snapshot");
    const ids = value.reports.flatMap((item) =>
      item.snapshotId === null ? [] : [item.snapshotId],
    );
    if (new Set(ids).size !== ids.length)
      invalid("One observation cannot identify different awards");
    if (new TextEncoder().encode(JSON.stringify(value)).byteLength > 1_048_576)
      invalid("Account report response exceeds one MiB");
  }) satisfies z.ZodType<ProcurementAccountReports>;

export const procurementAccountOperations = {
  "procurement.accountReports": defineOperation({
    service: "core",
    method: "POST",
    path: "/defense-budget/procurement/account-reports",
    source:
      "capiro-backend@07582f2e4c97887daf6458f4fd98ef725c42110f public packages/shared/src/defense-procurement.ts; account-report declarations; Core deployment unverified",
    request: z.object({ body: procurementAccountScope }).strict(),
    response: procurementAccountReports,
    timeoutMs: 20_000,
    requestLimitBytes: 16_384,
  }),
} as const;
