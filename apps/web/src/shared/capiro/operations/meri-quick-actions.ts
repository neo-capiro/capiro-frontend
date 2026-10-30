import { z } from "zod";
import { defineOperation } from "../contracts";

/**
 * QuickActions rollout read — the existing Core owner, nothing new.
 *
 * `GET /clio/v3/skills` already exists behind `@Roles('standard_user')` and returns
 * `{ version: 1, enabled, skills }` where `enabled` is the AND of Core's env kill-switch, the tenant
 * cohort and the tenant flag `meriv3.quickActionSkills`
 * (capiro-backend apps/api/src/meri/meri-skills.controller.ts:41-60 and
 * apps/api/src/meri/meri-feature-flags.service.ts:113-139).
 *
 * This leaf intentionally models the ROLLOUT READ ONLY. Core's rows are label/starterPrompt/recipe
 * metadata without the typed skill version, subject kinds or window bases, so they are never a
 * substitute for the bundled `@capiro/meri-contracts` conversation contract: the picker keeps that
 * typed catalog and this contract only carries the ids that the rollout currently admits.
 */

const source =
  "capiro-backend apps/api/src/meri/meri-skills.controller.ts:41-60 (GET clio/v3/skills, @Roles('standard_user')) + apps/api/src/meri/meri-feature-flags.service.ts:113-139 (env/cohort/tenant gate)";

/** One Core registry row; opaque beyond its id (metadata is display material, never authority). */
export const quickActionCatalogRow = z.looseObject({
  id: z.string().min(2).max(64),
});

export const quickActionCatalogSchema = z.strictObject({
  version: z.literal(1),
  enabled: z.boolean(),
  skills: z.array(quickActionCatalogRow),
});

export type QuickActionCatalog = z.infer<typeof quickActionCatalogSchema>;

export const meriQuickActionOperations = {
  "meri.quickActions.list": defineOperation({
    service: "core",
    method: "GET",
    path: "/clio/v3/skills",
    request: z.strictObject({}),
    response: quickActionCatalogSchema,
    source,
  }),
} as const;
