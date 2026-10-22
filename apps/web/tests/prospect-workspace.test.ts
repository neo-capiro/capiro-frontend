import { it, expect } from "vitest";
import {
  prospectDraftCreateBody,
  prospectWorkspaceDraft,
} from "../src/shared/capiro/operations/workspace-prospects";
import {
  manualDraftInput,
  assertProspectDraft,
  assertManualSave,
} from "../src/features/modules/workspace/prospects/manual-draft";
import { clientDrafts } from "../src/features/portfolio/work/contracts";
import {
  actor,
  prospectId,
  requestId,
  otherId,
  draft,
} from "./prospect-resources-fixtures";
const scope = { id: draft.id, tenantId: actor.tenantId, prospectId };
it("requires a stable canonical creation key and rejects extra association or generation fields", () => {
  const body = { prospectId, requestId, docTitle: "Manual" };
  expect(prospectDraftCreateBody.parse(body)).toEqual(body);
  for (const extra of [
    { requestId: undefined },
    { prospectId: "name" },
    { clientId: otherId },
    { generate: true },
    { ownerId: "other" },
  ])
    expect(
      prospectDraftCreateBody.safeParse({ ...body, ...extra }).success,
    ).toBe(false);
});
it("requires original document membership", () => {
  expect(prospectWorkspaceDraft.safeParse(draft).success).toBe(true);
  expect(
    prospectWorkspaceDraft.safeParse({
      ...draft,
      documents: [{ ...draft.documents[0], draftId: otherId }],
    }).success,
  ).toBe(false);
});
for (const field of ["id", "tenantId", "prospectId"] as const)
  it(`rejects another ${field} before displaying or exporting content`, () =>
    expect(() =>
      assertProspectDraft({ ...draft, [field]: otherId }, scope),
    ).toThrow());
it("creates a manual Body section for an empty prospect document without generation", () =>
  expect(manualDraftInput(draft)).toEqual({
    title: draft.docTitle,
    names: ["Body"],
    sections: {},
  }));
it("preserves ordered section names and existing content", () =>
  expect(
    manualDraftInput({
      ...draft,
      config: {
        sections: ["Two", "One"],
        sectionContent: { Two: "B", One: "A" },
      },
    }),
  ).toEqual({
    title: draft.docTitle,
    names: ["Two", "One"],
    sections: { Two: "B", One: "A" },
  }));
it("requires the edited content receipt, never raw success alone", () => {
  const input = {
    title: "Edited",
    names: ["Body"],
    sections: { Body: "Manual text" },
  };
  expect(() => assertManualSave(draft, scope, input)).toThrow();
  expect(() =>
    assertManualSave(
      {
        ...draft,
        docTitle: input.title,
        config: { sections: input.names, sectionContent: input.sections },
      },
      scope,
      input,
    ),
  ).not.toThrow();
});
it("never reassigns prospect documents through a matching legacy client display name", () => {
  const client = { id: otherId, name: "Identical name" };
  expect(
    clientDrafts([{ ...draft, client: client.name }], client, [client]),
  ).toEqual([]);
  expect(
    clientDrafts(
      [{ ...draft, prospectId: null, client: client.name, clientId: client.id }],
      client,
      [client],
    ),
  ).toHaveLength(1);
});
