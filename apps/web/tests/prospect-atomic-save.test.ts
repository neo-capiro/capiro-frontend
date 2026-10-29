import { expect, it } from "vitest";
import {
  draft,
  prospectId,
  otherId,
  requestId,
} from "./prospect-resources-fixtures";
import {
  prospectReceiptFixture,
  prospectStateFixture,
} from "./prospect-atomic-fixture";
import {
  bindProspectSave,
  bindProspectState,
  prospectRequest,
  prospectSaveRecoveryContract,
} from "../src/features/modules/workspace/prospects/atomic-save";
const scope = { id: draft.id, tenantId: draft.tenantId, prospectId };
const record = {
  requestId,
  atomicVersion: 1 as const,
  baseline: "a".repeat(64),
  input: {
    title: "Reviewed proposal",
    names: ["Scope"],
    sections: { Scope: "The exact reviewed text" },
  },
};
it("binds complete state and the exact saved request to prospect, actor, draft and version", async () => {
  expect(bindProspectState(prospectStateFixture(draft), scope).draft.id).toBe(
    draft.id,
  );
  const body = prospectRequest(record, prospectId);
  expect(
    (
      await bindProspectSave(
        await prospectReceiptFixture(draft, body),
        scope,
        draft.ownerId,
        body,
      )
    ).receipt.versionId,
  ).toBe(requestId);
});
it.each(["tenantId", "prospectId", "draftId"])(
  "refuses a foreign %s in a state read",
  (field) => {
    expect(() =>
      bindProspectState(
        { ...prospectStateFixture(draft), [field]: otherId },
        scope,
      ),
    ).toThrow();
  },
);
it.each([
  "tenantId",
  "prospectId",
  "draftId",
  "requestId",
  "versionId",
  "actorId",
  "requestHash",
])("refuses mismatched saved %s", async (field) => {
  const body = prospectRequest(record, prospectId),
    response = await prospectReceiptFixture(draft, body);
  await expect(
    bindProspectSave(
      {
        ...response,
        receipt: {
          ...response.receipt,
          [field]: field === "requestHash" ? "d".repeat(64) : otherId,
        },
      },
      scope,
      draft.ownerId,
      body,
    ),
  ).rejects.toThrow();
});
it("retains legacy input but does not silently replay it as a new atomic request", () => {
  const { atomicVersion, ...legacy } = record;
  expect(atomicVersion).toBe(1);
  expect(prospectSaveRecoveryContract.schema.parse(legacy).input).toEqual(
    record.input,
  );
  expect(() => prospectRequest(legacy, prospectId)).toThrow("legacy");
});
it("only allows an immutable request to record a definite conflict", () => {
  expect(() =>
    prospectSaveRecoveryContract.validateUpdate(record, {
      ...record,
      conflict: true,
    }),
  ).not.toThrow();
  expect(() =>
    prospectSaveRecoveryContract.validateUpdate(record, {
      ...record,
      baseline: "b".repeat(64),
    }),
  ).toThrow();
  expect(() =>
    prospectSaveRecoveryContract.validateUpdate(
      { ...record, conflict: true },
      record,
    ),
  ).toThrow();
});
it("refuses missing sections and dangerous names before dispatch", () => {
  expect(() =>
    prospectRequest(
      { ...record, input: { ...record.input, sections: {} } },
      prospectId,
    ),
  ).toThrow();
  expect(() =>
    prospectRequest(
      {
        ...record,
        input: {
          ...record.input,
          names: ["constructor"],
          sections: { constructor: "bad" },
        },
      },
      prospectId,
    ),
  ).toThrow();
});
