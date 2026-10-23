import { describe, expect, it, vi } from "vitest";
import {
  assertSettingsReceipt,
  snapshotSettingsWrite,
} from "../src/features/settings/security-writes";
import {
  persistSettingsWrite,
  restoreSettingsWrite,
} from "../src/features/settings/security-write-journal";
import {
  prepareOrdinaryRecovery,
  reconcileOrdinaryWrite,
  retainCanonicalSignature,
} from "../src/features/settings/ordinary-write-recovery";
import { reconcileSettingsWrite } from "../src/features/settings/security-write-reconciliation";
const fixture = (operation: string, body: Record<string, unknown>) =>
  snapshotSettingsWrite(operation, { body });
function store() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}
describe("ordinary Settings canonical receipts and retained uncertainty", () => {
  it.each(["", "   ", "  Advisor  "])(
    "normalizes title %j exactly like Core and rejects another user",
    (title) => {
      const write = fixture("me.update", { title });
      write.subjectId = "actor-a";
      const receipt = { user: { id: "actor-a", title: title.trim() || null } };
      expect(() => assertSettingsReceipt(write, receipt)).not.toThrow();
      expect(() =>
        assertSettingsReceipt(write, {
          user: { ...receipt.user, id: "actor-b" },
        }),
      ).toThrow();
      expect(() =>
        assertSettingsReceipt(write, {
          user: { ...receipt.user, title: "Other" },
        }),
      ).toThrow();
    },
  );
  it("retains only a scope/command-bound digest, no title or replayable contact details", async () => {
    const storage = store(),
      write = fixture("settings.contact.update", {
        email: "synthetic-private@example.test",
        mailingStreet1: "Private address",
      });
    await prepareOrdinaryRecovery(write, "actor-a/session-a/tenant-a");
    await persistSettingsWrite(storage, "key", write, write.input);
    const text = storage.getItem("key")!;
    expect(text).not.toContain("synthetic-private");
    expect(text).not.toContain("Private address");
    expect(restoreSettingsWrite(storage, "key")?.projection).toEqual(
      write.projection,
    );
    const other: typeof write = {
      ...write,
      projection: undefined,
      scopeHash: undefined,
    };
    await prepareOrdinaryRecovery(other, "actor-b/session-b/tenant-b");
    expect(other.projection?.hash).not.toBe(write.projection?.hash);
  });
  it("never infers an unreceived command result from equal current state", async () => {
    const write = fixture("me.update", { title: "Advisor" });
    write.subjectId = "actor-a";
    await prepareOrdinaryRecovery(write, "actor-a/tenant-a");
    const request = vi.fn(async () => ({
      user: { id: "actor-a", title: "Advisor" },
    }));
    expect(
      await reconcileOrdinaryWrite(
        { request } as never,
        write,
        new AbortController().signal,
      ),
    ).toBe(false);
    expect(request).not.toHaveBeenCalled();
    write.receiptConfirmed = true;
    expect(
      await reconcileOrdinaryWrite(
        { request } as never,
        write,
        new AbortController().signal,
      ),
    ).toBe(true);
    request.mockResolvedValueOnce({
      user: { id: "actor-b", title: "Advisor" },
    });
    expect(
      await reconcileOrdinaryWrite(
        { request } as never,
        write,
        new AbortController().signal,
      ),
    ).toBe(false);
  });
  it("accepts Core sanitized signature only after exact canonical readback; loss stays fenced", async () => {
    const write = fixture("me.emailSignature.update", {
      html: "<script>x</script><b>Safe</b>",
      enabled: true,
    });
    await prepareOrdinaryRecovery(write, "actor-a/tenant-a");
    const receipt = { html: "<b>Safe</b>", enabled: true };
    expect(() => assertSettingsReceipt(write, receipt)).not.toThrow();
    const request = vi.fn(async () => receipt);
    expect(
      await reconcileOrdinaryWrite(
        { request } as never,
        write,
        new AbortController().signal,
      ),
    ).toBe(false);
    write.receiptConfirmed = true;
    await retainCanonicalSignature(write, receipt);
    expect(
      await reconcileOrdinaryWrite(
        { request } as never,
        write,
        new AbortController().signal,
      ),
    ).toBe(true);
    request.mockResolvedValueOnce({ html: "<b>Changed</b>", enabled: true });
    expect(
      await reconcileOrdinaryWrite(
        { request } as never,
        write,
        new AbortController().signal,
      ),
    ).toBe(false);
  });
  it("does not turn coincidental legacy Settings state into a receipt after response loss", async () => {
    const request = vi.fn(async () => []);
    for (const operation of [
      "settings.team.remove",
      "settings.team.setRole",
      "settings.hq.tenants.delete",
      "settings.hq.customers.comp",
      "settings.integrations.disconnectGoogle",
      "settings.mappings.confirmIndividual",
      "settings.analyst.quarantine.discard",
    ]) {
      const write = snapshotSettingsWrite(operation, {
        params: { userId: "actor-a", id: "resource-a" },
        body: {},
      });
      expect(
        await reconcileSettingsWrite(
          { request } as never,
          write,
          new AbortController().signal,
        ),
      ).toBe(false);
    }
    expect(request).not.toHaveBeenCalled();
  });
  it("binds integration actions to the exact connection and allowlisted provider", () => {
    const sync = snapshotSettingsWrite("settings.integrations.syncGoogle", {
      params: { connectionId: "connection-a" },
    });
    expect(() =>
      assertSettingsReceipt(sync, { connectionId: "connection-a" }),
    ).not.toThrow();
    expect(() =>
      assertSettingsReceipt(sync, { connectionId: "connection-b" }),
    ).toThrow();
    const start = fixture("settings.integrations.startGoogle", {
      connectionId: "connection-a",
    });
    expect(() =>
      assertSettingsReceipt(start, {
        connectionId: "connection-a",
        authUrl: "https://accounts.google.com/oauth",
      }),
    ).not.toThrow();
    expect(() =>
      assertSettingsReceipt(start, {
        connectionId: "connection-b",
        authUrl: "https://accounts.google.com/oauth",
      }),
    ).toThrow();
    expect(() =>
      assertSettingsReceipt(start, {
        connectionId: "connection-a",
        authUrl: "https://login.microsoftonline.com/oauth",
      }),
    ).toThrow();
    expect(() =>
      assertSettingsReceipt(
        snapshotSettingsWrite(
          "settings.integrations.configureMicrosoftSubscriptions",
          {},
        ),
        { configured: false },
      ),
    ).toThrow();
  });
  it("validates exact profiles, provider registration and hosted billing origin", () => {
    const archive = snapshotSettingsWrite("settings.profiles.archive", {
      params: { clientId: "client-a" },
    });
    expect(() =>
      assertSettingsReceipt(archive, { id: "client-b", status: "archived" }),
    ).toThrow();
    expect(() =>
      assertSettingsReceipt(archive, { id: "client-a", status: "active" }),
    ).toThrow();
    const create = fixture("settings.integrations.create", {
      provider: "microsoft_365",
      accountEmail: " A@EXAMPLE.TEST ",
    });
    expect(() =>
      assertSettingsReceipt(create, {
        id: "new",
        provider: "microsoft_365",
        accountEmail: "a@example.test",
        displayName: null,
        status: "needs_configuration",
      }),
    ).not.toThrow();
    expect(() =>
      assertSettingsReceipt(create, {
        id: "new",
        provider: "google",
        accountEmail: "a@example.test",
        displayName: null,
        status: "needs_configuration",
      }),
    ).toThrow();
    const checkout = fixture("settings.billing.checkout", { quantity: 10 });
    expect(() =>
      assertSettingsReceipt(checkout, {
        url: "https://billing.stripe.com/session",
      }),
    ).toThrow();
    expect(() =>
      assertSettingsReceipt(checkout, {
        url: "https://checkout.stripe.com/session",
      }),
    ).not.toThrow();
    expect(() =>
      assertSettingsReceipt(checkout, {
        url: "https://checkout.stripe.com.evil.test/session",
      }),
    ).toThrow();
  });
});
