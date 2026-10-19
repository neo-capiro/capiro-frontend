import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const expectedFiles = [
  "intents-application.mjs",
  "intents-application.d.ts",
  "intents-application.schema.json",
  "intents-application.metadata.json",
];
const schemaId = "urn:meri:intents-application:0.1.0";
export function verifyIntentsInput(manifest, readInput) {
  if (
    !manifest ||
    manifest.schema !== "meri-intents-public-input/1" ||
    manifest.repository !== "neo-capiro/meri-greenfield" ||
    !/^[a-f0-9]{40}$/.test(manifest.sourceCommit) ||
    manifest.publicExport !== "@capiro/meri-contracts/intents-application" ||
    !Array.isArray(manifest.files) ||
    manifest.files.length !== expectedFiles.length
  )
    throw Error("Invalid intents public input provenance");
  const seen = new Set();
  return manifest.files.map((record) => {
    if (
      !record ||
      !expectedFiles.includes(record.file) ||
      seen.has(record.file) ||
      !Number.isSafeInteger(record.bytes) ||
      record.bytes < 1 ||
      !/^[a-f0-9]{64}$/.test(record.sha256)
    )
      throw Error("Invalid intents public file binding");
    seen.add(record.file);
    const bytes = readInput(record.file);
    if (
      bytes.length !== record.bytes ||
      createHash("sha256").update(bytes).digest("hex") !== record.sha256
    )
      throw Error("Intents public input drift: " + record.file);
    return { file: record.file, bytes: bytes.length, sha256: record.sha256 };
  });
}
export function checkIntentsInput() {
  const root = new URL("../packages/meri-client/", import.meta.url),
    directory = new URL("vendor/intents-application/0.1.0/", root);
  const manifest = JSON.parse(
    readFileSync(new URL("provenance.json", directory), "utf8"),
  );
  const records = verifyIntentsInput(manifest, (name) =>
    readFileSync(new URL(name, directory)),
  );
  const client = JSON.parse(
    readFileSync(new URL("package.json", root), "utf8"),
  );
  const entry = client.exports?.["./intents"],
    prefix = "./vendor/intents-application/0.1.0/";
  if (
    entry?.types !== prefix + "intents-application.d.ts" ||
    entry?.default !== prefix + "intents-application.mjs" ||
    !client.files.includes(prefix.slice(2, -1))
  )
    throw Error("Intents public export drift");
  // The generated metadata and schema name the same exact contract the export promises.
  const metadata = JSON.parse(
    readFileSync(
      new URL("intents-application.metadata.json", directory),
      "utf8",
    ),
  );
  const schema = JSON.parse(
    readFileSync(new URL("intents-application.schema.json", directory), "utf8"),
  );
  if (
    metadata.schemaId !== schemaId ||
    schema.$id !== schemaId ||
    metadata.contractVersion !== "0.1.0" ||
    metadata.routes?.list?.path !== "/api/conversations/intents/list" ||
    metadata.routes?.decide?.path !== "/api/conversations/intents/decide"
  )
    throw Error("Intents public contract identity drift");
  if (
    !/^\/\/ Generated self-contained browser receiving boundary/.test(
      readFileSync(new URL("intents-application.mjs", directory), "utf8"),
    )
  )
    throw Error(
      "Intents public receiver is not the generated self-contained boundary",
    );
  return { sourceCommit: manifest.sourceCommit, records };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv.length === 3 && process.argv[2] === "--help")
    console.log(
      "Usage: node scripts/intents-public-input.mjs [--help]\nVerify immutable public receiver bytes/provenance/export; no install/network. Exit0 success/help; exit1 invalid arguments/setup/drift.",
    );
  else if (process.argv.length !== 2) {
    console.error("Invalid arguments");
    process.exitCode = 1;
  } else
    try {
      console.log(JSON.stringify(checkIntentsInput()));
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
}
