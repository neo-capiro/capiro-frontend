import { z } from "zod";

// Published Intel PutAlertPrefsDto, capirov2 main 4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace.
export const alertTriggers = [
  "newMatch",
  "amendment",
  "hearing",
  "committeeVote",
  "floorVote",
  "enactedFailed",
  "fiscalNote",
  "sponsorMomentum",
  "companion",
  "deadline",
] as const;
export const triggerLabels: Record<(typeof alertTriggers)[number], string> = {
  newMatch: "New matches",
  amendment: "Amendments",
  hearing: "Hearings",
  committeeVote: "Committee votes",
  floorVote: "Floor votes",
  enactedFailed: "Enacted or failed",
  fiscalNote: "Fiscal notes",
  sponsorMomentum: "Sponsor momentum",
  companion: "Companion bills",
  deadline: "Deadlines",
};
const quietTime = z
  .string()
  .regex(/^([01]?\d|2[0-3]):[0-5]\d$/)
  .nullable();
const writable = {
  triggers: z.array(z.enum(alertTriggers)),
  materiality: z.enum(["low", "medium", "high"]),
  emailEnabled: z.boolean(),
  emailAddress: z.string().max(320).nullable(),
  emailCadence: z.enum(["realtime", "daily", "weekly"]),
  smsEnabled: z.boolean(),
  smsPhone: z.string().max(32).nullable(),
  smsCadence: z.enum(["realtime", "daily"]),
  quietHoursStart: quietTime,
  quietHoursEnd: quietTime,
  jurisdictions: z.array(z.string().max(2)),
};
export const alertPrefsBodySchema = z
  .object(writable)
  .strict()
  .superRefine((value, ctx) => {
    if (
      (value.emailEnabled || value.emailAddress) &&
      !z.email().safeParse(value.emailAddress).success
    )
      ctx.addIssue({
        code: "custom",
        path: ["emailAddress"],
        message: "Enter a valid email address for email alerts.",
      });
  });
const alertPrefsSchema = z.object({
  ...writable,
  clientId: z.string().min(1),
  userId: z.string().min(1),
  tenantId: z.string().optional(),
  smsPhoneVerified: z.boolean(),
});
export type AlertPreferences = z.infer<typeof alertPrefsSchema>;
export type AlertPrefsBody = z.infer<typeof alertPrefsBodySchema>;
export type AlertDraft = Omit<AlertPrefsBody, "jurisdictions" | "triggers"> & {
  // Core accepts native string keys beyond Intel's allowlist; retain them.
  triggers: string[];
  jurisdictionsText: string;
};
export type AlertOwner = {
  clientId: string;
  clerkUserId: string;
  tenantId: string;
};

export function alertPreferencesSchema(owner: AlertOwner) {
  return alertPrefsSchema.refine(
    (record) =>
      record.clientId === owner.clientId &&
      record.userId === owner.clerkUserId &&
      (record.tenantId === undefined || record.tenantId === owner.tenantId),
    "The alert preferences do not belong to the requested client and user.",
  );
}

/** Only DTO-owned fields are editable; identity and verification are server receipts. */
export function preferenceValues(record: AlertPreferences): AlertPrefsBody {
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
    jurisdictions: [...record.jurisdictions],
  };
}
export function preferenceDraft(record: AlertPreferences): AlertDraft {
  const { jurisdictions, ...values } = preferenceValues(record);
  return { ...values, jurisdictionsText: jurisdictions.join(", ") };
}
export function preferenceBody(draft: AlertDraft): AlertPrefsBody {
  const { jurisdictionsText, ...values } = draft;
  return alertPrefsBodySchema.parse({
    ...values,
    jurisdictions: jurisdictionsText
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  });
}
export function preferenceSignature(record: AlertPreferences) {
  return JSON.stringify([preferenceValues(record), record.smsPhoneVerified]);
}
export function hasVerifiedDraftPhone(
  record: Pick<AlertPreferences, "smsPhone" | "smsPhoneVerified">,
  draft: AlertDraft,
) {
  return Boolean(
    record.smsPhoneVerified &&
    record.smsPhone &&
    record.smsPhone === draft.smsPhone,
  );
}

/** Intel's published normalizer is deliberately stricter than Core's legacy one. */
export function intelSavedPhoneValue(raw: string | null) {
  if (!raw) return null;
  const value = raw.trim();
  if (!/^\+?[\d\s().-]+$/.test(value)) return null;
  const digits = value.replace(/\D/g, "");
  const phone = value.startsWith("+")
    ? `+${digits}`
    : digits.length === 10
      ? `+1${digits}`
      : digits.length === 11 && digits.startsWith("1")
        ? `+${digits}`
        : null;
  return phone && /^\+[1-9]\d{9,14}$/.test(phone) ? phone : null;
}
