import { describe, expect, it, vi } from "vitest";
import {
  createProcedureGovernanceClient,
  type ProcedureApi,
} from "../src/shared/meri-procedures/client";
import {
  ProcedureRevisionConflict,
  ProcedureUncertainWrite,
  applyProcedureRun,
  createProcedureLifetime,
  procedureAccountKey,
  procedureResultStillApplies,
  procedureRoleDenied,
} from "../src/shared/meri-procedures/governance";

/**
 * Controller-level coverage for the governance host (features/meri/procedures/
 * ProcedureGovernanceHost.tsx): the account-scoped lifetime and the exact run sequence it composes.
 *
 * Mounted-render coverage is not available in this workspace: the only DOM test dependencies that
 * would provide it are not resolvable (`jsdom` and `@testing-library/react` are absent from the
 * materialized dependency set, verified with require.resolve from apps/web), and the repository's one
 * `.tsx` mounted test under src is not collected by this workspace's vitest `include`
 * (`tests/**\/*.test.{ts,mjs}`). The host's sequence is therefore extracted into `applyProcedureRun`,
 * which the host calls directly, and is driven here with the real lifetime and the real client.
 */

const admin = { userId: "user-1", tenantId: "tenant-1", role: "user_admin" };
const otherAdmin = {
  userId: "user-2",
  tenantId: "tenant-1",
  role: "user_admin",
};
const revoked = {
  userId: "user-1",
  tenantId: "tenant-1",
  role: "standard_user",
};
const target = {
  id: "11111111-1111-4111-8111-111111111111",
  version: 3,
  procedureDigest: "a".repeat(64),
};

function harness() {
  return {
    setMessage: vi.fn(),
    readback: vi.fn(),
    setBusy: vi.fn(),
  };
}

function commandApi() {
  const request = vi.fn(async () => ({}));
  return {
    api: { request } as unknown as ProcedureApi,
    request: request as unknown as ReturnType<typeof vi.fn>,
  };
}

describe("procedure governance host lifetime", () => {
  it("applies a result and reads the stored state back while the account is still current", async () => {
    const stores = harness();
    const applied = await applyProcedureRun({
      lifetime: createProcedureLifetime(),
      identity: admin,
      dispatchedUnder: procedureAccountKey(admin),
      work: async () => ({ version: 4 }),
      describe: (value) =>
        `Applied version ${(value as { version: number }).version}`,
      ...stores,
    });
    expect(applied).toBe(true);
    expect(stores.setMessage.mock.calls).toEqual([
      [null],
      ["Applied version 4"],
    ]);
    expect(stores.readback).toHaveBeenCalledTimes(1);
    expect(stores.setBusy.mock.calls).toEqual([[true], [false]]);
  });

  it("retires a result that settles after the scope ended: no message, no reload", async () => {
    const stores = harness();
    const lifetime = createProcedureLifetime();
    const releases: Array<(value: unknown) => void> = [];
    const pending = applyProcedureRun({
      lifetime,
      identity: admin,
      dispatchedUnder: procedureAccountKey(admin),
      work: () =>
        new Promise((resolve) =>
          releases.push(resolve as (value: unknown) => void),
        ),
      describe: () => "Applied",
      ...stores,
    });
    // The surface unmounts, or the account changes, before the transport answers.
    lifetime.retire();
    releases[0]?.({ version: 4 });
    expect(await pending).toBe(false);
    // No result was rendered, the new account's list was not reloaded, and busy was never released
    // for a scope that no longer exists.
    expect(stores.setMessage.mock.calls).toEqual([[null]]);
    expect(stores.readback).not.toHaveBeenCalled();
    expect(stores.setBusy.mock.calls).toEqual([[true]]);
  });

  it("retires a failure that settles after the scope ended", async () => {
    const stores = harness();
    const lifetime = createProcedureLifetime();
    const releases: Array<(error: unknown) => void> = [];
    const pending = applyProcedureRun({
      lifetime,
      identity: admin,
      dispatchedUnder: procedureAccountKey(admin),
      work: () =>
        new Promise((_resolve, reject) =>
          releases.push(reject as (error: unknown) => void),
        ),
      describe: () => "Applied",
      ...stores,
    });
    lifetime.retire();
    releases[0]?.(new ProcedureRevisionConflict());
    expect(await pending).toBe(false);
    expect(stores.setMessage.mock.calls).toEqual([[null]]);
    expect(stores.readback).not.toHaveBeenCalled();
  });

  it("carries the scope signal so retirement aborts the in-flight request", async () => {
    const stores = harness();
    const lifetime = createProcedureLifetime();
    const signals: AbortSignal[] = [];
    const releases: Array<(value: unknown) => void> = [];
    const pending = applyProcedureRun({
      lifetime,
      identity: admin,
      dispatchedUnder: procedureAccountKey(admin),
      work: (signal) => {
        signals.push(signal);
        return new Promise((resolve) =>
          releases.push(resolve as (value: unknown) => void),
        );
      },
      describe: () => "Applied",
      ...stores,
    });
    expect(signals[0]?.aborted).toBe(false);
    lifetime.retire();
    expect(signals[0]?.aborted).toBe(true);
    releases[0]?.({ version: 4 });
    await pending;
  });

  it("denies before dispatch when the current role cannot govern", async () => {
    const stores = harness();
    const work = vi.fn(async () => ({}));
    expect(
      await applyProcedureRun({
        lifetime: createProcedureLifetime(),
        identity: revoked,
        dispatchedUnder: procedureAccountKey(revoked),
        work,
        describe: () => "Applied",
        ...stores,
      }),
    ).toBe(false);
    expect(work).not.toHaveBeenCalled();
    expect(stores.setMessage).toHaveBeenCalledWith(procedureRoleDenied);
    expect(stores.setBusy).not.toHaveBeenCalled();
    expect(stores.readback).not.toHaveBeenCalled();
  });

  it("reports a definite refusal without reading back or holding the surface", async () => {
    const stores = harness();
    const applied = await applyProcedureRun({
      lifetime: createProcedureLifetime(),
      identity: admin,
      dispatchedUnder: procedureAccountKey(admin),
      work: async () => {
        throw new ProcedureRevisionConflict();
      },
      describe: () => "Applied",
      ...stores,
    });
    expect(applied).toBe(false);
    expect(stores.setMessage.mock.calls[1]?.[0]).toMatch(
      /changed while you were/i,
    );
    expect(stores.readback).not.toHaveBeenCalled();
    expect(stores.setBusy.mock.calls).toEqual([[true], [false]]);
  });

  it("keeps an unknown outcome in custody, and only the surface read-back releases it", async () => {
    const stores = harness();
    const { api: fake, request } = commandApi();
    request.mockRejectedValueOnce(
      Object.assign(new Error("gateway"), { status: 502 }),
    );
    const governed = createProcedureGovernanceClient(fake, {
      attemptId: () => "attempt-1",
    });
    expect(
      await applyProcedureRun({
        lifetime: createProcedureLifetime(),
        identity: admin,
        dispatchedUnder: procedureAccountKey(admin),
        work: (signal) => governed.setEnabled(admin, target, false, signal),
        describe: () => "Applied",
        ...stores,
      }),
    ).toBe(false);
    expect(stores.setMessage.mock.calls[1]?.[0]).toMatch(/unknown/i);
    expect(stores.readback).not.toHaveBeenCalled();
    expect(governed.requiresReadback(admin)).toBe(true);
    expect(governed.unknownCustody(admin)).toHaveLength(1);
    await expect(governed.setEnabled(admin, target, false)).rejects.toThrow(
      ProcedureUncertainWrite,
    );

    // What the surface's "Check current stored state" action does.
    request.mockResolvedValueOnce([]);
    await governed.list(admin);
    expect(governed.requiresReadback(admin)).toBe(false);
  });

  it("drops another account's custody on the successor mount instead of replaying it", async () => {
    const { api: fake, request } = commandApi();
    request.mockRejectedValueOnce(
      Object.assign(new Error("gateway"), { status: 502 }),
    );
    const governed = createProcedureGovernanceClient(fake, {
      attemptId: () => "attempt-1",
    });
    await expect(governed.setEnabled(admin, target, false)).rejects.toThrow(
      ProcedureUncertainWrite,
    );
    // The host's successor scope (a different authenticated account) retires it.
    const retired = governed.retireStaleCommands(otherAdmin);
    expect(retired).toHaveLength(1);
    expect(governed.requiresReadback(otherAdmin)).toBe(false);
    expect(governed.commands).toHaveLength(0);
  });
});

describe("procedure result applicability", () => {
  it("requires the same current, permitted account and an unretired generation", () => {
    const lifetime = createProcedureLifetime();
    const generation = lifetime.current();
    const key = procedureAccountKey(admin);
    expect(procedureResultStillApplies(lifetime, generation, key, admin)).toBe(
      true,
    );
    // A different account, a revoked role, or an ended scope all retire the result.
    expect(
      procedureResultStillApplies(lifetime, generation, key, otherAdmin),
    ).toBe(false);
    expect(
      procedureResultStillApplies(lifetime, generation, key, revoked),
    ).toBe(false);
    expect(procedureResultStillApplies(lifetime, generation, key, null)).toBe(
      false,
    );
    lifetime.retire();
    expect(procedureResultStillApplies(lifetime, generation, key, admin)).toBe(
      false,
    );
    expect(
      procedureResultStillApplies(lifetime, lifetime.current(), key, admin),
    ).toBe(true);
  });
});
