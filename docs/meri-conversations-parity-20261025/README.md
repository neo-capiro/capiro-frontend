# Meri Conversations list — Figma 3.4 parity, 25 October 2026

Branch `fable/meri-conversations-parity-20261025` from `origin/main` `90702180`. Second bounded parity fix from the Waves 1+2 acceptance pass (Fable); Figma first, then code. No API, contract, schema, authorization or dependency change: the list still reads `POST /api/conversations/summaries` one status at a time and every change still goes through the existing management command owner (`useManagedChange`, `management-journal`).

## Design read

File **Capiro 3.4 — Meri** `IXJzJUkXcUTkySHir5JNea`, page `1064:140864`, Figma MCP read on 25 October 2026 (dated read; no immutable version token).

| Node                        | Frame                                       | Used for                                                                                                                                           |
| --------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `1064:144425`               | 01.04 · Conversation history                | Heading copy, search (752 px) + client/status triggers, table (Conversation 43 % · Client 20 % · Status 18 % · Updated 19 %), selected-row actions |
| `3034:32186` / `3034:32443` | 01.04A empty · 01.04B no matches            | Empty and no-match states                                                                                                                          |
| `3048:34602`                | 01.04G · Archived filter                    | Archived rows and actions                                                                                                                          |
| `3034:37582` / `3034:37596` | 13.21 client menu · 13.22 status menu       | `FilterMenu` triggers and options                                                                                                                  |
| `3035:33134`                | Overlay · Delete conversation from history? | Delete confirmation                                                                                                                                |
| `1064:148633`               | 09.08 · Conversation management             | "Rename conversation" wording                                                                                                                      |

## Figma additions (missing states added first)

- `Action · Trash` option in the 13.22 status menu and its anchored copy in 01.04J (`3147:41253`, `3147:41259`): the live list has a Trash view with a 30-day Restore window that 3.4 did not show.
- `Overlay · Rename conversation` (`3147:41265`, field `3147:41279`): cloned from the existing delete overlay (title · description · Field · Save title · Cancel) so the rename action has a design instead of the former inline input.

Documented deviations (contract, not design): the summaries read serves one status per request, so the status trigger defaults to **Active** instead of "All statuses"; the Status column shows the management status (Active · Archived · In Trash) because run state (Complete/Running) is not part of `ConversationSummary`; the client menu lists the clients present in the loaded rows.

## Code

- `conversations/ConversationHistoryList.tsx` (new): filters row, `DataTable`, selected row, Load more, empty/no-match/error states, Trash note; `historyRows` and `updatedLabel` map summaries to the Figma columns ("Just now · N min ago · Today · Yesterday · 7 Oct").
- `conversations/SelectedConversationActions.tsx` (new): Open conversation · Rename · Archive/Restore · Delete for the selected row; retained-command retry, receipts and the archived "Read saved chat" disclosure; dialogs close while rows are being revalidated and keep their draft.
- `conversations/RenameConversationDialog.tsx` (new): the new Figma overlay.
- `conversations/MeriConversationList.tsx`: Figma heading copy; the entry link's `scope=general` / `clientId` becomes the initial client filter; the page no longer shows the scope chooser (01.04 has the client menu instead).
- Deleted: `ManagedConversationPanel.tsx`, `ManagedChatRow.tsx`, `TrashConversationButton.tsx`, `managed-conversations.module.css` (card list, inline rename, per-row Manage disclosure). `UnconfirmedChatChanges`, `SavedChatTranscript`, `useManagedChange` are reused unchanged.
- Harness `test/browser/main.tsx` mounts `ConversationHistoryList`; `tests/meri-management-presentation.test.ts` and `test/browser/meri-management-lifecycle.spec.ts` follow the new interaction (status menu → row → Rename overlay).

## Checks

See the pull request for commands and results. No live model turn, build, deployment or preview qualification from this branch.
