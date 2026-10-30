import { z } from "zod";
import {
  boundedJsonText,
  withActionDeadline,
} from "../../../shared/meri-actions/bounded-json";

// Projection of control/settings/service.mjs readTenant/saveTenant and documents.mjs.
// No tenant-settings contract is exported by meri-contracts 0.1.39. Policies
// remain opaque; the editor projects fields and the canonical owner validates.
const positive = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
const modelSchema = z.object({
  monthlyCapMicroUsd: positive.nullable(),
  maxTurns: positive.max(100),
  maxBudgetMicroUsd: positive,
});
const responseSchema = z.object({
  revision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  defaultTimezone: z.string().min(1),
  capabilityStatus: z.string().min(1),
  effectiveCapabilities: z.unknown(),
  capabilityPolicy: z.record(z.string(), z.unknown()).optional(),
  model: modelSchema.optional(),
  browserPolicy: z.record(z.string(), z.unknown()).optional(),
  browserPlatform: z.record(z.string(), z.unknown()).optional(),
  browserStatus: z.string().optional(),
});
export type TenantDocument = z.infer<typeof responseSchema>;
export type ModelLimits = Omit<
  z.infer<typeof modelSchema>,
  "monthlyCapMicroUsd"
> & { monthlyCapMicroUsd: number };
export type TenantSave = {
  expectedRevision: number;
  settings: {
    defaultTimezone: string;
    capabilityPolicy: Record<string, unknown>;
    model?: ModelLimits;
    browserPolicy?: Record<string, unknown>;
  };
};
export class TenantSettingsFailure extends Error {
  constructor(
    public readonly kind: "access" | "conflict" | "invalid" | "unavailable",
  ) {
    super(kind);
  }
}
export function editableDocument(document: TenantDocument) {
  return (
    document.capabilityPolicy !== undefined && document.model !== undefined
  );
}
export function saveRequest(
  document: TenantDocument,
  model: ModelLimits,
): TenantSave {
  if (!editableDocument(document) || model.monthlyCapMicroUsd === null)
    throw new TenantSettingsFailure("access");
  modelSchema.parse(model);
  return {
    expectedRevision: document.revision,
    settings: {
      defaultTimezone: document.defaultTimezone,
      capabilityPolicy: document.capabilityPolicy!,
      model,
    },
  };
}
/** Exact decimal conversion avoids rounded or exponential budget input. */
export function usdToMicro(value: string): number | null {
  if (!/^\d+(?:\.\d{1,6})?$/.test(value.trim())) return null;
  const [whole, fraction = ""] = value.trim().split(".");
  const result = Number(
    BigInt(whole!) * 1000000n + BigInt(fraction.padEnd(6, "0")),
  );
  return Number.isSafeInteger(result) && result > 0 ? result : null;
}
export function microToUsd(value: number | null): string {
  if (value === null) return "";
  const amount = BigInt(value);
  const fraction = (amount % 1000000n)
    .toString()
    .padStart(6, "0")
    .replace(/0+$/, "");
  return `${amount / 1000000n}${fraction ? `.${fraction}` : ""}`;
}
export function modelDraft(
  monthly: string,
  perQuery: string,
  turns: string,
): ModelLimits | null {
  const monthlyCapMicroUsd = usdToMicro(monthly),
    maxBudgetMicroUsd = usdToMicro(perQuery);
  const maxTurns = /^\d+$/.test(turns) ? Number(turns) : NaN;
  if (
    monthlyCapMicroUsd === null ||
    maxBudgetMicroUsd === null ||
    !Number.isInteger(maxTurns) ||
    maxTurns < 1 ||
    maxTurns > 100
  )
    return null;
  return { monthlyCapMicroUsd, maxBudgetMicroUsd, maxTurns };
}
/** One same-origin request; server derives native identity. No retry or retained credential. */
export async function tenantSettingsRequest(
  operation: "read" | "save",
  body: TenantSave | Record<string, never>,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<TenantDocument> {
  return withActionDeadline(
    [signal],
    async (receiving) => {
      const response = await fetcher(`/api/settings/tenant/${operation}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        body: JSON.stringify(body),
        signal: receiving,
      });
      try {
        if ([401, 403, 404].includes(response.status))
          throw new TenantSettingsFailure("access");
        if (response.redirected) throw new Error("Unexpected redirect");
        const value: unknown = JSON.parse(
          await boundedJsonText(response, receiving, 262144),
        );
        if (!response.ok) {
          const error = z
            .object({ error: z.object({ code: z.string() }) })
            .safeParse(value);
          const code = error.success ? error.data.error.code : "";
          if (response.status === 409 && code === "SETTINGS_REVISION_CONFLICT")
            throw new TenantSettingsFailure("conflict");
          if (
            [400, 422].includes(response.status) &&
            /^(SETTINGS_(REQUEST|DOCUMENT|FIELD|MODEL)_INVALID|CAPABILITY_[A-Z_]+|BROWSER_[A-Z_]+)$/.test(
              code,
            )
          )
            throw new TenantSettingsFailure("invalid");
          throw new TenantSettingsFailure("unavailable");
        }
        receiving.throwIfAborted();
        return responseSchema.parse(value);
      } finally {
        if (!response.bodyUsed)
          void response.body?.cancel().catch(() => undefined);
      }
    },
    30000,
  );
}
