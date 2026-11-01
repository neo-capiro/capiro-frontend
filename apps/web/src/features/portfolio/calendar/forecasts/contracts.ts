import { z } from "zod";

const period = z.discriminatedUnion("precision", [
  z.object({
    precision: z.literal("month"),
    raw: z.string(),
    year: z.number().int().min(1).max(9999),
    month: z.number().int().min(1).max(12),
  }),
  z.object({ precision: z.literal("unknown"), raw: z.string() }),
]);
const sourceUrl = z.url().refine((value) => {
  const url = new URL(value);
  return (
    url.protocol === "https:" &&
    url.hostname === "www.reginfo.gov" &&
    !url.username &&
    !url.password
  );
}, "Expected the authoritative Reginfo source");
export const forecastSchema = z.object({
  id: z.string().min(1),
  revision: z.number().int().positive(),
  title: z.string().min(1),
  eventType: z.enum(["proposed_rule", "final_rule"]),
  period,
  status: z.enum(["published", "withdrawn", "source_completed"]),
  completionEvidence: z
    .object({ action: z.string(), rawDate: z.string() })
    .optional(),
  withdrawalEvidence: z
    .object({ action: z.string(), rawDate: z.string() })
    .optional(),
  source: z.object({
    rin: z.string().min(1),
    edition: z.string().min(1),
    url: sourceUrl,
    issuedAt: z.string().min(1).nullable(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  confidence: z.literal("not_supplied"),
  observedAt: z.iso.datetime(),
  recordedAt: z.iso.datetime(),
});
export type Forecast = z.infer<typeof forecastSchema>;
const page = z.object({
  schemaVersion: z.literal(1),
  items: z.array(forecastSchema).max(100),
  page: z.number().int().positive(),
  pageSize: z.number().int().min(1).max(100),
  total: z.number().int().nonnegative(),
});
export const forecastPageSchema = page
  .extend({
    coverage: z.object({
      lastSuccessfulCheckAt: z.iso.datetime().nullable(),
      lastAttemptAt: z.iso.datetime().nullable(),
      lastCheckStatus: z.enum(["success", "failed", "unavailable"]),
      edition: z.string().nullable(),
      acceptedCount: z.number().int().nonnegative(),
      rejectedCount: z.number().int().nonnegative(),
      partial: z.boolean(),
    }),
  })
  .refine(
    (value) =>
      new Set(value.items.map((item) => item.id)).size === value.items.length,
    "Duplicate forecast identity",
  );
export type ForecastCoverage = z.infer<typeof forecastPageSchema>["coverage"];
export function forecastHistorySchema(id: string) {
  return page.refine(
    (value) =>
      value.items.every((item) => item.id === id) &&
      new Set(value.items.map((item) => item.revision)).size ===
        value.items.length,
    "History belongs to another forecast or repeats a revision",
  );
}
