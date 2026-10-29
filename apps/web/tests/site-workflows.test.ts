import { describe, expect, it, vi } from "vitest";
import {
  parseSaveSiteWorkflow,
  type SiteWorkflowReceipt,
} from "@capiro/shared/site-workflows";
import { siteWorkflowOperations } from "../src/shared/capiro/operations/site-workflows";
import { newWorkflow } from "../src/features/settings/site-workflows/form";
import {
  reconcileSiteWorkflow,
  workflowReceiptMatches,
} from "../src/features/settings/site-workflows/recovery";
import {
  persistSettingsWrite,
  restoreSettingsWrite,
} from "../src/features/settings/security-write-journal";
import { snapshotSettingsWrite } from "../src/features/settings/security-writes";
import { canOpenSettings } from "../src/features/settings/access";
const account = { user: { id: "actor" }, tenant: { id: "tenant" } };
function fixture() {
  const manifest = {
    ...newWorkflow(),
    siteId: "records-site",
    workflowId: "find-record",
    taskSummary: "Find a record",
    origins: ["https://records.example.com"],
    signInUrl: "https://records.example.com/login",
    signedInProbe: { kind: "selector" as const, value: "[data-account]" },
  };
  const body = parseSaveSiteWorkflow({
    requestId: crypto.randomUUID(),
    expectedVersion: 0,
    manifest,
    enabled: false,
  });
  const write = snapshotSettingsWrite("settings.siteWorkflows.save", { body });
  write.expectedAccount = {
    userId: account.user.id,
    tenantId: account.tenant.id,
  };
  const receipt: SiteWorkflowReceipt = {
    requestId: body.requestId,
    configuration: {
      manifest: body.manifest,
      enabled: false,
      manifestSha256: "a".repeat(64),
    },
    savedAt: "2026-10-29T00:00:00.000Z",
  };
  return { body, write, receipt };
}
const storage = () => {
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
};
describe("website workflow administration", () => {
  it("requires Capiro admin access and the shared closed save contract", () => {
    expect(
      canOpenSettings("hq-site-workflows", { role: "standard_user" } as never),
    ).toBe(false);
    expect(
      canOpenSettings("hq-site-workflows", { role: "user_admin" } as never),
    ).toBe(false);
    expect(
      canOpenSettings("hq-site-workflows", { role: "capiro_admin" } as never),
    ).toBe(true);
    const { body } = fixture();
    expect(
      siteWorkflowOperations["settings.siteWorkflows.save"].request.parse({
        body,
      }),
    ).toEqual({ body });
    expect(() =>
      siteWorkflowOperations["settings.siteWorkflows.save"].request.parse({
        body: { ...body, tenantId: "other" },
      }),
    ).toThrow();
  });
  it("binds the acknowledgement to the exact reviewed settings and request", () => {
    const { write, receipt } = fixture();
    expect(workflowReceiptMatches(write, receipt)).toBe(true);
    expect(
      workflowReceiptMatches(write, {
        ...receipt,
        requestId: crypto.randomUUID(),
      }),
    ).toBe(false);
    expect(
      workflowReceiptMatches(write, {
        ...receipt,
        configuration: {
          ...receipt.configuration,
          manifest: {
            ...receipt.configuration.manifest,
            taskSummary: "Different task",
          },
        },
      }),
    ).toBe(false);
  });
  it("recovers the exact original result using metadata only after reload", async () => {
    const { write, body, receipt } = fixture(),
      journal = storage();
    await persistSettingsWrite(journal, "workflow", write, { body });
    const persisted = journal.getItem("workflow")!;
    expect(persisted).toContain(body.requestId);
    expect(persisted).not.toContain("records.example.com");
    expect(persisted).not.toContain("signedInProbe");
    const recovered = restoreSettingsWrite(journal, "workflow")!;
    // DB JSON object ordering may differ; shared parsing restores canonical field order before hashing.
    const manifest = Object.fromEntries(
      Object.entries(receipt.configuration.manifest).reverse(),
    );
    const api = {
      request: vi
        .fn()
        .mockResolvedValueOnce(account)
        .mockResolvedValueOnce({
          requestId: body.requestId,
          receipt: {
            ...receipt,
            configuration: { ...receipt.configuration, manifest },
          },
        }),
    };
    expect(
      await reconcileSiteWorkflow(
        api as never,
        recovered,
        new AbortController().signal,
      ),
    ).toBe(true);
    expect(api.request.mock.calls.map((args) => args[0])).toEqual([
      "me.read",
      "settings.siteWorkflows.receipt",
    ]);
  });
  it("does not clear an unknown write for another account, missing receipt or a newer revision", async () => {
    const { write, body, receipt } = fixture();
    await persistSettingsWrite(storage(), "workflow", write, { body });
    const changedAccount = {
      request: vi
        .fn()
        .mockResolvedValue({ ...account, tenant: { id: "other" } }),
    };
    expect(
      await reconcileSiteWorkflow(
        changedAccount as never,
        write,
        new AbortController().signal,
      ),
    ).toBe(false);
    for (const saved of [
      null,
      {
        ...receipt,
        configuration: {
          ...receipt.configuration,
          manifest: { ...receipt.configuration.manifest, version: 2 },
        },
      },
    ]) {
      const api = {
        request: vi
          .fn()
          .mockResolvedValueOnce(account)
          .mockResolvedValueOnce({ requestId: body.requestId, receipt: saved }),
      };
      expect(
        await reconcileSiteWorkflow(
          api as never,
          write,
          new AbortController().signal,
        ),
      ).toBe(false);
    }
  });
});
