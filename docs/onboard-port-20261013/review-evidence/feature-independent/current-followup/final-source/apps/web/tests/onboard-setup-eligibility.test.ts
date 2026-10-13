import { afterEach, describe, expect, it, vi } from "vitest";
import { createOnboardAttempt } from "../src/features/onboard/lib/attempt-journal";
import {
  createSetupReadLifetime,
  refreshSetupState,
} from "../src/features/onboard/lib/setup-state-read";
import { QueryClient } from "@tanstack/react-query";
import type { SetupState } from "../src/shared/capiro/onboard-contracts";
import {
  createSetupOverlayLifetime,
  SETUP_STATE_KEY,
  type SetupOverlayKind,
} from "../src/features/onboard/lib/setup-overlay-lifetime";
import { importClientSelection } from "../src/features/onboard/lib/import-client-selection";
import {
  sendReviewedInvitations,
  type InviteOutcome,
} from "../src/features/onboard/lib/invite-sequence";

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
});
const initial: SetupState = {
  complete: false,
  legacyTenant: false,
  importMode: "self",
  tasks: { it_email: "done", import: "done", firm_ai: "none", invites: "none" },
  orgName: "Synthetic organization",
  slug: "synthetic",
  plan: "trial",
  imported: 0,
  cap: 250,
  trialEndsAt: null,
  itInvites: [],
};
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
};
function fixture(kind: SetupOverlayKind) {
  const cache = new QueryClient();
  cleanups.push(() => cache.clear());
  cache.setQueryData(SETUP_STATE_KEY, initial);
  const owner = createSetupOverlayLifetime(cache, kind);
  const notify = vi.fn();
  cleanups.push(owner.subscribe(notify));
  const attempt = owner.attempt(kind);
  cleanups.push(attempt.mount());
  return { cache, owner, notify, attempt };
}
const receipt = { created: 0, items: [], skipped: [] };
describe("current setup eligibility owns each open overlay", () => {
  it("revokes an open self-import editor on managed replacement and requires explicit reopening", () => {
    const f = fixture("import");
    f.cache.setQueryData(SETUP_STATE_KEY, {
      ...initial,
      importMode: "managed",
    });
    expect(f.owner.current()).toBe(false);
    expect(f.notify).toHaveBeenCalled();
    f.cache.setQueryData(SETUP_STATE_KEY, initial);
    expect(f.owner.current()).toBe(false);
    expect(createSetupOverlayLifetime(f.cache, "import").current()).toBe(true);
  });
  it("stops after a held first chunk when current import mode changes, without next chunk or refresh", async () => {
    const f = fixture("import"),
      held = deferred<typeof receipt>(),
      refresh = vi.fn(async () => {});
    const dispatch = vi
      .fn()
      .mockImplementationOnce(() => held.promise)
      .mockResolvedValue(receipt);
    const pending = f.attempt.run(
      "Import reviewed selection",
      async (guard) => {
        await importClientSelection(
          Array.from({ length: 150 }, (_, i) => i + 1),
          (ids) => guard.wait(() => dispatch(ids)),
        );
        await guard.wait(refresh);
      },
    );
    f.cache.setQueryData(SETUP_STATE_KEY, {
      ...initial,
      importMode: "managed",
    });
    held.resolve(receipt);
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
    expect(f.attempt.read()?.phase).toBe("unknown");
  });
  it("prevents stale manual-create and registrant-change dispatch before React disposal", async () => {
    const f = fixture("import"),
      create = vi.fn(async () => {});
    f.cache.setQueryData(SETUP_STATE_KEY, {
      ...initial,
      importMode: "managed",
    });
    await expect(
      f.attempt.run("Create client", (guard) => guard.wait(create)),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(create).not.toHaveBeenCalled();
    expect(f.attempt.read()).toBeUndefined();
  });
  it.each(["it_email", "import", "invites"] as const)(
    "revokes open invitations when current %s prerequisite or completion changes",
    async (task) => {
      const f = fixture("invites"),
        finish = vi.fn(async () => {});
      f.cache.setQueryData(SETUP_STATE_KEY, {
        ...initial,
        tasks: {
          ...initial.tasks,
          [task]: task === "invites" ? "done" : "waiting",
        },
      });
      expect(f.owner.current()).toBe(false);
      await expect(
        f.attempt.run("Finish setup", (guard) => guard.wait(finish)),
      ).rejects.toMatchObject({ name: "AbortError" });
      expect(finish).not.toHaveBeenCalled();
    },
  );
  it("retains unknown first invitation and never dispatches a second after prerequisite replacement", async () => {
    const f = fixture("invites"),
      held = deferred<{
        status: "invited";
        invitation: {
          id: string;
          email: string;
          role: "standard_user";
          firstName: null;
          lastName: null;
          createdAt: string;
          expiresAt: null;
        };
      }>();
    const rows = ["one", "two"].map((name) => ({
      email: `${name}@synthetic.example`,
      role: "standard_user" as const,
    }));
    const invite = vi.fn(() => held.promise);
    let outcomes: InviteOutcome[] = [];
    const pending = f.attempt.run("Invite reviewed rows", (guard) =>
      sendReviewedInvitations(rows, invite, guard, (value) => {
        outcomes = value;
      }),
    );
    f.cache.setQueryData(SETUP_STATE_KEY, {
      ...initial,
      tasks: { ...initial.tasks, it_email: "waiting" },
    });
    held.resolve({
      status: "invited",
      invitation: {
        id: "synthetic-invite",
        ...rows[0]!,
        firstName: null,
        lastName: null,
        createdAt: "2026-10-13T00:00:00Z",
        expiresAt: null,
      },
    });
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(invite).toHaveBeenCalledTimes(1);
    expect(outcomes.map((row) => row.status)).toEqual([
      "unknown",
      "unattempted",
    ]);
    expect(f.attempt.read()?.phase).toBe("unknown");
  });
  it("a failed current read revokes despite retained successful data and later recovery cannot revive the opening", async () => {
    const f = fixture("import");
    await expect(
      f.cache.fetchQuery({
        queryKey: SETUP_STATE_KEY,
        queryFn: async () => {
          throw Error("503");
        },
        retry: false,
      }),
    ).rejects.toThrow("503");
    expect(f.cache.getQueryData(SETUP_STATE_KEY)).toEqual(initial);
    expect(f.owner.current()).toBe(false);
    f.cache.setQueryData(SETUP_STATE_KEY, initial);
    expect(f.owner.current()).toBe(false);
  });
  it.each([403, 503])(
    "deliberate setup recovery read %s publishes canonical failure and fences an existing overlay",
    async (status) => {
      const f = fixture("import"),
        create = vi.fn(async () => {});
      await expect(
        refreshSetupState(f.cache, async () => {
          throw Error(String(status));
        }),
      ).rejects.toThrow(String(status));
      expect(f.cache.getQueryState(SETUP_STATE_KEY)?.status).toBe("error");
      expect(f.owner.current()).toBe(false);
      await expect(
        f.attempt.run("Old editor create", (guard) => guard.wait(create)),
      ).rejects.toMatchObject({ name: "AbortError" });
      expect(create).not.toHaveBeenCalled();
    },
  );
  it("a newer setup recovery read prevents old same-options success from continuing", async () => {
    const f = fixture("import"),
      held = deferred<SetupState>(),
      next = vi.fn();
    const request = vi
      .fn()
      .mockImplementationOnce(() => held.promise)
      .mockResolvedValue(initial);
    const old = refreshSetupState(f.cache, request).then(
      next,
      (error: unknown) => error,
    );
    await f.cache.refetchQueries({ queryKey: SETUP_STATE_KEY, exact: true });
    held.resolve(initial);
    await expect(old).resolves.toMatchObject({ name: "AbortError" });
    expect(next).not.toHaveBeenCalled();
    expect(f.cache.getQueryState(SETUP_STATE_KEY)?.status).toBe("success");
  });
  it.each([403, 503])(
    "failed current setup %s fences a held parent task/invitation before React cleanup",
    async (status) => {
      const f = fixture("import"),
        lifetime = createSetupReadLifetime(f.cache),
        held = deferred<void>(),
        next = vi.fn(async () => {});
      cleanups.push(lifetime.subscribe());
      const parent = createOnboardAttempt(
        f.cache,
        "parent-setup-action",
        lifetime.current,
      );
      cleanups.push(parent.mount());
      const pending = parent.run("Parent task", async (guard) => {
        await guard.wait(() => held.promise);
        await guard.wait(next);
      });
      await expect(
        refreshSetupState(f.cache, async () => {
          throw Error(String(status));
        }),
      ).rejects.toThrow(String(status));
      held.resolve();
      await expect(pending).rejects.toMatchObject({ name: "AbortError" });
      expect(next).not.toHaveBeenCalled();
      expect(parent.read()?.phase).toBe("unknown");
      await refreshSetupState(f.cache, async () => initial);
      expect(lifetime.current()).toBe(false);
      expect(createSetupReadLifetime(f.cache).current()).toBe(true);
    },
  );
  it("parent setup admission pauses during a held read without discarding a valid pending continuation", async () => {
    const f = fixture("import"),
      lifetime = createSetupReadLifetime(f.cache),
      held = deferred<SetupState>();
    cleanups.push(lifetime.subscribe());
    const reading = refreshSetupState(f.cache, () => held.promise);
    expect(lifetime.current()).toBe(false);
    held.resolve(initial);
    await reading;
    expect(lifetime.current()).toBe(true);
  });
  it("keeps an unknown operation locked on eligible reopening instead of replaying it", async () => {
    const f = fixture("import"),
      held = deferred<void>(),
      effect = vi.fn(() => held.promise);
    const pending = f.attempt.run("Create client", (guard) =>
      guard.wait(effect),
    );
    f.cache.setQueryData(SETUP_STATE_KEY, {
      ...initial,
      importMode: "managed",
    });
    held.resolve();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    f.cache.setQueryData(SETUP_STATE_KEY, initial);
    const next = createSetupOverlayLifetime(f.cache, "import").attempt(
      "import",
    );
    cleanups.push(next.mount());
    await expect(
      next.run("Repeat", (guard) => guard.wait(effect)),
    ).rejects.toThrow("current-status");
    expect(effect).toHaveBeenCalledTimes(1);
  });
  it("allows unchanged eligibility/count refresh and resolved skipped-email prerequisites", async () => {
    const f = fixture("import"),
      held = deferred<typeof receipt>(),
      refresh = vi.fn(async () => {});
    const pending = f.attempt.run("Create client", async (guard) => {
      await guard.wait(() => held.promise);
      await guard.wait(refresh);
    });
    f.cache.setQueryData(SETUP_STATE_KEY, {
      ...initial,
      imported: 1,
      tasks: { ...initial.tasks, it_email: "skipped" },
    });
    held.resolve(receipt);
    await pending;
    expect(f.owner.current()).toBe(true);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(createSetupOverlayLifetime(f.cache, "invites").current()).toBe(true);
    expect(f.attempt.read()?.phase).toBe("confirmed");
  });
  it("revokes every overlay for legacy replacement or missing current setup", () => {
    const f = fixture("ai");
    f.cache.setQueryData(SETUP_STATE_KEY, { ...initial, legacyTenant: true });
    expect(f.owner.current()).toBe(false);
    f.cache.removeQueries({ queryKey: SETUP_STATE_KEY });
    expect(createSetupOverlayLifetime(f.cache, "import").current()).toBe(false);
  });
});
