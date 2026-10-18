import { describe, expect, it } from "vitest";
import { storageUsageSchema } from "../src/features/portfolio/files/contracts";
import { storageUsageKey } from "../src/features/portfolio/files/queries";
import { filesKey } from "../src/features/portfolio/files/file-reader";

const clientId = "10000000-0000-4000-8000-000000000001";
const allowanceBytes = 10 * 1024 ** 3;
const base = {
  clientId,
  source: "engagement_attachments",
  usageBasis: "registered_attachments",
  allowanceScope: "client",
  asOf: "2026-10-18T12:00:00.000Z",
  allowanceBytes,
  enforcement: "report_only",
};

describe("registered client storage usage", () => {
  it("accepts exact available and unavailable Core snapshots", () => {
    expect(
      storageUsageSchema(clientId).parse({
        ...base,
        status: "available",
        usedBytes: allowanceBytes + 1,
        remainingBytes: 0,
        overAllowance: true,
      }).status,
    ).toBe("available");
    expect(
      storageUsageSchema(clientId).parse({
        ...base,
        status: "unavailable",
        reason: "incomplete_size_metadata",
        usedBytes: null,
        remainingBytes: null,
        overAllowance: null,
      }).status,
    ).toBe("unavailable");
  });

  it("rejects another client, inconsistent allowance and invented zero for unknown usage", () => {
    const available = {
      ...base,
      status: "available",
      usedBytes: 1,
      remainingBytes: allowanceBytes - 1,
      overAllowance: false,
    };
    const schema = storageUsageSchema(clientId);
    expect(
      schema.safeParse({
        ...available,
        clientId: "20000000-0000-4000-8000-000000000001",
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...available, overAllowance: true }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...available, remainingBytes: allowanceBytes })
        .success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...base,
        status: "unavailable",
        reason: "incomplete_size_metadata",
        usedBytes: 0,
        remainingBytes: 0,
        overAllowance: false,
      }).success,
    ).toBe(false);
  });

  it("shares the Files invalidation prefix but scopes usage by reader", () => {
    const first = storageUsageKey(clientId, {
      tenantId: "tenant-a",
      userId: "user-a",
      revision: 1,
    });
    const second = storageUsageKey(clientId, {
      tenantId: "tenant-b",
      userId: "user-b",
      revision: 1,
    });
    expect(first.slice(0, filesKey(clientId).length)).toEqual(
      filesKey(clientId),
    );
    expect(first).not.toEqual(second);
    expect(first).not.toEqual(
      storageUsageKey("20000000-0000-4000-8000-000000000001"),
    );
  });
});
