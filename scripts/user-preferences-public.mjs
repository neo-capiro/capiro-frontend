import { checkInstalledPublicExport } from "./installed-public-export.mjs";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const names = ["d.ts", "metadata.json", "mjs", "schema.json"].map(
  (extension) => `user-preferences-application.${extension}`,
);
const directory = new URL(
  "../packages/meri-client/vendor/user-preferences-application/0.1.0/",
  import.meta.url,
);

/** Byte/provenance binding only; source review and runtime qualification remain separate. */
export function verifyUserPreferencesInput(
  manifest,
  readArtifact,
  packageInfo,
) {
  if (
    manifest?.schema !== "meri-user-preferences-public-input/1" ||
    manifest.repository !== "neo-capiro/meri-greenfield" ||
    manifest.publicExport !==
      "@capiro/meri-contracts/user-preferences-application" ||
    typeof manifest.sourceCommit !== "string" ||
    !/^[a-f0-9]{40}$/.test(manifest.sourceCommit) ||
    !Array.isArray(manifest.files) ||
    manifest.files.length !== names.length
  )
    throw Error("Invalid user preferences provenance");
  const seen = new Set();
  const records = manifest.files.map((record) => {
    if (
      !record ||
      typeof record !== "object" ||
      typeof record.file !== "string" ||
      !names.includes(record.file) ||
      seen.has(record.file) ||
      !Number.isSafeInteger(record.bytes) ||
      record.bytes < 1 ||
      typeof record.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(record.sha256)
    )
      throw Error("Invalid user preferences artifact binding");
    seen.add(record.file);
    return { file: record.file, bytes: record.bytes, sha256: record.sha256 };
  });
  for (const record of records) {
    const raw = readArtifact(record.file);
    if (
      raw.length !== record.bytes ||
      createHash("sha256").update(raw).digest("hex") !== record.sha256
    )
      throw Error(`User preferences public artifact drift: ${record.file}`);
  }
  const base =
    "./vendor/user-preferences-application/0.1.0/user-preferences-application";
  if (
    packageInfo.exports?.["./user-preferences"]?.types !== `${base}.d.ts` ||
    packageInfo.exports?.["./user-preferences"]?.default !== `${base}.mjs` ||
    !packageInfo.files?.includes("vendor/user-preferences-application/0.1.0")
  )
    throw Error("User preferences public export drift");
  return { sourceCommit: manifest.sourceCommit, files: manifest.files.length };
}

export function checkUserPreferencesPublic() {
  const manifest = JSON.parse(
    readFileSync(new URL("provenance.json", directory), "utf8"),
  );
  // Historical bytes keep their historical export contract; the active SDK uses the package.
  const base =
    "./vendor/user-preferences-application/0.1.0/user-preferences-application";
  const historical = verifyUserPreferencesInput(
    manifest,
    (name) => readFileSync(new URL(name, directory)),
    {
      exports: {
        "./user-preferences": { types: `${base}.d.ts`, default: `${base}.mjs` },
      },
      files: ["vendor/user-preferences-application/0.1.0"],
    },
  );
  return {
    ...historical,
    active: checkInstalledPublicExport(
      "user-preferences",
      "user-preferences-application",
    ),
  };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const usage =
    "Usage: node scripts/user-preferences-public.mjs [--help]\nExit0: verified/help; exit1: invalid arguments, missing provenance or artifact drift. No network or install.";
  try {
    if (process.argv.length === 3 && process.argv[2] === "--help")
      console.log(usage);
    else if (process.argv.length !== 2) throw Error(usage);
    else console.log(JSON.stringify(checkUserPreferencesPublic()));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
