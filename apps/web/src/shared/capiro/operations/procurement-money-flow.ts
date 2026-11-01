import type {
  ProcurementFlowGroup,
  ProcurementHubSummary,
  ProcurementMeasure,
  ProcurementMoneyFlow,
  ProcurementScopeRequest,
} from "@capiro/shared";
import { z } from "zod";
import { defineOperation } from "../contracts";

// This is the supported full composite identity, including the parent tuple.
const awardIdentityKey = z
  .string()
  .max(512)
  .regex(
    /^usaspending\|award\|CONT_AWD_[A-Z0-9][A-Z0-9-]*_[A-Z0-9]{4}_(?:-NONE-_-NONE-|[A-Z0-9][A-Z0-9-]*_[A-Z0-9]{4})$/,
  );
const awardIdentityKeys = z
  .array(awardIdentityKey)
  .min(1)
  .max(25)
  .refine(
    (keys) => new Set(keys).size === keys.length,
    "Duplicate award identity",
  );
const exactInstant = z.string().refine((value) => {
  if (!/^(?!0000)\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(value))
    return false;
  const wholeSeconds = value.slice(0, 19);
  const date = new Date(`${wholeSeconds}.000Z`);
  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 19) === wholeSeconds
  );
}, "Expected an exact UTC microsecond timestamp");

export const procurementScope = z
  .object({
    awardIdentityKeys,
    knownAt: exactInstant.optional(),
    sourceThrough: exactInstant.optional(),
  })
  .strict() satisfies z.ZodType<ProcurementScopeRequest>;

const countPattern = /^(?:0|[1-9]\d{0,18})$/;
const countValue = (value: string) =>
  countPattern.test(value) ? BigInt(value) : 0n;
const count = z
  .string()
  .regex(countPattern)
  .refine(
    (value) => countValue(value) <= 9223372036854775807n,
    "Count exceeds bigint",
  );
// Bound the wire value without rounding it to JS number or a display precision.
const moneyPattern = /^-?(?:0|[1-9]\d{0,127})(?:\.\d{1,128})?$/;
const money = z
  .string()
  .regex(moneyPattern)
  .refine((value) => !/^-0(?:\.0+)?$/.test(value));
function amountsAgree(
  values: readonly (string | null)[],
  expected: string | null,
): boolean {
  const amounts = [...values, expected].map((value) =>
    value !== null && moneyPattern.test(value) ? value : "0",
  );
  const scale = Math.max(
    ...amounts.map((value) => (value.split(".")[1] ?? "").length),
  );
  const exact = (value: string) =>
    BigInt(value.replace(".", "")) *
    10n ** BigInt(scale - (value.split(".")[1] ?? "").length);
  return (
    amounts.slice(0, -1).reduce((sum, value) => sum + exact(value), 0n) ===
    exact(amounts.at(-1)!)
  );
}
const measureShape = {
  actions: count,
  obligationUsd: money.nullable(),
  // sam-contract-action/v2 has no reported action outlay measure.
  outlayUsd: z.null(),
  obligationKnown: count,
  outlayKnown: z.literal("0"),
};
function measureIsConsistent(value: ProcurementMeasure): boolean {
  return (
    countValue(value.actions) > 0n &&
    countValue(value.obligationKnown) <= countValue(value.actions) &&
    (value.obligationUsd === null) === (value.obligationKnown === "0")
  );
}
const measure = z
  .object(measureShape)
  .strict()
  .refine(
    measureIsConsistent,
    "Inconsistent measure counts or missing amount",
  ) satisfies z.ZodType<ProcurementMeasure>;
const label = z
  .string()
  .min(1)
  .max(4096)
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value));
const group = z
  .object({
    ...measureShape,
    fiscalYear: z.number().int().min(1).max(10000).nullable(),
    awardingAgency: label.nullable(),
    awardingSubTier: label.nullable(),
    contractorName: label.nullable(),
    recipientUei: z
      .string()
      .regex(/^[A-Z0-9]{12}$/)
      .nullable(),
    vendorIdentityState: z.enum(["source_uei", "unresolved"]),
    vendorKey: z.string().min(1).max(518),
    attributeState: z.enum([
      "latest_known_catalog_observation",
      "award_observation_fork",
      "missing_catalog_attributes",
    ]),
    latestSourceRevision: exactInstant,
    latestSourceObservedAt: exactInstant,
    latestRecordedAt: exactInstant,
    latestAttributeRecordedAt: exactInstant.nullable(),
  })
  .strict()
  .refine(
    measureIsConsistent,
    "Inconsistent group measure",
  ) satisfies z.ZodType<ProcurementFlowGroup>;
const sourceUrl = z
  .string()
  .max(4096)
  .url()
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    } catch {
      return false;
    }
  }, "Expected a public HTTPS source URL");
const producerToken = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/);
const provenance = z
  .object({
    awardIdentityKey,
    contract: z.literal("sam-contract-action/v2"),
    producerCommit: z.string().regex(/^[a-f0-9]{40}$/),
    imageDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    runId: producerToken,
    targetId: producerToken,
    selectedActions: count.refine((value) => countValue(value) > 0n),
    sourceUrl: sourceUrl.nullable(),
    catalogRevisionId: z.uuid().nullable(),
    catalogSourceUrl: sourceUrl.nullable(),
    attributeRecordedAt: exactInstant.nullable(),
  })
  .strict();
const responseShape = {
  contract: z.literal("defproc-scoped-money-flow/v1"),
  state: z.enum(["partial", "unavailable"]),
  measure: z.literal("qualified_observed_actions"),
  currency: z.literal("USD"),
  knownAt: exactInstant,
  sourceThrough: exactInstant.nullable(),
  scope: z
    .object({ awardIdentityKeys, includesDescendants: z.literal(false) })
    .strict(),
  totals: measure.nullable(),
  coverage: z
    .record(z.string().regex(/^[a-z][a-z_]{0,63}$/), count)
    .refine((value) => Object.keys(value).length <= 32),
  provenance: z.array(provenance).max(500),
  sources: z
    .array(
      z
        .object({
          system: z.enum(["sam_gov", "usaspending"]),
          documentationUrl: sourceUrl,
          semantics: label,
        })
        .strict(),
    )
    .length(2)
    .refine(
      (sources) => new Set(sources.map((source) => source.system)).size === 2,
    ),
};
function validateProjection(
  value: ProcurementMoneyFlow | ProcurementHubSummary,
  ctx: z.RefinementCtx,
) {
  const invalid = (message: string) =>
    ctx.addIssue({ code: "custom", message });
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > 1_048_576)
    invalid("Procurement response exceeds one MiB");
  const groups = "groups" in value ? value.groups : null;
  const groupCount = groups
    ? groups.length
    : (value as ProcurementHubSummary).groupCount;
  const totalActions = value.totals ? countValue(value.totals.actions) : 0n;
  if (value.state === "unavailable") {
    if (
      value.totals !== null ||
      groupCount !== 0 ||
      value.provenance.length !== 0
    )
      invalid("Unavailable data must not report selected money or actions");
  } else if (!value.totals || totalActions === 0n || groupCount === 0) {
    invalid("Partial data requires selected actions and groups");
  }
  if (countValue(value.coverage.selected ?? "0") !== totalActions)
    invalid("Selected coverage disagrees with totals");
  if (
    value.provenance.reduce(
      (sum, row) => sum + countValue(row.selectedActions),
      0n,
    ) !== totalActions
  )
    invalid("Provenance actions disagree with totals");
  for (const row of value.provenance) {
    if (!value.scope.awardIdentityKeys.includes(row.awardIdentityKey))
      invalid("Provenance exceeds the award scope");
    if (
      (row.catalogRevisionId === null) !== (row.attributeRecordedAt === null) ||
      (row.catalogRevisionId === null && row.catalogSourceUrl !== null)
    )
      invalid("Incomplete catalog provenance");
    if (row.attributeRecordedAt && row.attributeRecordedAt > value.knownAt)
      invalid("Catalog provenance exceeds known-at");
  }
  if (groups && value.totals) {
    for (const field of [
      "actions",
      "obligationKnown",
      "outlayKnown",
    ] as const) {
      if (
        groups.reduce((sum, row) => sum + countValue(row[field]), 0n) !==
        countValue(value.totals[field])
      )
        invalid("Group counts disagree with totals");
    }
    if (
      !amountsAgree(
        groups.map((row) => row.obligationUsd),
        value.totals.obligationUsd,
      )
    )
      invalid("Group obligations disagree with totals");
    for (const row of groups) validateGroup(row, value, invalid);
  }
}
function validateGroup(
  row: ProcurementFlowGroup,
  value: ProcurementMoneyFlow | ProcurementHubSummary,
  invalid: (message: string) => void,
) {
  if (row.vendorIdentityState === "source_uei") {
    if (!row.recipientUei || row.vendorKey !== `uei:${row.recipientUei}`)
      invalid("Vendor identity disagrees with source UEI");
  } else if (
    row.recipientUei !== null ||
    !value.scope.awardIdentityKeys.some(
      (key) => row.vendorKey === `award:${key}`,
    )
  ) {
    invalid("Unresolved vendor must remain scoped to its exact award");
  }
  if (
    row.latestRecordedAt > value.knownAt ||
    (row.latestAttributeRecordedAt &&
      row.latestAttributeRecordedAt > value.knownAt)
  )
    invalid("Observation exceeds known-at");
  if (value.sourceThrough && row.latestSourceRevision > value.sourceThrough)
    invalid("Source revision exceeds cutoff");
  if (row.attributeState === "latest_known_catalog_observation") {
    if (!row.latestAttributeRecordedAt)
      invalid("Catalog attributes require a recorded time");
  } else if (
    row.latestAttributeRecordedAt !== null ||
    row.awardingAgency !== null ||
    row.awardingSubTier !== null ||
    row.contractorName !== null ||
    row.recipientUei !== null
  )
    invalid("Unresolved attributes cannot imply catalog facts");
}

export const procurementMoneyFlow = z
  .object({
    ...responseShape,
    groups: z.array(group).max(500),
  })
  .strict()
  .superRefine(validateProjection) satisfies z.ZodType<ProcurementMoneyFlow>;
export const procurementHubSummary = z
  .object({
    ...responseShape,
    groupCount: z.number().int().min(0).max(500),
  })
  .strict()
  .superRefine(validateProjection) satisfies z.ZodType<ProcurementHubSummary>;

const source =
  "capiro-backend@f326ba7926606a6c5810c7608b627637bdf3092d public packages/shared/src/defense-procurement.ts; scoped original-source procurement v1";
const request = z.object({ body: procurementScope }).strict();
export const procurementOperations = {
  "procurement.moneyFlow": defineOperation({
    service: "core",
    method: "POST",
    path: "/defense-budget/procurement/money-flow",
    source,
    request,
    response: procurementMoneyFlow,
    timeoutMs: 20_000,
    requestLimitBytes: 16_384,
  }),
  "procurement.hubSummary": defineOperation({
    service: "core",
    method: "POST",
    path: "/hub/procurement/summary",
    source,
    request,
    response: procurementHubSummary,
    timeoutMs: 20_000,
    requestLimitBytes: 16_384,
  }),
} as const;
