import { expect, it } from "vitest";
import { createHash } from "node:crypto";
import {
  receiveFederalSource,
  applyDecodedXmlEdit,
  decodeXmlTextRun,
} from "@capiro/meri-contracts/federal-workbench";
import {
  authoredFrom,
  authoredOperations,
  type AuthoredInput,
} from "../src/shared/meri-documents/federal-authoring";
import fixture from "./fixtures/federal-text-run-source.json";
const sha = (text: string) =>
  createHash("sha256").update(text, "utf8").digest("hex");
async function source() {
  const { publication: omitted, ...envelope } = fixture.imported;
  void omitted;
  return receiveFederalSource(
    new TextEncoder().encode(JSON.stringify(envelope)),
  );
}
const run = fixture.imported.source.scopes.find((scope) =>
  scope.textRun?.decoded.includes("profound sorrow"),
)!;
const replacement = (
  id: string,
  expectedText: string,
  text: string,
): Exclude<AuthoredInput, { kind: "remove_source_text" }> => ({
  id,
  kind: "replace",
  scopeId: run.id,
  expectedText,
  text,
  textMode: "decoded-xml",
});
it("hashes raw intermediate XML while repeated anchors and output text are decoded", async () => {
  const value = await source(),
    raw = value.text.slice(run.start, run.end);
  const inputs = [
    replacement("a", "profound sorrow", "A & <B> 😀"),
    replacement("b", "& <B> 😀", "<&> 🏛"),
    { id: "remove", kind: "remove_source_text" } as const,
  ];
  const result = await authoredOperations(value, inputs);
  expect(result.refusal).toBeNull();
  const firstRaw = raw.replace("profound sorrow", "A &amp; &lt;B&gt; 😀");
  const finalRaw = raw.replace("profound sorrow", "A &lt;&amp;&gt; 🏛");
  expect(result.operations[0]).toMatchObject({
    textMode: "decoded-xml",
    expectedScopeSha256: sha(raw),
    expectedTextSha256: sha("profound sorrow"),
  });
  expect(result.operations[1]).toMatchObject({
    textMode: "decoded-xml",
    expectedScopeSha256: sha(firstRaw),
    expectedTextSha256: sha("& <B> 😀"),
    dependsOn: ["a"],
  });
  expect(result.operations[2]).toEqual({
    id: "remove",
    kind: "remove_source_text",
    expectedSourceSha256: value.sha256,
    expectedTextSha256: sha(
      value.text.slice(0, run.start) + finalRaw + value.text.slice(run.end),
    ),
    dependsOn: ["a", "b"],
  });
  expect(result.scopes.find((scope) => scope.id === run.id)).toMatchObject({
    current: finalRaw,
    decoded: raw.replace("profound sorrow", "A <&> 🏛"),
  });
  expect(authoredFrom(result.operations)).toEqual(inputs);
  expect(
    (await authoredOperations(value, authoredFrom(result.operations)))
      .operations,
  ).toEqual(result.operations);
});
it("maps decoded insert/delete to raw entities and retains dependency order", async () => {
  const value = await source(),
    raw = value.text.slice(run.start, run.end);
  const inputs: AuthoredInput[] = [
    replacement("a", "profound sorrow", "A & 😀"),
    {
      id: "b",
      kind: "insert",
      scopeId: run.id,
      expectedText: "&",
      text: "<",
      textMode: "decoded-xml",
    },
    {
      id: "c",
      kind: "delete",
      scopeId: run.id,
      expectedText: "&<",
      textMode: "decoded-xml",
    },
  ];
  const result = await authoredOperations(value, inputs);
  expect(result.refusal).toBeNull();
  expect(result.operations[1]).toMatchObject({
    position: "after",
    expectedScopeSha256: sha(raw.replace("profound sorrow", "A &amp; 😀")),
  });
  expect(result.operations[2]).toMatchObject({
    dependsOn: ["a", "b"],
    expectedScopeSha256: sha(raw.replace("profound sorrow", "A &amp;&lt; 😀")),
  });
  expect(result.scopes.find((scope) => scope.id === run.id)?.current).toBe(
    raw.replace("profound sorrow", "A  😀"),
  );
});
it("preserves raw loaded operations and refuses decoded reuse after raw markup consumes a run", async () => {
  const value = await source();
  const raw: AuthoredInput = {
    id: "raw",
    kind: "replace",
    scopeId: run.id,
    expectedText: "profound sorrow",
    text: "<b>marked</b>",
  };
  const result = await authoredOperations(value, [raw]);
  expect(result.refusal).toBeNull();
  expect(result.operations[0]).not.toHaveProperty("textMode");
  expect(authoredFrom(result.operations)).toEqual([raw]);
  expect(
    result.scopes.find((scope) => scope.id === run.id)?.decoded,
  ).toBeNull();
  const invalid = await authoredOperations(value, [
    raw,
    replacement("decoded", "marked", "next"),
  ]);
  expect(invalid.refusal).toContain("no longer maps");
  expect(invalid.operations).toHaveLength(1);
});
it("refuses decoded mode on element scopes, scalar splits and ancestor interleaving", async () => {
  const value = await source();
  expect(
    (
      await authoredOperations(value, [
        { ...replacement("a", "profound sorrow", "new"), scopeId: "document" },
      ])
    ).refusal,
  ).toContain("declared XML text run");
  expect(
    (
      await authoredOperations(value, [
        replacement("a", "profound sorrow", "😀"),
        replacement("b", "\ud83d", "x"),
      ])
    ).refusal,
  ).toContain("cannot be mapped");
  expect(
    (
      await authoredOperations(value, [
        replacement("a", "profound sorrow", "new"),
        {
          id: "b",
          kind: "replace",
          scopeId: "document",
          expectedText: "new",
          text: "later",
        },
      ])
    ).refusal,
  ).toContain("intermediate hash");
});
it("uses the canonical lexical helper for CDATA, CRLF, numeric entities and safe boundaries", () => {
  const text = applyDecodedXmlEdit("A&amp;&#x1F600;\r\nZ", "text", {
    kind: "replace",
    expectedText: "&😀\n",
    text: "<\r>",
  });
  expect(text.text).toBe("A&lt;&#13;&gt;Z");
  expect(text.textRun.decoded).toBe("A<\r>Z");
  const cdata = applyDecodedXmlEdit("raw\r\n😀", "cdata", {
    kind: "replace",
    expectedText: "raw\n",
    text: "<&>",
  });
  expect(cdata.text).toBe("<&>😀");
  expect(decodeXmlTextRun(cdata.text, "cdata").decoded).toBe("<&>😀");
  for (const text of ["]]>", "\r"])
    expect(() =>
      applyDecodedXmlEdit("old", "cdata", {
        kind: "replace",
        expectedText: "old",
        text,
      }),
    ).toThrow();
});
