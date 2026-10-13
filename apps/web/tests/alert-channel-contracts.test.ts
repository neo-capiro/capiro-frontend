import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "../src/shared/portfolio/api/http";
import {
  currentPreferenceActor,
  assertPreferenceActor,
} from "../src/features/portfolio/bill-tracker/alert-preferences/personal-access";
import {
  corePreferencesSchema,
  corePreferenceBody,
  corePreferenceDraft,
  coreSavedValues,
  savedPhoneValue,
} from "../src/features/portfolio/bill-tracker/alert-preferences/core-contracts";
import { intelSavedPhoneValue } from "../src/features/portfolio/bill-tracker/alert-preferences/contracts";
import {
  personalBody,
  personalDraft,
  personalPreferencesPath,
  personalPreferencesSchema,
  assertSavedPreferences,
} from "../src/features/portfolio/bill-tracker/alert-preferences/personal-contracts";
import {
  personalPreferencesKey,
  capturePreferenceReview,
  assertPreferenceReview,
} from "../src/features/portfolio/bill-tracker/alert-preferences/personal-queries";
import {
  channelPath,
  phoneRequestSchema,
  phoneConfirmBodySchema,
  phoneRequestReceiptSchema,
  phoneConfirmReceiptSchema,
  testAlertBodySchema,
  testAlertReceiptSchema,
  testResultLabel,
} from "../src/features/portfolio/bill-tracker/alert-preferences/channel-contracts";
import {
  channelAttemptKey,
  beginChannelAttempt,
  finishChannelAttempt,
} from "../src/features/portfolio/bill-tracker/alert-preferences/channel-attempts";
import { profileReadKey } from "../src/features/portfolio/client-profile/read-public";
import { watchPreferenceInputs } from "../src/features/portfolio/bill-tracker/alert-preferences/preference-write-lifetime";
import {
  corePreferenceOwner as core,
  intelPreferenceOwner as intel,
  corePreferences,
  intelPreferences,
  alertClient,
  trackerActor,
  trackerClientId as clientId,
  trackerIdentity,
} from "./alert-channel-fixtures";

function cacheWithSources() {
  const cache = new QueryClient();
  cache.setQueryData(["identity"], trackerIdentity);
  cache.setQueryData(
    profileReadKey(clientId, "saved-client", core.actor),
    alertClient,
  );
  cache.setQueryData(personalPreferencesKey(clientId, core), corePreferences);
  cache.setQueryData(personalPreferencesKey(clientId, intel), intelPreferences);
  return cache;
}
describe("explicit Core and Intel personal preferences", () => {
  it("uses the actual database identity for Core without requiring or deriving a Clerk subject", () => {
    const cache = cacheWithSources();
    cache.setQueryData(["identity"], {
      ...trackerIdentity,
      user: { id: trackerActor.userId, email: null },
    });
    expect(currentPreferenceActor(cache, "core")).toEqual(core);
    expect(currentPreferenceActor(cache, "intelligence")).toBeUndefined();
    expect(() => assertPreferenceActor(cache, intel)).toThrow(ApiError);
    expect(() => assertPreferenceActor(cache, core)).not.toThrow();
  });
  it("keeps owner routes and keys distinct, including actual Clerk ownership for Intel", () => {
    expect(personalPreferencesPath(clientId, core)).toBe(
      `intelligence/clients/${clientId}/tracker/alert-prefs`,
    );
    expect(personalPreferencesPath(clientId, intel)).toBe(
      `tracker/watchlists/${clientId}/alert-prefs`,
    );
    expect(personalPreferencesKey(clientId, core)).not.toEqual(
      personalPreferencesKey(clientId, intel),
    );
    expect(personalPreferencesKey(clientId, intel)).toContain(
      trackerActor.clerkUserId,
    );
    expect(personalPreferencesKey(clientId, core)).not.toContain(
      trackerActor.clerkUserId,
    );
  });
  it("preserves every Core field, unknown native triggers, and no invented identity or jurisdiction echo", () => {
    const body = corePreferenceBody(
      { ...corePreferenceDraft(corePreferences), materiality: "high" },
      corePreferences,
    );
    expect(body).toEqual({ ...corePreferences, materiality: "high" });
    expect(Object.keys(body)).toHaveLength(11);
    expect(body.triggers).toContain("core_native_extra");
    expect(body).not.toHaveProperty("clientId");
    expect(body).not.toHaveProperty("jurisdictions");
    expect(corePreferencesSchema.parse(body)).toEqual(body);
    expect(personalPreferencesSchema(clientId, core).parse(body)).toEqual(body);
  });
  it("preserves the Core verified flag only for the exact saved verified phone and clears it on change or clear", () => {
    const saved = { ...corePreferences, smsPhoneVerified: true };
    const draft = corePreferenceDraft(saved);
    expect(corePreferenceBody(draft, saved).smsPhoneVerified).toBe(true);
    expect(
      corePreferenceBody({ ...draft, smsPhone: "+12025550124" }, saved)
        .smsPhoneVerified,
    ).toBe(false);
    expect(
      corePreferenceBody({ ...draft, smsPhone: null }, saved).smsPhoneVerified,
    ).toBe(false);
    expect(corePreferenceBody(draft, corePreferences).smsPhoneVerified).toBe(
      false,
    );
    expect(
      personalBody(
        personalDraft(intelPreferences, intel),
        intelPreferences,
        intel,
      ),
    ).not.toHaveProperty("smsPhoneVerified");
  });
  it("uses Core's own length/string DTO without importing Intel jurisdiction or time validators", () => {
    const draft = corePreferenceDraft(corePreferences);
    expect(
      corePreferenceBody(
        { ...draft, quietHoursStart: "saved" },
        corePreferences,
      ).quietHoursStart,
    ).toBe("saved");
    expect(() =>
      corePreferenceBody(
        { ...draft, smsPhone: "1".repeat(21) },
        corePreferences,
      ),
    ).toThrow();
    expect(() =>
      corePreferenceBody(
        { ...draft, quietHoursEnd: "123456" },
        corePreferences,
      ),
    ).toThrow();
  });
  it.each([
    ["+02025550123", "+02025550123"],
    ["441234567890", "+441234567890"],
    ["abc2025550123", "+12025550123"],
  ])(
    "does not substitute the broader Core phone projection for Intel: %s",
    (input, coreValue) => {
      expect(savedPhoneValue(input)).toBe(coreValue);
      expect(intelSavedPhoneValue(input)).toBeNull();
    },
  );
  it("accepts each owner's returned normalization without accepting mismatched saved field receipts", () => {
    const draft = {
      ...corePreferenceDraft(corePreferences),
      smsPhone: "(202) 555-0123",
      emailAddress: " core@example.test ",
      smsEnabled: true,
    };
    const saved = coreSavedValues(corePreferenceBody(draft, corePreferences));
    expect(saved).toMatchObject({
      smsPhone: "+12025550123",
      smsPhoneVerified: false,
      smsEnabled: false,
      emailAddress: "core@example.test",
    });
    expect(() =>
      assertSavedPreferences(saved, draft, corePreferences, core),
    ).not.toThrow();
    expect(() =>
      assertSavedPreferences(
        { ...saved, materiality: "high" },
        draft,
        corePreferences,
        core,
      ),
    ).toThrow("do not confirm");
    const intelDraft = {
      ...personalDraft(intelPreferences, intel),
      smsPhone: "441234567890",
    };
    expect(() =>
      assertSavedPreferences(
        { ...intelPreferences, smsPhone: null },
        intelDraft,
        intelPreferences,
        intel,
      ),
    ).not.toThrow();
    expect(() =>
      assertSavedPreferences(
        { ...intelPreferences, smsPhone: "+441234567890" },
        intelDraft,
        intelPreferences,
        intel,
      ),
    ).toThrow();
  });
  it("requires an actual current client before using even a well-shaped no-echo default preference", async () => {
    const cache = cacheWithSources();
    const review = capturePreferenceReview(
      cache,
      clientId,
      core,
      corePreferences,
    );
    expect(() =>
      assertPreferenceReview(cache, clientId, core, review),
    ).not.toThrow();
    await cache.invalidateQueries({
      queryKey: review.parent.key,
      refetchType: "none",
    });
    expect(() =>
      capturePreferenceReview(cache, clientId, core, corePreferences),
    ).toThrow("current client");
    cache.setQueryData(review.parent.key, {
      ...alertClient,
      id: "wrong-client",
    });
    expect(() =>
      capturePreferenceReview(cache, clientId, core, corePreferences),
    ).toThrow();
  });
  it("refuses failed, invalidated and later preference-source revisions", async () => {
    const cache = cacheWithSources();
    const key = personalPreferencesKey(clientId, core);
    const review = capturePreferenceReview(
      cache,
      clientId,
      core,
      corePreferences,
    );
    await cache.invalidateQueries({ queryKey: key, refetchType: "none" });
    expect(() =>
      assertPreferenceReview(cache, clientId, core, review),
    ).toThrow();
    expect(() =>
      assertPreferenceReview(cache, clientId, core, review, true),
    ).not.toThrow();
    cache.setQueryData(key, { ...corePreferences, materiality: "high" });
    expect(() =>
      assertPreferenceReview(cache, clientId, core, review, true),
    ).toThrow();
    cache
      .getQueryCache()
      .find({ queryKey: key })!
      .setState({ status: "error", error: new ApiError(403, "Refused") });
    expect(() =>
      capturePreferenceReview(cache, clientId, core, corePreferences),
    ).toThrow();
  });
  it.each(["client", "preferences"])(
    "latches a %s input failure restored to the exact same revision in one callback",
    (target) => {
      const cache = cacheWithSources();
      const review = capturePreferenceReview(
        cache,
        clientId,
        core,
        corePreferences,
      );
      const controller = new AbortController();
      const attempt = {
        controller,
        parent: review.parent,
        review,
        ownInvalidation: false,
      };
      const stop = watchPreferenceInputs(
        cache,
        clientId,
        core,
        () => attempt,
        () => {
          throw new Error("Unexpected actor loss");
        },
      );
      const key =
        target === "client"
          ? review.parent.key
          : personalPreferencesKey(clientId, core);
      const query = cache.getQueryCache().find({ queryKey: key })!;
      const pristine = query.state;
      query.setState({
        status: "error",
        error: new ApiError(403, "Interrupted"),
      });
      query.setState(pristine);
      expect(() =>
        assertPreferenceReview(cache, clientId, core, review),
      ).not.toThrow();
      expect(controller.signal.aborted).toBe(true);
      stop();
    },
  );
  it("allows only the writer's own deliberate target invalidation", async () => {
    const cache = cacheWithSources();
    const review = capturePreferenceReview(
      cache,
      clientId,
      core,
      corePreferences,
    );
    const controller = new AbortController();
    const attempt = {
      controller,
      parent: review.parent,
      review,
      ownInvalidation: true,
    };
    const stop = watchPreferenceInputs(
      cache,
      clientId,
      core,
      () => attempt,
      () => {},
    );
    const key = personalPreferencesKey(clientId, core);
    await cache.invalidateQueries({ queryKey: key, refetchType: "none" });
    expect(controller.signal.aborted).toBe(false);
    attempt.ownInvalidation = false;
    const query = cache.getQueryCache().find({ queryKey: key })!;
    query.setState({ isInvalidated: false });
    await cache.invalidateQueries({ queryKey: key, refetchType: "none" });
    expect(controller.signal.aborted).toBe(true);
    stop();
  });
});
describe("native alert channel request and receipt boundaries", () => {
  it.each([core, intel])(
    "uses published explicit $backend routes and exact action bodies",
    (owner) => {
      const prefix =
        owner.backend === "core"
          ? `intelligence/clients/${clientId}/tracker`
          : `clients/${clientId}/tracker`;
      expect(channelPath(clientId, owner.backend, "sms/verify/start")).toBe(
        `${prefix}/sms/verify/start`,
      );
      expect(channelPath(clientId, owner.backend, "sms/verify/confirm")).toBe(
        `${prefix}/sms/verify/confirm`,
      );
      expect(channelPath(clientId, owner.backend, "test-alert")).toBe(
        `${prefix}/test-alert`,
      );
      expect(phoneRequestSchema.parse({ phone: "+12025550123" })).toEqual({
        phone: "+12025550123",
      });
      expect(
        phoneConfirmBodySchema.parse({ phone: "+12025550123", code: "123456" }),
      ).toEqual({ phone: "+12025550123", code: "123456" });
    },
  );
  it("accepts acknowledgement only, without inventing delivered or provider accepted fields", () => {
    expect(
      phoneRequestReceiptSchema.parse({ dormant: false, masked: "•••0123" }),
    ).toEqual({ dormant: false, masked: "•••0123" });
    expect(phoneRequestReceiptSchema.safeParse({ sent: true }).success).toBe(
      false,
    );
    expect(
      phoneRequestSchema.safeParse({ phone: "1".repeat(21) }).success,
    ).toBe(false);
    expect(
      phoneConfirmBodySchema.safeParse({
        phone: "+12025550123",
        code: "abc123",
      }).success,
    ).toBe(false);
  });
  it("requires a true verification receipt for the exact requested saved phone", () => {
    const schema = phoneConfirmReceiptSchema("+12025550123");
    expect(
      schema.safeParse({ verified: true, phone: "+12025550123" }).success,
    ).toBe(true);
    expect(
      schema.safeParse({ verified: true, phone: "+12025550124" }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ verified: false, phone: "+12025550123" }).success,
    ).toBe(false);
  });
  it("does not expose the native in_app no-op as a notification test", () => {
    expect(
      testAlertBodySchema.safeParse({ channels: ["in_app"] }).success,
    ).toBe(false);
    expect(testAlertBodySchema.safeParse({ channels: [] }).success).toBe(false);
    expect(
      testAlertBodySchema.safeParse({ channels: ["email", "email"] }).success,
    ).toBe(false);
    expect(testResultLabel.sent).toBe("Provider accepted");
    expect(testResultLabel.failed).toBe("Service reported failure");
  });
  it.each([
    [{ channel: "email", status: "sent" }],
    [
      { channel: "email", status: "sent" },
      { channel: "email", status: "sent" },
    ],
    [
      { channel: "email", status: "sent" },
      { channel: "in_app", status: "sent" },
    ],
  ])(
    "rejects missing, duplicate or unrequested test receipts %#",
    (...results) => {
      expect(
        testAlertReceiptSchema(["email", "sms"]).safeParse(results).success,
      ).toBe(false);
    },
  );
  it("accepts the exact independent native outcomes for each requested channel", () => {
    const results = [
      {
        channel: "email",
        status: "failed",
        detail: "Synthetic provider rejection",
      },
      { channel: "sms", status: "suppressed" },
    ];
    expect(testAlertReceiptSchema(["email", "sms"]).parse(results)).toEqual(
      results,
    );
  });
  it("keeps interrupted attempt uncertainty in the current query cache until explicit review, without replay", () => {
    const cache = new QueryClient();
    const key = channelAttemptKey(clientId, core, "phone");
    const attempt = beginChannelAttempt(cache, key, "confirm");
    expect(() =>
      beginChannelAttempt(
        cache,
        channelAttemptKey(clientId, core, "test"),
        "test",
      ),
    ).toThrow("current channel");
    finishChannelAttempt(cache, key, attempt.token, true);
    expect(cache.getQueryData(key)).toEqual({ ...attempt, status: "unknown" });
    expect(() => beginChannelAttempt(cache, key, "start")).toThrow("Review");
    finishChannelAttempt(cache, key, attempt.token + 1, false);
    expect(cache.getQueryData(key)).toBeTruthy();
    finishChannelAttempt(cache, key, attempt.token, false);
    expect(cache.getQueryData(key)).toBeUndefined();
  });
});
