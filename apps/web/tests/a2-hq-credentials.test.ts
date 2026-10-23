import { describe, expect, it } from "vitest";
import {
  assertSettingsReceipt,
  snapshotSettingsWrite,
} from "../src/features/settings/security-writes";
import { reconcileSettingsWrite } from "../src/features/settings/security-write-reconciliation";

const input = (modelOverride?: string) => ({
  params: { tenantId: "synthetic-tenant" },
  body: {
    provider: "openai",
    apiKey: "synthetic-test-key-9876",
    ...(modelOverride === undefined ? {} : { modelOverride }),
  },
});
const receipt = (modelOverride: string | null) => ({
  provider: "openai",
  last4: "9876",
  status: "active",
  modelOverride,
  updatedAt: "2026-10-23T00:00:00.000Z",
  lastValidatedAt: "2026-10-23T00:00:00.000Z",
});

describe("HQ credential canonical receipt", () => {
  it.each([
    [undefined, null],
    ["   ", null],
    ["  custom-deployment  ", "custom-deployment"],
    ["gpt-4.1", "gpt-6-astra"],
    [" gpt-5-mini ", "gpt-6-astra"],
    ["claude-sonnet-4-20250514", "claude-sonnet-5"],
    ["claude-opus-4-1", "claude-opus-4-1"],
    ["text-embedding-3-small", "text-embedding-3-small"],
  ])("accepts Core's applied model for %s", (requested, applied) => {
    const write = snapshotSettingsWrite(
      "settings.hq.ai.setCredential",
      input(requested),
    );
    expect(() => assertSettingsReceipt(write, receipt(applied))).not.toThrow();
    expect(JSON.stringify(write)).not.toContain("synthetic-test-key");
  });

  it.each([
    { provider: "anthropic" },
    { last4: "0000" },
    { status: "disabled" },
    { modelOverride: "gpt-4.1" },
    { modelOverride: "another-deployment" },
    { modelOverride: null },
  ])("rejects wrong applied credential %j", (changed) => {
    const write = snapshotSettingsWrite(
      "settings.hq.ai.setCredential",
      input(" gpt-4.1 "),
    );
    expect(() =>
      assertSettingsReceipt(write, { ...receipt("gpt-6-astra"), ...changed }),
    ).toThrow(/not confirmed/);
  });

  it("does not infer a lost rotation from coincidentally equal current state", async () => {
    const write = snapshotSettingsWrite(
      "settings.hq.ai.setCredential",
      input("gpt-4.1"),
    );
    const api = {
      request: async () => {
        throw new Error("No read proves this lost attempt");
      },
    };
    await expect(
      reconcileSettingsWrite(api as never, write, new AbortController().signal),
    ).resolves.toBe(false);
  });
});
