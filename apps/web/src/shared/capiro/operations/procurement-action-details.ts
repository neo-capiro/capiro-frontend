import { z } from "zod";
import type {
  ProcurementActionDetail,
  ProcurementMoneyFlow,
} from "@capiro/shared/defense-procurement";
import { defineOperation } from "../contracts";
import {
  amountsAgree,
  procurementMoneyFlow,
  procurementScope,
} from "./procurement-money-flow";

// Reuse the existing admission rules instead of maintaining another money/clock/scope parser.
const groupFields = procurementMoneyFlow.shape.groups.element.shape;
const exactInstant = procurementMoneyFlow.shape.knownAt;
const awardIdentityKey = procurementScope.shape.awardIdentityKeys.element;
const label = groupFields.contractorName.unwrap();
const identifier = label.max(512);
const orgLevel = z
  .object({ code: label.nullable(), name: label.nullable() })
  .strict();
const organization = z
  .object({ department: orgLevel, subtier: orgLevel, office: orgLevel })
  .strict();
const actionDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) => exactInstant.safeParse(`${value}T00:00:00.000000Z`).success,
    "Invalid action date",
  )
  .nullable();

export const procurementActionDetailsScope = procurementScope.extend({
  includeActionDetails: z.literal(true),
});
export const actionDetailSchema = z
  .object({
    transactionIdentityKey: z
      .string()
      .min(1)
      .max(2048)
      .startsWith("sam_gov|modification|"),
    awardIdentityKey,
    awardUniqueId: identifier,
    selectedRevisionId: z.uuid(),
    piid: identifier,
    submittingAgencyCode: identifier,
    parentPiid: identifier.nullable(),
    parentAgencyCode: identifier.nullable(),
    modificationNumber: identifier,
    transactionNumber: identifier,
    awardType: z.enum(["A", "B", "C", "D"]),
    actionDate,
    fiscalYear: groupFields.fiscalYear,
    obligationUsd: groupFields.obligationUsd.unwrap(),
    outlayUsd: z.null(),
    sourceRevisionOrder: exactInstant,
    sourceObservedAt: exactInstant,
    recordedAt: exactInstant,
    sourceUrl: procurementMoneyFlow.shape.provenance.element.shape.sourceUrl,
    sourcePayloadHash: z.string().regex(/^[a-f0-9]{64}$/),
    vendorKey: groupFields.vendorKey,
    contractorName: groupFields.contractorName,
    recipientUei: groupFields.recipientUei,
    vendorIdentityState: groupFields.vendorIdentityState,
    attributeState: groupFields.attributeState,
    fundingOrganization: organization,
    contractingOrganization: organization,
  })
  .strict() satisfies z.ZodType<ProcurementActionDetail>;

type AmountGroup = { count: bigint; known: bigint; amounts: (string | null)[] };
const groupKey = (year: number | null, vendor: string) =>
  JSON.stringify([year, vendor]);

export const procurementActionDetailsResponse = z
  .object({
    ...procurementMoneyFlow.shape,
    actionDetails: z.array(actionDetailSchema).max(2500),
  })
  .strict()
  .superRefine((value, ctx) => {
    const { actionDetails: details, ...summary } = value;
    const admitted = procurementMoneyFlow.safeParse(summary);
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
      invalid("Procurement response with action details exceeds one MiB");
      return;
    }
    if (details.length > 2500) return; // Array admission already refused it; never truncate.
    const transactions = new Set<string>(),
      revisions = new Set<string>();
    const actual = new Map<string, AmountGroup>();
    for (const detail of details) {
      if (!value.scope.awardIdentityKeys.includes(detail.awardIdentityKey))
        invalid("Detail exceeds selected award scope");
      const award = `CONT_AWD_${detail.piid}_${detail.submittingAgencyCode}_${detail.parentPiid ?? "-NONE-"}_${detail.parentAgencyCode ?? "-NONE-"}`;
      if (
        (detail.parentPiid === null) !== (detail.parentAgencyCode === null) ||
        detail.awardUniqueId !== award ||
        detail.awardIdentityKey !== `usaspending|award|${award}`
      )
        invalid(
          "Detail full award identity disagrees with PIID/agency/parent tuple",
        );
      const transaction =
        "sam_gov|modification|" +
        encodeURIComponent(
          JSON.stringify([
            "sam-contract-action/v2",
            detail.awardIdentityKey,
            detail.modificationNumber,
            detail.transactionNumber,
          ]),
        );
      if (detail.transactionIdentityKey !== transaction)
        invalid("Detail transaction tuple disagrees with its identity");
      if (
        transactions.has(detail.transactionIdentityKey) ||
        revisions.has(detail.selectedRevisionId)
      )
        invalid("Duplicate action or selected revision");
      transactions.add(detail.transactionIdentityKey);
      revisions.add(detail.selectedRevisionId);
      if (detail.recordedAt > value.knownAt)
        invalid("Detail recorded time exceeds known-at");
      if (
        value.sourceThrough &&
        detail.sourceRevisionOrder > value.sourceThrough
      )
        invalid("Detail source revision exceeds cutoff");
      if (detail.vendorIdentityState === "source_uei") {
        if (
          !detail.recipientUei ||
          detail.vendorKey !== `uei:${detail.recipientUei}`
        )
          invalid("Detail vendor disagrees with source UEI");
      } else if (
        detail.recipientUei !== null ||
        detail.vendorKey !== `award:${detail.awardIdentityKey}`
      ) {
        invalid(
          "Unresolved detail vendor must remain scoped to its exact award",
        );
      }
      if (
        detail.attributeState !== "latest_known_catalog_observation" &&
        (detail.contractorName !== null || detail.recipientUei !== null)
      )
        invalid("Unresolved catalog attributes cannot assert vendor facts");
      const key = groupKey(detail.fiscalYear, detail.vendorKey);
      const combined = actual.get(key) ?? { count: 0n, known: 0n, amounts: [] };
      combined.count++;
      combined.known++;
      combined.amounts.push(detail.obligationUsd);
      actual.set(key, combined);
    }
    if (
      BigInt(details.length) !== BigInt(value.totals?.actions ?? "0") ||
      BigInt(details.length) !== BigInt(value.totals?.obligationKnown ?? "0")
    )
      invalid("Detail counts disagree with summary counts");
    if (
      !amountsAgree(
        details.map((detail) => detail.obligationUsd),
        value.totals?.obligationUsd ?? null,
      )
    )
      invalid("Detail obligations disagree with summary totals");

    // Different awarding-catalog groups may share a vendor/year. Contracting org is NOT awarding org.
    const expected = new Map<string, AmountGroup>();
    for (const group of value.groups) {
      const key = groupKey(group.fiscalYear, group.vendorKey);
      const combined = expected.get(key) ?? {
        count: 0n,
        known: 0n,
        amounts: [],
      };
      combined.count += BigInt(group.actions);
      combined.known += BigInt(group.obligationKnown);
      combined.amounts.push(group.obligationUsd);
      expected.set(key, combined);
    }
    if (actual.size !== expected.size)
      invalid("Detail vendor/year groups disagree with summary");
    for (const [key, wanted] of expected) {
      const found = actual.get(key);
      if (
        !found ||
        found.count !== wanted.count ||
        found.known !== wanted.known
      ) {
        invalid("Detail vendor/year counts disagree with summary");
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
        invalid("Detail vendor/year obligations disagree with summary");
    }
  }) satisfies z.ZodType<
  ProcurementMoneyFlow & { actionDetails: readonly ProcurementActionDetail[] }
>;

export const procurementActionDetailsOperations = {
  "procurement.actionDetails": defineOperation({
    service: "core",
    method: "POST",
    path: "/defense-budget/procurement/money-flow",
    source:
      "capiro-backend@07582f2e4c97887daf6458f4fd98ef725c42110f public packages/shared/src/defense-procurement.ts; opt-in declarations; Core deployment unverified",
    request: z.object({ body: procurementActionDetailsScope }).strict(),
    response: procurementActionDetailsResponse,
    timeoutMs: 20_000,
    requestLimitBytes: 16_384,
  }),
} as const;
