import { z } from "zod";

// WIRE.md SHA25664181558d22ccd71bf1b09f5644a2431e591567cd2b77913f9a6471b7004e8e2.
// Backend PR27 source9a151f4dbf9e910ce9a78c3cb40a5dc53390508e; runtime qualification is separate.
const id = z.uuid().transform((value) => value.toLowerCase());
const version = z.number().int().min(1).max(2147483647);
const instant = z.iso.datetime({ offset: true });
const title = z.string().trim().min(1).max(200);
const lifecycle = z.enum(["draft", "active", "archived"]);
const uniqueIds = (maximum: number) =>
  z
    .array(id)
    .max(maximum)
    .refine((ids) => new Set(ids).size === ids.length, "IDs must be unique.");
const dateOnly = z
  .string()
  .regex(/^(?!0000)\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      Number.isFinite(date.valueOf()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, "Use a real calendar date.");
const timeZone = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Use an explicit IANA timezone.")
  .transform(
    (value) =>
      new Intl.DateTimeFormat("en", { timeZone: value }).resolvedOptions()
        .timeZone,
  );
export const engagementPlanWindowSchema = z
  .object({ startDate: dateOnly, endDateExclusive: dateOnly, timeZone })
  .strict()
  .refine(
    (value) => value.startDate < value.endDateExclusive,
    "The exclusive end date must follow the start date.",
  );
const officeInput = z
  .object({
    targetId: id,
    officeKey: z
      .string()
      .trim()
      .min(1)
      .max(512)
      .regex(/^(?:directory|manual):\S+$/),
  })
  .strict();
const officeInputs = z
  .array(officeInput)
  .max(200)
  .refine(
    (items) =>
      new Set(items.map((item) => item.targetId)).size === items.length &&
      new Set(items.map((item) => item.officeKey)).size === items.length,
    "Office identities must be unique.",
  );
const office = officeInput.extend({ available: z.boolean() }).strict();
const objectiveInput = z
  .object({ objectiveId: id, objectiveVersion: version })
  .strict();
const objectiveBinding = objectiveInput
  .extend({ clientId: id, objectiveRevisionId: id })
  .strict();
const rawWave = z
  .object({
    id,
    clientId: id,
    planId: id,
    title,
    position: z.number().int().nonnegative(),
    formatLabel: z.string().max(120).nullable(),
    window: engagementPlanWindowSchema.nullable(),
    officeTargetIds: uniqueIds(200),
    archivedAt: instant.nullable(),
    createdAt: instant,
    updatedAt: instant,
  })
  .strict();
const wave = rawWave
  .extend({ planVersion: version, unavailableOfficeTargetIds: uniqueIds(200) })
  .strict();
const rawPlan = z
  .object({
    id,
    clientId: id,
    title,
    lifecycle,
    version,
    officeReferences: z
      .array(office)
      .max(200)
      .refine(
        (items) =>
          new Set(items.map((item) => item.targetId)).size === items.length &&
          new Set(items.map((item) => item.officeKey)).size === items.length,
        "Office identities must be unique.",
      ),
    objectiveBinding: objectiveBinding.nullable(),
    reviewedPlanVersion: version.nullable(),
    reviewedAt: instant.nullable(),
    reviewDueAt: instant.nullable(),
    reviewedByUserId: id.nullable(),
    createdByUserId: id,
    createdAt: instant,
    updatedAt: instant,
  })
  .strict();
export const engagementPlanSchema = rawPlan
  .extend({
    review: z
      .object({
        status: z.enum(["unknown", "current", "stale"]),
        reason: z.enum([
          "not_reviewed",
          "invalid_review_basis",
          "plan_changed",
          "review_expired",
          "review_current",
        ]),
        checkedAt: instant,
        meaning: z.literal("explicitly_reviewed_version"),
      })
      .strict(),
    waves: z.array(wave),
  })
  .strict()
  .superRefine((plan, context) => {
    const review =
      plan.reviewedPlanVersion === null || plan.reviewDueAt === null
        ? ["unknown", "not_reviewed"]
        : plan.reviewedPlanVersion > plan.version
          ? ["unknown", "invalid_review_basis"]
          : Date.parse(plan.review.checkedAt) >= Date.parse(plan.reviewDueAt)
            ? ["stale", "review_expired"]
            : plan.reviewedPlanVersion !== plan.version
              ? ["stale", "plan_changed"]
              : ["current", "review_current"];
    if (plan.review.status !== review[0] || plan.review.reason !== review[1])
      context.addIssue({
        code: "custom",
        message:
          "Review projection does not match its raw basis and checked timestamp.",
      });
    if (
      plan.objectiveBinding &&
      plan.objectiveBinding.clientId !== plan.clientId
    )
      context.addIssue({
        code: "custom",
        message: "Objective binding does not match the plan client.",
      });
    if (new Set(plan.waves.map((item) => item.id)).size !== plan.waves.length)
      context.addIssue({
        code: "custom",
        message: "Wave identities must be unique.",
      });
    for (const child of plan.waves) {
      if (
        child.clientId !== plan.clientId ||
        child.planId !== plan.id ||
        child.planVersion !== plan.version
      )
        context.addIssue({
          code: "custom",
          message: "Wave does not match the current parent aggregate.",
        });
      const unavailable = child.officeTargetIds.filter(
        (targetId) =>
          !plan.officeReferences.some(
            (office) => office.targetId === targetId && office.available,
          ),
      );
      if (
        child.officeTargetIds.some(
          (targetId) =>
            !plan.officeReferences.some(
              (office) => office.targetId === targetId,
            ),
        ) ||
        unavailable.length !== child.unavailableOfficeTargetIds.length ||
        unavailable.some(
          (targetId) => !child.unavailableOfficeTargetIds.includes(targetId),
        )
      )
        context.addIssue({
          code: "custom",
          message:
            "Wave office integrity does not match the current plan references.",
        });
    }
  });
const planReceipt = z
  .object({
    operation: z.literal("create_plan"),
    planId: id,
    clientId: id,
    planVersion: version,
    requestId: id,
  })
  .strict();
const waveReceipt = planReceipt
  .extend({ operation: z.literal("create_wave"), waveId: id })
  .strict();
export const engagementPlanCreationSchema = z
  .object({
    receipt: z.discriminatedUnion("operation", [planReceipt, waveReceipt]),
    reconciled: z.boolean(),
    aggregate: engagementPlanSchema,
  })
  .strict();
export const engagementPlanListSchema = z
  .object({
    items: z.array(engagementPlanSchema),
    summaries: z.array(
      z
        .object({
          clientId: id,
          totalPlans: z.number().int().nonnegative(),
          activePlans: z.number().int().nonnegative(),
          archivedPlans: z.number().int().nonnegative(),
          draftPlans: z.number().int().nonnegative(),
          planIdsOnPage: z.array(id),
          complete: z.literal(true),
          checkedAt: instant,
        })
        .strict(),
    ),
    pagination: z
      .object({
        hasMore: z.boolean(),
        nextCursor: z.string().min(1).max(512).nullable(),
      })
      .strict(),
    completeness: z
      .object({
        read: z.literal("complete"),
        page: z.enum(["partial", "complete"]),
        summaryCoverage: z.enum(["selected_client", "returned_clients"]),
      })
      .strict(),
  })
  .strict()
  .superRefine((result, context) => {
    const fail = (message: string) =>
      context.addIssue({ code: "custom", message });
    if (
      result.pagination.hasMore !== Boolean(result.pagination.nextCursor) ||
      (result.completeness.page === "partial") !== result.pagination.hasMore
    )
      fail("Pagination completeness does not match its cursor.");
    if (
      new Set(result.items.map((item) => item.id)).size !==
        result.items.length ||
      new Set(result.summaries.map((item) => item.clientId)).size !==
        result.summaries.length
    )
      fail("Plan and summary identities must be unique.");
    if (
      result.completeness.summaryCoverage === "selected_client" &&
      result.summaries.length !== 1
    )
      fail("A selected client requires its complete summary.");
    const clients = new Set(result.items.map((item) => item.clientId));
    if (
      result.completeness.summaryCoverage === "returned_clients" &&
      (clients.size !== result.summaries.length ||
        result.summaries.some((item) => !clients.has(item.clientId)))
    )
      fail("Unscoped summaries cover returned clients only.");
    for (const summary of result.summaries) {
      const pageIds = result.items
        .filter((item) => item.clientId === summary.clientId)
        .map((item) => item.id);
      if (
        summary.totalPlans !==
          summary.activePlans + summary.archivedPlans + summary.draftPlans ||
        summary.totalPlans < pageIds.length ||
        summary.planIdsOnPage.length !== pageIds.length ||
        new Set(summary.planIdsOnPage).size !== pageIds.length ||
        pageIds.some((value) => !summary.planIdsOnPage.includes(value))
      )
        fail("Summary counts or page identities are inconsistent.");
    }
    if (
      result.items.some(
        (item) =>
          !result.summaries.some(
            (summary) => summary.clientId === item.clientId,
          ),
      )
    )
      fail("Each returned client requires its complete summary.");
  });
export const engagementPlanHistorySchema = z
  .object({
    planId: id,
    clientId: id,
    planVersion: version,
    items: z.array(
      z
        .object({
          version,
          operation: z.string(),
          actorUserId: id,
          createdAt: instant,
          snapshot: rawPlan.extend({ waves: z.array(rawWave) }).strict(),
        })
        .strict(),
    ),
    pagination: z
      .object({ hasMore: z.boolean(), beforeVersion: version.nullable() })
      .strict(),
    completeness: z.enum(["partial", "complete"]),
  })
  .strict()
  .superRefine((result, context) => {
    const fail = (message: string) =>
      context.addIssue({ code: "custom", message });
    if (
      result.pagination.hasMore !==
        (result.pagination.beforeVersion !== null) ||
      (result.completeness === "partial") !== result.pagination.hasMore ||
      (result.pagination.hasMore &&
        result.pagination.beforeVersion !== result.items.at(-1)?.version)
    )
      fail("History pagination is inconsistent.");
    for (const [index, item] of result.items.entries()) {
      const snapshot = item.snapshot;
      if (
        snapshot.id !== result.planId ||
        snapshot.clientId !== result.clientId ||
        snapshot.version !== item.version ||
        item.version > result.planVersion ||
        (index > 0 && item.version >= result.items[index - 1]!.version)
      )
        fail("History revision identity or ordering does not match this plan.");
      if (
        snapshot.waves.some(
          (child) =>
            child.planId !== snapshot.id ||
            child.clientId !== snapshot.clientId,
        )
      )
        fail("Historical wave identity does not match its snapshot.");
    }
  });
export const engagementPlanCreateBody = z
  .object({
    clientId: id,
    requestId: id,
    title,
    officeReferences: officeInputs.optional(),
    objective: objectiveInput.nullable().optional(),
  })
  .strict();
export const engagementPlanPatchBody = z
  .object({
    expectedPlanVersion: version,
    title: title.optional(),
    officeReferences: officeInputs.optional(),
    objective: objectiveInput.nullable().optional(),
    action: z.enum(["activate", "deactivate", "archive", "restore"]).optional(),
  })
  .strict()
  .refine(
    (body) => !body.action || Object.keys(body).length === 2,
    "Lifecycle actions are separate commands.",
  );
const waveFields = {
  title,
  formatLabel: z
    .string()
    .trim()
    .max(120)
    .nullable()
    .transform((value) => value || null)
    .optional(),
  window: engagementPlanWindowSchema.nullable().optional(),
  officeTargetIds: uniqueIds(200).optional(),
};
export const engagementPlanWaveCreateBody = z
  .object({ requestId: id, expectedPlanVersion: version, ...waveFields })
  .strict();
export const engagementPlanWavePatchBody = z
  .object({
    expectedPlanVersion: version,
    title: title.optional(),
    formatLabel: waveFields.formatLabel,
    window: waveFields.window,
    officeTargetIds: waveFields.officeTargetIds,
    action: z.enum(["archive", "restore"]).optional(),
  })
  .strict()
  .refine(
    (body) => !body.action || Object.keys(body).length === 2,
    "Wave lifecycle actions are separate commands.",
  );
const reviewInstant = instant.refine(
  (value) =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) && dateOnly.safeParse(value.slice(0, 10)).success,
  "Use a full ISO timestamp with seconds and an explicit offset.",
);
export const engagementPlanReviewBody = z
  .object({ expectedPlanVersion: version, reviewDueAt: reviewInstant })
  .strict();

const params = z.object({ planId: id }).strict();
const integerQuery = (maximum: number) =>
  z.union([
    z.number().int().min(1).max(maximum),
    z
      .string()
      .regex(/^[1-9]\d*$/)
      .refine(
        (value) =>
          Number.isSafeInteger(Number(value)) && Number(value) <= maximum,
      ),
  ]);
const limit = integerQuery(100);
export const engagementPlanListRequest = z
  .object({
    query: z
      .object({
        clientId: id.optional(),
        cursor: z.string().min(1).max(512).optional(),
        limit: limit.optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export const engagementPlanDetailRequest = z.object({ params }).strict();
export const engagementPlanCreateRequest = z
  .object({ body: engagementPlanCreateBody })
  .strict();
export const engagementPlanPatchRequest = z
  .object({ params, body: engagementPlanPatchBody })
  .strict();
export const engagementPlanWaveCreateRequest = z
  .object({ params, body: engagementPlanWaveCreateBody })
  .strict();
export const engagementPlanWavePatchRequest = z
  .object({
    params: params.extend({ waveId: id }).strict(),
    body: engagementPlanWavePatchBody,
  })
  .strict();
export const engagementPlanReorderRequest = z
  .object({
    params,
    body: z
      .object({ expectedPlanVersion: version, waveIds: uniqueIds(1000) })
      .strict(),
  })
  .strict();
export const engagementPlanReviewRequest = z
  .object({ params, body: engagementPlanReviewBody })
  .strict();
export const engagementPlanHistoryRequest = z
  .object({
    params,
    query: z
      .object({
        beforeVersion: integerQuery(2147483647).optional(),
        limit: limit.optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type EngagementPlan = z.infer<typeof engagementPlanSchema>;
export type EngagementPlanWave = EngagementPlan["waves"][number];
export type EngagementPlanCreation = z.infer<
  typeof engagementPlanCreationSchema
>;
export type EngagementPlanHistory = z.infer<typeof engagementPlanHistorySchema>;
