/**
 * The one place this app binds to the canonical uploads wire family.
 *
 * `@capiro/meri-contracts/uploads-application` is the published public export of the
 * uploads-application contract (routes initiate/complete/status/inspect/read/remove). The tarball
 * vendored in this checkout predates that export, so this module resolves only once the parent
 * binds the frozen package. Every upload consumer imports the contract from here; nothing reaches
 * into the producer's runtime source and no request, receipt or validator is re-declared locally.
 */
export * from "@capiro/meri-contracts/uploads-application";
