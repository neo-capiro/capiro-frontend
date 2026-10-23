import { describe, expect, it } from "vitest";
import {
  batchPayloadDigest,
  batchRecoverySchema,
  captureBatchMove,
  requireBatchReceipt,
} from "../src/features/portfolio/files/batch-move-contract";
import type { Attachment } from "../src/features/portfolio/files/contracts";
const clientId = "11111111-1111-4111-8111-111111111111",
  first = "22222222-2222-4222-8222-222222222222",
  second = "33333333-3333-4333-8333-333333333333";
const files = () =>
  [first, second].map((id) => ({
    id,
    clientId,
    fileName: `Synthetic ${id}`,
    folder: null,
    metadataRevision: 4,
    sourceEntityType: null,
  })) as Attachment[];
async function fixture() {
  const command = captureBatchMove(clientId, files(), "  Reviewed  ");
  const payloadDigest = await batchPayloadDigest(command);
  const recovery = {
    version: 1 as const,
    clientId,
    requestId: command.requestId,
    payloadDigest,
  };
  const receipt = {
    schemaVersion: 1,
    clientId,
    requestId: command.requestId,
    payloadDigest,
    outcome: "moved",
    committedAt: "2026-10-23T00:00:00.000Z",
    files: command.files.map((file) => ({
      id: file.id,
      previousRevision: 4,
      revision: 5,
      folder: "Reviewed",
    })),
  };
  return { command, recovery, receipt };
}
describe("atomic file batch frontend contract", () => {
  it("captures every exact revision and normalized label without mutating the selected files", () => {
    const selected = files(),
      captured = captureBatchMove(clientId, selected.reverse(), " Reviewed ");
    selected[0]!.metadataRevision = 8;
    expect(captured.files).toEqual([
      { id: first, expectedRevision: 4 },
      { id: second, expectedRevision: 4 },
    ]);
    expect(captured.folder).toBe("Reviewed");
  });
  it("rejects unavailable, foreign, duplicate, oversized and hearing-backed selection", () => {
    const missing = files();
    delete missing[0]!.metadataRevision;
    const foreign = files();
    foreign[0]!.clientId = first;
    const hearing = files();
    hearing[0]!.sourceEntityType = "hearing_record_brief";
    for (const selection of [
      [],
      missing,
      foreign,
      hearing,
      [files()[0]!, files()[0]!],
      Array(101).fill(files()[0]!),
    ])
      expect(() => captureBatchMove(clientId, selection, "Folder")).toThrow();
  });
  it("recovers exact original batch from only scoped request identity and digest", async () => {
    const { recovery, receipt } = await fixture();
    expect(Object.keys(batchRecoverySchema.parse(recovery)).sort()).toEqual([
      "clientId",
      "payloadDigest",
      "requestId",
      "version",
    ]);
    expect(await requireBatchReceipt(recovery, receipt)).toEqual(receipt);
    expect(JSON.stringify(recovery)).not.toContain("Reviewed");
  });
  it("rejects partial, duplicate, wrong scope/destination/revision/digest and malformed receipts", async () => {
    const { recovery, receipt } = await fixture();
    const variants = [
      { ...receipt, clientId: first },
      { ...receipt, requestId: first },
      { ...receipt, payloadDigest: "0".repeat(64) },
      { ...receipt, files: receipt.files.slice(1) },
      { ...receipt, files: [receipt.files[0], receipt.files[0]] },
      {
        ...receipt,
        files: receipt.files.map((file) => ({ ...file, folder: "Other" })),
      },
      {
        ...receipt,
        files: receipt.files.map((file) => ({
          ...file,
          previousRevision: 5,
          revision: 6,
        })),
      },
      {
        ...receipt,
        files: receipt.files.map((file) => ({ ...file, revision: 10 })),
      },
      { ok: true },
    ];
    for (const value of variants)
      await expect(requireBatchReceipt(recovery, value)).rejects.toThrow();
  });
});
