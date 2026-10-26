import { expect, it } from "vitest";
import {
  ordinary,
  state,
  requestId,
  otherId,
  scope,
  receipt,
} from "./workspace-ordinary-save-fixtures";
import {
  createNewsletter,
  newsletterDocumentBlocks,
} from "../src/features/modules/workspace/newsletter/newsletter-model";
import { newsletterSaveModel } from "../src/features/modules/workspace/newsletter/newsletter-atomic-save";
import {
  bindOrdinaryReceipt,
  ordinaryRetainedSchema,
  manualSaveModel,
  sameOrdinaryRequest,
} from "../src/features/modules/workspace/ordinary-save/ordinary-save";
import { ordinarySaveBody } from "../src/shared/capiro/operations/workspace-documents";

function fixture() {
  const row = ordinary();
  row.product = "Newsletter";
  row.documents[0]!.body.newsletter = createNewsletter("weekly");
  row.documents[0]!.body.blocks = newsletterDocumentBlocks(
    row.documents[0]!.body.newsletter,
  ).map((block) => ({ ...block, extra: { keep: true } }));
  const current = state(row);
  const input = newsletterSaveModel.input(current);
  input.title = "Name distinct from email subject";
  input.body = {
    ...input.body,
    subject: "Résumé — café",
    blocks: input.body.blocks.map((block) => ({
      ...block,
      text: block.text + " edited",
    })),
  };
  return {
    row,
    current,
    input,
    capture: () => newsletterSaveModel.capture(current, input, requestId),
  };
}
it("captures the complete primary body and identity without changing unrelated fields or the baseline", () => {
  const f = fixture();
  const before = structuredClone(f.current);
  const retained = f.capture();
  expect(retained.body).toMatchObject({
    requestId,
    expectedStateHash: f.current.stateHash,
    expectedClientId: null,
    draft: { docTitle: f.input.title },
    documents: [
      {
        id: f.input.documentId,
        name: f.input.title,
        body: { unknown: { preserved: true }, newsletter: f.input.body },
      },
    ],
  });
  if (retained.body.label !== "Newsletter revision")
    throw new Error("Expected newsletter variant");
  expect(retained.body.documents).toHaveLength(1);
  expect(
    retained.body.documents[0]!.body.blocks!.every(
      (block) => JSON.stringify(block.extra) === '{"keep":true}',
    ),
  ).toBe(true);
  expect(f.current).toEqual(before);
  expect(retained.body.draft).not.toHaveProperty("config");
});
it("round-trips the exact retained newsletter request and binds its receipt, including non-ASCII content", async () => {
  const f = fixture();
  f.input.body.blocks[0]!.href = undefined;
  const original = f.capture();
  const retained = ordinaryRetainedSchema.parse(
    JSON.parse(JSON.stringify(f.capture())),
  );
  expect(sameOrdinaryRequest(original, retained)).toBe(true);
  expect(newsletterSaveModel.retained(retained)).toEqual(f.input);
  await expect(
    bindOrdinaryReceipt(receipt(retained.body, f.row), scope, retained.body),
  ).resolves.toBeTruthy();
  const changed = structuredClone(retained.body);
  changed.draft.docTitle = "Changed request";
  await expect(
    bindOrdinaryReceipt(receipt(retained.body, f.row), scope, changed),
  ).rejects.toThrow("does not match");
});
it.each(["conflicting projection", "extra body block", "changed primary"])(
  "refuses replacement of %s",
  (kind) => {
    const f = fixture();
    if (kind === "conflicting projection")
      f.row.documents[0]!.body.blocks[0]!.content = "Unprojected content";
    if (kind === "extra body block")
      f.row.documents[0]!.body.blocks.push({
        id: "extra",
        type: "photo",
        url: "https://example.invalid/synthetic.png",
      });
    if (kind === "changed primary") f.input.documentId = otherId;
    expect(f.capture).toThrow(
      /outside this newsletter editor|primary newsletter document changed/,
    );
  },
);
it("refuses missing, malformed or ambiguous newsletter bodies without choosing a template", () => {
  const f = fixture();
  f.row.documents[0]!.body.newsletter!.subject = "x".repeat(401);
  expect(f.capture).toThrow();
  delete f.row.documents[0]!.body.newsletter;
  expect(f.capture).toThrow("one supported primary");
  f.row.documents[0]!.body.newsletter = createNewsletter("blank");
  f.row.documents.push({ ...f.row.documents[0]!, id: otherId });
  expect(f.capture).toThrow("one supported primary");
});
it("bounds complete request bytes, exact client identity and one primary document", () => {
  const f = fixture();
  f.current.clientId = otherId;
  const retained = f.capture();
  expect(retained.body.expectedClientId).toBe(otherId);
  expect(
    ordinarySaveBody.safeParse({
      ...retained.body,
      expectedClientId: undefined,
    }).success,
  ).toBe(false);
  expect(
    ordinarySaveBody.safeParse({ ...retained.body, documents: [] }).success,
  ).toBe(false);
  f.input.title = "x".repeat(401);
  expect(f.capture).toThrow();
  f.input.title = "Short";
  f.row.documents[0]!.body.blocks[0]!.extra = "é".repeat(500_000);
  expect(f.capture).toThrow("byte limit");
});
it("keeps manual and newsletter hydration distinct within the same retained contract", () => {
  const f = fixture();
  const manual = manualSaveModel.capture(
    state(),
    manualSaveModel.input(state()),
    requestId,
  );
  expect(() => newsletterSaveModel.retained(manual)).toThrow(
    "different editor",
  );
  expect(() => manualSaveModel.retained(f.capture())).toThrow();
});
