import { z } from "zod";

export const evidenceId = z.string().min(1).max(200);
export const evidenceScope = z
  .object({
    sessionKey: z.string().max(60).optional(),
    folderId: z.string().min(1).max(100).optional(),
    clientId: z.string().min(1).max(100).optional(),
  })
  .strict();
export const evidenceSource = z.object({
  id: evidenceId,
  revision: z.string(),
  title: z.string(),
  sourceUrl: z.string(),
  text: z.string(),
  observedAt: z.string(),
  complete: z.boolean(),
  authority: z.string(),
  rights: z.string(),
  sections: z
    .array(z.object({ locator: z.string(), text: z.string() }))
    .optional(),
});
export const newsItem = z.object({
  id: evidenceId,
  revision: z.string(),
  title: z.string(),
  publisher: z.string(),
  summary: z.string().nullable().optional(),
  source_url: z.string(),
  observed_at: z.string(),
  published_at: z.string().nullable().optional(),
  body_complete: z.boolean(),
  rights: z.string(),
  saved: z.boolean(),
  tracking_version: z.number().int().nullable(),
});
export const publisherCoverage = z.object({
  publisher: z.string(),
  source_group: z.string().optional(),
  source_url: z.string().nullable().optional(),
  status: z.string().optional(),
  intake: z.object({
    status: z.enum([
      "no_verified_endpoint",
      "succeeded",
      "failed",
      "not_checked",
      "partial",
    ]),
    feeds: z.array(
      z.object({
        url: z.string(),
        publisher: z.string(),
        status: z.enum([
          "succeeded",
          "partial",
          "failed",
          "unknown",
          "not_checked",
        ]),
        observedAt: z.string().nullable(),
        reason: z.string().nullable(),
        primaryFailure: z.string().nullable(),
      }),
    ),
  }),
  retained: z.object({
    articles: z.number().int().nonnegative(),
    fullTextArticles: z.number().int().nonnegative(),
    latestPublishedAt: z.string().nullable(),
    latestObservedAt: z.string().nullable(),
  }),
});
export const newsPage = z.object({
  items: z.array(newsItem),
  nextOffset: z.number().int().nonnegative().nullable(),
  coverage: z.array(publisherCoverage),
  coverageMessage: z.string(),
  window: z.object({ since: z.string(), days: z.number() }),
  matchDefinition: z
    .object({
      id: z.string(),
      version: z.number(),
      query: z.string(),
      fields: z.string(),
      interpretation: z.string().nullable().optional(),
    })
    .nullable(),
});
export const monitorConfig = evidenceScope
  .extend({
    name: z.string().max(200),
    query: z.string().min(1).max(2000),
    provider: z.enum(["newscatcher", "rss"]),
    fields: z.enum(["title", "title_summary", "available_text"]),
    sources: z.array(z.string().regex(/^[a-z0-9.-]+$/i)).max(74),
    scopeAccepted: z.boolean(),
  })
  .strict();
export const newsMonitor = z.object({
  id: evidenceId,
  version: z.number().int(),
  state: z.string(),
  config: monitorConfig
    .extend({
      folderId: z.string().nullable().optional(),
      clientId: z.string().nullable().optional(),
    })
    .partial(),
  source: z.object({ raw: z.string().optional() }).optional(),
  baseline_at: z.string().nullable().optional(),
  checkpoint: z.string().nullable().optional(),
  last_error: z.string().nullable().optional(),
  interpretation: z
    .object({
      status: z.string().optional(),
      providerQuery: z.string().nullable().optional(),
      interpretation: z.string().nullable().optional(),
      reasons: z.array(z.string()).optional(),
    })
    .optional(),
});
export const configureMonitorBody = z
  .object({
    expectedVersion: z.number().int().nonnegative(),
    state: z.enum(["active", "paused", "excluded"]),
    config: monitorConfig,
  })
  .strict()
  .refine((body) => body.state !== "active" || body.config.scopeAccepted, {
    message: "Review and accept the monitor scope before activation.",
  });
export const personnelItem = z.object({
  id: evidenceId,
  revision: z.string(),
  name: z.string(),
  branch: z.string().nullable().optional(),
  firm: z.string().nullable().optional(),
  principal: z.string().nullable().optional(),
  confirmation: z.string().nullable().optional(),
  source_url: z.string(),
  observed_at: z.string(),
  saved: z.boolean(),
  tracking_version: z.number().int().nullable(),
});
export const evidenceTrackBody = evidenceScope
  .extend({
    folderId: z.string().min(1).max(100),
    kind: z.enum(["news", "budget", "personnel"]),
    sourceId: evidenceId,
    expectedVersion: z.number().int().nonnegative(),
    removed: z.boolean(),
    notes: z.string().max(5000),
  })
  .strict();
export const trackingReceipt = z.object({
  id: z.string(),
  source_id: z.string(),
  kind: z.string(),
  removed: z.boolean(),
  notes: z.string(),
  version: z.number().int(),
});

const alertKey = z.enum([
  "alert-01",
  "alert-02",
  "alert-03",
  "alert-39",
  "alert-40",
]);
export const newsImportBody = z
  .object({
    capture: z.string().regex(/^[\w.-]{1,100}$/),
    sourceAccount: z.string().regex(/^[\w.:-]{1,100}$/),
    evidencePath: z.string().max(1000).optional(),
    keywords: z
      .array(
        z
          .object({
            url: z.url().refine((value) => {
              const url = new URL(value);
              return (
                url.hostname === "apps.lobbytools.com" &&
                Boolean(url.searchParams.get("keyword"))
              );
            }),
            keyword: z.string().max(2000),
          })
          .strict(),
      )
      .length(38),
    alerts: z
      .array(
        z
          .object({
            key: alertKey,
            nameFieldPresent: z.boolean().optional(),
            name: z.string().max(200).optional(),
          })
          .strict(),
      )
      .length(5),
  })
  .strict()
  .refine(
    (value) =>
      new Set(value.alerts.map((alert) => alert.key)).size === 5 &&
      new Set(
        value.keywords.map((keyword) =>
          new URL(keyword.url).searchParams.get("keyword"),
        ),
      ).size === 38,
    { message: "The capture must contain distinct source identities." },
  );
const importDecision = z.object({
  sourceKey: z.string(),
  raw: z.string(),
  decision: z.string(),
  localVersion: z.number().nullable(),
});
export const newsImportPreview = z.object({
  decisions: z.array(importDecision),
  staged: z.literal(0),
  activation: z.literal(false),
});
export const newsImportReceipt = z.object({
  definitions: z.literal(38),
  families: z.literal(5),
  insertedDefinitions: z.number().int(),
  insertedFamilies: z.number().int(),
  decisions: z.array(importDecision),
  state: z.literal("staged"),
  activation: z.literal(false),
  localEdits: z.literal("preserved"),
});
