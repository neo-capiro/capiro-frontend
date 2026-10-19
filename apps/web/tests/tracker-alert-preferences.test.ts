import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "../src/shared/portfolio/api/http";
import { identitySchema } from "../src/shared/portfolio/auth/identity";
import {
  currentAlertActor,
  assertAlertActor,
} from "../src/features/portfolio/bill-tracker/alert-preferences/access";
import {
  alertPreferencesSchema,
  preferenceBody,
  preferenceDraft,
  hasVerifiedDraftPhone,
  alertPrefsBodySchema,
} from "../src/features/portfolio/bill-tracker/alert-preferences/contracts";
import {
  alertPreferencesKey,
  alertPreferencesPath,
  assertPreferenceSource,
} from "../src/features/portfolio/bill-tracker/alert-preferences/queries";
import {
  trackerActor,
  trackerClientId,
  trackerIdentity,
  trackerPreferences,
} from "./tracker-preference-fixtures";

function cacheWithIdentity(value: unknown = trackerIdentity) {
  const cache = new QueryClient();
  cache.setQueryData(["identity"], value);
  return cache;
}
describe("Intel personal alert preference contract", () => {
  it("preserves the returned Clerk identity independently of the database user ID", () => {
    const parsed = identitySchema.parse(trackerIdentity);
    expect(parsed.user.id).not.toBe(parsed.user.clerkUserId);
    const cache = cacheWithIdentity(parsed);
    expect(currentAlertActor(cache)).toEqual(trackerActor);
    expect(() => assertAlertActor(cache, trackerActor)).not.toThrow();
  });
  it("never derives a missing Clerk subject from a database ID", () => {
    const cache = cacheWithIdentity({
      ...trackerIdentity,
      user: { id: "user_looks_like_a_clerk_id", email: null },
    });
    expect(currentAlertActor(cache)).toBeUndefined();
    expect(() => assertAlertActor(cache, trackerActor)).toThrow(ApiError);
    expect(
      identitySchema.safeParse({
        ...trackerIdentity,
        user: { ...trackerIdentity.user, clerkUserId: "" },
      }).success,
    ).toBe(false);
  });
  it.each(["client_portal_user", "guest", null])(
    "refuses a non-writer role %s",
    (role) => {
      expect(
        currentAlertActor(cacheWithIdentity({ ...trackerIdentity, role })),
      ).toBeUndefined();
    },
  );
  it("requires a current identity and detects changed Clerk subjects even with the same database identity", async () => {
    const cache = cacheWithIdentity();
    await cache.invalidateQueries({
      queryKey: ["identity"],
      refetchType: "none",
    });
    expect(currentAlertActor(cache)).toBeUndefined();
    cache.setQueryData(["identity"], {
      ...trackerIdentity,
      user: { ...trackerIdentity.user, clerkUserId: "user_other" },
    });
    expect(() => assertAlertActor(cache, trackerActor)).toThrow(
      "current account",
    );
  });
  it("requires the exact client, Clerk owner, and optional native tenant on read and save receipts", () => {
    const schema = alertPreferencesSchema({
      ...trackerActor,
      clientId: trackerClientId,
    });
    expect(schema.parse(trackerPreferences)).toEqual(trackerPreferences);
    const { tenantId: _tenant, ...defaults } = trackerPreferences;
    expect(_tenant).toBe(trackerActor.tenantId);
    expect(schema.safeParse(defaults).success).toBe(true);
    for (const mismatch of [
      { clientId: "other-client" },
      { userId: trackerActor.userId },
      { userId: "user_other" },
      { tenantId: "other-tenant" },
    ])
      expect(
        schema.safeParse({ ...trackerPreferences, ...mismatch }).success,
      ).toBe(false);
  });
  it("keeps the explicit Intel path and personal client/user cache separation", () => {
    expect(alertPreferencesPath(trackerClientId)).toBe(
      `tracker/watchlists/${trackerClientId}/alert-prefs`,
    );
    expect(alertPreferencesKey(trackerClientId, trackerActor)).toEqual([
      "bill-alert-preferences",
      "intelligence",
      trackerActor.tenantId,
      trackerActor.userId,
      trackerActor.clerkUserId,
      trackerClientId,
    ]);
  });
  it("sends every writable field and strips identity, metadata, and server-owned verification", () => {
    const draft = preferenceDraft({
      ...trackerPreferences,
      id: "saved-row",
      updatedAt: "2026-10-11T12:00:00Z",
    } as typeof trackerPreferences);
    const body = preferenceBody({ ...draft, materiality: "high" });
    expect(body).toEqual({
      triggers: trackerPreferences.triggers,
      materiality: "high",
      emailEnabled: true,
      emailAddress: "analyst@example.test",
      emailCadence: "daily",
      smsEnabled: false,
      smsPhone: "+12025550123",
      smsCadence: "realtime",
      quietHoursStart: "22:00",
      quietHoursEnd: "7:00",
      jurisdictions: ["US", "VA"],
    });
    expect(
      alertPrefsBodySchema.safeParse({ ...body, smsPhoneVerified: true })
        .success,
    ).toBe(false);
  });
  it("preserves explicit empty triggers and all-jurisdiction selection, and clears optional fields explicitly", () => {
    const body = preferenceBody({
      ...preferenceDraft(trackerPreferences),
      triggers: [],
      jurisdictionsText: "",
      emailEnabled: false,
      emailAddress: null,
      smsPhone: null,
      quietHoursStart: null,
      quietHoursEnd: null,
    });
    expect(body).toMatchObject({
      triggers: [],
      jurisdictions: [],
      emailAddress: null,
      smsPhone: null,
      quietHoursStart: null,
      quietHoursEnd: null,
    });
    expect(body.emailCadence).toBe("daily");
  });
  it("uses the native cadence, email and quiet-hours limits without a browser timezone conversion", () => {
    const draft = preferenceDraft(trackerPreferences);
    expect(
      preferenceBody({
        ...draft,
        quietHoursStart: "0:00",
        quietHoursEnd: "23:59",
      }).quietHoursStart,
    ).toBe("0:00");
    expect(() =>
      preferenceBody({ ...draft, quietHoursEnd: "24:00" }),
    ).toThrow();
    expect(() => preferenceBody({ ...draft, emailAddress: null })).toThrow();
    expect(() =>
      preferenceBody({
        ...draft,
        emailEnabled: false,
        emailAddress: "invalid",
      }),
    ).toThrow();
    expect(() =>
      preferenceBody({ ...draft, jurisdictionsText: "USA" }),
    ).toThrow();
    expect(
      alertPrefsBodySchema.safeParse({
        ...preferenceBody(draft),
        smsCadence: "weekly",
      }).success,
    ).toBe(false);
  });
  it("treats phone verification as a receipt for that exact saved number", () => {
    const draft = preferenceDraft(trackerPreferences);
    expect(hasVerifiedDraftPhone(trackerPreferences, draft)).toBe(true);
    expect(
      hasVerifiedDraftPhone(trackerPreferences, {
        ...draft,
        smsPhone: "+12025550124",
      }),
    ).toBe(false);
    expect(
      hasVerifiedDraftPhone(
        { ...trackerPreferences, smsPhoneVerified: false },
        draft,
      ),
    ).toBe(false);
    expect(
      hasVerifiedDraftPhone(
        { ...trackerPreferences, smsPhone: null },
        { ...draft, smsPhone: null },
      ),
    ).toBe(false);
  });
  it("refuses PUT after an invalidated, failed, changed, or misassociated saved read", async () => {
    const cache = cacheWithIdentity();
    const key = alertPreferencesKey(trackerClientId, trackerActor);
    cache.setQueryData(key, trackerPreferences);
    expect(
      assertPreferenceSource(
        cache,
        trackerClientId,
        trackerActor,
        trackerPreferences,
      ),
    ).toBe(1);
    await cache.invalidateQueries({ queryKey: key, refetchType: "none" });
    expect(() =>
      assertPreferenceSource(
        cache,
        trackerClientId,
        trackerActor,
        trackerPreferences,
      ),
    ).toThrow("Reload saved preferences");
    cache.setQueryData(key, { ...trackerPreferences, materiality: "high" });
    expect(() =>
      assertPreferenceSource(
        cache,
        trackerClientId,
        trackerActor,
        trackerPreferences,
      ),
    ).toThrow();
    cache.setQueryData(key, {
      ...trackerPreferences,
      userId: trackerActor.userId,
    });
    expect(() =>
      assertPreferenceSource(
        cache,
        trackerClientId,
        trackerActor,
        trackerPreferences,
      ),
    ).toThrow();
    cache.setQueryData(key, trackerPreferences);
    cache
      .getQueryCache()
      .find({ queryKey: key })!
      .setState({
        status: "error",
        error: new ApiError(403, "Removed access"),
      });
    expect(() =>
      assertPreferenceSource(
        cache,
        trackerClientId,
        trackerActor,
        trackerPreferences,
      ),
    ).toThrow();
  });
});
