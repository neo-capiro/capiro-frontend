import { expect, it } from "vitest";
import {
  publicationScope,
  publicationVersion,
  publicationStateFixture,
  publicationReceiptFixture,
} from "./prospect-publication-fixture";
import { draft, requestId, otherId } from "./prospect-resources-fixtures";
import {
  bindPublication,
  bindPublicationState,
  publicationSourceEligible,
  publicationRecoveryContract,
} from "../src/features/modules/workspace/prospects/publication";
import { workspaceSnapshotHash } from "../src/shared/capiro/workspace-snapshot";
import { workspaceProspectPublicationOperations } from "../src/shared/capiro/operations/workspace-prospect-publication";
import { serviceErrorResponse } from "../src/shared/capiro/gateway-errors";
const input = async () => ({
  requestId,
  expectedProspectId: publicationScope.prospectId,
  sourceVersionId: publicationVersion.id,
  sourceSnapshotHash: await workspaceSnapshotHash(publicationVersion.snapshot),
  expectedStateHash: publicationStateFixture.stateHash,
  expectedPublicationId: null,
});
it("binds the exact source, actor, prior publication and request", async () => {
  const body = await input(),
    value = await publicationReceiptFixture(body);
  expect(
    (await bindPublication(value, publicationScope, draft.ownerId, body))
      .receipt.versionId,
  ).toBe(requestId);
  expect(
    bindPublicationState(publicationStateFixture, publicationScope).current,
  ).toBeNull();
  expect(
    publicationSourceEligible(publicationVersion, body.expectedStateHash),
  ).toBe(true);
  expect(publicationSourceEligible(publicationVersion, "f".repeat(64))).toBe(
    false,
  );
  expect(
    publicationSourceEligible(
      {
        ...publicationVersion,
        snapshot: { ...publicationVersion.snapshot, prospectPublication: {} },
      },
      body.expectedStateHash,
    ),
  ).toBe(false);
});
it.each([
  "tenantId",
  "draftId",
  "prospectId",
  "actorId",
  "versionId",
  "sourceVersionId",
  "sourceSnapshotHash",
  "requestHash",
  "previousPublicationId",
])("rejects a mismatched %s", async (field) => {
  const body = await input(),
    value = await publicationReceiptFixture(body);
  await expect(
    bindPublication(
      {
        ...value,
        receipt: {
          ...value.receipt,
          [field]: field === "sourceVersionId" ? requestId : otherId,
        },
      },
      publicationScope,
      draft.ownerId,
      body,
    ),
  ).rejects.toThrow();
});
it("keeps recovery immutable and refuses source substitution", async () => {
  const body = await input();
  expect(() =>
    publicationRecoveryContract.validateUpdate(body, {
      ...body,
      sourceVersionId: requestId,
    }),
  ).toThrow();
  expect(() =>
    bindPublicationState(
      { ...publicationStateFixture, prospectId: otherId },
      publicationScope,
    ),
  ).toThrow();
});
it("passes only the named producer publication conflict through the shared gateway", async () => {
  const op =
    workspaceProspectPublicationOperations["workspace.prospect.publish"];
  const response = await serviceErrorResponse(
    Response.json(
      { code: "WORKSPACE_PUBLICATION_STATE_CONFLICT", private: "hidden" },
      { status: 409 },
    ),
    op,
    new AbortController().signal,
    false,
  );
  const body = await response.json();
  expect(body.code).toBe("WORKSPACE_PUBLICATION_STATE_CONFLICT");
  expect(body.private).toBeUndefined();
});
