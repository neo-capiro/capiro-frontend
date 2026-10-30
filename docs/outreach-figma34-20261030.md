# Outreach v3.4 implementation and verification

## Scope and design references

The Engagement module opens the current Outreach list and preserves the existing shared Modules shell. List actions open reload-stable decision, recorded-status, or simple-draft views through `detail=overview`. Existing `draft` and `session` links without that parameter retain the canonical workflow owner. Saving an ordinary draft does not generate or send mail; opening its campaign is an explicit continuation.

The companion Core contract is [backend PR #309](https://github.com/neo-capiro/capiro-backend/pull/309), reviewed at `31ced606`. The frontend depends on its paged record/campaign queries, structured decisions, and truthful delivery summaries.

The design source is the current [Figma v3.4 Outreach section](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE?node-id=3077-107261), not the superseded 1064:191976 frame. High-fidelity design context and screenshots were inspected before implementation. Existing Geist, shell assets, and shared controls are reused. Outreach-scoped styling supplies the 32px main inset, 24px card padding and gaps, 47px fields, 36px actions, and responsive wrapping.

| Surface                         | Figma node                                                                             | Frontend owner        |
| ------------------------------- | -------------------------------------------------------------------------------------- | --------------------- |
| Campaign list                   | [3078:107383](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE?node-id=3078-107383) | `OutreachList`        |
| Campaign decisions              | [3078:113482](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE?node-id=3078-113482) | `CampaignOverview`    |
| New/simple draft                | [3078:114235](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE?node-id=3078-114235) | `OutreachDraft`       |
| Sent record                     | [3078:113692](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE?node-id=3078-113692) | `CampaignOverview`    |
| Attention record                | [3078:114069](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE?node-id=3078-114069) | `CampaignOverview`    |
| Decision-to-workflow transition | [3206:125584](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE?node-id=3206-125584) | `CampaignOverview`    |
| Direction                       | [3201:123649](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE?node-id=3201-123649) | `CampaignDirection`   |
| Campaign setup                  | [3201:123938](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE?node-id=3201-123938) | `CampaignSetup`       |
| Recipients                      | [3201:124233](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE?node-id=3201-124233) | `CampaignRecipients`  |
| Context plan                    | [3203:124284](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE?node-id=3203-124284) | `CampaignContextPlan` |
| Context builder                 | [3203:124539](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE?node-id=3203-124539) | `CampaignContext`     |
| Generate and review             | [3203:124988](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE?node-id=3203-124988) | `CampaignDrafts`      |
| Send review                     | [3203:125389](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE?node-id=3203-125389) | `CampaignSend`        |
| Send confirmation               | [3203:125714](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE?node-id=3203-125714) | `CampaignSend`        |
| Unknown delivery                | [3203:125991](https://www.figma.com/design/zGvvF6V6hh7yweoplCdpdE?node-id=3203-125991) | `CampaignSend`        |

## Authority and behavior

- Core owns permitted-client access, canonical state, immutable draft versions, generation jobs, approval/readiness, and durable send intents. The existing native SDK preparation/generation path remains the sole generation owner. This change introduces no browser agent loop or alternate mail transport.
- The paged campaign and saved-record operations use Core's opaque cursors and a maximum of 100 results. Counts describe the loaded campaign pages, with a continuation indicator when more results exist. Legacy sessions retain their existing paged owner and are excluded once Core marks them as canonical workflows; ordinary saved rows exclude those workflow roots. Deleted-only records remain visible without reopen actions.
- Search is sent to each authoritative list owner. Client/date filters apply to native campaigns and saved records; the UI identifies global legacy sessions separately. Inclusive date selection becomes a UTC start and exclusive next-day end. Invalid windows suppress reads and stale rows.
- Draft, sent, and attention categories come from recorded delivery/generation evidence. Workflow completion alone never means mail was sent. The sent badge uses Core's category; attention retains the native status. Provider acceptance is not described as recipient delivery.
- Canonical sent details read the exact matching non-test send intent and display only subjects/recipients whose delivery status is `sent`; canceled planned copies and stale authored-record subjects are excluded. Legacy records without native delivery evidence retain their recorded subject. A mismatched intent cannot populate the sent view.
- Simple draft create/update retains title, type, subject, body, and selected client. A synchronous submit fence prevents double writes. Before a write, `outreachSave=pending` records a reload-stable unresolved outcome. Confirmed request refusals allow correction; unknown acknowledgements keep the draft fenced until reconciliation through the saved record. Canonical recovery keys and immutable send owners remain intact.
- Direct draft links wait for current record classification before mounting an editor, preserving dedicated newsletter routing. Mismatched identities/client scopes and failed reads do not fall back to editable blank drafts. Fixed client scopes cannot be changed inside either editor.
- Goal, objective, topic, why-now, and campaign angle have explicit typed fields alongside existing tone. Their bounds preserve the legacy producer limits. The overview's generation continuation agrees with its displayed readiness checks; configuration remains available through the companion workflow.

## Verification

Browser qualification uses local synthetic HTTP fixtures, with writes observed and asserted. It does not constitute live account, generation-provider, or mail-delivery qualification. Browser evidence covers 1440px desktop and 390px phone, keyboard and accessibility checks, primary list/decision/simple-draft views, recorded status, canonical admission/recovery, and representative workflow/send-confirmation views.

Focused suites:

```text
npm run test:browser:modules --workspace @capiro/web -- outreach-figma34.spec.ts outreach-workflow-figma34.spec.ts outreach-canonical.spec.ts outreach-list-scope.spec.ts engagement-outreach-only.spec.ts
```

The expanded 43-test run passed. A final targeted regression additionally verifies immutable delivered subjects and cross-page legacy deduplication. Tests exercise saved-record continuation beyond the first 100 rows, server search, duplicate workflow exclusion, invalid date windows, stale-row concealment, denied/unavailable reads and retries, ordinary save rejection versus unknown acknowledgement across reload, and exact saved-state revision checks. Screenshot tests assert no mail write while opening or canceling confirmation.

Repository-wide qualification was compared with the untouched frontend baseline `bfb7c223dfc441a317900c2665239f1c3fe9fc9d` on native Windows because the available WSL distributions could not start. Full root typecheck passed. Full root tests had 238 passes and 10 failures, with the same 10 failures on baseline. Full web tests had 5,868 passes, 49 failures, 36 skipped, and two unhandled errors; the 49 failures and two errors also occurred on baseline, which had one additional timing-sensitive failure. Full lint had the same 11 errors and 92 warnings as baseline, outside this change. Architecture boundary failures were identical to baseline. Transport tests passed 136/136; package and declaration checks passed. Newsletter qualification had the same two failures as baseline. These existing failures are not waived or represented as green checks.

The Windows `test:capiro` launcher constructed a malformed duplicated drive path and found no tests; the full web Vitest invocation covered its test globs. Production-build and final owned-file validation outcomes are reported in the PR after completion. Generated screenshots and raw baseline logs remain task evidence rather than committed application assets.
