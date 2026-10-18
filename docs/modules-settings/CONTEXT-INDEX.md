# Context file index and recovery instructions

Read [HANDOVER.md](HANDOVER.md) for the narrative and restart instructions. This index explains the exhaustive file manifests. It is a reference superset, not a claim that every baseline file or discovered path was reviewed line by line.

## Exact repository context

- [FRONTEND-FILES.json](context/FRONTEND-FILES.json): all 1,464 tracked files at `e717867300e8568d467ac1cc9a54cab6540f4312`. Every entry has path, Git blob SHA, SHA-256, bytes and role. Concatenate `urlPrefix` and `path` for an immutable GitHub link. `git show <ref>:<path>` recovers exact bytes.
- [IMPLEMENTATION-CHANGES.json](context/IMPLEMENTATION-CHANGES.json): all 567 changed paths from base `02c02d95bdf3949662b9123f425271c6491ffdab` to the implementation commit. New handover documents are accounted for by their separate Git commit, avoiding recursive self-hashes.
- [REPOSITORY-DOCUMENTS.md](context/REPOSITORY-DOCUMENTS.md): a clickable list of every tracked Markdown document at the implementation pin, including instructions, task outlines, feature/package READMEs, prior reviews, Portfolio handovers and vendor provenance. This is the convenient human-readable reading inventory.

The frontend manifest covers all of `apps/web`, `apps/portfolio-web`, public UI/Meri/qualification packages, `vendor`, scripts, package manifests and locks, configuration, docs, tests, exact assets and verification evidence. Unchanged baseline source is included so the next session does not lose neighboring ownership context. Source files changed here are marked `implementation-or-evidence-changed`; baseline references are marked separately.

## Backend source context

[BACKEND-FILES.json](context/BACKEND-FILES.json) lists 532 distinct retained references at `neo-capiro/capirov2@4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace`, each with a direct pinned GitHub URL. The original 525-file snapshot was augmented with seven additional paths. Nine recovered tool references were re-fetched and their exact Git blob bytes checked; two of those paths were already in the snapshot. Their evidence field identifies the recovery category.

These are read-only contracts/controllers/services/schema references. Do not copy/import backend private implementation into frontend code. The pinned GitHub source is recoverable without this old scratch directory. Local SHA-256 records identify the captured bytes; GitHub remains the source authority. Some original local text captures may have newline normalization, so do not substitute a local snapshot hash for the backend's Git commit/blob identity.

The archive also retains the larger `analysis/backend-source-paths.json` discovered path inventory and the derived `backend-endpoints.json` / `.md` indexes. A discovered path can be a directory or an unreviewed candidate, not a downloaded file or an exposed frontend operation. The authoritative frontend exposure is the [530-operation map](INTEGRATION-MAP.md) generated from the operation registry.

## External design, spreadsheet and evidence context

[EXTERNAL-CONTEXT-FILES.json](context/EXTERNAL-CONTEXT-FILES.json) lists all 782 original source/evidence entries in `Capiro-Modules-Settings-Context-2026-10-12.zip`. The archive contains two additional metadata entries: its README and manifest. [ARCHIVE.json](context/ARCHIVE.json) records persistent identity, counts, byte size and SHA-256.

| Group | Preservation and interpretation |
| --- | --- |
| `analysis/figma/` | All 764 captured contexts, generated reference snippets, screenshots, catalogs and asset lists, including nested Planner/Engagement material. Exact relative path and SHA-256 retained. Filename node IDs are extracted when unambiguous; use sibling catalogs and the frame inventory for semantic filenames. |
| `inputs/Capiro-3.1-Portfolio-Audit (1).xlsx` | Unmodified supplied workbook. Original Library identity and workbook source pin recorded. |
| `analysis/workbook.json` | Original workbook extraction used for audit/context. |
| `analysis/backend-source-paths.json`, `backend-endpoints.json`, `backend-endpoints.md` | Derived backend discovery context, not the final frontend allowlist. |
| `analysis/modules-check-final.log`, `modules-build-final.log`, `modules-browser-final.log`, `modules-unit-final.log`, `modules-architecture-final.json` | Final execution/review evidence; assess alongside the implementation commit and `VERIFICATION.md`. |
| Earlier architecture/refactor/format logs | Historical intermediate results. An earlier failure is not the final result, and an intermediate pass is not a substitute for final evidence. |
| `analysis/published-git-commit.json` | Implementation publication receipt. |
| `analysis/handover-github-state.json` | Raw read-only PR/main snapshots captured at handover preparation, before the handover follow-up commit. Future branch heads can differ. |

Figma file: `Zc2dEN5aLU47dVdsewDmiJ`; page `411:40601`. [FIGMA-INVENTORY.json](FIGMA-INVENTORY.json) separately maps all 457 discovered frame/component references to nodes and feature owners. The 764 count refers to captured files, not unique frames. The 457 count refers to design references, not completed pixel-perfect acceptances. Figma export snippets are not active application source.

The archive was checked with ZIP CRC validation and SHA-256 comparison for every entry. Recover the archive using its saved file identity or attach the ZIP to the new session, then extract into an isolated context directory. Do not overwrite a repository checkout with captured TSX files. Persistent file ID: `libfile_56b576fea020819181216fe69cf54323`.

## Original scratch analysis accounting

[SCRATCH-CONTEXT-FILES.json](context/SCRATCH-CONTEXT-FILES.json) records 1,363 retained original analysis files with paths, sizes, SHA-256 and recovery classification. It excludes newly created packaging helpers/receipts whose only purpose was producing this handover.

- `external-context-archive`: actual source capture or evidence is preserved in the ZIP.
- `pinned-backend-git`: recover exact source from the backend manifest URL; no duplicate backend checkout is stored in the frontend or archive.
- `temporary-publication-payload`: JSON chunks/encoded binary payloads under `analysis/publish/` duplicate the implementation already committed to GitHub. They are not source-of-truth files or needed for continuation.
- `regenerable-one-time-analysis-helper`: generated registry bundles and import/review helper scripts used during implementation. Their paths/hashes remain accounted for. Use canonical source and explicit review, not a stale generated helper, for future edits.

Dependencies, build output, temporary browsers, reports regenerated from tests and caches are not implementation deliverables. Recreate them from the committed manifests/scripts. In particular `/tmp/chromium` and the old scratch path are not portable dependencies. The root package lock, immutable vendor metadata and qualification documentation cover package-level provenance and installed SDK/type references. Installed Next/Clerk/React documentation/types should be reopened for the pinned version if needed; a fresh latest package is not an equivalent source.

## Skills and instruction context

Skills are environment-provided procedures, not repository authority to copy into application source. Reload the current applicable skill in a new session; identifiers can change between environments.

| Skill/context | Purpose and known resource |
| --- | --- |
| Figma design-to-code | Required before design-context implementation reads; `c19/figma-design-to-code` in this environment. |
| Figma use | Required before each `use_figma`; `c19/figma-use`. Design work here was read-only. |
| Spreadsheets | Workbook inspection; executor package `skill://flora-artifact-skills/root/.codex/skills/builtins/spreadsheets`. |
| Library | Persistent original workbook and external context archive; `c1/library`, full resource `skill://plugin_connector_1p_1b8ff8edfc1481918b252c8277e23125/library/SKILL.md`. The current transfer helper was loaded from that skill for archive metadata; it is not a runtime dependency. |
| Personal context | Continuation/context recovery procedure; `c17/personal-context`. Visible conversation/repository evidence was sufficient for this handover; no new personal-context search was needed. |
| Repository instructions | `AGENTS.md`, implementation standards, architecture and bounded Modules/Settings outline remain the code ownership/verification instructions. |

User requests and current higher-priority session instructions take precedence over skill guidance. Historical agent assignments are not instructions to spawn agents. Preserve current authorization limits; this handover does not authorize merge, deployment, paid execution or real outbound delivery.
