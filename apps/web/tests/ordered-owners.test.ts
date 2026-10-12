import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createApiClient } from "../src/shared/portfolio/api/http";
import { currentProfileActor } from "../src/features/portfolio/client-profile/profile-access";
import { currentProfileSource } from "../src/features/portfolio/client-profile/profile-source";
import {
  ownerLabels,
  orderedOwnersSchema,
  ownerReplacementReceipt,
  replaceOrderedOwners,
} from "../src/features/portfolio/client-profile/ordered-owners";
import { assertTeamChange } from "../src/features/portfolio/client-profile/team-writer";
import {
  profileIdentity,
  profileMembers,
  profileOwners,
  profileTeam,
} from "./profile-current-state-fixtures";

const primary = profileMembers[0]!;
const secondary = profileMembers[1]!;
function context() {
  const cache = new QueryClient();
  cache.setQueryData(["identity"], profileIdentity);
  cache.setQueryData(["owners"], profileOwners);
  cache.setQueryData(["members"], profileMembers);
  return {
    cache,
    value: {
      actor: currentProfileActor(cache)!,
      base: profileOwners,
      source: currentProfileSource(cache, ["owners"])!,
      options: currentProfileSource(cache, ["members"])!,
    },
  };
}
function apiFor(receipt: unknown, status = 200, beforeReceipt?: () => void) {
  const calls: { path: string; method: string; body: unknown }[] = [];
  const api = createApiClient(async (path, init) => {
    calls.push({
      path: String(path),
      method: init?.method ?? "GET",
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    beforeReceipt?.();
    return new Response(JSON.stringify(receipt), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  });
  return { api, calls };
}
describe("versioned complete owner replacement", () => {
  it("requires current context, contiguous ranks, matching person identities and honest unavailable slots", () => {
    const schema = orderedOwnersSchema(
      profileOwners.tenantId,
      profileOwners.clientId,
    );
    expect(schema.safeParse(profileOwners).success).toBe(true);
    expect(schema.safeParse({ ...profileOwners, owners: [] }).success).toBe(
      true,
    );
    expect(
      schema.safeParse({
        ...profileOwners,
        owners: [
          { ...profileOwners.owners[0], available: false, person: null },
        ],
      }).success,
    ).toBe(true);
    for (const owners of [
      [{ ...profileOwners.owners[0], person: secondary }],
      [{ ...profileOwners.owners[0], available: false }],
      [{ ...profileOwners.owners[0], person: null }],
      [{ ...profileOwners.owners[0], rank: 2, label: "Secondary" }],
      [{ ...profileOwners.owners[0], label: "Secondary" }],
      [
        ...profileOwners.owners,
        { ...profileOwners.owners[0], rank: 2, label: "Secondary" },
      ],
    ])
      expect(schema.safeParse({ ...profileOwners, owners }).success).toBe(
        false,
      );
    expect(
      schema.safeParse({ ...profileOwners, tenantId: secondary.id }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...profileOwners, clientId: secondary.id }).success,
    ).toBe(false);
  });
  it("preserves the four supplied ranks and rejects reordered or wrong-version receipts", () => {
    const members = [
      ...profileMembers,
      { ...primary, id: "81000000-0000-4000-8000-000000000006" },
    ];
    const input = {
      expectedVersion: 3,
      userIds: members.map((member) => member.id),
    };
    const receipt = {
      ...profileOwners,
      version: 4,
      owners: members.map((person, index) => ({
        userId: person.id,
        rank: index + 1,
        label: ownerLabels[index],
        available: true,
        person,
      })),
    };
    const schema = ownerReplacementReceipt(profileOwners, input);
    expect(schema.safeParse(receipt).success).toBe(true);
    expect(
      schema.safeParse({ ...receipt, owners: [...receipt.owners].reverse() })
        .success,
    ).toBe(false);
    expect(schema.safeParse({ ...receipt, version: 5 }).success).toBe(false);
    expect(
      ownerReplacementReceipt(profileOwners, {
        expectedVersion: 3,
        userIds: [primary.id],
      }).safeParse(profileOwners).success,
    ).toBe(true);
    expect(
      ownerReplacementReceipt(profileOwners, {
        expectedVersion: 3,
        userIds: [],
      }).safeParse({ ...profileOwners, version: 4, owners: [] }).success,
    ).toBe(true);
  });
  it("sends only expectedVersion and ordered IDs to the new client-scoped PUT, including explicit clear", async () => {
    const { cache, value } = context();
    const wire = apiFor({ ...profileOwners, version: 4, owners: [] });
    const attempts: unknown[] = [];
    await replaceOrderedOwners(
      wire.api,
      cache,
      value,
      { expectedVersion: 3, userIds: [] },
      new AbortController().signal,
      (attempt) => attempts.push(attempt),
    );
    expect(wire.calls).toEqual([
      {
        path: `/api/backend/core/clients/${profileOwners.clientId}/account-owners`,
        method: "PUT",
        body: { expectedVersion: 3, userIds: [] },
      },
    ]);
    expect(attempts).toEqual([{ expectedVersion: 3, userIds: [] }]);
  });
  it.each([
    "actor",
    "role",
    "source",
    "options",
    "member",
    "version",
    "duplicate",
  ])(
    "refuses %s changes before any PUT or attempt registration",
    async (change) => {
      const { cache, value } = context();
      if (change === "actor")
        cache.setQueryData(["identity"], {
          ...profileIdentity,
          user: { ...profileIdentity.user, id: secondary.id },
        });
      if (change === "role")
        cache.setQueryData(["identity"], {
          ...profileIdentity,
          role: "standard_user",
        });
      if (change === "source")
        cache.setQueryData(["owners"], { ...profileOwners, version: 4 });
      if (change === "options")
        await cache.invalidateQueries({
          queryKey: ["members"],
          refetchType: "none",
        });
      const wire = apiFor(profileOwners);
      const attempts: unknown[] = [];
      await expect(
        replaceOrderedOwners(
          wire.api,
          cache,
          value,
          {
            expectedVersion: change === "version" ? 2 : 3,
            userIds:
              change === "duplicate"
                ? [primary.id, primary.id]
                : [
                    change === "member"
                      ? profileIdentity.user.id
                      : secondary.id,
                  ],
          },
          new AbortController().signal,
          (attempt) => attempts.push(attempt),
        ),
      ).rejects.toThrow();
      expect(wire.calls).toEqual([]);
      expect(attempts).toEqual([]);
    },
  );
  it.each(["mismatch", "conflict", "unavailable", "actor", "readback"])(
    "retains one attempted order after %s without replay",
    async (mode) => {
      const { cache, value } = context();
      const wire = apiFor(
        mode === "mismatch"
          ? { ...profileOwners, version: 4 }
          : { ...profileOwners, version: 4, owners: [] },
        mode === "conflict" ? 409 : mode === "unavailable" ? 503 : 200,
        () => {
          if (mode === "actor")
            cache.setQueryData(["identity"], {
              ...profileIdentity,
              role: "standard_user",
            });
          if (mode === "readback")
            cache.setQueryData(["owners"], { ...profileOwners, version: 5 });
        },
      );
      const attempts: unknown[] = [];
      await expect(
        replaceOrderedOwners(
          wire.api,
          cache,
          value,
          { expectedVersion: 3, userIds: [] },
          new AbortController().signal,
          (attempt) => attempts.push(attempt),
        ),
      ).rejects.toThrow();
      expect(wire.calls).toHaveLength(1);
      expect(attempts).toEqual([{ expectedVersion: 3, userIds: [] }]);
    },
  );
  it("protects Secondary–Quaternary owners from roster removal while retaining ordinary roles", () => {
    const { cache, value } = context();
    for (const rank of [2, 3, 4]) {
      cache.setQueryData(
        ["team"],
        [
          profileTeam[0],
          { ...profileTeam[1], ownerRank: rank, ownerAvailable: false },
        ],
      );
      expect(() =>
        assertTeamChange(
          cache,
          {
            clientId: profileOwners.clientId,
            actor: value.actor,
            roster: currentProfileSource(cache, ["team"])!,
          },
          { kind: "remove", userId: secondary.id },
        ),
      ).toThrow();
    }
  });
});
