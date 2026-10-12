import { z } from "zod";
import { ApiError } from "@/shared/portfolio/api/http";
import {
  alertPreferencesSchema,
  preferenceBody,
  preferenceDraft,
  preferenceValues,
  intelSavedPhoneValue,
  type AlertPreferences,
  type AlertDraft,
} from "./contracts";
import {
  corePreferencesSchema,
  corePreferenceBody,
  corePreferenceDraft,
  coreSavedValues,
  type CorePreferences,
} from "./core-contracts";
import type { PreferenceActor } from "./personal-access";

export type PersonalPreferences = CorePreferences | AlertPreferences;
export const personalPreferencesPath = (
  clientId: string,
  owner: PreferenceActor,
) =>
  owner.backend === "core"
    ? `intelligence/clients/${encodeURIComponent(clientId)}/tracker/alert-prefs`
    : `tracker/watchlists/${encodeURIComponent(clientId)}/alert-prefs`;
export function personalPreferencesSchema(
  clientId: string,
  owner: PreferenceActor,
): z.ZodType<PersonalPreferences> {
  return owner.backend === "core"
    ? corePreferencesSchema
    : alertPreferencesSchema({ ...owner.actor, clientId });
}
export function personalDraft(
  record: PersonalPreferences,
  owner: PreferenceActor,
): AlertDraft {
  return owner.backend === "core"
    ? corePreferenceDraft(corePreferencesSchema.parse(record))
    : preferenceDraft(
        alertPreferencesSchema({
          ...owner.actor,
          clientId: (record as AlertPreferences).clientId,
        }).parse(record),
      );
}
export function personalSignature(
  record: PersonalPreferences,
  owner: PreferenceActor,
) {
  return JSON.stringify([
    personalDraft(record, owner),
    record.smsPhoneVerified,
  ]);
}
export function personalBody(
  draft: AlertDraft,
  baseline: PersonalPreferences,
  owner: PreferenceActor,
) {
  return owner.backend === "core"
    ? corePreferenceBody(draft, corePreferencesSchema.parse(baseline))
    : preferenceBody(draft);
}

/** Request-scoped field receipt: Core has no identity echoes or CAS token. */
export function assertSavedPreferences(
  receipt: PersonalPreferences,
  draft: AlertDraft,
  baseline: PersonalPreferences,
  owner: PreferenceActor,
) {
  if (owner.backend === "core") {
    const expected = coreSavedValues(
      corePreferenceBody(draft, corePreferencesSchema.parse(baseline)),
    );
    if (
      JSON.stringify(corePreferencesSchema.parse(receipt)) !==
      JSON.stringify(expected)
    )
      throw new ApiError(
        502,
        "The saved Core preferences do not confirm the requested values. Reload to review the current settings.",
      );
  } else {
    const body = preferenceBody(draft);
    const expected = {
      ...body,
      smsPhone: intelSavedPhoneValue(body.smsPhone),
      jurisdictions: body.jurisdictions.map((value) => value.toUpperCase()),
    };
    if (
      JSON.stringify(preferenceValues(receipt as AlertPreferences)) !==
      JSON.stringify(expected)
    )
      throw new ApiError(
        502,
        "The saved Intel preferences do not confirm the requested values. Reload to review the current settings.",
      );
  }
}
