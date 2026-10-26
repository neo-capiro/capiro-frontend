# Meri scope chooser and composer selectors — Figma 3.4 parity, 25 October 2026

Branch `fable/meri-ui-parity-20261025` from `origin/main` `90702180`. Bounded parity fix found during the Waves 1+2 acceptance pass (Fable); Figma first, then code. No API, contract, schema, authorization or dependency change; navigation still goes through the existing scoped routes and Core re-verifies the selected client.

## Design read

File **Capiro 3.4 — Meri** `IXJzJUkXcUTkySHir5JNea`, page `1064:140864`, read through the Figma MCP on 25 October 2026 (dated read; Figma exposes no immutable version token).

| Node          | Frame                                                                  | Used for                                                                                              |
| ------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `1064:144075` | 01.01 · Home                                                           | Scope row: outline scope trigger + "Your authorized data" pill; composer footer                       |
| `1064:144332` | 01.03 · Choose client and data scope                                   | "Choose a scope" dialog: search, permitted scopes, data scope, preserved-draft notice, Cancel / Use … |
| `12:388`      | v2/Button (Primary · Outline · Ghost; "Chevron = Select trigger look") | Scope trigger and the two new selector triggers                                                       |

## Figma additions (missing components added first)

The live composer carries a skill selector and a model selector that 3.4 did not show. Two `v2/Button` instances (Variant=Outline, Show icon=false, Show chevron=true) named `Action · Skill` ("Skill · None") and `Action · Model` ("Model · Default") were inserted after the scope chip in every desktop/tablet `PromptInputFooter`, and each footer's `Spacer` became `FILL` so the footer keeps its width: Home `1064:144120`, 01.02 `1064:144233`, 01.03 `1064:144326`, 04.02 `1064:146265`, 10.01 dark `1064:148742`, 10.03 tablet `1064:148835`, and the `Next draft · Ready` / `Next draft · Blocked` main components (`3085:36710`, `3085:36731`). New instance ids `3144:40968`–`3144:41059`. Phone-width footers (308–328 px, including the `Meri/AI Elements/PromptInput` state sheet and the Conversation-and-Artifact split views) were left unchanged; they need a phone treatment before the selectors are added there.

## Code

- `features/meri/MeriClientSelector.tsx`: the `<details>` dropdown of links became the 01.03 dialog (`MeriDialog` + shared `ScopeChoice`); the trigger is a `v2/Button` Outline with the chevron; "Use …" is a `Link` to the existing `/meri?scope=general` or `scopedHref` route. Roster states (unverified, loading, failed, empty) keep their copy inside the dialog.
- `features/meri/screens/conversation/ScopeChoice.tsx` (new): the dialog body moved out of the fixture `ScopeScreen` so the fixture and the live route share one implementation; `ScopeScreen` keeps its disabled fixture "Use …" button.
- `features/meri/MeriHome.tsx`: scope row adds the "Your authorized data" pill (existing `.status` rule).
- `features/meri/MeriClientSelector.module.css`: dropdown rules deleted; only the label truncation remains.
- `model-selection/model-selection.module.css`, `ModelSelectionPicker.tsx`, `conversation/SkillSelectionPicker.tsx`, `conversation/ConversationView.tsx`: both composer selectors render as the Outline Select trigger with a trailing chevron and the Figma labels "Skill · None" / "Model · Default" (visible); accessible names "Skill for next message: …" and "Model for next message: …" are unchanged.

## Checks

See the pull request for the exact commands and results (Vitest, ESLint, Prettier, `tsc --noEmit`). No live model turn, build, deployment or browser qualification was run from this branch; the preview edge needs Release.
