import { expect, it, vi } from "vitest";
import { CapiroApiError } from "../src/shared/capiro/http";
import { executeSettingsWrite } from "../src/features/settings/settings-write-execution";
import {
  clearSettingsWrite,
  persistSettingsWrite,
  restoreSettingsWrite,
} from "../src/features/settings/security-write-journal";
import type {
  SettingsWrite,
  SettingsWriteJournal,
} from "../src/features/settings/security-write-types";
import { reconcileSettingsWrite } from "../src/features/settings/security-write-reconciliation";

function fixture() {
  let current: SettingsWrite | undefined;
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
  const scopeKey = "synthetic-actor/session/tenant/personal";
  const journal: SettingsWriteJournal = {
    scopeKey,
    current: () => current,
    record: (write) => {
      current = write;
    },
    persist: (write, input) =>
      persistSettingsWrite(storage, scopeKey, write, input),
    clear: (write) => {
      clearSettingsWrite(storage, scopeKey, write);
      if (current?.attemptId === write.attemptId) current = undefined;
    },
    markUnknown: (write) => {
      if (current?.attemptId === write.attemptId)
        current = { ...write, state: "unknown" };
    },
  };
  const request = vi.fn(async () => ({
    user: { id: "actor-a", title: "Advisor" },
  }));
  const execution = {
    api: { request } as never,
    journal,
    verified: true,
    subjectId: "actor-a",
  };
  return {
    execution,
    request,
    journal,
    retained: () => restoreSettingsWrite(storage, scopeKey),
  };
}

it("captures the reviewed input and persists the fence before exactly one dispatch", async () => {
  const f = fixture();
  const draft = { body: { title: "  Advisor  " } };
  const dispatch = vi.fn(async (captured) => {
    expect(f.retained()?.operation).toBe("me.update");
    expect(f.retained()?.receiptConfirmed).toBe(false);
    expect(captured.body.title).toBe("  Advisor  ");
    return { user: { id: "actor-a", title: "Advisor" } };
  });
  const result = executeSettingsWrite(
    f.execution,
    "me.update",
    draft,
    undefined,
    dispatch,
  );
  draft.body.title = "Changed after click";
  await expect(result).resolves.toEqual({
    user: { id: "actor-a", title: "Advisor" },
  });
  expect(dispatch).toHaveBeenCalledTimes(1);
  expect(f.journal.current()).toBeUndefined();
  expect(f.retained()).toBeUndefined();
});

it("keeps a lost response uncertain across restoration and blocks a second dispatch", async () => {
  const f = fixture(),
    dispatch = vi.fn(async () => {
      throw new TypeError("response lost");
    });
  await expect(
    executeSettingsWrite(
      f.execution,
      "me.update",
      { body: { title: "Advisor" } },
      undefined,
      dispatch,
    ),
  ).rejects.toThrow("not confirmed");
  expect(f.journal.current()?.state).toBe("unknown");
  const restored = f.retained()!;
  expect(restored.receiptConfirmed).toBe(false);
  expect(
    await reconcileSettingsWrite(
      f.execution.api,
      restored,
      new AbortController().signal,
    ),
  ).toBe(false);
  expect(f.request).not.toHaveBeenCalled();
  f.journal.record(restored);
  await expect(
    executeSettingsWrite(
      f.execution,
      "me.update",
      { body: { title: "Advisor" } },
      undefined,
      dispatch,
    ),
  ).rejects.toThrow("not confirmed");
  expect(dispatch).toHaveBeenCalledTimes(1);
});

it("keeps a delivered but mismatched receipt fenced", async () => {
  const f = fixture();
  await expect(
    executeSettingsWrite(
      f.execution,
      "me.update",
      { body: { title: "Advisor" } },
      undefined,
      async () => ({ user: { id: "actor-b", title: "Advisor" } }),
    ),
  ).rejects.toThrow("not confirmed");
  expect(f.retained()?.receiptConfirmed).toBe(false);
  expect(f.journal.current()?.state).toBe("unknown");
});

it("releases a definitive rejection and a failed preparation without replay", async () => {
  const f = fixture(),
    rejected = new CapiroApiError(403, "Synthetic permission revoked");
  const dispatch = vi.fn(async () => {
    throw rejected;
  });
  await expect(
    executeSettingsWrite(
      f.execution,
      "me.update",
      { body: { title: "Advisor" } },
      undefined,
      dispatch,
    ),
  ).rejects.toBe(rejected);
  expect(f.journal.current()).toBeUndefined();
  expect(f.retained()).toBeUndefined();
  f.request.mockRejectedValueOnce(new Error("Invitation list incomplete"));
  await expect(
    executeSettingsWrite(
      f.execution,
      "settings.team.resend",
      { params: { invitationId: "old" } },
      undefined,
      dispatch,
    ),
  ).rejects.toThrow("Invitation list incomplete");
  expect(f.journal.current()).toBeUndefined();
  expect(dispatch).toHaveBeenCalledTimes(1);
});

it("does not dispatch before sign-in or after cancellation, and preserves post-dispatch uncertainty", async () => {
  const f = fixture(),
    controller = new AbortController(),
    dispatch = vi.fn(async () => ({
      user: { id: "actor-a", title: "Advisor" },
    }));
  await expect(
    executeSettingsWrite(
      { ...f.execution, verified: false },
      "me.update",
      {},
      undefined,
      dispatch,
    ),
  ).rejects.toThrow("sign-in");
  controller.abort();
  await expect(
    executeSettingsWrite(
      f.execution,
      "me.update",
      {},
      controller.signal,
      dispatch,
    ),
  ).rejects.toThrow();
  expect(dispatch).not.toHaveBeenCalled();
  const later = new AbortController();
  dispatch.mockImplementationOnce(async () => {
    later.abort();
    return { user: { id: "actor-a", title: "Advisor" } };
  });
  await expect(
    executeSettingsWrite(
      f.execution,
      "me.update",
      { body: { title: "Advisor" } },
      later.signal,
      dispatch,
    ),
  ).rejects.toThrow("not confirmed");
  expect(f.retained()).toBeDefined();
  expect(f.journal.current()?.state).toBe("unknown");
});

it("retains the delivered sanitizer receipt when readback fails, then reconciles without another write", async () => {
  const f = fixture(),
    canonical = { html: "<b>Safe</b>", enabled: true };
  f.request.mockRejectedValueOnce(
    new CapiroApiError(403, "Synthetic readback revoked"),
  );
  const dispatch = vi.fn(async () => canonical);
  await expect(
    executeSettingsWrite(
      f.execution,
      "me.emailSignature.update",
      { body: { html: "<script>bad</script><b>Safe</b>", enabled: true } },
      undefined,
      dispatch,
    ),
  ).rejects.toThrow("not confirmed");
  const retained = f.retained()!;
  expect(retained.receiptConfirmed).toBe(true);
  expect(retained.input.body).not.toHaveProperty("html");
  f.request.mockResolvedValueOnce(canonical as never);
  expect(
    await reconcileSettingsWrite(
      f.execution.api,
      retained,
      new AbortController().signal,
    ),
  ).toBe(true);
  expect(dispatch).toHaveBeenCalledTimes(1);
});

it("fails closed before dispatch when durable journal storage is unavailable", async () => {
  const f = fixture(),
    dispatch = vi.fn();
  f.journal.persist = async () => {
    throw new Error("Synthetic storage unavailable");
  };
  await expect(
    executeSettingsWrite(
      f.execution,
      "me.update",
      { body: { title: "Advisor" } },
      undefined,
      dispatch,
    ),
  ).rejects.toThrow("Synthetic storage unavailable");
  expect(dispatch).not.toHaveBeenCalled();
  expect(f.journal.current()).toBeUndefined();
});
