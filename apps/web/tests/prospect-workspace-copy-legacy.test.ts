import { expect, it } from "vitest";
import { manualDraftInput } from "../src/features/modules/workspace/prospects/manual-draft";
import { draft, prospectId } from "./prospect-resources-fixtures";

it("never projects a bound Core copy into the legacy main-section PATCH editor", () => {
  const value = {
    ...draft,
    config: {},
    documents: [
      {
        ...draft.documents[0]!,
        sourceBriefVersion: {
          kind: "core_prospect_brief_version" as const,
          prospectId,
          briefId: "10000000-0000-4000-8000-000000000003",
          versionId: "10000000-0000-4000-8000-000000000004",
          versionNumber: 2,
          sectionsHash: "a".repeat(64),
          snapshotHash: "b".repeat(64),
        },
        body: {
          blocks: [
            {
              id: "saved-core-section",
              type: "section" as const,
              title: "Original Core",
              content: "Bound content",
            },
          ],
        },
      },
    ],
  };
  expect(manualDraftInput(value)).toEqual({
    title: draft.docTitle,
    names: ["Body"],
    sections: {},
  });
});

it("continues to expose ordinary document sections on the established editor path", () => {
  const value = {
    ...draft,
    config: {},
    documents: [
      {
        ...draft.documents[0]!,
        sourceBriefVersion: null,
        body: {
          blocks: [
            {
              id: "ordinary",
              type: "section" as const,
              title: "Ordinary",
              content: "Unbound text",
            },
          ],
        },
      },
    ],
  };
  expect(manualDraftInput(value)).toEqual({
    title: draft.docTitle,
    names: ["Ordinary"],
    sections: { Ordinary: "Unbound text" },
  });
});
