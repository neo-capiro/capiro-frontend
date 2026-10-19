import { describe, expect, it } from "vitest";
import wire from "./objective-operational-contract-fixtures.json";
import {
  operationalAssociationCommandSchema,
  operationalAssociationPayloadDigest,
  operationalAssociationReceiptSchema,
  requireOperationalAssociationReceipt,
  type OperationalAssociationReceipt,
} from "../src/shared/capiro/operations/objective-operational";

function fixture() {
  return {
    command: operationalAssociationCommandSchema.parse(
      wire.examples.find((entry) => entry.type === "AssociationCommand")!.value,
    ),
    receipt: operationalAssociationReceiptSchema.parse(
      wire.examples.find((entry) => entry.type === "AssociationReceipt")!.value,
    ),
  };
}
const otherId = "f0000000-0000-4000-8000-000000000001";
describe("retained Objective association command/receipt binding", () => {
  it("binds the source-pinned exact command and digest without invoking a write", async () => {
    const { command, receipt } = fixture();
    expect(await operationalAssociationPayloadDigest(command)).toBe(
      receipt.payloadDigest,
    );
    await expect(
      requireOperationalAssociationReceipt(
        receipt,
        { command, payloadDigest: receipt.payloadDigest },
        receipt.associationLinkedRevision,
      ),
    ).resolves.toEqual(receipt);
  });
  it.each([
    [
      "request",
      (r: OperationalAssociationReceipt) => {
        r.requestId = otherId;
      },
    ],
    [
      "client",
      (r: OperationalAssociationReceipt) => {
        r.clientId = otherId;
      },
    ],
    [
      "Objective",
      (r: OperationalAssociationReceipt) => {
        r.objectiveId = otherId;
      },
    ],
    [
      "action",
      (r: OperationalAssociationReceipt) => {
        r.action = "unlink";
        r.outcome = "unlinked";
      },
    ],
    [
      "hash",
      (r: OperationalAssociationReceipt) => {
        r.payloadDigest = "f".repeat(64);
      },
    ],
    [
      "revision",
      (r: OperationalAssociationReceipt) => {
        r.commandRevision.version += 1;
      },
    ],
    [
      "linked revision",
      (r: OperationalAssociationReceipt) => {
        r.associationLinkedRevision.id = otherId;
      },
    ],
    [
      "set version",
      (r: OperationalAssociationReceipt) => {
        r.resultSetVersion += 1;
      },
    ],
  ])("refuses a mismatched %s witness", async (_label, mutate) => {
    const { command, receipt } = fixture(),
      payloadDigest = receipt.payloadDigest;
    mutate(receipt);
    await expect(
      requireOperationalAssociationReceipt(receipt, { command, payloadDigest }),
    ).rejects.toThrow();
  });
  it("binds link resource identity through the original command digest", async () => {
    const { command, receipt } = fixture();
    if (command.action !== "link")
      throw new Error("Expected pinned link fixture.");
    command.resource.id = otherId;
    await expect(
      requireOperationalAssociationReceipt(receipt, {
        command,
        payloadDigest: receipt.payloadDigest,
      }),
    ).rejects.toThrow();
    await expect(
      requireOperationalAssociationReceipt(receipt, {
        command,
        payloadDigest: await operationalAssociationPayloadDigest(command),
      }),
    ).rejects.toThrow();
  });
  it("preserves historical replay rather than comparing it with a newer current CAS", async () => {
    const { command: original, receipt: first } = fixture();
    const command = {
      schemaVersion: 1 as const,
      requestId: otherId,
      clientId: original.clientId,
      objectiveId: original.objectiveId,
      expectedObjectiveVersion: original.expectedObjectiveVersion + 1,
      expectedAssociationSetVersion: original.expectedAssociationSetVersion + 1,
      action: "unlink" as const,
      associationId: first.associationId,
    };
    const payloadDigest = await operationalAssociationPayloadDigest(command);
    const receipt = {
      ...first,
      requestId: command.requestId,
      action: command.action,
      outcome: "unlinked" as const,
      payloadDigest,
      commandRevision: {
        id: otherId,
        version: command.expectedObjectiveVersion,
      },
      resultSetVersion: command.expectedAssociationSetVersion + 1,
    };
    await expect(
      requireOperationalAssociationReceipt(
        receipt,
        { command, payloadDigest },
        first.associationLinkedRevision,
      ),
    ).resolves.toEqual(receipt);
    await expect(
      requireOperationalAssociationReceipt(
        { ...receipt, associationId: otherId },
        { command, payloadDigest },
      ),
    ).rejects.toThrow();
    await expect(
      requireOperationalAssociationReceipt(
        receipt,
        { command, payloadDigest },
        { id: otherId, version: first.associationLinkedRevision.version },
      ),
    ).rejects.toThrow();
    await expect(
      requireOperationalAssociationReceipt(receipt, {
        command: {
          ...command,
          expectedAssociationSetVersion:
            command.expectedAssociationSetVersion + 4,
        },
        payloadDigest,
      }),
    ).rejects.toThrow();
  });
  it("does not advance the set for an unchanged historical association", async () => {
    const { command, receipt } = fixture();
    const unchanged = {
      ...receipt,
      outcome: "unchanged" as const,
      resultSetVersion: command.expectedAssociationSetVersion,
    };
    await expect(
      requireOperationalAssociationReceipt(unchanged, {
        command,
        payloadDigest: receipt.payloadDigest,
      }),
    ).resolves.toEqual(unchanged);
    await expect(
      requireOperationalAssociationReceipt(
        { ...unchanged, resultSetVersion: unchanged.resultSetVersion + 1 },
        { command, payloadDigest: receipt.payloadDigest },
      ),
    ).rejects.toThrow();
  });
  it("sorts object keys while retaining original strings and cycle-array order", async () => {
    const { command } = fixture();
    if (command.action !== "link")
      throw new Error("Expected pinned link fixture.");
    command.cycles = [
      {
        fiscalYear: 2027,
        authorityTrack: " House ",
        basis: "human_annotation",
        context: null,
      },
      {
        fiscalYear: 2028,
        authorityTrack: null,
        basis: "human_annotation",
        context: null,
      },
    ];
    const hash = await operationalAssociationPayloadDigest(command);
    expect(
      await operationalAssociationPayloadDigest({
        ...command,
        resource: { id: command.resource.id, kind: command.resource.kind },
      }),
    ).toBe(hash);
    expect(
      await operationalAssociationPayloadDigest({
        ...command,
        cycles: [...command.cycles].reverse(),
      }),
    ).not.toBe(hash);
    expect(
      await operationalAssociationPayloadDigest({
        ...command,
        cycles: [
          { ...command.cycles[0]!, authorityTrack: "House" },
          command.cycles[1]!,
        ],
      }),
    ).not.toBe(hash);
    await expect(
      operationalAssociationPayloadDigest({
        ...command,
        expectedObjectiveVersion: 1.5,
      }),
    ).rejects.toThrow();
  });
});
