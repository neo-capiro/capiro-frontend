import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

/** Active SDK exports use the installed public package; archived snapshots stay historical. */
export function assertPublicReexport(
  client,
  name,
  publicName,
  source,
  runtime,
  types,
) {
  const statement = `export * from "@capiro/meri-contracts/${publicName}";`;
  const entry = client.exports?.[`./${name}`];
  const statements = (value) =>
    value
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith("//"))
      .join("\n")
      .trim();
  if (
    entry?.default !== `./dist/${name}.js` ||
    entry?.types !== `./dist/${name}.d.ts` ||
    !client.files?.includes("dist") ||
    [source, runtime, types].some((value) => statements(value) !== statement)
  )
    throw Error("Canonical public re-export drift: " + name);
}

export function checkInstalledPublicExport(name, publicName) {
  const sdk = new URL("../packages/meri-client/", import.meta.url);
  const client = JSON.parse(readFileSync(new URL("package.json", sdk), "utf8"));
  assertPublicReexport(
    client,
    name,
    publicName,
    readFileSync(new URL(`src/${name}.ts`, sdk), "utf8"),
    readFileSync(new URL(`dist/${name}.js`, sdk), "utf8"),
    readFileSync(new URL(`dist/${name}.d.ts`, sdk), "utf8"),
  );
  const publicExport = `@capiro/meri-contracts/${publicName}`;
  const resolve = createRequire(new URL("package.json", sdk)).resolve;
  const entry = resolve(publicExport);
  if (
    entry !==
    createRequire(new URL("../apps/web/package.json", import.meta.url)).resolve(
      publicExport,
    )
  )
    throw Error("Web and SDK public package resolution differ");
  const directory = dirname(entry),
    packageInfo = JSON.parse(
      readFileSync(join(directory, "../package.json"), "utf8"),
    );
  const expected = `./dist/${publicName}`;
  if (
    packageInfo.name !== "@capiro/meri-contracts" ||
    packageInfo.version !== client.peerDependencies[packageInfo.name] ||
    packageInfo.exports?.[`./${publicName}`]?.default !== `${expected}.mjs` ||
    packageInfo.exports?.[`./${publicName}`]?.types !== `${expected}.d.ts` ||
    resolve(`${publicExport}/schema`) !==
      join(directory, `${publicName}.schema.json`)
  )
    throw Error("Installed canonical public package export drift");
  const records = ["mjs", "d.ts", "schema.json", "metadata.json"].map(
    (extension) => {
      const file = `${publicName}.${extension}`,
        bytes = readFileSync(join(directory, file));
      return {
        file,
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      };
    },
  );
  const schema = JSON.parse(
    readFileSync(join(directory, `${publicName}.schema.json`), "utf8"),
  );
  const metadata = JSON.parse(
    readFileSync(join(directory, `${publicName}.metadata.json`), "utf8"),
  );
  const contractVersion =
    publicName === "document-access-application" ? "0.2.0" : "0.1.0";
  if (
    metadata.schemaId !== schema.$id ||
    metadata.schemaId !== `urn:meri:${publicName}:${contractVersion}` ||
    metadata.contractVersion !== contractVersion ||
    !/^\/\/ Generated self-contained browser (?:receiving boundary|receiver)\./.test(
      readFileSync(entry, "utf8"),
    )
  )
    throw Error("Installed canonical receiving boundary identity drift");
  return {
    publicExport,
    packageVersion: packageInfo.version,
    contractVersion,
    records,
  };
}
