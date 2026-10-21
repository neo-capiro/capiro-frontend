import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  verifyDocumentAccessInput,
  checkDocumentAccessInput,
} from "./document-access-public-input.mjs";

test("retained document-access public generated input matches the accepted source commit and the deliberate export", () => {
  const checked = checkDocumentAccessInput();
  assert.equal(checked.records.length, 4);
  assert.equal(
    checked.sourceCommit,
    "8eab537a8c60bf086afb56b2ceb24b79f6260b6b",
  );
});
test("document-access snapshot refuses missing, duplicate, substituted and changed file bytes", () => {
  const bytes = Buffer.from("synthetic"),
    sha256 = createHash("sha256").update(bytes).digest("hex");
  const manifest = {
    schema: "meri-document-access-public-input/1",
    repository: "neo-capiro/meri-greenfield",
    sourceCommit: "a".repeat(40),
    publicExport: "@capiro/meri-contracts/document-access-application",
    files: ["mjs", "d.ts", "schema.json", "metadata.json"].map((extension) => ({
      file: `document-access-application.${extension}`,
      bytes: bytes.length,
      sha256,
    })),
  };
  assert.equal(verifyDocumentAccessInput(manifest, () => bytes).length, 4);
  for (const mutate of [
    (m) => m.files.pop(),
    (m) => {
      m.files[1] = m.files[0];
    },
    (m) => {
      m.files[0].file = "../private-source";
    },
    (m) => {
      m.sourceCommit = "unreviewed";
    },
    (m) => {
      m.publicExport = "@capiro/meri-contracts/other";
    },
  ]) {
    const changed = structuredClone(manifest);
    mutate(changed);
    assert.throws(() => verifyDocumentAccessInput(changed, () => bytes));
  }
  assert.throws(() =>
    verifyDocumentAccessInput(manifest, () => Buffer.from("changed")),
  );
});
