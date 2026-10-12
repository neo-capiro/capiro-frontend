import { z } from "zod";
import type { AlertDraft } from "./contracts";

// Core AlertPrefsDto / AlertPrefsPayload, published capirov2 main 4be13b0.
// This native receipt has no user, tenant, client, jurisdictions, or version echo.
export const corePreferencesSchema = z.object({
  triggers: z.array(z.string()),
  materiality: z.enum(["low", "medium", "high"]),
  emailEnabled: z.boolean(),
  emailAddress: z.string().max(320).nullable(),
  emailCadence: z.enum(["realtime", "daily", "weekly"]),
  smsEnabled: z.boolean(),
  smsPhone: z.string().max(20).nullable(),
  smsPhoneVerified: z.boolean(),
  smsCadence: z.enum(["realtime", "daily"]),
  quietHoursStart: z.string().max(5).nullable(),
  quietHoursEnd: z.string().max(5).nullable(),
});
export type CorePreferences = z.infer<typeof corePreferencesSchema>;

export function corePreferenceDraft(record: CorePreferences): AlertDraft {
  return {
    triggers: [...record.triggers],
    materiality: record.materiality,
    emailEnabled: record.emailEnabled,
    emailAddress: record.emailAddress,
    emailCadence: record.emailCadence,
    smsEnabled: record.smsEnabled,
    smsPhone: record.smsPhone,
    smsCadence: record.smsCadence,
    quietHoursStart: record.quietHoursStart,
    quietHoursEnd: record.quietHoursEnd,
    jurisdictionsText: "",
  };
}

export function corePreferenceBody(
  draft: AlertDraft,
  saved: CorePreferences,
): CorePreferences {
  return corePreferencesSchema.strict().parse({
    triggers: [...draft.triggers],
    materiality: draft.materiality,
    emailEnabled: draft.emailEnabled,
    emailAddress: draft.emailAddress,
    emailCadence: draft.emailCadence,
    smsEnabled: draft.smsEnabled,
    smsPhone: draft.smsPhone,
    // This required Core DTO flag is not editable. Only current unchanged
    // saved-phone evidence may preserve it; editing/clearing the phone revokes it.
    smsPhoneVerified: Boolean(
      saved.smsPhoneVerified &&
      saved.smsPhone &&
      saved.smsPhone === draft.smsPhone,
    ),
    smsCadence: draft.smsCadence,
    quietHoursStart: draft.quietHoursStart,
    quietHoursEnd: draft.quietHoursEnd,
  });
}

/** Native normalizeE164 projection; not a verification or delivery grant. */
export function savedPhoneValue(raw: string | null) {
  if (!raw) return null;
  const value = raw.trim();
  const digits = value.replace(/[^\d]/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  return !value.startsWith("+") && digits.length === 10
    ? `+1${digits}`
    : `+${digits}`;
}

export function coreSavedValues(body: CorePreferences): CorePreferences {
  const phone = savedPhoneValue(body.smsPhone);
  return {
    ...body,
    emailAddress: body.emailAddress?.trim() || null,
    smsPhone: phone,
    smsPhoneVerified: Boolean(body.smsPhoneVerified && phone),
    smsEnabled: Boolean(body.smsEnabled && body.smsPhoneVerified && phone),
    quietHoursStart: body.quietHoursStart?.trim() || null,
    quietHoursEnd: body.quietHoursEnd?.trim() || null,
  };
}
