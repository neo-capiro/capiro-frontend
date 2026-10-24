import { describe, expect, it, vi } from "vitest";
import type { CapiroMe } from "../../shared/capiro/operations/settings-schemas";
import { assertTeamWriteAllowed, teamPermissions } from "./team-permissions";

const actor = (
  role: CapiroMe["role"] = "user_admin",
  billingAdmin = false,
) => ({
  role,
  billingAdmin,
  user: { id: "actor" } as CapiroMe["user"],
});
const member = {
  userId: "target",
  role: "user_admin",
  status: "active",
  billingAdmin: false,
};

describe("Team row eligibility", () => {
  it.each(["standard_user", "client_portal_user"] as const)(
    "%s cannot manage team permissions",
    (role) => {
      const result = teamPermissions(actor(role, true), member);
      expect([
        result.canChangeRole,
        result.canGrantBilling,
        result.canRevokeBilling,
        result.canRemove,
      ]).toEqual([false, false, false, false]);
    },
  );
  it.each(["invited", "removed"])(
    "%s members cannot change role or billing",
    (status) => {
      for (const role of ["user_admin", "capiro_admin"] as const) {
        const result = teamPermissions(actor(role, true), {
          ...member,
          status,
        });
        expect([
          result.canChangeRole,
          result.canGrantBilling,
          result.canRevokeBilling,
        ]).toEqual([false, false, false]);
        expect(result.canRemove).toBe(status === "invited");
      }
    },
  );
  it("separates nonbilling admins, billing admins and HQ recovery", () => {
    expect(teamPermissions(actor(), member)).toMatchObject({
      canChangeRole: true,
      canRemove: true,
      canGrantBilling: false,
    });
    expect(
      teamPermissions(actor("user_admin", true), member).canGrantBilling,
    ).toBe(true);
    expect(teamPermissions(actor("capiro_admin"), member).canGrantBilling).toBe(
      true,
    );
  });
  it("only grants to active user admins and permits revocation after a demotion", () => {
    for (const role of ["standard_user", "client_portal_user"]) {
      expect(
        teamPermissions(actor("user_admin", true), { ...member, role })
          .canGrantBilling,
      ).toBe(false);
      const result = teamPermissions(actor("user_admin", true), {
        ...member,
        role,
        billingAdmin: true,
      });
      expect(result.canRevokeBilling).toBe(true);
      expect(result.canGrantBilling).toBe(false);
    }
  });
  it.each([{ userId: "actor" }, { role: "capiro_admin" }])(
    "protects self/staff %j",
    (override) => {
      const result = teamPermissions(actor("capiro_admin", true), {
        ...member,
        ...override,
      });
      expect([
        result.canChangeRole,
        result.canGrantBilling,
        result.canRevokeBilling,
        result.canRemove,
      ]).toEqual([false, false, false, false]);
    },
  );
});

describe("Team dispatch preflight", () => {
  const check = async (
    identity: ReturnType<typeof actor>,
    rows = [member],
    operation = "settings.team.setBillingAdmin",
    billingAdmin = true,
  ) => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(identity)
      .mockResolvedValueOnce(rows);
    const api = { request } as unknown as Parameters<
      typeof assertTeamWriteAllowed
    >[0];
    return assertTeamWriteAllowed(api, operation, {
      params: { userId: "target" },
      body: { billingAdmin },
    });
  };
  it("refuses authority lost since rendering", async () => {
    await expect(check(actor("standard_user", true))).rejects.toThrow(
      "no longer available",
    );
    await expect(check(actor("user_admin", false))).rejects.toThrow(
      "billing administrator",
    );
  });
  it("refuses a removed/missing target and a stale grant after demotion", async () => {
    await expect(check(actor("user_admin", true), [])).rejects.toThrow(
      "no longer available",
    );
    await expect(
      check(actor("user_admin", true), [{ ...member, status: "removed" }]),
    ).rejects.toThrow("active members");
    await expect(
      check(actor("user_admin", true), [
        { ...member, role: "standard_user", billingAdmin: true },
      ]),
    ).rejects.toThrow("user admins");
  });
  it("allows a currently eligible grant and a demoted target's revoke", async () => {
    await expect(check(actor("user_admin", true))).resolves.toBeUndefined();
    await expect(
      check(
        actor("user_admin", true),
        [{ ...member, role: "standard_user", billingAdmin: true }],
        "settings.team.setBillingAdmin",
        false,
      ),
    ).resolves.toBeUndefined();
  });
});
