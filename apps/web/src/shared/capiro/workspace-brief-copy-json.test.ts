import { expect, it } from "vitest";
import {
  briefCopyBodySchema,
  briefCopyDetailSchema,
} from "./operations/workspace-brief-copy";
import { draftDocument } from "./operations/workspace-documents";
import { detail, legacyDocument } from "./workspace-brief-copy.fixtures";

it("preserves inert original-evidence JSON keys without modifying object prototypes", () => {
  const evidence = JSON.parse(
    '{"__proto__":{"synthetic":true},"constructor":"original","prototype":[1,2]}',
  );
  const input = {
    ...detail,
    sourceEvidence: { ...detail.sourceEvidence, sourceSnapshot: evidence },
  };
  const output = briefCopyDetailSchema.parse(input);
  expect(JSON.stringify(output.sourceEvidence.sourceSnapshot)).toBe(
    JSON.stringify(evidence),
  );
  expect(Object.getPrototypeOf(output.sourceEvidence.sourceSnapshot)).toBe(
    Object.prototype,
  );
  expect({}).not.toHaveProperty("synthetic");
});

it("rejects forbidden raw copied-body keys before legacy parsing can remove them", () => {
  for (const body of [
    JSON.parse('{"blocks":[],"__proto__":{"synthetic":true}}'),
    JSON.parse(
      '{"blocks":[{"id":"one","type":"section","__proto__":{"synthetic":true}}]}',
    ),
  ])
    expect(draftDocument.safeParse({ ...legacyDocument, body }).success).toBe(
      false,
    );
});

it("preserves arbitrary newsletter-named metadata on a bound rich document", () => {
  const body = {
    ...legacyDocument.body,
    newsletter: { original: "opaque rich extension" },
  };
  expect(draftDocument.parse({ ...legacyDocument, body }).body).toEqual(body);
  expect(
    draftDocument.safeParse({
      ...legacyDocument,
      sourceBriefVersion: null,
      body,
    }).success,
  ).toBe(false);
});

it("rejects non-JSON cycles and values while allowing repeated acyclic JSON", () => {
  const repeated = { exact: [1, true, null] };
  const body = { blocks: [], first: repeated, second: repeated };
  expect(briefCopyBodySchema.parse(body)).toEqual(body);
  const cycle: Record<string, unknown> = { blocks: [] };
  cycle.self = cycle;
  for (const value of [cycle, { bad: undefined }, { bad: new Date() }]) {
    expect(briefCopyBodySchema.safeParse(value).success).toBe(false);
    expect(
      briefCopyDetailSchema.safeParse({
        ...detail,
        sourceEvidence: { ...detail.sourceEvidence, sourceSnapshot: value },
      }).success,
    ).toBe(false);
  }
});
