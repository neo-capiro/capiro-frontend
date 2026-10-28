import { z } from "zod";
import { defineOperation } from "../contracts";

/**
 * Firm procedure governance operations — the existing admin-gated Core owner.
 *
 * Every route below already exists in canonical Core behind `@Roles('user_admin')`
 * (`@Controller('clio')` + `firm-skills`): apps/api/src/meri/meri.controller.ts:995-1053,
 * implemented by MeriFirmSkillsService. This leaf only declares the reviewed wire contract for
 * them; it adds no store, no catalog and no authority of its own. The shared registry
 * (shared/capiro/registry.ts) is the gateway allowlist and is composed by the parent — this leaf
 * is not spread in by this change.
 */
const source =
  "capiro-backend apps/api/src/meri/meri.controller.ts:995-1053 (@Roles('user_admin'), @Controller('clio') /firm-skills) + apps/api/src/meri/meri-firm-skills.service.ts";

const canonicalUuid = z
  .uuid()
  .refine((value) => value === value.toLowerCase(), "Use a canonical UUID.");

const skillParams = z.object({ id: canonicalUuid }).strict();

/**
 * One stored snapshot. `pushVersion` in the service emits `{ version, skillJson, savedAt }`
 * (apps/api/src/meri/meri-firm-skills.service.ts:467-484) and the persisted `update`/`restore` rows
 * carry that shape, while `list()` projects each snapshot down to `{ version, savedAt }`
 * (`:130-134`). `skillJson` is therefore optional here: it is opaque historical user material and
 * never an authority grant, but a decoder that required it would reject every real `list()` response,
 * and one that forbade it would reject every real `update`/`restore` response.
 */
const storedVersion = z.looseObject({
  version: z.number().int().min(1),
  skillJson: z.unknown().optional(),
  savedAt: z.string(),
});

/** One row of GET /clio/firm-skills, exactly as MeriFirmSkillsService.list() emits it. */
export const firmSkillGovernanceRow = z
  .object({
    id: canonicalUuid,
    skillId: z.string().min(2).max(48),
    name: z.string().min(1).max(80),
    /**
     * The stored payload, deliberately opaque: an invalid or altered row is a real governance state
     * this surface must display, so the transport must not reject the row the server reports. Content
     * here never grants a tool, an effect or a memory permission.
     */
    skill: z.unknown(),
    version: z.number().int().min(1),
    versions: z.array(storedVersion),
    enabled: z.boolean(),
    /** enabled && the stored row passes the same rules the turn path applies. */
    runnable: z.boolean(),
    /** sha256 of the stored procedure manifest, or null when the row carries no procedure. */
    procedureDigest: z
      .string()
      .regex(/^[0-9a-f]{64}$/)
      .nullable(),
    procedureScopes: z.array(z.string()),
    validationErrors: z.array(z.string()),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();

export type FirmSkillGovernanceRow = z.infer<typeof firmSkillGovernanceRow>;

/** The admin write routes return the persisted row, not the list projection. */
const persistedRow = z
  .object({
    id: canonicalUuid,
    tenantId: canonicalUuid,
    skillId: z.string().min(2).max(48),
    name: z.string().min(1).max(80),
    skillJson: z.unknown(),
    version: z.number().int().min(1),
    versions: z.array(storedVersion),
    enabled: z.boolean(),
    createdByUserId: canonicalUuid.nullable(),
    updatedByUserId: canonicalUuid.nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();

export const createdFirmSkill = persistedRow;
export const updatedFirmSkill = persistedRow;

/**
 * The dry run's exact return, read from MeriFirmSkillsService.testRun
 * (apps/api/src/meri/meri-firm-skills.service.ts:279-306). It emits no `runAsNativeSdk` field — this
 * route resolves stored guidance and executes no tools — and a stored row that the turn path would
 * refuse is answered with BadRequest rather than an "invalid" body. The surface therefore labels the
 * stored-only nature locally instead of requiring a field Core never emits.
 */
export const firmSkillDryRun = z
  .object({
    skillId: z.string().min(2).max(48),
    canonicalId: z.string().min(2).max(48),
    version: z.number().int().min(1),
    procedureDigest: z
      .string()
      .regex(/^[0-9a-f]{64}$/)
      .nullable(),
    procedureScopes: z.array(z.string()),
    triggers: z.array(z.string()),
    systemAddendum: z.string().optional(),
    template: z.unknown().optional(),
    requiredTools: z.array(z.string()).optional(),
    note: z.string(),
  })
  .strict();

/**
 * The viewed-version fence. Every mutation carries the exact version the operator was looking at;
 * Core binds it into the atomic WHERE clause. A malformed or missing value is refused, never
 * defaulted to the current version.
 */
export const expectedVersion = z.number().int().min(1);

/**
 * The admin write body. Structured fields only — there is no freeform raw execution JSON and no
 * field that can carry tool, effect or memory authority. `procedure` is accepted as an opaque
 * object because Core owns its authoritative validation and returns the exact errors to display.
 */
export const firmSkillWriteBody = z
  .object({
    id: z.string().regex(/^[a-z0-9_]{2,48}$/),
    name: z.string().min(1).max(80),
    triggers: z.array(z.string().min(1).max(64)).min(1).max(5),
    systemAddendum: z.string().max(2000).optional(),
    requiredTools: z.array(z.string().min(1).max(64)).max(12).optional(),
    template: z.unknown().optional(),
    procedure: z.unknown().optional(),
  })
  .strict();

export type FirmSkillWriteBody = z.infer<typeof firmSkillWriteBody>;

export const deletedFirmSkill = z.object({ deleted: z.literal(true) }).strict();

export const meriFirmSkillOperations = {
  "meri.procedures.list": defineOperation({
    service: "core",
    method: "GET",
    path: "/clio/firm-skills",

    request: z.object({}).strict(),
    response: z.array(firmSkillGovernanceRow),
    source,
  }),
  "meri.procedures.create": defineOperation({
    service: "core",
    method: "POST",
    path: "/clio/firm-skills",

    request: z.object({ body: firmSkillWriteBody }).strict(),
    response: createdFirmSkill,
    source,
    requestLimitBytes: 32768,
  }),
  "meri.procedures.update": defineOperation({
    service: "core",
    method: "PATCH",
    path: "/clio/firm-skills/:id",
    request: z
      .object({
        params: skillParams,
        body: firmSkillWriteBody.extend({ expectedVersion }),
      })
      .strict(),
    response: updatedFirmSkill,
    source,
    requestLimitBytes: 32768,
  }),
  "meri.procedures.setEnabled": defineOperation({
    service: "core",
    method: "PATCH",
    path: "/clio/firm-skills/:id/enabled",
    request: z
      .object({
        params: skillParams,
        body: z.object({ enabled: z.boolean(), expectedVersion }).strict(),
      })
      .strict(),
    response: updatedFirmSkill,
    source,
  }),
  "meri.procedures.remove": defineOperation({
    service: "core",
    method: "DELETE",
    path: "/clio/firm-skills/:id",
    // Delete carries the fence as a query parameter: the controller reads it with @Query.
    request: z
      .object({
        params: skillParams,
        query: z.object({ expectedVersion }).strict(),
      })
      .strict(),
    response: deletedFirmSkill,
    source,
  }),
  "meri.procedures.restore": defineOperation({
    service: "core",
    method: "POST",
    path: "/clio/firm-skills/:id/restore",
    request: z
      .object({
        params: skillParams,
        body: z
          .object({ version: z.number().int().min(1), expectedVersion })
          .strict(),
      })
      .strict(),
    response: updatedFirmSkill,
    source,
  }),
  "meri.procedures.test": defineOperation({
    service: "core",
    method: "POST",
    path: "/clio/firm-skills/:id/test",

    request: z.object({ params: skillParams }).strict(),
    response: firmSkillDryRun,
    source,
  }),
} as const;

export const meriFirmSkillOperationKeys = Object.keys(
  meriFirmSkillOperations,
) as ReadonlyArray<keyof typeof meriFirmSkillOperations>;

/**
 * Transport: these are ORDINARY Capiro operations, not session-auth exceptions.
 *
 * The gateway already attaches the reviewed capiro-template session token for every ordinary
 * operation (apps/web/src/app/api/capiro/[operation]/route.ts:63-68 —
 * `session.getToken({ template: "capiro" })`), and Core verifies that canonical JWT and resolves the
 * `capiro_tenant_id` / `capiro_tenant_slug` / `org_id` claims before the existing
 * `@Roles('user_admin')` guard runs on these routes
 * (apps/api/src/tenant/tenant-context.middleware.ts:333-368).
 *
 * `authentication: "clerk-session"` is reserved for the few specifically reviewed exceptions
 * (onboard funnel/setup, the conversation bootstrap) and is deliberately NOT set here, so nothing
 * needs to be added to `nativeSessionAllowed` and no route admission has to be widened.
 */
