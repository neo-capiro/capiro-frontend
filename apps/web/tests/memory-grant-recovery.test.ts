import { expect, it, vi } from "vitest";
import {
  grantStatus,
  reconcileMemoryGrant,
} from "../src/features/settings/memory/grant-reconciliation";
import {
  snapshotSettingsWrite,
  assertSettingsReceipt,
} from "../src/features/settings/security-writes";
import {
  persistSettingsWrite,
  restoreSettingsWrite,
} from "../src/features/settings/security-write-journal";
import type { MemoryGrant } from "../src/shared/capiro/operations/memory-grants";

const clientId = "11111111-1111-4111-8111-111111111111";
const body = {
  id: "22222222-2222-4222-8222-222222222222",
  userId: "33333333-3333-4333-8333-333333333333",
  permissions: ["approve"] as const,
  reason: "Exact reviewed grant reason",
  expiresAt: "2030-01-01T00:00:00.000Z",
};
const account = { user: { id: "admin" }, tenant: { id: "tenant" } };
const row: MemoryGrant = {
  ...body,
  permissions: [...body.permissions],
  clientId,
  status: "active",
  grantedByUserId: account.user.id,
  revokedAt: null,
  revokedByUserId: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
async function retained() {
  const map = new Map<string, string>();
  const storage = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
  const input = { params: { clientId }, body };
  const write = snapshotSettingsWrite("settings.memory.grants.create", input);
  write.expectedAccount = {
    userId: account.user.id,
    tenantId: account.tenant.id,
  };
  await persistSettingsWrite(storage, "test", write, input);
  return {
    write: restoreSettingsWrite(storage, "test")!,
    serialized: map.get("test")!,
  };
}
function api(grants: MemoryGrant[], identity = account) {
  return {
    request: vi.fn(async (operation: string) =>
      operation === "me.read" ? identity : { grants },
    ),
  };
}
it("recovers the exact original grant by readback after reload without retaining reason text or replaying", async () => {
  const { write, serialized } = await retained();
  expect(serialized).not.toContain(body.reason);
  const port = api([row]);
  expect(
    await reconcileMemoryGrant(
      port as never,
      write,
      new AbortController().signal,
    ),
  ).toBe(true);
  expect(port.request.mock.calls.map((call) => call[0])).toEqual([
    "me.read",
    "settings.memory.grants.list",
  ]);
});
it("keeps a missing, altered or different-account grant unknown", async () => {
  const { write } = await retained();
  for (const port of [
    api([]),
    api([{ ...row, reason: "Changed" }]),
    api([row], { ...account, user: { id: "other" } }),
  ]) {
    expect(
      await reconcileMemoryGrant(
        port as never,
        write,
        new AbortController().signal,
      ),
    ).toBe(false);
  }
});
it("rejects an acknowledgement for a different grant identifier", () => {
  const write = snapshotSettingsWrite("settings.memory.grants.create", {
    params: { clientId },
    body,
  });
  expect(() =>
    assertSettingsReceipt(write, { ok: true, ...body, id: "other" }),
  ).toThrow();
});
it("distinguishes expiry and revocation without inventing inherited grants", () => {
  expect(grantStatus(row, Date.parse("2031-01-01"))).toBe("expired");
  expect(
    grantStatus({ ...row, status: "revoked" }, Date.parse("2027-01-01")),
  ).toBe("revoked");
  expect(grantStatus(row, Date.parse("2027-01-01"))).toBe("active");
});
