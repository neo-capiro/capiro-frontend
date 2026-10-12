import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { ApiError, createApiClient } from "../src/shared/portfolio/api/http";
import { currentProfileActor } from "../src/features/portfolio/client-profile/profile-access";
import { profileReadKey } from "../src/features/portfolio/client-profile/profile-keys";
import { currentProfileSource } from "../src/features/portfolio/client-profile/profile-source";
import {
  assertFacilityAction,
  writeFacilityAction,
  type FacilityAction,
} from "../src/features/portfolio/client-profile/facility-action-writer";
import {
  facilityActionAttemptKey,
  setFacilityActionAttempt,
  unknownFacilityActionAttempt,
} from "../src/features/portfolio/client-profile/facility-action-attempt";
import {
  profileClientId,
  profileFacility,
  profileIdentity,
} from "./profile-current-state-fixtures";

const revision = `v1:${"a".repeat(64)}`;
const facility = {
  ...profileFacility,
  addressLine: "1 Test Street",
  geocodeCandidateRevision: revision,
  geocodeCandidates: [
    {
      matchedAddress: "1 TEST STREET",
      congressionalDistrict: "10",
      state: "TX",
      latitude: 30.27,
      longitude: -97.74,
    },
  ],
};
function current() {
  const cache = new QueryClient();
  cache.setQueryData(["identity"], profileIdentity);
  const actor = currentProfileActor(cache)!;
  const key = profileReadKey(profileClientId, "facilities", actor);
  cache.setQueryData(key, [facility]);
  return {
    cache,
    key,
    context: {
      clientId: profileClientId,
      actor,
      source: currentProfileSource(cache, key)!,
      facility,
    },
  };
}
function receipt(value: unknown, status = 200) {
  const calls: {
    path: string;
    method: string;
    body: unknown;
    signal?: AbortSignal | null;
  }[] = [];
  const api = createApiClient(async (path, init) => {
    calls.push({
      path: String(path),
      method: init?.method ?? "GET",
      body: init?.body ? JSON.parse(String(init.body)) : null,
      signal: init?.signal,
    });
    return new Response(JSON.stringify(value), { status });
  });
  return { api, calls };
}
const choice: FacilityAction = {
  kind: "geocode-candidate",
  facilityId: facility.id,
  candidateIndex: 0,
  expectedRevision: revision,
};

describe("native facility action dispatch", () => {
  it.each(["geocode", "resolve-district"] as const)(
    "keeps %s POST bodyless and carries the local abort signal",
    async (kind) => {
      const { cache, context } = current();
      const service = receipt(facility);
      const controller = new AbortController();
      await writeFacilityAction(
        service.api,
        cache,
        context,
        { kind, facilityId: facility.id },
        controller.signal,
      );
      expect(service.calls).toEqual([
        {
          path: `/api/backend/core/clients/${profileClientId}/facilities/${facility.id}/${kind}`,
          method: "POST",
          body: null,
          signal: controller.signal,
        },
      ]);
    },
  );
  it("carries the actual candidate index and server revision only to the reviewed route", async () => {
    const { cache, context } = current();
    const service = receipt(facility);
    await writeFacilityAction(
      service.api,
      cache,
      context,
      choice,
      new AbortController().signal,
    );
    expect(service.calls[0]).toMatchObject({
      path: `/api/backend/core/clients/${profileClientId}/facilities/${facility.id}/geocode-candidate/reviewed`,
      method: "POST",
      body: { candidateIndex: 0, expectedRevision: revision },
    });
  });
  it.each([400, 403, 404, 409, 503])(
    "never follows a reviewed-route %s with another provider route",
    async (status) => {
      const { cache, context } = current();
      const service = receipt(
        { message: "Synthetic refusal or unknown result" },
        status,
      );
      await expect(
        writeFacilityAction(
          service.api,
          cache,
          context,
          choice,
          new AbortController().signal,
        ),
      ).rejects.toMatchObject({ status });
      expect(service.calls).toHaveLength(1);
      expect(service.calls[0]!.path).toContain("/geocode-candidate/reviewed");
    },
  );
  it.each([
    { id: "another-facility" },
    { clientId: "another-client" },
    { tenantId: "another-tenant" },
    { tenantId: "" },
  ])("rejects a mismatched native facility receipt %j", async (change) => {
    const { cache, context } = current();
    const service = receipt({ ...facility, ...change });
    await expect(
      writeFacilityAction(
        service.api,
        cache,
        context,
        { kind: "geocode", facilityId: facility.id },
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ status: 502 });
    expect(service.calls).toHaveLength(1);
  });
  it("accepts a real facility receipt that omits optional tenant identity", async () => {
    const { cache, context } = current();
    const native = { ...facility, tenantId: undefined };
    const service = receipt(native);
    await expect(
      writeFacilityAction(
        service.api,
        cache,
        context,
        choice,
        new AbortController().signal,
      ),
    ).resolves.toMatchObject({ id: facility.id, clientId: profileClientId });
  });
});

describe("current facility and candidate source preflight", () => {
  it.each([-1, 0.5, 1, Number.MAX_SAFE_INTEGER + 1])(
    "refuses absent or invalid candidate index %s before any POST",
    async (candidateIndex) => {
      const { cache, context } = current();
      const service = receipt(facility);
      await expect(
        writeFacilityAction(
          service.api,
          cache,
          context,
          { ...choice, candidateIndex },
          new AbortController().signal,
        ),
      ).rejects.toBeInstanceOf(ApiError);
      expect(service.calls).toEqual([]);
    },
  );
  it.each(["", `v1:${"b".repeat(64)}`])(
    "requires the displayed server revision %s",
    (expectedRevision) => {
      const { cache, context } = current();
      expect(() =>
        assertFacilityAction(cache, context, { ...choice, expectedRevision }),
      ).toThrow(ApiError);
    },
  );
  it("refuses a missing current facility or differently bound action", () => {
    const { cache, key, context } = current();
    expect(() =>
      assertFacilityAction(cache, context, {
        kind: "geocode",
        facilityId: "other",
      }),
    ).toThrow(ApiError);
    cache.setQueryData(key, []);
    expect(() =>
      assertFacilityAction(
        cache,
        { ...context, source: currentProfileSource(cache, key)! },
        choice,
      ),
    ).toThrow(ApiError);
  });
  it("refuses an invalidated source and changed actor before dispatch", async () => {
    const { cache, key, context } = current();
    await cache.invalidateQueries({ queryKey: key, refetchType: "none" });
    expect(() => assertFacilityAction(cache, context, choice)).toThrow(
      ApiError,
    );
    cache.setQueryData(key, [facility]);
    cache.setQueryData(["identity"], {
      ...profileIdentity,
      user: { ...profileIdentity.user, id: "other-user" },
    });
    expect(() =>
      assertFacilityAction(
        cache,
        { ...context, source: currentProfileSource(cache, key)! },
        choice,
      ),
    ).toThrow(ApiError);
  });
  it("refuses an old displayed address even when a newer source is successfully available", () => {
    const { cache, key, context } = current();
    cache.setQueryData(key, [{ ...facility, addressLine: "2 Current Street" }]);
    expect(() =>
      assertFacilityAction(
        cache,
        { ...context, source: currentProfileSource(cache, key)! },
        choice,
      ),
    ).toThrow(ApiError);
  });
  it("does not start provider work from an incomplete saved address", () => {
    const { cache, key, context } = current();
    cache.setQueryData(key, [profileFacility]);
    expect(() =>
      assertFacilityAction(
        cache,
        {
          ...context,
          facility: profileFacility,
          source: currentProfileSource(cache, key)!,
        },
        { kind: "geocode", facilityId: facility.id },
      ),
    ).toThrow(ApiError);
  });
  it("keeps uncertainty scoped to the initiating actor/client/facility without a native operation ID", () => {
    const { cache, context } = current();
    const key = facilityActionAttemptKey(
      profileClientId,
      context.actor,
      facility.id,
    );
    setFacilityActionAttempt(cache, key, {
      token: 8,
      kind: "geocode",
      status: "pending",
    });
    unknownFacilityActionAttempt(cache, key, 7);
    expect(cache.getQueryData(key)).toMatchObject({ status: "pending" });
    unknownFacilityActionAttempt(cache, key, 8);
    expect(cache.getQueryData(key)).toEqual({
      token: 8,
      kind: "geocode",
      status: "unknown",
    });
    expect(
      facilityActionAttemptKey(
        profileClientId,
        { ...context.actor, role: "standard_user" },
        facility.id,
      ),
    ).toEqual(key);
    expect(
      facilityActionAttemptKey(
        profileClientId,
        { ...context.actor, userId: "other" },
        facility.id,
      ),
    ).not.toEqual(key);
    expect(
      facilityActionAttemptKey("other-client", context.actor, facility.id),
    ).not.toEqual(key);
    expect(
      facilityActionAttemptKey(
        profileClientId,
        context.actor,
        "other-facility",
      ),
    ).not.toEqual(key);
    expect(cache.getQueryDefaults(key).gcTime).toBe(Infinity);
  });
});
