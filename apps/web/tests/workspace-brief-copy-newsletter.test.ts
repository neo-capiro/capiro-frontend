import { expect, it } from "vitest";
import { copyBody, copySource, copyIds } from "./workspace-brief-copy-fixtures";
import { ordinary, state, requestId } from "./workspace-ordinary-save-fixtures";
import { createNewsletter } from "../src/features/modules/workspace/newsletter/newsletter-model";
import { newsletterSaveModel } from "../src/features/modules/workspace/newsletter/newsletter-atomic-save";

it("newsletter capture excludes a preceding bound tab with arbitrary newsletter metadata", () => {
  const row = ordinary();
  row.product = "Newsletter";
  row.documents[0]!.body.newsletter = createNewsletter("blank");
  const current = {
    ...state(row),
    draft: {
      ...row,
      documents: [
        {
          ...row.documents[0]!,
          id: copyIds.document,
          body: copyBody,
          sourceBriefVersion: copySource,
        },
        { ...row.documents[0]!, id: copyIds.other, sourceBriefVersion: null },
      ],
    },
  };
  const input = newsletterSaveModel.input(current);
  expect(input.documentId).toBe(copyIds.other);
  const retained = newsletterSaveModel.capture(current, input, requestId);
  expect(retained.body).toMatchObject({ documents: [{ id: copyIds.other }] });
  expect(JSON.stringify(retained.body)).not.toContain(copyIds.document);
});
it("a bound-only draft cannot produce an ordinary newsletter save", () => {
  const row = ordinary();
  row.product = "Newsletter";
  const current = {
    ...state(row),
    draft: {
      ...row,
      documents: [
        {
          ...row.documents[0]!,
          body: copyBody,
          sourceBriefVersion: copySource,
        },
      ],
    },
  };
  expect(() => newsletterSaveModel.input(current)).toThrow(
    "one supported primary",
  );
});
