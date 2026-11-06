import type {
  ProcurementObservedActionDetail,
  ProcurementObservedFlowGroup,
  ProcurementObservedMoneyFlow,
} from "@capiro/shared";
import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  amountsAgree,
  procurementMoneyFlow,
  procurementScope,
} from "./procurement-money-flow";
import { actionDetailSchema } from "./procurement-action-details";

// ---------------------------------------------------------------------------
// Shared validators extracted from admitted schemas (no weaker re-definitions)
// ---------------------------------------------------------------------------
const exactInstant = procurementScope.shape.knownAt.unwrap();
const awardIdentityKeys = procurementScope.shape.awardIdentityKeys;
const awardIdentityKey = awardIdentityKeys.element;
const mfGroupShape = procurementMoneyFlow.shape.groups.element.shape;
const mfProvenanceShape = procurementMoneyFlow.shape.provenance.element.shape;

const countValue = (value: string) => BigInt(value);
function measureIsConsistent(value: {
  actions: string;
  obligationUsd: string | null;
  obligationKnown: string;
}): boolean {
  return (
    countValue(value.actions) > 0n &&
    countValue(value.obligationKnown) <= countValue(value.actions) &&
    (value.obligationUsd === null) === (value.obligationKnown === "0")
  );
}

// ---------------------------------------------------------------------------
// Request schema — no sourceThrough field; revisionBasis required
// ---------------------------------------------------------------------------
export const procurementObservedActionDetailsScope = z
  .object({
    awardIdentityKeys,
    knownAt: exactInstant.optional(),
    revisionBasis: z.literal("latest_observed"),
    includeActionDetails: z.literal(true),
  })
  .strict();

// ---------------------------------------------------------------------------
// Observed group: ProcurementFlowGroup minus latestSourceRevision
// ---------------------------------------------------------------------------
const { latestSourceRevision: _omittedRevision, ...observedGroupShapeFields } =
  mfGroupShape;
const observedGroup = z
  .object(observedGroupShapeFields)
  .strict()
  .refine(
    measureIsConsistent,
    "Inconsistent observed group measure",
  ) satisfies z.ZodType<ProcurementObservedFlowGroup>;

// ---------------------------------------------------------------------------
// Observed provenance: contract is sam-contract-action/observed-v1
// ---------------------------------------------------------------------------
const { contract: _omittedContract, ...baseProvenanceFields } =
  mfProvenanceShape;
const observedProvenance = z
  .object({
    ...baseProvenanceFields,
    contract: z.literal("sam-contract-action/observed-v1"),
  })
  .strict();

// ---------------------------------------------------------------------------
// Observed action detail: minus sourceRevisionOrder, plus sourceRevisionLabel
// ---------------------------------------------------------------------------
const {
  sourceRevisionOrder: _omittedOrder,
  transactionIdentityKey: _omittedTxId,
  ...baseActionDetailFields
} = actionDetailSchema.shape;
export const observedActionDetailSchema = z
  .object({
    ...baseActionDetailFields,
    transactionIdentityKey: z
      .string()
      .min(1)
      .max(2048)
      .startsWith("sam_gov|modification|"),
    sourceRevisionLabel: z
      .string()
      .max(256)
      .refine(
        (label) => !/[\u0000-\u001f\u007f]/.test(label),
        "Publisher label contains controls",
      )
      .nullable(),
  })
  .strict() satisfies z.ZodType<ProcurementObservedActionDetail>;

// ---------------------------------------------------------------------------
// Response envelope — base shape (without groups / actionDetails)
// ---------------------------------------------------------------------------
const {
  contract: _oldContract,
  measure: _oldMeasure,
  sourceThrough: _oldSourceThrough,
  groups: _oldGroups,
  ...baseResponseFields
} = procurementMoneyFlow.shape;

const observedResponseBase = z
  .object({
    ...baseResponseFields,
    contract: z.literal("defproc-observed-money-flow/v1"),
    measure: z.literal("latest_observed_actions"),
    revisionBasis: z.literal("latest_observed"),
    sourceThrough: z.null(),
    provenance: z.array(observedProvenance).max(500),
    groups: z.array(observedGroup).max(500),
  })
  .strict();

// Re-use projection validation, adapted for observed (no sourceThrough checks).
function validateObservedProjection(
  value: z.infer<typeof observedResponseBase>,
  ctx: z.RefinementCtx,
) {
  const invalid = (message: string) =>
    ctx.addIssue({ code: "custom", message });
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > 1_048_576)
    invalid("Observed procurement response exceeds one MiB");
  const { groups } = value;
  const totalActions = value.totals ? countValue(value.totals.actions) : 0n;
  if (value.state === "unavailable") {
    if (
      value.totals !== null ||
      groups.length !== 0 ||
      value.provenance.length !== 0
    )
      invalid(
        "Unavailable observed data must not report selected money or actions",
      );
  } else if (!value.totals || totalActions === 0n || groups.length === 0) {
    invalid("Partial observed data requires selected actions and groups");
  }
  if (countValue(value.coverage.selected ?? "0") !== totalActions)
    invalid("Selected coverage disagrees with observed totals");
  if (
    value.provenance.reduce(
      (sum, row) => sum + countValue(row.selectedActions),
      0n,
    ) !== totalActions
  )
    invalid("Provenance actions disagree with observed totals");
  for (const row of value.provenance) {
    if (!value.scope.awardIdentityKeys.includes(row.awardIdentityKey))
      invalid("Provenance exceeds the observed award scope");
    if (
      (row.catalogRevisionId === null) !== (row.attributeRecordedAt === null) ||
      (row.catalogRevisionId === null && row.catalogSourceUrl !== null)
    )
      invalid("Incomplete catalog provenance for observed");
    if (row.attributeRecordedAt && row.attributeRecordedAt > value.knownAt)
      invalid("Catalog provenance exceeds observed known-at");
  }
  if (value.totals) {
    for (const field of [
      "actions",
      "obligationKnown",
      "outlayKnown",
    ] as const) {
      if (
        groups.reduce((sum, row) => sum + countValue(row[field]), 0n) !==
        countValue(value.totals[field])
      )
        invalid(`Observed group ${field} disagrees with totals`);
    }
    if (
      !amountsAgree(
        groups.map((row) => row.obligationUsd),
        value.totals.obligationUsd,
      )
    )
      invalid("Observed group obligations disagree with totals");
    for (const row of groups) {
      if (row.vendorIdentityState === "source_uei") {
        if (!row.recipientUei || row.vendorKey !== `uei:${row.recipientUei}`)
          invalid("Observed vendor identity disagrees with source UEI");
      } else if (
        row.recipientUei !== null ||
        !value.scope.awardIdentityKeys.some(
          (key) => row.vendorKey === `award:${key}`,
        )
      ) {
        invalid(
          "Unresolved observed vendor must remain scoped to its exact award",
        );
      }
      if (
        row.latestRecordedAt > value.knownAt ||
        (row.latestAttributeRecordedAt &&
          row.latestAttributeRecordedAt > value.knownAt)
      )
        invalid("Observed observation exceeds known-at");
      if (row.attributeState === "latest_known_catalog_observation") {
        if (!row.latestAttributeRecordedAt)
          invalid("Observed catalog attributes require a recorded time");
      } else if (
        row.latestAttributeRecordedAt !== null ||
        row.awardingAgency !== null ||
        row.awardingSubTier !== null ||
        row.contractorName !== null ||
        row.recipientUei !== null
      )
        invalid("Unresolved observed attributes cannot imply catalog facts");
    }
  }
}

export const procurementObservedMoneyFlowBase =
  observedResponseBase.superRefine(
    validateObservedProjection,
  ) satisfies z.ZodType<ProcurementObservedMoneyFlow>;

// ---------------------------------------------------------------------------
// Full response with action details (the operation response type)
// ---------------------------------------------------------------------------
type ObservedAmountGroup = {
  count: bigint;
  known: bigint;
  amounts: (string | null)[];
};
const observedGroupKey = (year: number | null, vendor: string) =>
  JSON.stringify([year, vendor]);

export const procurementObservedActionDetailsResponse = z
  .object({
    ...observedResponseBase.shape,
    actionDetails: z.array(observedActionDetailSchema).max(2500),
  })
  .strict()
  .superRefine((value, ctx) => {
    const { actionDetails: details, ...summary } = value;
    const admitted = observedResponseBase.safeParse(summary);
    if (!admitted.success) {
      for (const issue of admitted.error.issues)
        ctx.addIssue({
          code: "custom",
          path: issue.path,
          message: issue.message,
        });
      return;
    }
    const invalid = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    if (
      new TextEncoder().encode(JSON.stringify(value)).byteLength > 1_048_576
    ) {
      invalid("Observed response with action details exceeds one MiB");
      return;
    }
    if (details.length > 2500) return;
    const transactions = new Set<string>(),
      revisions = new Set<string>();
    const actual = new Map<string, ObservedAmountGroup>();
    for (const detail of details) {
      if (!value.scope.awardIdentityKeys.includes(detail.awardIdentityKey))
        invalid("Observed detail exceeds selected award scope");
      const award = `CONT_AWD_${detail.piid}_${detail.submittingAgencyCode}_${detail.parentPiid ?? "-NONE-"}_${detail.parentAgencyCode ?? "-NONE-"}`;
      if (
        (detail.parentPiid === null) !== (detail.parentAgencyCode === null) ||
        detail.awardUniqueId !== award ||
        detail.awardIdentityKey !== `usaspending|award|${award}`
      )
        invalid(
          "Observed detail full award identity disagrees with PIID/agency/parent tuple",
        );
      // Identity tuple uses the observed-v1 contract prefix
      const transaction =
        "sam_gov|modification|" +
        encodeURIComponent(
          JSON.stringify([
            "sam-contract-action/observed-v1",
            detail.awardIdentityKey,
            detail.modificationNumber,
            detail.transactionNumber,
          ]),
        );
      if (detail.transactionIdentityKey !== transaction)
        invalid(
          "Observed detail transaction tuple disagrees with its identity",
        );
      if (
        transactions.has(detail.transactionIdentityKey) ||
        revisions.has(detail.selectedRevisionId)
      )
        invalid("Duplicate observed action or selected revision");
      transactions.add(detail.transactionIdentityKey);
      revisions.add(detail.selectedRevisionId);
      if (detail.recordedAt > value.knownAt)
        invalid("Observed detail recorded time exceeds known-at");
      // sourceThrough is always null; no revision order to check
      if (detail.vendorIdentityState === "source_uei") {
        if (
          !detail.recipientUei ||
          detail.vendorKey !== `uei:${detail.recipientUei}`
        )
          invalid("Observed detail vendor disagrees with source UEI");
      } else if (
        detail.recipientUei !== null ||
        detail.vendorKey !== `award:${detail.awardIdentityKey}`
      ) {
        invalid(
          "Unresolved observed detail vendor must remain scoped to its exact award",
        );
      }
      if (
        detail.attributeState !== "latest_known_catalog_observation" &&
        (detail.contractorName !== null || detail.recipientUei !== null)
      )
        invalid(
          "Unresolved observed catalog attributes cannot assert vendor facts",
        );
      const key = observedGroupKey(detail.fiscalYear, detail.vendorKey);
      const combined = actual.get(key) ?? {
        count: 0n,
        known: 0n,
        amounts: [],
      };
      combined.count++;
      combined.known++;
      combined.amounts.push(detail.obligationUsd);
      actual.set(key, combined);
    }
    if (
      BigInt(details.length) !== BigInt(value.totals?.actions ?? "0") ||
      BigInt(details.length) !== BigInt(value.totals?.obligationKnown ?? "0")
    )
      invalid("Observed detail counts disagree with summary counts");
    if (
      !amountsAgree(
        details.map((detail) => detail.obligationUsd),
        value.totals?.obligationUsd ?? null,
      )
    )
      invalid("Observed detail obligations disagree with summary totals");
    const expected = new Map<string, ObservedAmountGroup>();
    for (const group of value.groups) {
      const key = observedGroupKey(group.fiscalYear, group.vendorKey);
      const combined = expected.get(key) ?? {
        count: 0n,
        known: 0n,
        amounts: [],
      };
      combined.count += countValue(group.actions);
      combined.known += countValue(group.obligationKnown);
      combined.amounts.push(group.obligationUsd);
      expected.set(key, combined);
    }
    if (actual.size !== expected.size)
      invalid("Observed detail vendor/year groups disagree with summary");
    for (const [key, wanted] of expected) {
      const found = actual.get(key);
      if (
        !found ||
        found.count !== wanted.count ||
        found.known !== wanted.known
      ) {
        invalid("Observed detail vendor/year counts disagree with summary");
        continue;
      }
      const inverse = wanted.amounts.map((amount) =>
        amount === null
          ? null
          : amount.startsWith("-")
            ? amount.slice(1)
            : `-${amount}`,
      );
      if (!amountsAgree([...found.amounts, ...inverse], "0"))
        invalid(
          "Observed detail vendor/year obligations disagree with summary",
        );
    }
  });

// ---------------------------------------------------------------------------
// Operation registration
// ---------------------------------------------------------------------------
const observedSource =
  "capiro-backend@f7c284a25264a3b830ee2831dab967b2c33b5b31 public packages/shared/src/defense-procurement.ts; observed contract; serving unverified";

export const procurementObservedOperations = {
  "procurement.observedActionDetails": defineOperation({
    service: "core",
    method: "POST",
    path: "/defense-budget/procurement/money-flow",
    source: observedSource,
    request: z.object({ body: procurementObservedActionDetailsScope }).strict(),
    response: procurementObservedActionDetailsResponse,
    timeoutMs: 20_000,
    requestLimitBytes: 16_384,
  }),
} as const;
