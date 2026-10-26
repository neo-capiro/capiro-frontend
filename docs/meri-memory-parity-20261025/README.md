# Meri personal memory — Figma 3.4 parity, 25 October 2026

Branch `fable/meri-memory-parity-20261025` from `origin/main` `90702180`. Third bounded parity fix from the Waves 1+2 acceptance pass (Fable); Figma first, then code. No API, contract, schema, authorization or dependency change: the page still reads `GET /api/memory/owner/items` and submits corrections through `useOwnerCorrection`; the owner decision inbox (`MemoryOwnerInbox`) is unchanged.

## Design read

File **Capiro 3.4 — Meri** `IXJzJUkXcUTkySHir5JNea`, page `1064:140864`, Figma MCP read on 25 October 2026 (dated read; no immutable version token).

| Node          | Frame                               | Used for                                                                                                                                                                         |
| ------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `1064:147042` | 05.04 · Institutional Memory recall | Heading + count line, search field, scope chip, Current memory / History toggles, memory cards (title · provenance · fact · Current pill · View evidence · Propose a correction) |
| `1064:147204` | 05.06 · Memory update proposal      | Correction wording                                                                                                                                                               |
| `12:388`      | v2/Button                           | Card actions and toggles                                                                                                                                                         |

No Figma addition was needed: every tested element already exists in 05.04. The live route adds nothing the design lacks; controls without a connected contract (client scope, History) render disabled with their reason, as the design-fixture pattern already does.

## Code

- `memory-review/MemoryCorrectionComposer.tsx`: the raw-key list became the 05.04 recall view — `MeriPageHeading` "Institutional Memory" with the record count, `Search memory`, disabled "Personal" scope chip and "History" toggle, `MemoryCard`s for each current item, `MemorySearchEmpty` for a zero-result search, "Load more", and the existing correction form for the selected card. `memoryTitle()` shows the readable slug of Core's canonical key (`user:<id>:monday-client-board-mapping` → "Monday client board mapping"); the owner id is never a title.
- `screens/memory/MemoryCard.tsx`: `correction.onSelect` renders the "Propose a correction" action as a live button (the fixture `href` path is unchanged).
- `app/meri/memory/page.tsx`: recall (05.04) first, pending owner decisions second; `designTarget` points at 05.04.
- `memory-review/useOwnerCorrection.ts`: the re-read that follows a confirmed correction no longer wipes the "Correction submitted for review" receipt (the effect cleared feedback on every revision, so the receipt never stayed visible; `meri-memory-owner-review.spec.ts` fails 1/3 on `origin/main` for that reason). Manual refresh still starts clean.
- Documented deviation: the correction form stays an inline card under the selected memory (05.06 is a separate proposal screen); moving it there would need its own route.

## Checks

See the pull request for commands and results.
