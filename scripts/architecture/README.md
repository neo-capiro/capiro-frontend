# Frontend architecture checks

## Implementation outline

This migration preserves the existing guard contracts while allocating Portfolio within the canonical Next application. The outline was recorded before edits: source inspection, dependency policy and graph analysis, and review evidence have distinct owners. The checker parses authored source with the existing TypeScript compiler package; it does not import or execute the application, establish authority, connect to a service, or change persisted state.

| Owner | Responsibility |
| --- | --- |
| `../architecture.mjs` | Source discovery, result composition, canonical entry/public-export checks and CLI exit status |
| `scan.mjs` | AST imports, typed/origin signals, named size findings and exact source fingerprints |
| `dependencies.mjs` | Alias/relative resolution, ownership direction, public entry policy, server adapters and cycles |
| `reviews.mjs` | Validate review/provenance records and classify every size finding |
| `reviewed-size-findings.json` | Explicit, individually reasoned reviews of exact source bodies or files |
| `transfer-baseline.mjs` | Reproduce unchanged transfer provenance from the pinned Git tree |
| `portfolio-transfer-size-baseline.json` | Immutable transfer inventory; it contains no approval decisions |

Review records are data, separate from scanner and graph logic. A module does not gain another runtime responsibility merely to hold review metadata. Semantic responsibility findings still require human/Codex design review even when a size threshold does not fire.

## Dependency rules

The canonical `@/` alias resolves to `apps/web/src`. Static imports, re-exports, literal dynamic imports, type imports and CommonJS import forms all participate in dependency checks. Computed module loading remains forbidden.

- Shared foundations cannot import `features` or `app`, through aliases or relative paths. Features cannot depend on route composition.
- Portfolio domains live under `features/portfolio/<domain>`. Cross-domain consumers use `public.ts` or a deliberate `*-public.ts` entry. Routes may compose feature views.
- Meri and Portfolio cannot import one another's private feature code. Cross-application/package imports must use an explicitly approved public package export.
- Modules and Settings remain unallocated feature implementations. Portfolio is now allocated.
- Cycles, private package paths, repository/runtime imports, unresolved local imports and source symlinks remain rejected.
- The existing Portfolio `any` and fixed remote-origin protection covers Portfolio feature/shared source, the `(portfolio)` route group, `proxy.ts`, and its two server adapters. Localhost and `127.0.0.1` development origins remain valid. Runtime-configured origins are not replaced by constants.

Only these two server adapters are allocated:

| Adapter | Allowed dependencies |
| --- | --- |
| `app/api/backend/[service]/[...path]/route.ts` | Clerk's server auth adapter and the existing Portfolio configuration/proxy owners |
| `app/healthz/route.ts` | None |

They remain at most 80 nonblank lines, using the existing function review threshold as a conservative upper bound for a thin entry adapter. The allowance does not authorize new services, backend business logic or additional endpoints. JavaScript/JSX filename changes do not bypass route discovery.

## Size findings and evidence

Every scanned JavaScript/TypeScript file above 400 nonblank lines and function body above 80 nonblank lines appears in both the readable `signals` list and structured `sizeFindings` result. A function finding includes its file, symbol, line, body line count and SHA-256 of the complete function syntax, including its signature. File findings hash the complete file. CRLF is normalized and exterior whitespace trimmed; body changes invalidate the fingerprint. Stylesheets are discovered for dependency resolution; their size/cohesion review remains a separate check, as in the original guard.

| Classification | Gate behavior | Meaning |
| --- | --- | --- |
| Exact explicit review | Nonblocking | A named reviewer recorded a substantive cohesion decision for these exact bytes |
| Exact unchanged transfer match with no superseded review | Nonblocking, still reported as inherited and unreviewed | New enforcement does not force unrelated legacy cleanup during a mechanical move |
| New or changed, without an exact explicit review | Blocking | Review the changed responsibility or extract a cohesive owner |
| Invalidated explicit review | Blocking, including a reversion to transfer bytes | A stale decision cannot fall back silently to inherited provenance |

The transfer base is `02c02d95bdf3949662b9123f425271c6491ffdab`. Its inventory contains 129 findings: 128 function bodies and one file. The inventory generator reads only that Git tree. It maps old Portfolio paths to their canonical owners and rewrites only the agreed alias module specifiers before computing fingerprints. Arbitrary strings, function behavior and current working files cannot enter the transfer baseline through that generator.

Matching transfer provenance **does not approve cohesion**. The Calendar/Relationships review separately identified mixed responsibilities in transcript intake, meeting preparation and mail composition. The mail rewrite lifecycle was subsequently extracted and the resulting exact owners reviewed. Transcript intake and the meeting preparation findings remain outside the accepted records. The Profile review also excludes the enrichment mutation hook pending separation of projection/receipt effects. The relevant feature owners handle those changes. Review records have exact paths, symbols, fingerprints, a reason, reviewer and date; duplicate or incomplete records fail the checker. A file review cannot approve an oversized function within it.

## Commands and exit status

Run the focused guard tests:

```sh
node --test scripts/architecture.test.mjs
```

Run the current complete authored-source scan:

```sh
node scripts/architecture.mjs
```

The JSON result reports every size signal, its current provenance/review decision, dependency errors, discovered routes and the resolved graph. Exit 0 means no boundary violation and no new/changed unreviewed size finding. Exit 1 means a boundary or review failure. Exit 2 means an argument or setup failure. `--help` describes this contract without discovering application sources.

Reproduce the immutable transfer inventory for comparison:

```sh
node scripts/architecture/transfer-baseline.mjs
```

The generator prints JSON and performs no writes or network requests. Its exit codes are 0 for success and 2 for invalid arguments or an unavailable pinned Git tree. A shallow checkout can run the normal guard using the checked-in inventory; reproducing historical provenance requires the pinned tree locally.

The original guard assertions remain covered: route composition, directed imports, cycles, feature/package/repository boundaries, computed imports, unallocated endpoints, size triggers, emitted `.js` resolution, cross-owner rejection and approved public package imports. The obsolete unavailable-Portfolio fixture now uses Modules. Additional cases exercise the alias, Portfolio public-entry, thin-adapter, origin/type and review/provenance boundaries introduced by the move.
