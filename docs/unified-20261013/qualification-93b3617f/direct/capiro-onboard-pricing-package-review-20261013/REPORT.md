# Onboard pricing public-package review

**Accept an exact server-only projection; do not import this package root into the browser for two strings.** Root's selected owner is `shared/capiro/onboard-pricing.server.ts`, importing only `PRICE_LOCK_COPY` and `PRICE_CHANGE_COPY` and serializing those presentation values through OnboardEntry → OnboardHost → feature config. No copied pricing constants, private subpath imports or immutable package edits are needed.

## Exact artifact and public exports

Reviewed installed `@capiro/shared@0.0.0` under `/workspace/capiro-newsletter-port/node_modules/@capiro/shared`, against `vendor/capiro-shared-0.0.0-38fec5c8.tgz`: **532,178 bytes**, SHA256 **3e435f280fac8fd301eb753e9fc7ead93691cf979fc1641792fedd88e1bfd6d5**. Source pin `38fec5c83585850ed75a7d3693b3b90d517e70af`; distribution pin `9ffab390ef444d7ea0bf4eb0d68224f810245e25`. All **187 regular archive entries** have safe paths and match their installed bytes. SHA512 also matches the existing immutable provenance. The unrevised version `0.0.0` alone is not an adequate pin. See [provenance.json](provenance.json).

Root `exports["."]` deliberately publishes `dist/index.js` for require/import/default with `dist/index.d.ts` types. Both requested strings are actual public literals (`src/index.ts:665,671`; emitted `dist/index.js:676,681`), with matching literal declarations. There is no public pricing subpath in this artifact. [Pricing excerpts](pricing-excerpts.txt) preserve producer copy; this review does not certify current billing policy or whether every subscriber qualifies for the promotion.

## Static import closure and effects

The root closes over **25 CommonJS JS modules, 387,706 source bytes**; `dist/index.js` itself is253,411 bytes. [closure.json](closure.json) records every module/hash, local edge, top-level call and source parse result. Every require target is a literal relative packed module; there are **zero external imports, zero computed imports and zero parse errors**. No Node builtin, SDK/provider, filesystem, network, socket, credential/environment reader or agent-loop implementation is imported. Top-level work comprises export binding, constant/registry construction, array/object transformations, regexes, sets and maps. The packed `time.sleep` helper contains a timer inside its function body; importing the module does not invoke it. The reviewed initialization is source-safe for a server import and contains no provider/native effect.

The closure nevertheless includes unrelated legacy Meri prompt strings, capability/tool registries, citation/document/read normalization and schedule helpers. These are data/pure helpers, not an activated legacy agent, but a narrow frontend re-export does not prevent their inclusion in this CommonJS graph.

## Measured browser cost

A temporary static Vite8.3.4 ES library bundle whose only exports are the two pricing constants produced **251,757 minified bytes /75,872 gzip bytes**, retaining all25 package modules. Output has no external or dynamic imports. [bundle-receipt.json](bundle-receipt.json) records exact module IDs, timing and output SHA256 **50ca62510d5cf48b3acbfbd9a14d38f383a705cc56be9db36b21ec6226ebde12**. The bundle was generated only for inspection, never imported/evaluated; this was not an application build or browser/server run. It demonstrates the CommonJS breadth, not the final Next chunk size.

## Adoption guardrails and remaining proof

- Restrict `@capiro/shared` root imports to the one canonical `.server.ts` owner and its two named symbols; do not add a blanket public-root allow. Explicitly mark the owner server-only so an accidental client dependency fails. Avoid wildcard or namespace exports that expose the broader package.
- Resolve the two producer-owned literals on the server and pass only strings into client feature config. A filename alone is not sufficient isolation: preserve a server-component call path and keep client files from importing the owner.
- Root's final Next build must confirm that client chunks exclude this root closure/legacy registries and that the server-to-client values remain intact. This proof remains **unrun**. An upstream dedicated pricing public export would be a future lean alternative; do not invent or patch one inside this immutable artifact.
- Existing Newsletter subpath authorization and its exact artifact provenance remain unchanged. Server import of pricing copy confers no billing, session, approval or provider authority.

No repository/dependency file was edited, no package was installed, and no application runtime/browser/server was started. Inspection output is confined to this small `/tmp` packet; the temporary borrowed node_modules link was removed after bundling. This review approves the server-only source boundary with the stated final build obligation, not broad browser-root adoption.
