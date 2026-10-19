import { describe, expect, it } from "vitest";
import { copyRecoveryContract } from "../src/features/modules/workspace/brief-copy/intent";
import {
  assertCopyDetail,
  assertCopyReceipt,
} from "../src/features/modules/workspace/brief-copy/admission";
import {
  parseCopyBody,
  replaceCopySection,
} from "../src/features/modules/workspace/brief-copy/body";
import {
  copyBody,
  copyDetail,
  copyIds,
  copyResult,
  copyScope,
  copySource,
  copyState,
  saveIntent,
} from "./workspace-brief-copy-fixtures";

describe("complete copied-body preservation", () => {
  it("updates one section while preserving rich tables, photos, marks, unknown fields and block order", () => {
    const replacement = replaceCopySection(
      copyBody,
      "section-a",
      "<p>Independent <strong>edit</strong></p>",
    );
    expect(replacement).toEqual({
      ...copyBody,
      blocks: [
        {
          ...copyBody.blocks[0],
          content: "<p>Independent <strong>edit</strong></p>",
        },
        ...copyBody.blocks.slice(1),
      ],
    });
    expect(copyBody.blocks[0]!.content).toBe("Original text");
    expect(parseCopyBody(JSON.stringify(replacement))).toEqual(replacement);
  });
  it("rejects an absent/nonsection target without silently appending or altering another block", () => {
    expect(() => replaceCopySection(copyBody, "missing", "edit")).toThrow();
    expect(() => replaceCopySection(copyBody, "table-a", "edit")).toThrow();
  });
  it("rejects invalid full JSON and forbidden structure before replacing the local body", () => {
    for (const body of [
      '{"blocks":',
      '{"blocks":[],"constructor":{}}',
      '{"blocks":[{"id":"a","type":"invented"}]}',
    ])
      expect(() => parseCopyBody(body)).toThrow();
  });
});
describe("immutable command and receipt association", () => {
  it("allows only adding a verified receipt or exact conflict status to the unchanged intent", () => {
    expect(() =>
      copyRecoveryContract.validateUpdate(saveIntent, {
        ...saveIntent,
        receipt: copyResult("save_brief_copy"),
      }),
    ).not.toThrow();
    expect(() =>
      copyRecoveryContract.validateUpdate(saveIntent, {
        ...saveIntent,
        stateConflict: true,
      }),
    ).not.toThrow();
    const edited = structuredClone(saveIntent);
    if (edited.command.kind === "save")
      edited.command.body.body.blocks[0]!.content = "Changed after unknown";
    expect(() =>
      copyRecoveryContract.validateUpdate(saveIntent, edited),
    ).toThrow();
    expect(() =>
      copyRecoveryContract.validateUpdate(saveIntent, {
        ...saveIntent,
        source: { ...copySource, versionId: copyIds.other },
      }),
    ).toThrow();
    expect(() =>
      copyRecoveryContract.validateUpdate(
        { ...saveIntent, stateConflict: true },
        saveIntent,
      ),
    ).toThrow();
  });
  for (const field of [
    "tenantId",
    "actorId",
    "draftId",
    "prospectId",
    "clientId",
    "requestId",
    "versionId",
    "documentId",
  ] as const)
    it(`rejects a receipt with another ${field}`, () => {
      const result = copyResult("save_brief_copy");
      result.receipt[field] = copyIds.other;
      expect(() =>
        assertCopyReceipt(result, copyScope, {
          requestId: copyIds.request,
          operation: "save_brief_copy",
          documentId: copyIds.document,
          source: copySource,
        }),
      ).toThrow();
    });
  it("uses the Clerk actor, rejects source retargeting, and does not accept an altered replay receipt", () => {
    const result = copyResult("save_brief_copy");
    const expected = {
      requestId: copyIds.request,
      operation: "save_brief_copy" as const,
      documentId: copyIds.document,
      source: copySource,
    };
    expect(() => assertCopyReceipt(result, copyScope, expected)).not.toThrow();
    expect(() =>
      assertCopyReceipt(
        {
          ...result,
          receipt: { ...result.receipt, actorId: copyScope.actor.userId },
        },
        copyScope,
        expected,
      ),
    ).toThrow();
    expect(() =>
      assertCopyReceipt(
        {
          ...result,
          receipt: {
            ...result.receipt,
            source: { ...copySource, versionNumber: 3 },
          },
        },
        copyScope,
        expected,
      ),
    ).toThrow();
    expect(() =>
      assertCopyReceipt(
        {
          ...result,
          replayed: true,
          receipt: { ...result.receipt, requestHash: "0".repeat(64) },
        },
        copyScope,
        expected,
        result,
      ),
    ).toThrow();
  });
  it("admits only the exact selected tab and a fresh matching current baseline", () => {
    expect(() =>
      assertCopyDetail(
        copyDetail,
        copyState,
        copyScope,
        copyIds.document,
        copySource,
      ),
    ).not.toThrow();
    expect(() =>
      assertCopyDetail(
        copyDetail,
        { ...copyState, stateHash: "0".repeat(64) },
        copyScope,
        copyIds.document,
        copySource,
      ),
    ).toThrow();
    expect(() =>
      assertCopyDetail(
        copyDetail,
        copyState,
        copyScope,
        copyIds.other,
        copySource,
      ),
    ).toThrow();
    expect(() =>
      assertCopyDetail(
        copyDetail,
        copyState,
        { ...copyScope, clientId: copyIds.other },
        copyIds.document,
        copySource,
      ),
    ).toThrow();
  });
});
