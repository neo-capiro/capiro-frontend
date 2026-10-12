import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { ApiError, createApiClient } from "../src/shared/portfolio/api/http";
import {
  assertProfileActor,
  currentProfileActor,
  profileActorKey,
} from "../src/features/portfolio/client-profile/profile-access";
import { profileReadKey } from "../src/features/portfolio/client-profile/profile-keys";
import {
  currentProfileSource,
  profileSourceMatches,
} from "../src/features/portfolio/client-profile/profile-source";
import {
  profileNotesReceipt,
  profileTeamSchema,
  teamOwnerReceipt,
  teamRosterReceipt,
} from "../src/features/portfolio/client-profile/profile-receipts";
import { writeProfileNotes } from "../src/features/portfolio/client-profile/notes-writer";
import {
  assertTeamChange,
  writeTeamChange,
} from "../src/features/portfolio/client-profile/team-writer";
import {
  assertFacilityWrite,
  facilitySaveReceipt,
  writeFacility,
} from "../src/features/portfolio/client-profile/facility-writer";
import {
  facilityAttemptKey,
  setFacilityAttempt,
  unknownFacilityAttempt,
} from "../src/features/portfolio/client-profile/facility-attempt";
import {
  otherProfileClientId,
  profileClient,
  profileClientId,
  profileFacility,
  profileIdentity,
  profileMembers,
  profileTeam,
} from "./profile-current-state-fixtures";

function currentProfile() {
  const cache = new QueryClient();
  cache.setQueryData(["identity"], profileIdentity);
  const actor = currentProfileActor(cache)!;
  const sources = {
    client: profileReadKey(profileClientId, "saved-client", actor),
    team: profileReadKey(profileClientId, "team", actor),
    members: profileReadKey("members", "member-options", actor),
    facilities: profileReadKey(profileClientId, "facilities", actor),
  };
  cache.setQueryData(sources.client, profileClient);
  cache.setQueryData(sources.team, profileTeam);
  cache.setQueryData(sources.members, profileMembers);
  cache.setQueryData(sources.facilities, [profileFacility]);
  return { cache, actor, sources };
}
function serviceReceipt(receipt: unknown, status = 200) {
  const calls: { path: string; method: string; body: unknown }[] = [];
  const api = createApiClient(async (url, init) => {
    calls.push({
      path: String(url),
      method: init?.method ?? "GET",
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    return new Response(JSON.stringify(receipt), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  });
  return { api, calls };
}
describe("current Core profile authority and sources", () => {
  it("uses the native database actor and separately enforces admin-only sections", () => {
    const { cache, actor } = currentProfile();
    expect(actor.userId).toBe(profileIdentity.user.id);
    expect(() => assertProfileActor(cache, actor, true)).not.toThrow();
    cache.setQueryData(["identity"], {
      ...profileIdentity,
      role: "standard_user",
    });
    const member = currentProfileActor(cache)!;
    expect(() => assertProfileActor(cache, member)).not.toThrow();
    expect(() => assertProfileActor(cache, member, true)).toThrow(ApiError);
    expect(() => assertProfileActor(cache, actor)).toThrow(ApiError);
  });
  it.each(["guest", "client_portal_user", null])(
    "does not grant profile writes to %s",
    (role) => {
      const { cache } = currentProfile();
      cache.setQueryData(["identity"], { ...profileIdentity, role });
      expect(currentProfileActor(cache)).toBeUndefined();
    },
  );
  it("refuses invalidated or failed cached identity", async () => {
    const { cache, actor } = currentProfile();
    await cache.invalidateQueries({
      queryKey: ["identity"],
      refetchType: "none",
    });
    expect(currentProfileActor(cache)).toBeUndefined();
    expect(() => assertProfileActor(cache, actor)).toThrow(ApiError);
    cache.setQueryData(["identity"], profileIdentity);
    cache
      .getQueryCache()
      .find({ queryKey: ["identity"] })!
      .setState({ status: "error", error: new ApiError(403, "Unavailable") });
    expect(currentProfileActor(cache)).toBeUndefined();
  });
  it("separates tenant, actor, role, client and section reads", () => {
    const { actor } = currentProfile();
    const first = profileReadKey(profileClientId, "team", actor);
    for (const other of [
      { ...actor, tenantId: "other" },
      { ...actor, userId: "other" },
      { ...actor, role: "standard_user" },
    ])
      expect(profileReadKey(profileClientId, "team", other)).not.toEqual(first);
    expect(profileReadKey(otherProfileClientId, "team", actor)).not.toEqual(
      first,
    );
    expect(profileReadKey(profileClientId, "facilities", actor)).not.toEqual(
      first,
    );
    expect(profileActorKey(undefined)).toBe("unavailable");
  });
  it("expires a captured source after another read, error, or invalidation", async () => {
    const { cache, sources } = currentProfile();
    const source = currentProfileSource(cache, sources.client)!;
    cache.setQueryData(sources.client, profileClient);
    expect(profileSourceMatches(cache, source)).toBe(false);
    const next = currentProfileSource(cache, sources.client)!;
    await cache.invalidateQueries({
      queryKey: sources.client,
      refetchType: "none",
    });
    expect(profileSourceMatches(cache, next)).toBe(false);
    cache
      .getQueryCache()
      .find({ queryKey: sources.client })!
      .setState({ status: "error", error: new ApiError(404, "Gone") });
    expect(currentProfileSource(cache, sources.client)).toBeUndefined();
  });
});
describe("profile notes native receipts", () => {
  it.each([
    { id: otherProfileClientId },
    { tenantId: "another-tenant" },
    { tenantId: "" },
    { intakeData: { profileNotes: "Another value" } },
    { intakeData: {} },
  ])("rejects mismatched notes receipt %j", (change) => {
    expect(
      profileNotesReceipt(
        profileClientId,
        profileIdentity.tenant.id,
        "Saved profile notes",
      ).safeParse({ ...profileClient, ...change }).success,
    ).toBe(false);
  });
  it("accepts an explicit clear only as an updated matching client", async () => {
    const { cache, actor, sources } = currentProfile();
    const receipt = {
      ...profileClient,
      intakeData: { ...profileClient.intakeData, profileNotes: "" },
    };
    const { api, calls } = serviceReceipt(receipt);
    const value = await writeProfileNotes(
      api,
      cache,
      {
        clientId: profileClientId,
        actor,
        source: currentProfileSource(cache, sources.client)!,
      },
      "",
      new AbortController().signal,
    );
    expect(value.intakeData?.profileNotes).toBe("");
    expect(calls).toEqual([
      {
        path: `/api/backend/core/clients/${profileClientId}/profile-notes`,
        method: "PUT",
        body: { notes: "" },
      },
    ]);
    expect(value.intakeData?.retained).toBe("Sibling field");
    expect(
      profileNotesReceipt(profileClientId, actor.tenantId, "").safeParse({
        ok: true,
      }).success,
    ).toBe(false);
  });
  it("does not issue a request from an unavailable or differently bound source", async () => {
    const { cache, actor, sources } = currentProfile();
    const source = currentProfileSource(cache, sources.client)!;
    const { api, calls } = serviceReceipt(profileClient);
    cache.setQueryData(sources.client, {
      ...profileClient,
      id: otherProfileClientId,
    });
    await expect(
      writeProfileNotes(
        api,
        cache,
        { clientId: profileClientId, actor, source },
        "Draft",
        new AbortController().signal,
      ),
    ).rejects.toBeInstanceOf(ApiError);
    await expect(
      writeProfileNotes(
        api,
        cache,
        {
          clientId: profileClientId,
          actor,
          source: currentProfileSource(cache, sources.client)!,
        },
        "Draft",
        new AbortController().signal,
      ),
    ).rejects.toBeInstanceOf(ApiError);
    expect(calls).toEqual([]);
  });
});
describe("account team and single owner native receipts", () => {
  it("validates roster uniqueness and one native owner without invented tenant/client fields", () => {
    expect(profileTeamSchema.safeParse(profileTeam).success).toBe(true);
    expect(
      profileTeamSchema.safeParse([...profileTeam, profileTeam[0]]).success,
    ).toBe(false);
    expect(
      profileTeamSchema.safeParse(
        profileTeam.map((member) => ({ ...member, isOwner: true })),
      ).success,
    ).toBe(false);
  });
  it("checks add, updated role, native owner projection, and removal effects", () => {
    expect(
      teamRosterReceipt({
        kind: "add",
        userId: "member-team",
        role: " Analyst ",
      }).safeParse(profileTeam).success,
    ).toBe(true);
    expect(
      teamRosterReceipt({
        kind: "add",
        userId: "member-team",
        role: "New role",
      }).safeParse(profileTeam).success,
    ).toBe(false);
    expect(
      teamRosterReceipt({
        kind: "add",
        userId: "member-owner",
        role: "Owner membership role",
      }).safeParse(profileTeam).success,
    ).toBe(false);
    expect(
      teamRosterReceipt({
        kind: "add",
        userId: "member-owner",
        role: " Owner membership role ",
      }).safeParse(
        profileTeam.map((member) =>
          member.isOwner
            ? { ...member, role: "Owner membership role" }
            : member,
        ),
      ).success,
    ).toBe(true);
    expect(
      teamRosterReceipt({ kind: "remove", userId: "member-team" }).safeParse(
        profileTeam,
      ).success,
    ).toBe(false);
    expect(
      teamRosterReceipt({ kind: "remove", userId: "member-team" }).safeParse([
        profileTeam[0],
      ]).success,
    ).toBe(true);
  });
  it("requires nullable owner/member agreement and the requested database member ID", () => {
    expect(
      teamOwnerReceipt(null).safeParse({
        accountOwnerUserId: null,
        accountOwner: null,
      }).success,
    ).toBe(true);
    expect(
      teamOwnerReceipt("member-new").safeParse({
        accountOwnerUserId: "member-new",
        accountOwner: profileMembers[2],
      }).success,
    ).toBe(true);
    expect(
      teamOwnerReceipt("member-new").safeParse({
        accountOwnerUserId: "member-new",
        accountOwner: profileMembers[0],
      }).success,
    ).toBe(false);
    expect(
      teamOwnerReceipt(null).safeParse({
        accountOwnerUserId: null,
        accountOwner: profileMembers[0],
      }).success,
    ).toBe(false);
  });
  it("refuses removal of the projected owner and missing member options before sending", () => {
    const { cache, actor, sources } = currentProfile();
    const context = {
      clientId: profileClientId,
      actor,
      roster: currentProfileSource(cache, sources.team)!,
      options: currentProfileSource(cache, sources.members)!,
    };
    expect(() =>
      assertTeamChange(cache, context, {
        kind: "remove",
        userId: "member-owner",
      }),
    ).toThrow(ApiError);
    expect(() =>
      assertTeamChange(cache, context, {
        kind: "add",
        userId: "unavailable",
        role: "Analyst",
      }),
    ).toThrow(ApiError);
    cache.setQueryData(sources.members, []);
    expect(() =>
      assertTeamChange(cache, context, { kind: "owner", userId: "member-new" }),
    ).toThrow(ApiError);
  });
  it("uses the exact owner PUT vocabulary and a roster receipt for DELETE", async () => {
    const { cache, actor, sources } = currentProfile();
    const context = {
      clientId: profileClientId,
      actor,
      roster: currentProfileSource(cache, sources.team)!,
      options: currentProfileSource(cache, sources.members)!,
    };
    const owner = serviceReceipt({
      accountOwnerUserId: null,
      accountOwner: null,
    });
    expect(
      (
        await writeTeamChange(
          owner.api,
          cache,
          context,
          { kind: "owner", userId: null },
          new AbortController().signal,
        )
      ).kind,
    ).toBe("owner");
    expect(owner.calls[0]).toEqual({
      path: `/api/backend/core/client-account-owners/${profileClientId}`,
      method: "PUT",
      body: { accountOwnerUserId: null },
    });
    const removal = serviceReceipt([profileTeam[0]]);
    expect(
      (
        await writeTeamChange(
          removal.api,
          cache,
          context,
          { kind: "remove", userId: "member-team" },
          new AbortController().signal,
        )
      ).kind,
    ).toBe("roster");
    expect(removal.calls[0]).toEqual({
      path: `/api/backend/core/clients/${profileClientId}/team?userId=member-team`,
      method: "DELETE",
      body: null,
    });
  });
});
describe("facility native writes and session-local unknown fencing", () => {
  it.each([
    { id: "other" },
    { clientId: otherProfileClientId },
    { tenantId: "other" },
    { name: "Unchanged response" },
    { notes: "Unchanged note" },
  ])("rejects an unrelated or ineffective facility edit %j", (change) => {
    const schema = facilitySaveReceipt(
      profileClientId,
      profileIdentity.tenant.id,
      { name: profileFacility.name, notes: profileFacility.notes },
      profileFacility.id,
    );
    expect(schema.safeParse({ ...profileFacility, ...change }).success).toBe(
      false,
    );
  });
  it("keeps congressional normalization native while checking stable submitted fields", () => {
    const schema = facilitySaveReceipt(
      profileClientId,
      profileIdentity.tenant.id,
      {
        name: "Synthetic profile lab",
        state: "WY",
        congressionalDistrict: "01",
        notes: null,
      },
    );
    expect(
      schema.safeParse({
        ...profileFacility,
        state: "WY",
        congressionalDistrict: "00",
        notes: null,
      }).success,
    ).toBe(true);
    expect(
      schema.safeParse({
        ...profileFacility,
        state: "WY",
        congressionalDistrict: "00",
      }).success,
    ).toBe(false);
  });
  it("blocks stale or missing saved facilities before sending an edit/delete", () => {
    const { cache, actor, sources } = currentProfile();
    cache.setQueryData(sources.facilities, [
      { ...profileFacility, employeeCount: 99 },
    ]);
    const context = {
      clientId: profileClientId,
      actor,
      source: currentProfileSource(cache, sources.facilities)!,
      facility: profileFacility,
    };
    expect(() =>
      assertFacilityWrite(cache, context, {
        kind: "save",
        body: { name: profileFacility.name },
      }),
    ).toThrow(ApiError);
    expect(() =>
      assertFacilityWrite(cache, context, { kind: "remove" }),
    ).toThrow(ApiError);
  });
  it("validates the exact delete acknowledgement without fabricating a returned facility ID", async () => {
    const { cache, actor, sources } = currentProfile();
    const context = {
      clientId: profileClientId,
      actor,
      source: currentProfileSource(cache, sources.facilities)!,
      facility: profileFacility,
    };
    const { api, calls } = serviceReceipt({ deleted: true });
    expect(
      await writeFacility(
        api,
        cache,
        context,
        { kind: "remove" },
        new AbortController().signal,
      ),
    ).toBeNull();
    expect(calls[0]).toEqual({
      path: `/api/backend/core/clients/${profileClientId}/facilities/${profileFacility.id}`,
      method: "DELETE",
      body: null,
    });
    await expect(
      writeFacility(
        serviceReceipt({ ok: true }).api,
        cache,
        context,
        { kind: "remove" },
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ status: 502 });
  });
  it("retains unknown attempts by native actor/client across editor lifetime and role changes", () => {
    const { cache, actor } = currentProfile();
    const key = facilityAttemptKey(profileClientId, actor);
    setFacilityAttempt(cache, key, {
      token: 7,
      kind: "create",
      status: "pending",
    });
    unknownFacilityAttempt(cache, key, 7);
    expect(cache.getQueryData(key)).toEqual({
      token: 7,
      kind: "create",
      status: "unknown",
    });
    expect(
      facilityAttemptKey(profileClientId, { ...actor, role: "standard_user" }),
    ).toEqual(key);
    expect(
      facilityAttemptKey(profileClientId, { ...actor, userId: "other" }),
    ).not.toEqual(key);
    expect(facilityAttemptKey(otherProfileClientId, actor)).not.toEqual(key);
    expect(cache.getQueryDefaults(key).gcTime).toBe(Infinity);
    unknownFacilityAttempt(cache, key, 6);
    expect(cache.getQueryData(key)).toEqual({
      token: 7,
      kind: "create",
      status: "unknown",
    });
  });
});
