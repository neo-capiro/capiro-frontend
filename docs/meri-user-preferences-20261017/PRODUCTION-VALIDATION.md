# Personal preferences production source validation — 17 October 2026

The parent authorized a narrow checkout repair and one coherent production build after source publication. No application source, shipping pin, runtime configuration, dependency declaration or lock was changed by this validation.

## Exact source and setup

- Published [frontend PR62](https://github.com/neo-capiro/capiro-frontend/pull/62): `9e6d80843b0a46a862f7613b4ab9b08d925d7b17`.
- Local reviewed commit: `056b562694df7bbca4a45aef1221d9a3a12bf057`; matching tree: `678bb9a6ac507abbd091d4fd236bd162d4cfca8b`.
- Backend public artifact remains `9fe0b0857f0284cf460effab34b17fda21c5621d`; no generated supplemental byte changed.
- Read root/app AGENTS, implementation standards, ownership documentation and bundled Next16.4 CLI/output/tracing/root guidance.
- Materialized only tracked `vendor` inputs from existing Git objects: 14 files, 3,371,011 bytes. No package installation, archive generation or remote download.
- Root and app `node_modules` overlays remain task-local directories borrowing dependency directories read-only. Corrected the local `@capiro/ui` link to this checkout's own `packages/ui`; `@capiro/meri-client` already pointed to its own package. Rebuilt only the own client `dist`.
- Before the build, `apps/web/.next` did not exist and was not a junction. All generated build output belongs to this task's checkout. No shared or local build cleanup was performed.

## Commands and actual results

All Node invocations used `C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`, version **24.19.0**.

1. `node scripts/public-packages.mjs`: **exit0**, 11 historical manifest records plus all four supplemental preferences files pass exact provenance/byte checks. This resolves the prior missing `vendor/meri-public-packages.json` setup limitation.
2. `node node_modules/typescript/bin/tsc --project packages/meri-client/tsconfig.json`: **exit0**, producing own compiled client JS/declarations.
3. From `apps/web`, `node ../../node_modules/next/dist/bin/next build --webpack`: **exit0**. Environment: `NEXT_TELEMETRY_DISABLED=1`, `NODE_OPTIONS=--max-old-space-size=8192`. No authentication or feature activation values were introduced.

Next16.4 completed production compilation in **82 seconds**, TypeScript in **56 seconds**, and all **282 page-generation entries** in **8 seconds**. Total command duration was approximately **158 seconds**. The resulting 52-entry app route manifest includes `/api/settings/user/[operation]` and `/settings/[section]`. The full actual output and machine-readable result are retained under [production-evidence](production-evidence/BUILD-RESULT.json).

The published transcript removes terminal trailing spaces/tabs and extra blank lines at EOF, with canonical LF line endings for Git. The untouched raw log remains at `apps/web/.qa/user-preferences-next-build.log`; [EVIDENCE.json](production-evidence/EVIDENCE.json) records its original byte count and SHA256 separately from the normalized published transcript.

The earlier 28 behavior tests, 11 Node controls, five desktop browser interactions, lint, formatting and source review remain the acceptance evidence for the unchanged production source. This build introduced no new source behavior requiring another build or repeated browser execution.

## Resources and explicit limits

Preflight free disk was **2,274,861,056 bytes**; the build-start measurement was **2,271,748,096 bytes**. Free memory was approximately 37.7 GB. While compiling, disk briefly fell below 1 GB; independent shared-host reclamation then increased free space. No task deleted another owner's files. Build completion recorded **5,668,089,856 bytes** free.

The completed `.next` contained **1,258,990,863 bytes** in **1,245 regular files**, plus **two links** excluded from that size traversal. Approximately 1.19 GB was the own disposable compiler cache. No output was copied into an archive or duplicated as a deployment candidate.

The parent explicitly approved supported **Webpack** validation because bundled Next documentation says default Turbopack cannot resolve linked dependencies outside the configured project root. The existing configuration was preserved; default Turbopack is **not qualified** by this run.

Next explicitly warned that **27 Next/styled-jsx traced files** outside `outputFileTracingRoot` were omitted. Windows standalone output also contains absolute `next` and `shiki` links back to the borrowed dependency checkout. Accordingly, the local standalone output is **not a self-contained, relocatable or deployable artifact**. The run establishes production source compilation, framework TypeScript, generation and route discovery. A release-owned build using its complete dependency tree must qualify the shipping artifact.

Dot retains shipping and live acceptance ownership. Native bearer/Core membership against deployed services, settings-table/atomic-audit persistence, approved schema provisioning, runtime binding and live save/readback remain separate integration gates. No AWS, credential, migration or deployment action occurred here.
