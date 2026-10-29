import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import {
  memoryDraftRequestBytes,
  memoryDraftSubmissionBytes,
} from "@capiro/shared/settings-memory-drafts";
import {
  prepareMemoryDraftWrite,
  memoryDraftReceiptMatches,
  reconcileMemoryDraft,
} from "../src/features/settings/memory/drafts/recovery";
import {
  persistSettingsWrite,
  restoreSettingsWrite,
} from "../src/features/settings/security-write-journal";
import {
  assertSettingsReceipt,
  snapshotSettingsWrite,
} from "../src/features/settings/security-writes";
import { memoryDraftOperations } from "../src/shared/capiro/operations/memory-drafts";
import {
  draftBelongsToFile,
  editableDraft,
  draftSaveRequest,
} from "../src/features/settings/memory/drafts/model";
import {
  draftFile,
  draftActor,
  draftTenant,
  draftAccount,
  draftCandidate,
  savedDraft,
} from "./memory-draft-fixture";
const signal = () => new AbortController().signal;
function storage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
    removeItem: (k: string) => {
      data.delete(k);
    },
  };
}
async function fixture(
  scope: "user" | "firm" | "client" = "firm",
  submit = false,
) {
  const file = draftFile(scope),
    id = crypto.randomUUID(),
    requestId = crypto.randomUUID();
  const params = { type: file.type, slug: file.slug, id };
  const body = submit
    ? { requestId, expectedRevision: 1 }
    : {
        requestId,
        expectedRevision: 0,
        action: "save",
        baseItemId: file.baseItemId,
        baseVersion: file.baseVersion,
        sections: [
          { key: "positioning", body: "Private text π" },
          { key: "mission", body: "Private draft text" },
        ],
      };
  const operation = submit
    ? "settings.memory.drafts.submit"
    : "settings.memory.drafts.save";
  const write = snapshotSettingsWrite(operation, { params, body });
  write.expectedAccount = { userId: draftActor, tenantId: draftTenant };
  await prepareMemoryDraftWrite(
    { request: vi.fn().mockResolvedValue(file) } as never,
    write,
    signal(),
  );
  const target = {
    type: file.type,
    slug: scope === "user" ? draftActor : file.slug,
    scope,
    clientId: scope === "client" ? file.slug : null,
  };
  const bytes = submit
    ? memoryDraftSubmissionBytes(target, id, body as never)
    : memoryDraftRequestBytes(target, id, body as never);
  const hash = createHash("sha256").update(bytes).digest("hex");
  const receipt = submit
    ? {
        schema: "memory-settings-submit-receipt/1",
        draftId: id,
        requestId,
        requestHash: hash,
        draftRevision: 1,
        candidateId: draftCandidate,
        submittedAt: "2026-10-29T00:00:00.000Z",
        status: "pending_review",
        activeItemUnchanged: true,
      }
    : {
        schema: "memory-settings-draft-receipt/1",
        draftId: id,
        requestId,
        requestHash: hash,
        revision: 1,
        state: "draft",
        recordedAt: "2026-10-29T00:00:00.000Z",
      };
  return { file, id, body, params, write, receipt };
}
describe("Settings private draft recovery", () => {
  it.each(["user", "client", "firm"] as const)(
    "binds canonical %s ownership and exact content to the Core hash",
    async (scope) => {
      const { write, receipt } = await fixture(scope);
      expect(write.domainRequestHash).toBe(receipt.requestHash);
      expect(memoryDraftReceiptMatches(write, receipt)).toBe(true);
      expect(() => assertSettingsReceipt(write, receipt)).not.toThrow();
      for (const mismatch of [
        { requestHash: "b".repeat(64) },
        { requestId: crypto.randomUUID() },
        { draftId: crypto.randomUUID() },
        { revision: 2 },
        { state: "discarded" },
      ])
        expect(
          memoryDraftReceiptMatches(write, { ...receipt, ...mismatch }),
        ).toBe(false);
    },
  );
  it.each([false, true])(
    "recovers save/submit from exact historical metadata without retaining or replaying content (%s)",
    async (submit) => {
      const { write, receipt, params, body } = await fixture("user", submit),
        journal = storage();
      await persistSettingsWrite(journal, "draft", write, { params, body });
      expect(journal.getItem("draft")).not.toContain("Private");
      expect(journal.getItem("draft")).not.toContain("sections");
      const restored = restoreSettingsWrite(journal, "draft")!;
      expect(restored.domainRequestHash).toBe(receipt.requestHash);
      const api = {
        request: vi
          .fn()
          .mockResolvedValueOnce(draftAccount)
          .mockResolvedValueOnce(receipt),
      };
      expect(await reconcileMemoryDraft(api as never, restored, signal())).toBe(
        true,
      );
      expect(api.request.mock.calls.map((args) => args[0])).toEqual([
        "me.read",
        submit
          ? "settings.memory.drafts.submissionReceipt"
          : "settings.memory.drafts.receipt",
      ]);
    },
  );
  it("refuses changed accounts, wrong receipts and unavailable readback", async () => {
    const { write, receipt } = await fixture();
    const switched = {
      request: vi
        .fn()
        .mockResolvedValue({
          ...draftAccount,
          tenant: { ...draftAccount.tenant, id: crypto.randomUUID() },
        }),
    };
    expect(await reconcileMemoryDraft(switched as never, write, signal())).toBe(
      false,
    );
    expect(switched.request).toHaveBeenCalledTimes(1);
    const wrong = {
      request: vi
        .fn()
        .mockResolvedValueOnce(draftAccount)
        .mockResolvedValueOnce({ ...receipt, revision: 9 }),
    };
    expect(await reconcileMemoryDraft(wrong as never, write, signal())).toBe(
      false,
    );
    const down = { request: vi.fn().mockRejectedValue(Error("unavailable")) };
    await expect(
      reconcileMemoryDraft(down as never, write, signal()),
    ).rejects.toThrow("unavailable");
  });
  it("does not accept a wrong canonical file or an unbound recovered request", async () => {
    const { write } = await fixture();
    await expect(
      prepareMemoryDraftWrite(
        { request: vi.fn().mockResolvedValue(draftFile("user")) } as never,
        write,
        signal(),
      ),
    ).rejects.toThrow("file changed");
    const unbound = { ...write, domainRequestHash: undefined };
    expect(
      await reconcileMemoryDraft(
        { request: vi.fn() } as never,
        unbound,
        signal(),
      ),
    ).toBe(false);
  });
  it("uses closed public requests and distinguishes save from submission", async () => {
    const { params, body } = await fixture();
    expect(
      memoryDraftOperations["settings.memory.drafts.save"].request.parse({
        params,
        body,
      }).body.sections[0]?.key,
    ).toBe("mission");
    expect(() =>
      memoryDraftOperations["settings.memory.drafts.save"].request.parse({
        params,
        body: { ...body, ownerUserId: draftActor },
      }),
    ).toThrow();
    expect(() =>
      memoryDraftOperations["settings.memory.drafts.submit"].request.parse({
        params,
        body,
      }),
    ).toThrow();
  });
  it("keeps engine sections out of new drafts, terminal content empty and stale bases visible", () => {
    const file = draftFile(),
      id = crypto.randomUUID(),
      draft = editableDraft(file, id);
    expect(draft.sections.map((s) => s.key)).toEqual([
      "mission",
      "positioning",
    ]);
    const stored = savedDraft(file, id);
    expect(draftBelongsToFile(stored, file, id, draftActor)).toBe(true);
    expect(
      draftBelongsToFile({ ...stored, slug: "wrong" }, file, id, draftActor),
    ).toBe(false);
    expect(
      editableDraft(file, id, { ...stored, state: "submitted", sections: null })
        .sections,
    ).toEqual([]);
    expect(
      editableDraft(
        {
          ...file,
          baseItemId: crypto.randomUUID(),
          baseVersion: "a".repeat(64),
        },
        id,
        stored,
      ).baseChanged,
    ).toBe(true);
    expect(
      draftSaveRequest(
        editableDraft(file, id, stored),
        [{ key: "mission", body: "not retained" }],
        "discard",
      ),
    ).toMatchObject({ expectedRevision: 1, action: "discard", sections: [] });
  });
});
