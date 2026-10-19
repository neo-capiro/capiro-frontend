import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  verifyIntentsInput,
  checkIntentsInput,
} from "./intents-public-input.mjs";

test("retained intents public generated input matches the accepted source commit and the deliberate export", () => {
  const checked = checkIntentsInput();
  assert.equal(checked.records.length, 4);
  assert.equal(
    checked.sourceCommit,
    "5ee2fd6e979dff1c2b111bd964c91aadab8357a5",
  );
});
test("intents snapshot refuses missing, duplicate, substituted and changed file bytes", () => {
  const bytes = Buffer.from("synthetic"),
    sha256 = createHash("sha256").update(bytes).digest("hex");
  const manifest = {
    schema: "meri-intents-public-input/1",
    repository: "neo-capiro/meri-greenfield",
    sourceCommit: "a".repeat(40),
    publicExport: "@capiro/meri-contracts/intents-application",
    files: ["mjs", "d.ts", "schema.json", "metadata.json"].map((extension) => ({
      file: `intents-application.${extension}`,
      bytes: bytes.length,
      sha256,
    })),
  };
  assert.equal(verifyIntentsInput(manifest, () => bytes).length, 4);
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
    assert.throws(() => verifyIntentsInput(changed, () => bytes));
  }
  assert.throws(() =>
    verifyIntentsInput(manifest, () => Buffer.from("changed")),
  );
});
