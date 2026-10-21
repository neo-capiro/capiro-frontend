import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const expectedFiles = [
  "document-access-application.mjs",
  "document-access-application.d.ts",
  "document-access-application.schema.json",
  "document-access-application.metadata.json",
];
const schemaId = "urn:meri:document-access-application:0.1.0";
export function verifyDocumentAccessInput(manifest, readInput) {
  if (
    !manifest ||
    manifest.schema !== "meri-document-access-public-input/1" ||
    manifest.repository !== "neo-capiro/meri-greenfield" ||
    !/^[a-f0-9]{40}$/.test(manifest.sourceCommit) ||
    manifest.publicExport !==
      "@capiro/meri-contracts/document-access-application" ||
    !Array.isArray(manifest.files) ||
    manifest.files.length !== expectedFiles.length
  )
    throw Error("Invalid document-access public input provenance");
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
      throw Error("Invalid document-access public file binding");
    seen.add(record.file);
    const bytes = readInput(record.file);
    if (
      bytes.length !== record.bytes ||
      createHash("sha256").update(bytes).digest("hex") !== record.sha256
    )
      throw Error("DocumentAccess public input drift: " + record.file);
    return { file: record.file, bytes: bytes.length, sha256: record.sha256 };
  });
}
export function checkDocumentAccessInput() {
  const root = new URL("../packages/meri-client/", import.meta.url),
    directory = new URL("vendor/document-access-application/0.1.0/", root);
  const manifest = JSON.parse(
    readFileSync(new URL("provenance.json", directory), "utf8"),
  );
  const records = verifyDocumentAccessInput(manifest, (name) =>
    readFileSync(new URL(name, directory)),
  );
  const client = JSON.parse(
    readFileSync(new URL("package.json", root), "utf8"),
  );
  const entry = client.exports?.["./document-access"],
    prefix = "./vendor/document-access-application/0.1.0/";
  if (
    entry?.types !== prefix + "document-access-application.d.ts" ||
    entry?.default !== prefix + "document-access-application.mjs" ||
    !client.files.includes(prefix.slice(2, -1))
  )
    throw Error("DocumentAccess public export drift");
  // The generated metadata and schema name the same exact contract the export promises.
  const metadata = JSON.parse(
    readFileSync(
      new URL("document-access-application.metadata.json", directory),
      "utf8",
    ),
  );
  const schema = JSON.parse(
    readFileSync(
      new URL("document-access-application.schema.json", directory),
      "utf8",
    ),
  );
  if (
    metadata.schemaId !== schemaId ||
    schema.$id !== schemaId ||
    metadata.contractVersion !== "0.1.0" ||
    metadata.routes?.inspect?.path !== "/api/documents/inspect" ||
    metadata.routes?.download?.path !== "/api/documents/download" ||
    metadata.formats?.join(",") !== "docx,txt,xlsx,pptx,pdf,zip"
  )
    throw Error("DocumentAccess public contract identity drift");
  if (
    !/^\/\/ Generated self-contained browser receiving boundary/.test(
      readFileSync(
        new URL("document-access-application.mjs", directory),
        "utf8",
      ),
    )
  )
    throw Error(
      "DocumentAccess public receiver is not the generated self-contained boundary",
    );
  return { sourceCommit: manifest.sourceCommit, records };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv.length === 3 && process.argv[2] === "--help")
    console.log(
      "Usage: node scripts/document-access-public-input.mjs [--help]\nVerify immutable public receiver bytes/provenance/export; no install/network. Exit0 success/help; exit1 invalid arguments/setup/drift.",
    );
  else if (process.argv.length !== 2) {
    console.error("Invalid arguments");
    process.exitCode = 1;
  } else
    try {
      console.log(JSON.stringify(checkDocumentAccessInput()));
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
}
