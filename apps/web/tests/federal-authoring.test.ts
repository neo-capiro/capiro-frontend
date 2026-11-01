import { describe, expect, it } from "vitest";
import {
  authoredOperations,
  authoredFrom,
  type AuthoredInput,
  type AuthoredOperation,
} from "../src/shared/meri-documents/federal-authoring";
import fixture from "./fixtures/federal-workbench.json";
import type { FederalCompilerSource } from "@capiro/meri-contracts/federal-workbench";

const sha = async (text: string) => {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(text, "utf8").digest("hex");
};
function flat(text: string, sections: readonly string[]) {
  let cursor = 0;
  const scopes = sections.map((label) => {
    const id = label.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    const start = text.indexOf(label, cursor);
    const end = start + label.length;
    cursor = end;
    return { id, label, start, end, sha256: "" };
  });
  return { text, scopes } as unknown as { text: string; scopes: typeof scopes };
}
async function source(
  text: string,
  sections: readonly string[],
  nested = false,
): Promise<FederalCompilerSource> {
  const base = flat(text, sections);
  const scopes = await Promise.all(
    base.scopes.map(async (scope) => ({
      ...scope,
      sha256: await sha(text.slice(scope.start, scope.end)),
      ...(nested ? { ancestorPath: [] } : {}),
    })),
  );
  return {
    documentId: "Synthetic Act",
    publisher: "Synthetic federal publisher",
    sourceVersion: "introduced-1",
    sourceUrl: "https://legislation.example/act/introduced-1",
    publishedAt: "2026-10-28",
    parserVersion: nested ? "federal-scoped-text/2" : "federal-plain-text/1",
    text,
    sha256: await sha(text),
    coverage: { complete: true, limitations: ["Synthetic fixture."] },
    scopes,
  } as unknown as FederalCompilerSource;
}
const replace = (
  id: string,
  scopeId: string,
  expectedText: string,
  text: string,
): AuthoredInput => ({ id, scopeId, kind: "replace", expectedText, text });
function textOperation(operation: AuthoredOperation | undefined) {
  if (!operation || operation.kind === "remove_source_text")
    throw Error("Expected text amendment");
  return operation;
}

describe("federal amendment authoring", () => {
  it("refuses duplicate operation identities before deriving dependencies", async () => {
    const value = fixture.source as unknown as FederalCompilerSource;
    const result = await authoredOperations(value, [
      replace("same", "section-1", "$100", "$150"),
      replace("same", "section-1", "$150", "$250"),
    ]);
    expect(result.refusal).toContain("unique identity");
    expect(result.operations).toEqual([]);
  });
  it("hashes the exact current section and chains a later amendment on the same section", async () => {
    const value = await source("SEC. 1. Payment is $100.\nEnd.\n", [
      "SEC. 1. Payment is $100.",
    ]);
    const authoring = await authoredOperations(value, [
      replace("amendment-1", "sec-1-payment-is-100-", "$100", "$150"),
      replace(
        "amendment-2",
        "sec-1-payment-is-100-",
        "Payment is $150",
        "Payment is $250",
      ),
    ]);
    expect(authoring.refusal).toBeNull();
    const [first, second] = authoring.operations;
    expect(textOperation(first).expectedScopeSha256).toBe(
      value.scopes[0]?.sha256,
    );
    expect(first?.expectedTextSha256).toBe(await sha("$100"));
    expect(first?.dependsOn).toEqual([]);
    expect(textOperation(second).expectedScopeSha256).toBe(
      await sha("SEC. 1. Payment is $150."),
    );
    expect(second?.dependsOn).toEqual(["amendment-1"]);
    expect(authoring.scopes[0]?.current).toBe("SEC. 1. Payment is $250.");
  });

  it("keeps independent sections on their own retained hash and without dependencies", async () => {
    const value = fixture.source as unknown as FederalCompilerSource;
    const authoring = await authoredOperations(value, [
      replace("amendment-1", "section-1", "$100", "$150"),
      replace("amendment-2", "section-2", "$100", "$250"),
    ]);
    expect(authoring.refusal).toBeNull();
    expect(
      authoring.operations.map(
        (operation) => textOperation(operation).expectedScopeSha256,
      ),
    ).toEqual(value.scopes.map((scope) => scope.sha256));
    expect(
      authoring.operations.map((operation) => operation.dependsOn),
    ).toEqual([[], []]);
  });

  it("binds insertion position and refuses an unchanged replacement", async () => {
    const value = await source("SEC. 1. Payment is $100.", [
      "SEC. 1. Payment is $100.",
    ]);
    const authoring = await authoredOperations(value, [
      {
        id: "amendment-1",
        scopeId: "sec-1-payment-is-100-",
        kind: "insert",
        expectedText: "$100",
        text: " Payable",
        position: "after",
      },
    ]);
    expect(textOperation(authoring.operations[0]).position).toBe("after");
    expect(authoring.operations[0]?.dependsOn).toEqual([]);
    expect(authoring.scopes[0]?.current).toBe(
      "SEC. 1. Payment is $100 Payable.",
    );
    const unchanged = await authoredOperations(value, [
      replace("amendment-1", "sec-1-payment-is-100-", "$100", "$100"),
    ]);
    expect(unchanged.refusal).toContain("identical");
    expect(unchanged.operations).toHaveLength(0);
  });

  it("refuses missing, ambiguous, blank and unknown exact text before the compiler", async () => {
    const value = await source("A $1 B $1 C", ["A $1 B $1 C"]);
    const id = "a-1-b-1-c";
    expect(
      (await authoredOperations(value, [replace("a", id, "$9", "$2")])).refusal,
    ).toContain("not in the selected section");
    expect(
      (await authoredOperations(value, [replace("a", id, "$1", "$2")])).refusal,
    ).toContain("more than once");
    expect(
      (await authoredOperations(value, [replace("a", id, "", "$2")])).refusal,
    ).toContain("Enter the exact text");
    expect(
      (await authoredOperations(value, [replace("a", "missing", "$1", "$2")]))
        .refusal,
    ).toContain("Choose an exact source section");
  });

  it("keeps nested section text to the compiler once an ancestor amendment changed it", async () => {
    const text = "SEC. 1. Payment is $100.";
    const value = (await source(text, [
      "SEC. 1. Payment is $100.",
    ])) as unknown as {
      parserVersion: string;
      scopes: Array<Record<string, unknown>>;
    };
    const nested = {
      ...(value as unknown as FederalCompilerSource),
      parserVersion: "federal-scoped-text/2",
      scopes: [
        { ...value.scopes[0], ancestorPath: [] },
        {
          id: "paragraph-a",
          label: "paragraph (a)",
          start: text.indexOf("$100"),
          end: text.indexOf("$100") + 4,
          sha256: await sha("$100"),
          ancestorPath: ["sec-1-payment-is-100-"],
        },
      ],
    } as unknown as FederalCompilerSource;
    const authoring = await authoredOperations(nested, [
      replace("amendment-1", "sec-1-payment-is-100-", "$100", "$150"),
      replace("amendment-2", "paragraph-a", "$100", "$250"),
    ]);
    expect(authoring.refusal).toContain("only come from the compiler");
    expect(authoring.operations).toHaveLength(1);
  });

  it("refuses whole-source removal and allows an exact partial removal", async () => {
    const value = await source("SEC. 1. Payment is $100.", [
      "SEC. 1. Payment is $100.",
    ]);
    const id = "sec-1-payment-is-100-";
    const removal = await authoredOperations(value, [
      {
        id: "amendment-1",
        scopeId: id,
        kind: "delete",
        expectedText: "SEC. 1. Payment is $100.",
      },
    ]);
    expect(removal.refusal).toContain("explicit whole-source removal");
    const partial = await authoredOperations(value, [
      { id: "amendment-1", scopeId: id, kind: "delete", expectedText: "$100." },
    ]);
    expect(partial.refusal).toBeNull();
    expect(partial.scopes[0]?.current).toBe("SEC. 1. Payment is ");
  });

  it("re-reads the exact operations a saved review already carries", async () => {
    const value = fixture.source as unknown as FederalCompilerSource;
    const operations = fixture.review.prepared.draft
      .operations as unknown as readonly AuthoredOperation[];
    const inputs = authoredFrom(operations);
    expect(inputs).toHaveLength(1);
    const authoring = await authoredOperations(value, inputs);
    expect(authoring.refusal).toBeNull();
    expect(authoring.operations).toEqual(operations);
  });

  it("binds explicit removal to the full original and intermediate text, preserving gaps and Unicode", async () => {
    const value = await source(
      "Header\r\nFirst: café.\r\nSecond: 🏛.\r\nEnd.",
      ["First: café.", "Second: 🏛."],
    );
    const first = value.scopes[0]!.id,
      second = value.scopes[1]!.id;
    const result = await authoredOperations(value, [
      replace("a", first, "café", "thé"),
      replace("b", second, "🏛", "law"),
      { id: "remove", kind: "remove_source_text" },
    ]);
    expect(result.refusal).toBeNull();
    expect(result.operations.at(-1)).toEqual({
      id: "remove",
      kind: "remove_source_text",
      expectedSourceSha256: value.sha256,
      expectedTextSha256: await sha(
        "Header\r\nFirst: thé.\r\nSecond: law.\r\nEnd.",
      ),
      dependsOn: ["a", "b"],
    });
    expect(authoredFrom(result.operations).at(-1)).toEqual({
      id: "remove",
      kind: "remove_source_text",
    });
  });

  it("derives the whole intermediate hash after repeated edits to a nested child", async () => {
    const value = await source("ABC", ["ABC"], true);
    const nested = {
      ...value,
      scopes: [
        { ...value.scopes[0]!, ancestorPath: [] },
        {
          id: "child",
          label: "Synthetic child",
          start: 1,
          end: 2,
          sha256: await sha("B"),
          ancestorPath: [value.scopes[0]!.id],
        },
      ],
    } as FederalCompilerSource;
    const result = await authoredOperations(nested, [
      replace("a", "child", "B", "BB"),
      replace("b", "child", "BB", "BBB"),
      { id: "remove", kind: "remove_source_text" },
    ]);
    expect(result.refusal).toBeNull();
    expect(result.operations.at(-1)?.expectedTextSha256).toBe(
      await sha("ABBBC"),
    );
    expect(result.operations.at(-1)?.dependsOn).toEqual(["a", "b"]);
  });

  it("requires a terminal explicit operation and complete source coverage", async () => {
    const value = await source("ABC", ["ABC"]);
    const removal: AuthoredInput = { id: "remove", kind: "remove_source_text" };
    expect(
      (
        await authoredOperations(value, [
          removal,
          replace("after", "abc", "A", "Z"),
        ])
      ).refusal,
    ).toContain("final amendment");
    expect(
      (
        await authoredOperations(value, [
          removal,
          { id: "again", kind: "remove_source_text" },
        ])
      ).refusal,
    ).toContain("final amendment");
    const partial = {
      ...value,
      coverage: { ...value.coverage, complete: false },
    } as unknown as FederalCompilerSource;
    expect((await authoredOperations(partial, [removal])).refusal).toContain(
      "complete source coverage",
    );
    const result = await authoredOperations(value, [removal]);
    expect(result.refusal).toBeNull();
    expect(result.operations).toEqual([
      {
        ...removal,
        expectedSourceSha256: value.sha256,
        expectedTextSha256: value.sha256,
        dependsOn: [],
      },
    ]);
  });
});
