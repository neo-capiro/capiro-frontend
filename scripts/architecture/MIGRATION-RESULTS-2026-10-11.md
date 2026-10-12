# Portfolio architecture migration — verified checkpoint

Verified 2026-10-11 after the canonical source move, shared website/writer ownership changes, and the frozen MailCompose rewrite extraction.

## Result

The architecture CLI exited 0 across 425 authored code modules and 22 discovered routes, with no dependency or Portfolio typed/origin violations. All 131 JavaScript/TypeScript size signals remain reported: 93 exact reviewed findings, 38 unchanged inherited findings without an approved review record, and 0 blocking new/changed findings.

The inherited inventory is not cohesion approval. Its fixed base is `02c02d95bdf3949662b9123f425271c6491ffdab`; all 129 baseline entries were independently reproduced from that Git tree. Current exact reviews are recorded with individual reasons, reviewers, dates and source fingerprints in `reviewed-size-findings.json`.

## Checks actually run

- `node --test scripts/architecture.test.mjs`: 24 passed, zero failures/skips. The seven original guard contracts survive; only the obsolete unavailable-Portfolio fixture was adapted to Modules.
- `node scripts/architecture.mjs`: exit 0 on this complete current-tree scan.
- Both CLI `--help` calls: exit 0 with usage; both invalid-argument calls: exit 2 with usage.
- The transfer generator reproduced all checked-in baseline fields exactly.
- Scoped `git diff --check`: passed.
- The six changed/new JavaScript guard/test modules have no file or function size triggers; their nonblank file sizes are 58, 266, 69, 58, 62 and 67.

## Remaining responsibility observations

- `calendar/library/MeetingTranscriptUpload.tsx` — `TranscriptForm`: transport/attempt state should be separated from transcript form presentation.
- `calendar/preparation/MeetingPreparation.tsx` — file and `ScopedPreparation`: a focused preparation progress/recovery projection is still a justified extraction.
- `client-profile/enrichment/useReviewAction.ts`: separate acknowledgement text and affected query keys from the actor/abort/uncertainty lifecycle before extending action/finding families.
- `features/portfolio/index/portfolio.module.css`: 411 nonblank lines, explicitly recorded as an inherited stylesheet review observation. The original AST size guard does not enforce stylesheet size; its scope was not expanded during this migration.

These observations stay visible despite a passing changed-code gate. The architecture scan is source/boundary evidence and does not establish signed-in native service acceptance.

## Every current code size signal

Paths below are relative to `apps/web/src`. Function counts measure the body; the one `<module>` row measures the entire file. Exact function/file fingerprints and review reasons are available through the normal architecture CLI JSON result.

| Source | Function or file | Nonblank lines | Review | Provenance |
| --- | --- | ---: | --- | --- |
| `features/portfolio/advocacy/AdvocacyHistory.tsx` | `AdvocacyHistory` | 148 | unreviewed | inherited-unchanged |
| `features/portfolio/advocacy/CorrectionDialog.tsx` | `CorrectionDialog` | 200 | unreviewed | inherited-unchanged |
| `features/portfolio/advocacy/MatterEditor.tsx` | `MatterEditor` | 99 | unreviewed | inherited-unchanged |
| `features/portfolio/advocacy/RecordCard.tsx` | `RecordCard` | 91 | unreviewed | inherited-unchanged |
| `features/portfolio/advocacy/RecordDialog.tsx` | `RecordDialog` | 85 | unreviewed | inherited-unchanged |
| `features/portfolio/advocacy/useCorrection.ts` | `useCorrection` | 112 | unreviewed | inherited-unchanged |
| `features/portfolio/bill-tracker/BillDrawer.tsx` | `BillDrawer` | 140 | unreviewed | inherited-unchanged |
| `features/portfolio/bill-tracker/BillResults.tsx` | `BillResults` | 91 | unreviewed | inherited-unchanged |
| `features/portfolio/bill-tracker/BillTrackerPage.tsx` | `ConfiguredTracker` | 138 | unreviewed | inherited-unchanged |
| `features/portfolio/bill-tracker/TrackBillDialog.tsx` | `TrackBillDialog` | 111 | unreviewed | inherited-unchanged |
| `features/portfolio/bill-tracker/WatchlistDialog.tsx` | `WatchlistForm` | 186 | unreviewed | inherited-unchanged |
| `features/portfolio/bill-tracker/WatchlistTopics.tsx` | `WatchlistTopics` | 200 | unreviewed | inherited-unchanged |
| `features/portfolio/bill-tracker/WatchlistTopics.tsx` | `WatchlistTopics > <anonymous> #3` | 157 | unreviewed | inherited-unchanged |
| `features/portfolio/billing/BillingSummaryPanel.tsx` | `BillingSummaryPanel` | 121 | unreviewed | inherited-unchanged |
| `features/portfolio/calendar/CalendarPage.tsx` | `CalendarPage` | 291 | reviewed | inherited-unchanged |
| `features/portfolio/calendar/MeetingArtifacts.tsx` | `MeetingArtifacts` | 208 | reviewed | inherited-unchanged |
| `features/portfolio/calendar/MeetingArtifacts.tsx` | `MeetingArtifacts > <anonymous> #5` | 83 | reviewed | inherited-unchanged |
| `features/portfolio/calendar/MeetingDetail.tsx` | `MeetingDetail` | 135 | reviewed | inherited-unchanged |
| `features/portfolio/calendar/MeetingForm.tsx` | `MeetingForm` | 121 | reviewed | inherited-unchanged |
| `features/portfolio/calendar/attendance/ClientAttendancePreferences.tsx` | `PreferenceForm` | 178 | reviewed | inherited-unchanged |
| `features/portfolio/calendar/attendance/MeetingAttendance.tsx` | `AttendancePanel` | 195 | reviewed | inherited-unchanged |
| `features/portfolio/calendar/attendance/SendMeriDialog.tsx` | `SendMeriDialog` | 128 | reviewed | inherited-unchanged |
| `features/portfolio/calendar/debrief/DebriefGeneration.tsx` | `SessionDebriefGeneration` | 172 | reviewed | inherited-unchanged |
| `features/portfolio/calendar/debrief/voice/VoiceMemoSource.tsx` | `VoiceSourceForm` | 155 | reviewed | inherited-unchanged |
| `features/portfolio/calendar/debrief/voice/source.ts` | `prepareVoiceSource` | 81 | reviewed | inherited-unchanged |
| `features/portfolio/calendar/debrief/voice/useVoiceSource.ts` | `useVoiceSource` | 140 | reviewed | inherited-unchanged |
| `features/portfolio/calendar/documents/PreparationPdfAttachmentReview.tsx` | `PreparationPdfAttachmentReview` | 178 | reviewed | inherited-unchanged |
| `features/portfolio/calendar/documents/SavedMeetingDocumentPreview.tsx` | `SavedMeetingDocumentPreview` | 112 | reviewed | inherited-unchanged |
| `features/portfolio/calendar/library/MeetingAssignment.tsx` | `AssignmentForm` | 182 | reviewed | inherited-unchanged |
| `features/portfolio/calendar/library/MeetingLibrary.tsx` | `MeetingLibrary` | 237 | reviewed | inherited-unchanged |
| `features/portfolio/calendar/library/MeetingTranscriptUpload.tsx` | `TranscriptForm` | 221 | unreviewed | inherited-unchanged |
| `features/portfolio/calendar/preparation/MeetingPreparation.tsx` | `<module>` | 404 | unreviewed | inherited-unchanged |
| `features/portfolio/calendar/preparation/MeetingPreparation.tsx` | `ScopedPreparation` | 343 | unreviewed | inherited-unchanged |
| `features/portfolio/calendar/preparation/PreparationContent.tsx` | `PreparationContent` | 85 | reviewed | inherited-unchanged |
| `features/portfolio/calendar/preparation/PreparationContent.tsx` | `PreparationSources` | 92 | reviewed | inherited-unchanged |
| `features/portfolio/calendar/preparation/PreparationEditor.tsx` | `PreparationEditor` | 131 | reviewed | inherited-unchanged |
| `features/portfolio/calendar/preparation/PreparationSettings.tsx` | `PreparationSettings` | 161 | reviewed | inherited-unchanged |
| `features/portfolio/calendar/public-event/PublicEventDetail.tsx` | `PublicEventDetail` | 152 | reviewed | inherited-unchanged |
| `features/portfolio/calendar/review/MeetingAttachmentApprovals.tsx` | `AttachmentReview` | 120 | reviewed | inherited-unchanged |
| `features/portfolio/calendar/review/SavedMeetingNotesSource.tsx` | `SourceReview` | 112 | reviewed | inherited-unchanged |
| `features/portfolio/calendar/review/useAttachmentApproval.ts` | `useAttachmentApproval` | 112 | reviewed | inherited-unchanged |
| `features/portfolio/calendar/sync/CalendarSyncDialog.tsx` | `CalendarSyncDialog` | 237 | reviewed | inherited-unchanged |
| `features/portfolio/calendar/sync/useCalendarSync.ts` | `useCalendarSync` | 139 | reviewed | inherited-unchanged |
| `features/portfolio/capabilities/CapabilitiesPage.tsx` | `CapabilitiesPage` | 98 | unreviewed | inherited-unchanged |
| `features/portfolio/capabilities/CapabilityEditor.tsx` | `CapabilityEditor` | 181 | unreviewed | inherited-unchanged |
| `features/portfolio/capabilities/Registrations.tsx` | `Registrations` | 157 | unreviewed | inherited-unchanged |
| `features/portfolio/client-intake/ClientIntakeDialog.tsx` | `IntakeSession` | 314 | reviewed | inherited-unchanged |
| `features/portfolio/client-intake/form.ts` | `intakePayload` | 86 | reviewed | inherited-unchanged |
| `features/portfolio/client-profile/ActivityActions.tsx` | `ActivityActions` | 119 | reviewed | inherited-unchanged |
| `features/portfolio/client-profile/ActivityTimeline.tsx` | `ActivityTimeline` | 107 | reviewed | inherited-unchanged |
| `features/portfolio/client-profile/ClientHeader.tsx` | `ClientHeader` | 111 | reviewed | inherited-unchanged |
| `features/portfolio/client-profile/ClientOverview.tsx` | `ClientOverview` | 172 | reviewed | inherited-unchanged |
| `features/portfolio/client-profile/ClientProfileActions.tsx` | `ClientProfileActions` | 95 | reviewed | inherited-unchanged |
| `features/portfolio/client-profile/FacilitiesCard.tsx` | `FacilitiesCard` | 135 | reviewed | inherited-unchanged |
| `features/portfolio/client-profile/FacilityDetailDialog.tsx` | `FacilityDetailDialog` | 123 | reviewed | inherited-unchanged |
| `features/portfolio/client-profile/FacilityDialog.tsx` | `FacilityDialog` | 142 | reviewed | inherited-unchanged |
| `features/portfolio/client-profile/FacilityGeocoding.tsx` | `FacilityGeocoding` | 112 | reviewed | inherited-unchanged |
| `features/portfolio/client-profile/FacilityMap.tsx` | `FacilityMap` | 111 | reviewed | inherited-unchanged |
| `features/portfolio/client-profile/FacilityMapDialog.tsx` | `FacilityMapDialog` | 123 | reviewed | inherited-unchanged |
| `features/portfolio/client-profile/QuickLog.tsx` | `QuickLog` | 86 | reviewed | inherited-unchanged |
| `features/portfolio/client-profile/TeamDialog.tsx` | `TeamDialog` | 117 | reviewed | inherited-unchanged |
| `features/portfolio/client-profile/activity-mutations.ts` | `useChangeActivity` | 145 | reviewed | inherited-unchanged |
| `features/portfolio/client-profile/enrichment/ClientEnrichmentDialog.tsx` | `ClientEnrichmentReview` | 251 | reviewed | inherited-unchanged |
| `features/portfolio/client-profile/enrichment/FindingReview.tsx` | `FindingReview` | 141 | reviewed | inherited-unchanged |
| `features/portfolio/client-profile/enrichment/actions.ts` | `executeReviewAction` | 125 | reviewed | inherited-unchanged |
| `features/portfolio/client-profile/enrichment/useReviewAction.ts` | `useReviewAction` | 115 | unreviewed | inherited-unchanged |
| `features/portfolio/client-profile/export/ClientProfileExport.tsx` | `ExportSession` | 138 | reviewed | inherited-unchanged |
| `features/portfolio/client-profile/past-performance/PastPerformance.tsx` | `History` | 91 | reviewed | inherited-unchanged |
| `features/portfolio/client-profile/past-performance/RemoveSubmission.tsx` | `RemoveSubmission` | 96 | reviewed | inherited-unchanged |
| `features/portfolio/client-profile/quick-log/QuickLogUndo.tsx` | `QuickLogUndo` | 98 | reviewed | inherited-unchanged |
| `features/portfolio/client-profile/tags/FocusTags.tsx` | `FocusTagSession` | 158 | reviewed | inherited-unchanged |
| `features/portfolio/files/FilePreview.tsx` | `FilePreview` | 83 | reviewed | changed-since-transfer |
| `features/portfolio/files/FileTable.tsx` | `FileTable` | 109 | reviewed | inherited-unchanged |
| `features/portfolio/files/FilesPage.tsx` | `FilesPage` | 221 | reviewed | changed-since-transfer |
| `features/portfolio/files/UploadDialog.tsx` | `UploadDialog` | 94 | reviewed | inherited-unchanged |
| `features/portfolio/files/upload.ts` | `uploadParentFile` | 97 | reviewed | inherited-unchanged |
| `features/portfolio/index/CreateProfileDialog.tsx` | `ProfileChoiceSession` | 142 | unreviewed | inherited-unchanged |
| `features/portfolio/index/GlobalQuickLog.tsx` | `QuickLogSession` | 82 | unreviewed | inherited-unchanged |
| `features/portfolio/index/IndexFilters.tsx` | `IndexFilters` | 103 | unreviewed | inherited-unchanged |
| `features/portfolio/index/PortfolioIndex.tsx` | `PortfolioIndex` | 238 | unreviewed | inherited-unchanged |
| `features/portfolio/index/attention/PortfolioAttention.tsx` | `PortfolioAttention` | 87 | unreviewed | inherited-unchanged |
| `features/portfolio/index/layout/PortfolioLayoutEditor.tsx` | `EditorSession` | 198 | unreviewed | inherited-unchanged |
| `features/portfolio/index/layout/usePortfolioLayout.ts` | `usePortfolioLayout` | 245 | unreviewed | inherited-unchanged |
| `features/portfolio/index/layout/usePortfolioLayout.ts` | `usePortfolioLayout > save` | 87 | unreviewed | inherited-unchanged |
| `features/portfolio/intake/csv/CsvImportDialog.tsx` | `CsvImportDialog` | 268 | unreviewed | inherited-unchanged |
| `features/portfolio/intake/registrant/CandidateReview.tsx` | `CandidateReview` | 101 | unreviewed | inherited-unchanged |
| `features/portfolio/intake/registrant/FirmSearch.tsx` | `FirmSearch` | 82 | unreviewed | inherited-unchanged |
| `features/portfolio/intake/registrant/RegistrantImportDialog.tsx` | `RegistrantSession` | 244 | unreviewed | inherited-unchanged |
| `features/portfolio/objectives/ObjectiveEditor.tsx` | `ObjectiveEditor` | 198 | reviewed | changed-since-transfer |
| `features/portfolio/objectives/ObjectivesPage.tsx` | `ObjectivesPage` | 176 | reviewed | changed-since-transfer |
| `features/portfolio/objectives/global-create/GlobalObjectiveClientPicker.tsx` | `PickerSession` | 174 | unreviewed | inherited-unchanged |
| `features/portfolio/opportunities/OpportunitiesPage.tsx` | `OpportunitiesPage` | 140 | unreviewed | inherited-unchanged |
| `features/portfolio/prospects/NextStepEditor.tsx` | `NextStepEditor` | 103 | reviewed | inherited-unchanged |
| `features/portfolio/prospects/ProspectDetail.tsx` | `ProspectDetail` | 207 | reviewed | changed-since-transfer |
| `features/portfolio/prospects/ProspectEditor.tsx` | `ProspectEditor` | 106 | reviewed | inherited-unchanged |
| `features/portfolio/prospects/ProspectHistory.tsx` | `ProspectHistory` | 91 | reviewed | changed-since-transfer |
| `features/portfolio/prospects/ProspectPipeline.tsx` | `ProspectPipeline` | 125 | reviewed | inherited-unchanged |
| `features/portfolio/prospects/ProspectsIndex.tsx` | `ProspectsIndex` | 176 | reviewed | inherited-unchanged |
| `features/portfolio/prospects/brief/BriefEditor.tsx` | `BriefEditor` | 265 | reviewed | inherited-unchanged |
| `features/portfolio/prospects/brief/BriefSource.tsx` | `BriefSource` | 118 | reviewed | inherited-unchanged |
| `features/portfolio/prospects/brief/BriefViewer.tsx` | `BriefViewer` | 130 | reviewed | inherited-unchanged |
| `features/portfolio/prospects/brief/ProspectBrief.tsx` | `ScopedBrief` | 113 | reviewed | inherited-unchanged |
| `features/portfolio/prospects/contacts/ContactEditor.tsx` | `ContactEditor` | 271 | reviewed | inherited-unchanged |
| `features/portfolio/prospects/contacts/ProspectContacts.tsx` | `ProspectContacts` | 89 | reviewed | inherited-unchanged |
| `features/portfolio/prospects/conversion/ProspectClientLink.tsx` | `ClientLinkDialog` | 107 | reviewed | inherited-unchanged |
| `features/portfolio/prospects/proposals/TemplateCatalog.tsx` | `TemplateCatalog` | 118 | reviewed | inherited-unchanged |
| `features/portfolio/relationships/AddTargetDialog.tsx` | `AddTargetDialog` | 107 | reviewed | changed-since-transfer |
| `features/portfolio/relationships/ContactDrawer.tsx` | `ContactDrawer` | 199 | reviewed | inherited-unchanged |
| `features/portfolio/relationships/ContactForm.tsx` | `ContactForm` | 94 | reviewed | inherited-unchanged |
| `features/portfolio/relationships/ContactMail.tsx` | `ContactMail` | 99 | reviewed | inherited-unchanged |
| `features/portfolio/relationships/DirectoryResults.tsx` | `DirectoryResults` | 84 | reviewed | inherited-unchanged |
| `features/portfolio/relationships/GovernmentRelationships.tsx` | `GovernmentRelationships` | 122 | reviewed | inherited-unchanged |
| `features/portfolio/relationships/HierarchyEditor.tsx` | `HierarchyEditor` | 98 | reviewed | inherited-unchanged |
| `features/portfolio/relationships/MailCompose.tsx` | `MailCompose` | 272 | reviewed | changed-since-transfer |
| `features/portfolio/relationships/RelationshipsPage.tsx` | `OrganizationRelationships` | 181 | reviewed | inherited-unchanged |
| `features/portfolio/relationships/TargetDrawer.tsx` | `TargetDrawer` | 165 | reviewed | inherited-unchanged |
| `features/portfolio/relationships/committee/CommitteePickerPanel.tsx` | `CommitteePickerPanel` | 214 | reviewed | new |
| `features/portfolio/relationships/directory-queries.ts` | `useTargetDirectory` | 96 | reviewed | inherited-unchanged |
| `features/portfolio/relationships/directory-queries.ts` | `useTargetDirectory > queryFn` | 89 | reviewed | inherited-unchanged |
| `features/portfolio/relationships/email/RecipientFields.tsx` | `RecipientFields` | 142 | reviewed | inherited-unchanged |
| `features/portfolio/relationships/email/send.ts` | `sendReviewedMail` | 84 | reviewed | inherited-unchanged |
| `features/portfolio/relationships/email/useMailAttachments.ts` | `useMailAttachments` | 106 | reviewed | inherited-unchanged |
| `features/portfolio/relationships/email/useMailRewrite.ts` | `useMailRewrite` | 110 | reviewed | new |
| `features/portfolio/relationships/member-notes/MemberNoteForm.tsx` | `NoteSession` | 131 | reviewed | inherited-unchanged |
| `features/portfolio/relationships/member-notes/MemberQuickLog.tsx` | `MemberPicker` | 138 | reviewed | inherited-unchanged |
| `features/portfolio/relationships/member-notes/useMemberNote.ts` | `useMemberNote` | 118 | reviewed | inherited-unchanged |
| `features/portfolio/relationships/thread/TimelineMailThread.tsx` | `ThreadSession` | 121 | reviewed | inherited-unchanged |
| `features/portfolio/work/WorkPage.tsx` | `WorkPage` | 160 | unreviewed | inherited-unchanged |
| `features/portfolio/work/WorkspaceDocuments.tsx` | `WorkspaceDocuments` | 85 | unreviewed | inherited-unchanged |
| `shared/portfolio/api/proxy.ts` | `proxyRequest` | 125 | unreviewed | inherited-unchanged |
| `shared/portfolio/shell/Shell.tsx` | `Shell` | 120 | reviewed | changed-since-transfer |
