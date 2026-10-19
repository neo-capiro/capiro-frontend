import { expect, it } from "vitest";
import type { OperationRegistry } from "./contracts";
import { draftDocument } from "./operations/workspace-documents";
import { capiroOperations } from "./registry";
import {
  cases,
  createBody,
  detail,
  ids,
  legacyDocument,
  result,
  richBody,
  saveBody,
  source,
  state,
} from "./workspace-brief-copy.fixtures";

const registry: OperationRegistry = capiroOperations;
function operation(key: string) {
  const found = registry[key];
  expect(found, `Missing fixed operation ${key}`).toBeDefined();
  return found!;
}
const copy = () => operation("workspace.brief-copy.create");
const save = () => operation("workspace.brief-copy.save");
const copyInput = (body: unknown) => ({ params: { draftId: ids.draft }, body });
const saveInput = (body: unknown) => ({
  params: { draftId: ids.draft, docId: ids.document },
  body,
});

it.each(cases)(
  "preserves the full validated $key request and response",
  (fixture) => {
    const schema = operation(fixture.key);
    expect(schema.request.parse(fixture.input)).toEqual(fixture.input);
    expect(schema.response.parse(fixture.response)).toEqual(fixture.response);
    expect(
      schema.request.safeParse({ ...fixture.input, tenantId: ids.tenant })
        .success,
    ).toBe(false);
    expect(
      schema.request.safeParse({
        ...fixture.input,
        params: { ...fixture.input.params, actorId: "user_other" },
      }).success,
    ).toBe(false);
  },
);

it.each([
  { expectedClientId: undefined },
  { expectedClientId: "" },
  { expectedClientId: ids.client.toUpperCase() },
  { requestId: ids.request.toUpperCase() },
  { requestId: "a1000000-0000-0000-8000-000000000007" },
  { expectedStateHash: "C".repeat(64) },
  { expectedStateHash: "c".repeat(63) },
  { actorId: "user_injected" },
  { tenantId: ids.tenant },
])("rejects invalid command binding before dispatch: %j", (change) => {
  expect(
    copy().request.safeParse(copyInput({ ...createBody, ...change })).success,
  ).toBe(false);
  expect(
    save().request.safeParse(saveInput({ ...saveBody, ...change })).success,
  ).toBe(false);
});

it("accepts exact explicit null and linked client command bindings", () => {
  for (const expectedClientId of [null, ids.client]) {
    expect(
      copy().request.parse(copyInput({ ...createBody, expectedClientId })),
    ).toEqual(copyInput({ ...createBody, expectedClientId }));
    expect(
      save().request.parse(saveInput({ ...saveBody, expectedClientId })),
    ).toEqual(saveInput({ ...saveBody, expectedClientId }));
  }
});

it.each([
  { kind: "current_brief" },
  { prospectId: ids.prospect.toUpperCase() },
  { briefId: "not-a-uuid" },
  { versionId: ids.version.toUpperCase() },
  { versionNumber: 0 },
  { versionNumber: 101 },
  { versionNumber: 1.5 },
  { sectionsHash: "A".repeat(64) },
  { snapshotHash: "z".repeat(64) },
  { unexpectedSourceField: "must not disappear" },
])("refuses malformed immutable source identity: %j", (change) => {
  const input = copyInput({ ...createBody, source: { ...source, ...change } });
  expect(copy().request.safeParse(input).success).toBe(false);
});

it.each([
  { source },
  { sourceEvidence: detail.sourceEvidence },
  { name: "" },
  { name: "n".repeat(301) },
  { docTitle: "" },
  { docTitle: "t".repeat(501) },
  { label: "l".repeat(301) },
  { ordinal: -1 },
  { ordinal: 100001 },
  { ordinal: 1.5 },
])(
  "rejects source replacement and invalid save display metadata: %j",
  (change) => {
    expect(
      save().request.safeParse(saveInput({ ...saveBody, ...change })).success,
    ).toBe(false);
  },
);

it("admits bounded metadata, full rich body order and empty blocks without stripping JSON", () => {
  const body = {
    ...saveBody,
    name: "n".repeat(300),
    docTitle: "t".repeat(500),
    label: "",
    ordinal: 100000,
  };
  expect(save().request.parse(saveInput(body))).toEqual(saveInput(body));
  const empty = {
    ...saveBody,
    body: { blocks: [], extra: { retained: true } },
  };
  expect(save().request.parse(saveInput(empty))).toEqual(saveInput(empty));
});

const invalidBodies = [
  {},
  [],
  { blocks: [richBody.blocks[0], richBody.blocks[0]] },
  { blocks: [{ id: "", type: "section" }] },
  { blocks: [{ id: "i".repeat(65), type: "section" }] },
  { blocks: [{ id: "one", type: "unknown" }] },
  { blocks: [{ id: "one", type: "section", title: 3 }] },
  { blocks: [{ id: "one", type: "section", content: {} }] },
  { blocks: [], extra: undefined },
  { blocks: [], extra: Number.NaN },
  { blocks: [], extra: Infinity },
  { blocks: [], extra: new Date(0) },
  { blocks: [], extra: () => "not JSON" },
  JSON.parse('{"blocks":[],"extra":{"__proto__":{"polluted":true}}}'),
  JSON.parse('{"blocks":[],"extra":{"constructor":"forbidden"}}'),
  JSON.parse('{"blocks":[],"extra":{"prototype":"forbidden"}}'),
];
it.each(invalidBodies.map((body, index) => ({ body, index })))(
  "refuses invalid whole rich JSON case$index",
  ({ body }) => {
    expect(
      save().request.safeParse(saveInput({ ...saveBody, body })).success,
    ).toBe(false);
  },
);

it("enforces block, UTF8-byte, node and nesting limits independently", () => {
  const blocks = Array.from({ length: 1001 }, (_, i) => ({
    id: `s${i}`,
    type: "section",
  }));
  const oversizedUtf8 = { blocks: [], text: "é".repeat(2_000_001) };
  let deep: unknown = null;
  for (let i = 0; i < 34; i++) deep = { nested: deep };
  for (const body of [
    { blocks },
    oversizedUtf8,
    { blocks: [], nodes: Array(100001).fill(null) },
    { blocks: [], deep },
  ]) {
    expect(
      save().request.safeParse(saveInput({ ...saveBody, body })).success,
    ).toBe(false);
  }
  const allowed = {
    ...saveBody,
    body: { blocks: blocks.slice(0, 1000), text: "é".repeat(1000) },
  };
  expect(save().request.parse(saveInput(allowed))).toEqual(saveInput(allowed));
});

it("does not treat a Clerk actor as a database UUID and bounds receipt actor strings", () => {
  const receipt = result("copy_core_brief");
  for (const actorId of ["user_syntheticClerkActor", "u".repeat(200)]) {
    const value = { ...receipt, receipt: { ...receipt.receipt, actorId } };
    expect(copy().response.parse(value)).toEqual(value);
  }
  for (const actorId of ["", "u".repeat(201), null, 12]) {
    expect(
      copy().response.safeParse({
        ...receipt,
        receipt: { ...receipt.receipt, actorId },
      }).success,
    ).toBe(false);
  }
});

it.each(["workspace.brief-copy.create", "workspace.brief-copy.save"])(
  "requires matching operation, request version and exact source prospect in%s receipts",
  (key) => {
    const receipt = result(
      key.endsWith("create") ? "copy_core_brief" : "save_brief_copy",
    );
    const schema = operation(key).response;
    for (const change of [
      {
        operation: key.endsWith("create")
          ? "save_brief_copy"
          : "copy_core_brief",
      },
      { versionId: ids.version },
      { requestId: ids.request.toUpperCase() },
      { requestHash: "D".repeat(64) },
      { snapshotHash: "f".repeat(63) },
      { clientId: undefined },
      { source: { ...source, prospectId: ids.client } },
    ])
      expect(
        schema.safeParse({
          ...receipt,
          receipt: { ...receipt.receipt, ...change },
        }).success,
      ).toBe(false);
    expect(schema.parse({ ...receipt, replayed: true })).toEqual({
      ...receipt,
      replayed: true,
    });
  },
);

it("requires explicit nullable client and coherent source association on current reads", () => {
  const stateSchema = operation("workspace.brief-copy.state").response;
  const detailSchema = operation("workspace.brief-copy.detail").response;
  expect(stateSchema.safeParse({ ...state, clientId: undefined }).success).toBe(
    false,
  );
  expect(
    detailSchema.safeParse({ ...detail, clientId: undefined }).success,
  ).toBe(false);
  expect(
    stateSchema.safeParse({
      ...state,
      documents: [
        {
          ...state.documents[0],
          sourceBriefVersion: { ...source, prospectId: ids.client },
        },
      ],
    }).success,
  ).toBe(false);
  expect(
    detailSchema.safeParse({
      ...detail,
      document: {
        ...detail.document,
        sourceBriefVersion: { ...source, prospectId: ids.client },
      },
    }).success,
  ).toBe(false);
  expect(
    detailSchema.safeParse({
      ...detail,
      document: { ...detail.document, sourceBriefVersion: null },
    }).success,
  ).toBe(false);
});

it("preserves ordinary legacy absent/null association and refuses malformed bound association", () => {
  const ordinary = { ...legacyDocument, body: {} };
  Reflect.deleteProperty(ordinary, "sourceBriefVersion");
  expect(draftDocument.parse(ordinary)).toEqual(ordinary);
  expect(
    draftDocument.parse({ ...ordinary, sourceBriefVersion: null }),
  ).toEqual({ ...ordinary, sourceBriefVersion: null });
  for (const sourceBriefVersion of [
    { ...source, versionNumber: 101 },
    { ...source, kind: "unknown" },
    { ...source, unexpected: true },
  ]) {
    expect(
      draftDocument.safeParse({ ...legacyDocument, sourceBriefVersion })
        .success,
    ).toBe(false);
  }
});
