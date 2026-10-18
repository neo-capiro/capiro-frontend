# Current component/state owners — 16 October 2026

This is an actual current structural inventory, not state/render acceptance. Variant node IDs are retained in the JSON sibling. Reuse these existing owners; current high-fidelity state and keyboard behavior still need comparison. Shared Capiro header masters469:41447/469:92041 and animated-action master1103:280937 are captured in the Home/Cited contexts. No shared token/radius policy change is inferred.

| Current family | Set node | Defined variants | Existing code owner |
| --- | --- | --- | --- |
| Meri/Mode switch | 1064:143260 | Size=Desktop; Size=Compact | `apps/web/src/shared/shell/ModeLink.tsx`<br>`apps/web/src/shared/shell/Header.tsx` |
| Meri/Status | 1064:143269 | Tone=Neutral; Tone=Success; Tone=Warning; Tone=Danger | `apps/web/src/features/meri/ui/StatusPill.tsx` |
| Meri/Field | 1064:143278 | State=Default; State=Focus; State=Invalid; State=Disabled | `apps/web/src/features/meri/ui/FormField.tsx` |
| Meri/Action interaction | 1064:143602 | Variant=Primary, State=Default; Variant=Primary, State=Hover; Variant=Primary, State=Focus; Variant=Primary, State=Disabled; Variant=Primary, State=Loading; Variant=Outline, State=Default; Variant=Outline, State=Hover; Variant=Outline, State=Focus; Variant=Outline, State=Disabled; Variant=Outline, State=Loading; Variant=Ghost, State=Default; Variant=Ghost, State=Hover; Variant=Ghost, State=Focus; Variant=Ghost, State=Disabled; Variant=Ghost, State=Loading | `packages/ui/src/shadcn/button.tsx`<br>`apps/web/src/features/meri/ui/LinkAction.tsx` |
| Meri/AI Elements/PromptInput | 1064:143634 | State=Empty; State=Ready; State=Attached; State=Streaming; State=Disabled; State=Offline; State=Error; State=Steer | `packages/ui/src/ai-elements/prompt-input.tsx`<br>`apps/web/src/features/meri/MeriComposer.tsx` |
| Meri/AI Elements/Tool | 1064:143710 | State=Queued; State=Running; State=Approval; State=Complete; State=Error; State=Denied | `packages/ui/src/ai-elements/tool.tsx` |
| Meri/AI Elements/Artifact | 1064:143736 | State=Working; State=Verified; State=Failed; State=Filed | `packages/ui/src/ai-elements/artifact.tsx` |
| Meri/AI Elements/Attachment | 1064:143769 | State=Uploading; State=Processing; State=Ready; State=Error | `packages/ui/src/ai-elements/attachments.tsx` |
| Meri/AI Elements/Confirmation | 1064:143799 | State=Pending; State=Accepted; State=Rejected; State=Expired; State=Revoked | `packages/ui/src/ai-elements/confirmation.tsx` |
| Meri/AI Elements/Plan | 1064:143841 | State=Expanded; State=Collapsed; State=Complete | `packages/ui/src/ai-elements/plan.tsx`<br>`packages/ui/src/ai-elements/task.tsx` |
| Meri/AI Elements/Sources | 1064:143884 | State=Collapsed; State=Expanded; State=Restricted | `packages/ui/src/ai-elements/sources.tsx` |
| Meri/AI Elements/Queue | 1064:143898 | State=Pending; State=Active; State=Complete | `packages/ui/src/ai-elements/queue.tsx` |
| Meri/AI Elements/Checkpoint | 1064:143917 | State=Saving; State=Verified; State=Failed | `packages/ui/src/ai-elements/checkpoint.tsx` |
| Meri/AI Elements/Context | 1064:143933 | State=Normal; State=Near limit; State=Exceeded | Missing adopted Context module; review before implementation |
| Meri/AI Elements/FileTree | 1064:143954 | State=Collapsed; State=Expanded; State=Selected | `packages/ui/src/ai-elements/file-tree.tsx` |
| Meri/Workflow tile | 1064:150754 | State=Default; State=NeedsSource; State=Disabled | `apps/web/src/features/meri/screens/workflows/WorkflowTile.tsx` |
| Meri/Workflow field | 1064:150770 | State=Default; State=Unresolved; State=Unavailable | `apps/web/src/features/meri/screens/workflows/WorkflowField.tsx` |
| Meri/Source coverage row | 1064:150786 | Outcome=Success; Outcome=Empty; Outcome=Partial; Outcome=Unavailable | `apps/web/src/features/meri/screens/workflows/SourceCoverageRow.tsx` |
| Meri/Workflow setup | 1064:150832 | Workflow=research_company; Workflow=relationship_brief; Workflow=client_changes; Workflow=portfolio_changes; Workflow=portfolio_overlap; Workflow=mail_history; Workflow=meeting_prep; Workflow=commitments_audit; Workflow=funding_opportunity_match; Workflow=pe_deep_dive; Workflow=bill_watch; Workflow=hearing_watch; Workflow=representation_lookup; Workflow=regulatory_docket_brief | `apps/web/src/features/meri/screens/workflows/WorkflowSetup.tsx` |

Every family remains UNRUN for fresh current rendered parity. The 14 canonical AI Elements source files are present; this updates the active inventory without rewriting the historical audit's as-at adoption statement. No new dependency, copied DTO or second UI component library is introduced.
