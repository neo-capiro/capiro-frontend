import { z } from "zod";
import { defineOperation } from "../contracts";
import type { CapiroApi } from "../http";

/**
 * Native procedure catalog read — Wave5 MO01/ST16.
 *
 * `GET /clio/procedure-catalog` is the existing Core read (standard-user role, the caller's own
 * tenant) that the conversation picker lists from. Every entry is a candidate selector and nothing
 * more: Core re-resolves the exact built-in or firm procedure, its version, its manifest digest and
 * the caller's client access when a request is actually sent. Tools, budgets, approvals and manifest
 * instructions are never part of this contract, and no digest is computed, cached or corrected here —
 * the digests are the values Core chose for the procedures it will accept.
 */

/** The canonical built-in procedure ids, closed exactly as the conversation contract closes them. */
const builtinProcedureIds = [
  "briefing",
  "draft",
  "bill_analysis",
  "hearing_prep",
  "coalition_letter",
  "amendment_tracker",
] as const;

const manifestDigest = z.string().regex(/^[0-9a-f]{64}$/);

/** The exact selector the conversation contract accepts; nothing that fails this is selectable. */
export const procedureSelectorSchema = z.union([
  z.strictObject({
    source: z.literal("builtin"),
    id: z.enum(builtinProcedureIds),
    version: z.number().int().min(1),
    manifestDigest,
  }),
  z.strictObject({
    source: z.literal("firm"),
    recordId: z.string().min(1).max(128),
    version: z.number().int().min(1),
    manifestDigest,
  }),
]);

/** Core's public, non-authority display metadata for one selectable procedure. */
export const procedureCatalogEntrySchema = z.strictObject({
  selector: procedureSelectorSchema,
  display: z.strictObject({
    id: z.string().min(1).max(128),
    canonicalId: z.string().min(1).max(128),
    label: z.string().min(1).max(200),
    purpose: z.string().min(1).max(2_000).nullable(),
    scopes: z.array(z.string().min(1).max(64)).max(32),
  }),
});

export const procedureCatalogSchema = z.strictObject({
  /** Contract version, not a data revision: a refresh always re-reads the current owner. */
  version: z.literal(1),
  tenantId: z.string().min(1).max(128),
  generatedAt: z.number().int().nonnegative(),
  entries: z.array(procedureCatalogEntrySchema).max(500),
  counts: z.strictObject({
    builtin: z.number().int().nonnegative(),
    firm: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  }),
});

type ParsedProcedureCatalog = z.output<typeof procedureCatalogSchema>;
export type ProcedureCatalogEntry = ParsedProcedureCatalog["entries"][number];
export type ProcedureSelector = ProcedureCatalogEntry["selector"];
type DeeplyReadonly<Value> = Value extends readonly (infer Item)[]
  ? readonly DeeplyReadonly<Item>[]
  : Value extends object
    ? { readonly [Key in keyof Value]: DeeplyReadonly<Value[Key]> }
    : Value;
/** An accepted catalog is deep-frozen: the picker holds exactly the projection Core answered with. */
export type ProcedureCatalog = DeeplyReadonly<ParsedProcedureCatalog>;

export const procedureCatalogOperation = defineOperation({
  service: "core",
  method: "GET",
  path: "/clio/procedure-catalog",
  request: z.strictObject({}),
  response: procedureCatalogSchema,
  source:
    "capiro-backend d371e94c1479d4702fdebecae5c31e5609d7dbdd apps/api/src/meri/meri.controller.ts @Get('procedure-catalog') (@Roles('standard_user')) over apps/api/src/meri/native-procedures/procedure-catalog.ts",
});

export const meriProcedureOperations = {
  "meri.procedures.catalog": procedureCatalogOperation,
} as const;

export type ProcedureCatalogApi = CapiroApi<{
  "meri.procedures.catalog": typeof procedureCatalogOperation;
}>;

/** Why a catalog was not accepted. Nothing is listed from a read that is not this tenant's own. */
export type ProcedureCatalogRefusal =
  | "malformed"
  | "foreign-tenant"
  | "inconsistent";

export class ProcedureCatalogUnavailable extends Error {
  readonly reason: ProcedureCatalogRefusal;
  constructor(reason: ProcedureCatalogRefusal) {
    super(`Procedure catalog unavailable: ${reason}`);
    this.name = "ProcedureCatalogUnavailable";
    this.reason = reason;
  }
}

/** One exact selector identity — source, id, version and digest, never a label or an index. */
export function selectorIdentity(selector: ProcedureSelector): string {
  return selector.source === "builtin"
    ? `builtin:${selector.id}:${selector.version}:${selector.manifestDigest}`
    : `firm:${selector.recordId}:${selector.version}:${selector.manifestDigest}`;
}

/**
 * The only way a catalog enters browser state. The read must be the caller's own tenant and must agree
 * with itself: a payload that does not parse strictly, that names another tenant, that disagrees with
 * its own counts or that offers one selector twice is refused whole, so the picker can never list a
 * procedure it could not truthfully hand to the canonical selection receiver.
 */
export function receiveProcedureCatalog(
  payload: unknown,
  expected: { tenantId: string },
): ProcedureCatalog {
  const parsed = procedureCatalogSchema.safeParse(payload);
  if (!parsed.success) throw new ProcedureCatalogUnavailable("malformed");
  const catalog = parsed.data;
  if (catalog.tenantId !== expected.tenantId)
    throw new ProcedureCatalogUnavailable("foreign-tenant");
  const builtin = catalog.entries.filter(
    (entry) => entry.selector.source === "builtin",
  ).length;
  const firm = catalog.entries.length - builtin;
  const identities = catalog.entries.map((entry) =>
    selectorIdentity(entry.selector),
  );
  if (
    builtin !== catalog.counts.builtin ||
    firm !== catalog.counts.firm ||
    catalog.entries.length !== catalog.counts.total ||
    new Set(identities).size !== identities.length
  )
    throw new ProcedureCatalogUnavailable("inconsistent");
  return Object.freeze({
    ...catalog,
    entries: Object.freeze(
      catalog.entries.map((entry) =>
        Object.freeze({
          selector: Object.freeze({ ...entry.selector }),
          display: Object.freeze({
            ...entry.display,
            scopes: Object.freeze([...entry.display.scopes]),
          }),
        }),
      ),
    ),
    counts: Object.freeze({ ...catalog.counts }),
  });
}

/**
 * Read the catalog for the caller's own tenant through the existing operation client and accept it
 * only as this tenant's current projection. Each call is a fresh read — the version member is a
 * contract version, not an ETag, so nothing here is cached or compared for equality across refreshes.
 */
export async function loadProcedureCatalog(
  api: ProcedureCatalogApi,
  input: { tenantId: string; signal?: AbortSignal },
): Promise<ProcedureCatalog> {
  const payload = await api.request(
    "meri.procedures.catalog",
    {},
    { signal: input.signal },
  );
  return receiveProcedureCatalog(payload, { tenantId: input.tenantId });
}
