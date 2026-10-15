# Focused non-Meri Settings and comment closure

Base: `4e1421054df0d32c564f7c9bc75cbd5e5366b428`, tree `b855b9f779ad18332dd19caefc2986310786beca`.
Branch: `fix/non-meri-settings-comment-closure`. Earlier source and accepted 480-case evidence stay unchanged.

## Responsibilities and owned files

- Existing Settings components remain the owners of their typed actions. Add only confirmed receipt/pending fixes to `ProfileSettings.tsx`, `IntegrationSettings.tsx`, and other Settings components if new assertions establish a concrete defect. No operation schema, gateway, credential, provider or backend changes.
- New `settings-mutations.spec.ts` and `settings-mutation-fixtures.ts` cover Contact, Branding, Profiles and Integrations through the existing synthetic browser harness. They do not qualify real writes or providers.
- `TaskDetail.tsx` retains the canonical comment mutation, captured draft, pending and replacement lifetime. Reuse shared `MarkdownTextarea` for the required toolbar, with required/empty handling and field-specific copy. A small `TaskEventText.tsx` owns explicit formatting preview, leaving saved comments and other activity literal by default.
- New `planner-comments-formatting.spec.ts` covers the added controls and their safety/lifetime behavior. No accepted browser inventory or test assertion is removed or weakened.
- Existing `planner-markdown.spec.ts` changes only formerly unscoped Description-toolbar locators: the new Comment toolbar legitimately provides the same command names. Every existing description assertion remains.
- This directory records checks, independent review, owner dependencies and release limits. Exact changed size signals receive responsibility review through the existing architecture mechanism.

## Compatibility and failure ownership

The existing comment request is strictly `{kind: 'comment', text}`. Event responses have no format discriminator. Formatting edits the explicit Markdown source in that same string. Composer preview and user-selected saved-comment preview reuse the canonical safe reader; the default saved display remains literal. No heuristic, hidden marker or new wire field identifies new comments. Interpreting every historical comment as Markdown remains a separate compatibility decision.

Settings requests and responses continue through the canonical transport. A schema-valid response for a different requested profile/account, or a profile status that did not reach the requested state, must not produce success, close a review dialog or navigate to OAuth. New-account OAuth has no preexisting connection ID and receives no invented comparison.

## Verification and excluded work

Run only new focused browser assertions and directly affected existing Markdown/comment cases, relevant typing, changed-file lint/format and architecture checks. Preserve initial failures as evidence. Reuse the readable existing dependency installation; no installs or paid/cloud/provider operations. Synthetic fixtures block outbound requests. No Meri, mobile, deployment or full accepted-suite rerun.

Active Objective operational associations require a backend-owner binding map. Engagement plan/wave/office actions require their approved aggregate and action contracts. Full selected-meeting parity requires the design owner to admit the complete Modules frame. This slice supplies none of those missing decisions.
