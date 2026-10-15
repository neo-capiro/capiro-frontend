# Meri Figma 3.4: AI Elements adoption into `@capiro/ui`

Lane: `packages/ui/**` and `packages/qualification-elements/**` on branch `meri/figma-34-ui` (base `5880f5f0`). Owner: Fable implementation owner. Independent validation by dot/Codex remains separate; this is promotion source and offline provenance verification, not qualification acceptance, browser, visual or release evidence.

## Scope decision

The Figma 3.4 design uses Tool, Artifact, Attachment(s), Confirmation, Plan, Sources, Queue, Checkpoint, Context, FileTree, Inline Citation, Code Block, Terminal, Web Preview and Task. Only elements that compile from the already-installed, already-declared `@capiro/ui` dependencies were adopted. No npm dependency was added, no lockfile was touched and no Tailwind processor was installed. Utility class strings remain upstream source; the application caller styles them.

Upstream pins (fetched from `raw.githubusercontent.com` during this lane; hashes below were computed from the fetched bytes):

- `vercel/ai-elements` commit `bc871264341cf54a7ea1fee36d951688ed2a1ff7` (tag `ai-elements@1.9.0`), paths `packages/elements/src/<name>.tsx` and `packages/shadcn-ui/components/ui/<name>.tsx`.
- `shadcn-ui/ui` commit `2d3f1cd436b18ea12f24130de4df781355925b08`, path `apps/v4/registry/new-york-v4/ui/<name>.tsx`, recorded as the licence/lineage reference (`shadcnCommit`).

The five promoted shadcn components were taken from the `vercel/ai-elements` monorepo copy, exactly as the original seventeen shadcn promotions were. That copy is what the adopted elements import, and it uses the same `@repo/shadcn-ui/...` specifiers as the existing inverse-check regex. The `shadcn-ui/ui` registry copy at the pinned commit differs for four of the five files (it imports `cn` from `"cn"`, reorders class strings and, for badge, adds `ghost`/`link` variants and `data-variant`); only `collapsible.tsx` is byte-identical. Each shadcn addition carries a `shadcnRegistryReference` with the registry copy's bytes/SHA-256/blob SHA-1 and a `byteIdenticalToPromotedUpstream` flag. `progress.tsx` was not promoted because only the deferred `context.tsx` imports it.

## Promoted sources (`provenance.json` `additions`, 16 records)

| Promoted path | Upstream path (vercel/ai-elements @ bc871264) | Upstream bytes | Upstream SHA-256 | Upstream git blob SHA-1 | Promoted bytes | Promoted SHA-256 | Adapted |
|---|---|---|---|---|---|---|---|
| `src/ai-elements/artifact.tsx` | `packages/elements/src/artifact.tsx` | 3404 | `6e5017f85105164b95861b1d10a78c956c312682c5ecd17e2619870ba5993aba` | `4d5fef418484fc71952fc5df4ce8332dd219121e` | 3351 | `248edad66d9ddfc1eb77110a63ed76a32d3694b9f83015f2f973c9b0088be4b1` | no |
| `src/ai-elements/attachments.tsx` | `packages/elements/src/attachments.tsx` | 11417 | `91c42be9a592fe8ff2468352b8636f6bc364567779618ac3a075f1080b378fad` | `cc7b24958a815341dad0d5497fb338ae56a5c83f` | 11600 | `afef2be1e393351e1f81b6f5c3ab2a5d4d9325aec11ce8795ba0c241404322c6` | yes |
| `src/ai-elements/checkpoint.tsx` | `packages/elements/src/checkpoint.tsx` | 1683 | `8649b28c7969c6c58bd9a8643279810c13da332198a4fcbc5b8a75000673eb5b` | `ab7900ce8a3311ce4afb886fc57f044deae371f5` | 1610 | `b381d7331086c257518b3d356ed9c1a1ea0c844d8fe241c56f9fe1175ccf2904` | no |
| `src/ai-elements/confirmation.tsx` | `packages/elements/src/confirmation.tsx` | 3919 | `62aafcb7db41853faaf91b0247b6fce044b7a985e336e21b802e8778e7d1af7a` | `505139f02800e8d3cdaf52d3afdea80b5ca21b14` | 3866 | `5324e7bc00e3ee376c4981a8f3818d6f151ef40bf119e785b435a05191953e31` | no |
| `src/ai-elements/file-tree.tsx` | `packages/elements/src/file-tree.tsx` | 7680 | `9b6946171369d224d5d10df686c3c18ce7608aa4a4792744fc5c313499cec0cb` | `6c1f8441ffebf750061e4911dcdd8762577d92fd` | 7937 | `c762916cd5f0640ad23e1d27745c5a40c0080e49086fb57592d755d71ab0d857` | yes |
| `src/ai-elements/plan.tsx` | `packages/elements/src/plan.tsx` | 3600 | `bfa20e90199fa40e5f714be131798406dc07b23051f8c48c590e91c65ade99d8` | `cce50c74a0222e9fa633bff69e41fdb0baad7f41` | 3790 | `061fbcccbcde4cdff5a57b41315abb1e129602dcf1099c71e03bddc1618d7918` | yes |
| `src/ai-elements/queue.tsx` | `packages/elements/src/queue.tsx` | 6294 | `c823f565e0430749ba0b09db33e76eeb675eea4838bed10245bca392bffd6cfa` | `efe793cb581e92d65c68362909efadd6aada802b` | 6221 | `cd35e4a35ebaf4e0d6d3e5c6abe7236bde4cdc353640553f52f888472f8394ac` | no |
| `src/ai-elements/sources.tsx` | `packages/elements/src/sources.tsx` | 1886 | `1454af3ac2c58766a155a881d119d1f9321632a4922d3f74581ba37f52b4707a` | `8c5d559a3926d40eb0254582a0bee5151e8ba801` | 1853 | `81db9ff918731bff2b6ddc5a90a158edde7d73c4c09d6224fbeb8627551f5c9e` | no |
| `src/ai-elements/task.tsx` | `packages/elements/src/task.tsx` | 2373 | `cc9fb7138ded75f17c37c28a2b23425c98f4d06bead436531ad6e65ae553507e` | `f30d4e3433f404affd632286df9dbc2d72bfef93` | 2340 | `24e55ce774d5c05a7ab9136cb828e5f4653ccdc21d9d903bf6aab2d481d87bf5` | no |
| `src/ai-elements/tool.tsx` | `packages/elements/src/tool.tsx` | 5076 | `5b520e0c33792cba0ceb04e1cb18c69b212cffacdb52d7297e292c7af568dda4` | `9a22010eb5985b20c7256a881451fc252271942e` | 5205 | `1c1b0746e097b103e3c25e6a8fdcff68102abb67007eeee21dc70386c1fc9670` | yes |
| `src/ai-elements/web-preview.tsx` | `packages/elements/src/web-preview.tsx` | 7152 | `7ae44586766db67c5341b36a30340b202e6f45c205457ad98f0817968d162d2c` | `f3ac1c214ef7a3e096cd335749ebb28aec6826b4` | 7059 | `cac455f95a20f030d83142c2af13cca46cc12b507e5f545fe8394ebe6f907df0` | no |
| `src/shadcn/alert.tsx` | `packages/shadcn-ui/components/ui/alert.tsx` | 1628 | `3d1ebed4f4685ee7689db9f05c48389df00ec54b28061b7cea2795cf5189199f` | `cb11ebb330727fa329763073d67398d5cb2a7976` | 1615 | `bea5460b74dd83fc95c481843f6d5a9f31deb62dd86cbf7383f5158d29fa7193` | no |
| `src/shadcn/badge.tsx` | `packages/shadcn-ui/components/ui/badge.tsx` | 1666 | `145cf69448e20e027dd99e8e013507279aaa0922c30f63dabb54b75ab15222aa` | `b02f598b7e019266ef7d38ed3263dbf6e4c60c19` | 1653 | `fd2c161026e28debea5a19da1f2a5d63ccefa0c1d7fe5f0c6b03451d1cc82235` | no |
| `src/shadcn/card.tsx` | `packages/shadcn-ui/components/ui/card.tsx` | 2001 | `1c0537a8fa6adb76a9a275b8c569a744b92fa70fd1edbdca05d3b7234923be1a` | `384b4630161e90b6cf94f2c3ee56bad0bd6784f2` | 1988 | `83e0b1501b765c26c84b0f2b0636c10a95a91b1bf357130ec176af2c128f42df` | no |
| `src/shadcn/collapsible.tsx` | `packages/shadcn-ui/components/ui/collapsible.tsx` | 795 | `c6598e5584f4258b5d9fefadbc5ad6a66888ad58729f4b634a0bb2d9c513188b` | `2f7a4e7fc64a8874373c1584646a63f28cd63c47` | 795 | `c6598e5584f4258b5d9fefadbc5ad6a66888ad58729f4b634a0bb2d9c513188b` | no |
| `src/shadcn/scroll-area.tsx` | `packages/shadcn-ui/components/ui/scroll-area.tsx` | 1653 | `e7d38bb90960e5cd95069bb0ced0177d4284a7d029a65171ac5772b6ab42ff46` | `61634918da7f0d398d9514638921af461f26fddc` | 1640 | `5e4ea1181bf03acd5f2c4338664ea7ce2198ee973ae7db12f125e35736fdba9e` | no |

Import rewrites are limited to quoted module specifiers (`@repo/shadcn-ui/components/ui/x` -> `../shadcn/x` or `./x`, `@repo/shadcn-ui/lib/utils` -> `../lib/utils`), each occurring once per file, so replacing them back reproduces the upstream bytes. The seventeen original `sources` records, `sourceCommit` and `baselinePinsSha256` are byte-for-byte unchanged; new top-level fields are `aiElementsCommit`, `aiElementsTag`, `shadcnCommit`, `additionsScope`, `additions`, `projectAuthoredReplacements` and `deferred`.

Pinned `shadcn-ui/ui` registry copies fetched for reference:

| Registry path (shadcn-ui/ui @ 2d3f1cd4) | Bytes | SHA-256 |
|---|---|---|
| `apps/v4/registry/new-york-v4/ui/badge.tsx` | 1766 | `13a9380dfff853ee730c14a52df49f22aecd31f40f2998d7c1e7ec458b6e1650` |
| `apps/v4/registry/new-york-v4/ui/collapsible.tsx` | 795 | `c6598e5584f4258b5d9fefadbc5ad6a66888ad58729f4b634a0bb2d9c513188b` |
| `apps/v4/registry/new-york-v4/ui/alert.tsx` | 1604 | `d03dcae5cdb63c381c1144ca9a0c49ba0e46466967d7deb94662034042acb034` |
| `apps/v4/registry/new-york-v4/ui/card.tsx` | 1977 | `ef8305b12c3112dab42a4708b41b1ebcc042fa5ab4c20f039da8d45b09ed5059` |
| `apps/v4/registry/new-york-v4/ui/scroll-area.tsx` | 1629 | `8b73bb9be51300079c7f561bafbe43ee10f6f464cf39c8c1b25123cd4edb94dd` |
| `apps/v4/registry/new-york-v4/ui/progress.tsx` | 725 | `e012e1f7e6e66d11229d1233eccf91954edcd9179b418ff1d114dc651b86fd35` |

## Owner adaptations (4 files)

Every adapted file starts with a prominent `// Meri Fable owner adaptation:` notice directly after `"use client";`. The provenance record stores the exact notice text and the exact `from -> to` edits; `sources.mjs` strips the notice, reverses the edits (with exact occurrence counts) and the specifier rewrites, and asserts the result hashes to the recorded upstream SHA-256, byte length and git blob SHA-1. Imports and exports are otherwise preserved.

### `src/ai-elements/attachments.tsx`

Reason: Strict exactOptionalPropertyTypes: omit onRemove from the Attachment context value when undefined instead of explicitly passing undefined.

Recorded edits (inverse-checked by `sources.mjs`):

- `() => ({ data, mediaCategory, onRemove, variant }),` -> `() => ({
      data,
      mediaCategory,
      ...(onRemove === undefined ? {} : { onRemove }),
      variant,
    }),`

### `src/ai-elements/file-tree.tsx`

Reason: Strict exactOptionalPropertyTypes: omit onSelect and selectedPath from the FileTree context value when undefined instead of explicitly passing undefined.

Recorded edits (inverse-checked by `sources.mjs`):

- `() => ({ expandedPaths, onSelect, selectedPath, togglePath }),` -> `() => ({
      expandedPaths,
      ...(onSelect === undefined ? {} : { onSelect }),
      ...(selectedPath === undefined ? {} : { selectedPath }),
      togglePath,
    }),`

### `src/ai-elements/plan.tsx`

Reason: Upstream ./shimmer requires motion, which is not installed; the streaming PlanTitle/PlanDescription branch renders through the project-authored StreamingText marker.

Recorded edits (inverse-checked by `sources.mjs`):

- `import { Shimmer } from "./shimmer";` -> `import { StreamingText } from "../streaming-text";`
- `{isStreaming ? <Shimmer>{children}</Shimmer> : children}` -> `{isStreaming ? <StreamingText>{children}</StreamingText> : children}` (x2)

### `src/ai-elements/tool.tsx`

Reason: Upstream ./code-block requires shiki, which is not a declared @capiro/ui dependency; ToolInput and ToolOutput render through the project-authored plain-text OutputBlock while keeping their props and output/errorText behaviour.

Recorded edits (inverse-checked by `sources.mjs`):

- `import { CodeBlock } from "./code-block";` -> `import { OutputBlock } from "../output-block";`
- `<CodeBlock code={JSON.stringify(input, null, 2)} language="json" />` -> `<OutputBlock text={JSON.stringify(input, null, 2)} />`
- `<CodeBlock code={JSON.stringify(output, null, 2)} language="json" />` -> `<OutputBlock text={JSON.stringify(output, null, 2)} />`
- `<CodeBlock code={output} language="json" />` -> `<OutputBlock text={output} />`

## Project-authored replacements (listed in `PROJECT_UI_SOURCES`)

- `packages/ui/src/output-block.tsx` (`@capiro/ui/output-block`): `OutputBlock` renders `<pre data-slot="tool-output-block">` with the given text. It replaces the shiki-backed upstream `CodeBlock` inside `ToolInput` and `ToolOutput`; `ToolOutput` keeps its `output`/`errorText` props, its null return when both are absent, the object/string/ReactNode branches and the `Error`/`Result` heading. No highlighting, copy control or language selection is provided.
- `packages/ui/src/streaming-text.tsx` (`@capiro/ui/streaming-text`): `StreamingText` renders `<span data-slot="streaming-text" data-streaming="true">` with the given string. It replaces the motion-backed upstream `Shimmer` inside `PlanTitle`/`PlanDescription` while streaming; the application stylesheet owns any animation.

## Deferred: dependency not installed

| Element | Upstream path | Missing dependency |
|---|---|---|
| Code Block | `packages/elements/src/code-block.tsx` (13845 bytes, SHA-256 `5c7285171c5aa741749a1642a85f492a9b5e80dc4ccb704b5c3f58c45efebd04`) | `shiki` (installed only transitively via `streamdown` at 3.23.0; not a declared `@capiro/ui` dependency, and adding it needs the lockfile owner) |
| Shimmer | `packages/elements/src/shimmer.tsx` (2135 bytes, SHA-256 `89d2284ee165aa57fec960e17c6c71078d22ad3fb3798ca683d7e3d850919a46`) | `motion` (`motion/react`) |
| Context | `packages/elements/src/context.tsx` | `tokenlens` (also needs shadcn `progress.tsx`, fetched: 749 bytes, SHA-256 `fc7e2a5570f711d99ac0b5df15b0d1e65b4f18cf6fe4b5ea016f1b781f2db284`) |
| Inline Citation | `packages/elements/src/inline-citation.tsx` | `embla-carousel-react` (through the shadcn `carousel` component) |
| Terminal | `packages/elements/src/terminal.tsx` | `ansi-to-react` |

## Package surface

New `@capiro/ui` exports: `./tool`, `./artifact`, `./attachments`, `./confirmation`, `./plan`, `./sources`, `./queue`, `./checkpoint`, `./file-tree`, `./task`, `./web-preview`, `./badge`, `./collapsible`, `./alert`, `./card`, `./scroll-area`, `./output-block`, `./streaming-text`. `./shimmer` and `./progress` were not added because those files were not promoted. No new package licence is introduced (all additions are Apache-2.0 `vercel/ai-elements` source, with shadcn MIT attribution already retained), so `THIRD-PARTY-NOTICES.md` is unchanged.

Coordination note for the `apps/web` lane: `scripts/architecture/dependencies.mjs` `publicExports` allowlists `@capiro/ui/*` specifiers and does not yet include the new exports; it is outside this lane's owned paths.

## Qualification extension (`packages/qualification-elements`)

- `sources.mjs`: the seventeen-source verification is unchanged in meaning. `verifyAdditions` checks every `additions` record (promoted bytes/hash, bounded count, pinned upstream URL prefix, exact notice, exact inverse edits with occurrence counts, exact inverse specifier rewrites, upstream SHA-256/bytes/git blob SHA-1). The owned-file assertion now equals the seventeen promoted paths plus the recorded additions plus the three inventoried project-authored files. New exports: `adoptedFiles`, `projectUiSources`, `AI_ELEMENTS_COMMIT`, `SHADCN_COMMIT`.
- `qualification.test.mjs`: existing assertions retained; the exports map, project-authored inventory (now three files) and two new tests were added: inverse verification of all sixteen additions with negative controls (wrong upstream hash, dropped edit, dropped record, dropped specifier rewrite, removed notice), and a closed import graph from every adopted root over adopted plus project-authored sources with no deferred dependency.
- `promotion-pins.json` regenerated with `node generate-pins.mjs`; `node generate-pins.mjs --check` passes.

## Checks run

| Check | Result |
|---|---|
| `npx tsc -p packages/ui/tsconfig.json` (strict, `exactOptionalPropertyTypes`) | pass |
| `npm run typecheck --workspace @capiro/ui` | pass |
| `npm run typecheck --workspace @capiro/qualification-elements` (includes `../ui/src/**`) | pass |
| `node generate-pins.mjs` then `node generate-pins.mjs --check` | pass |
| `npm test --workspace @capiro/qualification-elements` | 15 pass, 3 fail; the 3 failures are the pre-existing SSR receipt tests that require `MERI_ELEMENTS_SSR_RECEIPT` / `MERI_ELEMENTS_SSR_RECEIPT_SHA256` ("prepare an exclusive SSR artifact first"); those variables are not available in this environment and fail identically on the untouched base. Not run: real SSR receipt verification. |
| `npm run check:packages` | pass |
| `npm run architecture` | errors 0 (canonical `@capiro/ui` export check passes); exit 1 from `sizeSummary.blocking: 1` on `apps/web/src/shared/shell/Sidebar.tsx` (`changed-since-review`), which is the concurrent `apps/web` lane's in-progress edit; the script scans only `apps/web/src` and `packages/meri-client/src`, so this lane's files do not affect it. |

Not verified here: browser rendering, styling, accessibility, hydration, live SSR receipt, and any product behaviour of the adopted elements. Those remain for the application lane and independent validation.
