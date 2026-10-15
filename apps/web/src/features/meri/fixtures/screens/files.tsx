import { AttachFilesScreen } from "../../screens/files/AttachFilesScreen";
import { CapiroFileScreen } from "../../screens/files/CapiroFileScreen";
import { DownloadScreen } from "../../screens/files/DownloadScreen";
import { ExtractionScreen } from "../../screens/files/ExtractionScreen";
import { FileToClientScreen } from "../../screens/files/FileToClientScreen";
import { FilingReceiptScreen } from "../../screens/files/FilingReceiptScreen";
import { RevisionProgressScreen } from "../../screens/files/RevisionProgressScreen";
import { meetingBriefDownload } from "./files-flows";
import { fixtureHref, fixtureUnavailable } from "./href";
import type { FixtureScreen } from "./types";

/** Figma 3.4 04 · Files frames, with synthetic attachments, extraction, filing and receipts. */
export const fileScreens: readonly FixtureScreen[] = [
  {
    slug: "attach-files",
    figmaId: "04.01",
    figmaNode: "1064:146204",
    title: "Upload and attachment menu",
    Screen: () => (
      <AttachFilesScreen
        unavailable={fixtureUnavailable}
        links={{
          capiro: fixtureHref("attach-capiro-file"),
          close: fixtureHref("workspace-files"),
        }}
        view={{
          heading: {
            title: "Add files to your workspace",
            description: "Files are checked before Meri uses them.",
          },
          accepted:
            "Documents, spreadsheets, presentations, images and supported data files",
          access: {
            title: "Access stays attached to the source",
            detail:
              "Files are only available to users allowed to access this workspace and its contributing sources.",
          },
          attached: [
            {
              id: "brief-source",
              name: "brief-source.pdf · 2.4 MB",
              mediaType: "application/pdf",
              origin: "upload",
            },
          ],
          draft: "Summarize these sources and create a meeting brief.",
        }}
      />
    ),
  },
  {
    slug: "attach-capiro-file",
    figmaId: "04.02",
    figmaNode: "1064:146271",
    title: "Attach an authorized Capiro file",
    Screen: () => (
      <CapiroFileScreen
        unavailable={fixtureUnavailable}
        backHref={fixtureHref("attach-files")}
        view={{
          heading: {
            title: "Add files to your workspace",
            description: "Files are checked before Meri uses them.",
          },
          scope: "Anduril · Showing files available to your account",
          query: "meeting",
          selected: "strategy",
          files: [
            {
              id: "strategy",
              name: "Strategy review notes.pdf",
              mediaType: "application/pdf",
              location: "Anduril / Meetings",
              version: "v1",
              updated: "7 Oct",
              indexed: "Notes from the Anduril strategy review meeting",
            },
            {
              id: "client-brief",
              name: "Client brief.docx",
              mediaType:
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              location: "Anduril / Briefs",
              version: "v2",
              updated: "6 Oct",
              indexed: "Client brief prepared for the Anduril meeting",
            },
            {
              id: "funding",
              name: "Funding context.pdf",
              mediaType: "application/pdf",
              location: "Anduril / Research",
              version: "v1",
              updated: "5 Oct",
              indexed: "Funding background for the meeting brief",
            },
          ],
        }}
      />
    ),
  },
  {
    slug: "file-extraction",
    figmaId: "04.03",
    figmaNode: "1064:146356",
    title: "Upload and extraction progress",
    Screen: () => (
      <ExtractionScreen
        unavailable={fixtureUnavailable}
        view={{
          heading: {
            title: "Preparing your files",
            description: "You can keep working while extraction finishes.",
          },
          items: [
            {
              id: "notes",
              name: "meeting-notes.pdf",
              detail: "2.4 MB · Upload complete · 6 pages extracted",
              progress: 100,
              status: "Ready",
            },
            {
              id: "funding",
              name: "funding-update.pdf",
              detail: "3.1 MB · OCR in progress · Page 8 of 12",
              progress: 68,
              status: "Processing",
            },
            {
              id: "snapshot",
              name: "client-snapshot.png",
              detail: "840 KB · Image attached",
              progress: 100,
              status: "Ready",
            },
          ],
        }}
      />
    ),
  },
  {
    slug: "file-to-client",
    figmaId: "04.04",
    figmaNode: "1064:146428",
    title: "File artifact to client",
    Screen: () => (
      <FileToClientScreen
        unavailable={fixtureUnavailable}
        links={{
          artifact: fixtureHref("word-document"),
          review: fixtureHref("review-artifact-filing"),
        }}
        view={{
          heading: {
            title: "Save a verified version",
            description: "Review the exact destination and source scope.",
          },
          title: "File meeting brief",
          context:
            "A copy of this immutable version will be filed in the selected client folder.",
          version: "meeting-brief-v2.docx · v2 · Verified",
          client: "Anduril",
          destination: "Anduril / Documents / Meeting briefs",
          fileName: "Anduril meeting brief — 9 Oct 2026.docx",
          access:
            "Authorized Anduril team · Source restrictions remain enforced",
          review: {
            title: "Review required",
            detail:
              "Filing is a governed action. Confirm this destination and exact version before it is saved.",
          },
        }}
      />
    ),
  },
  {
    slug: "download-artifact",
    figmaId: "04.05",
    figmaNode: "1064:146498",
    title: "Download exact artifact version",
    Screen: () => (
      <DownloadScreen
        unavailable={fixtureUnavailable}
        previewHref={fixtureHref("word-document")}
        heading={{
          title: "Meeting brief",
          description: "meeting-brief-v2.docx · Version 2 · Verified",
        }}
        download={meetingBriefDownload}
      />
    ),
  },
  {
    slug: "revision-progress",
    figmaId: "04.06",
    figmaNode: "1064:146561",
    title: "Revision progress and verification",
    Screen: () => (
      <RevisionProgressScreen
        unavailable={fixtureUnavailable}
        currentHref={fixtureHref("word-document")}
        view={{
          heading: {
            title: "Creating version 3",
            description: "Meeting brief · Version 2 is still available",
          },
          steps: [
            {
              id: "accepted",
              title: "Revision accepted",
              detail:
                "Add one-page executive summary; source details to appendix",
              done: true,
            },
            {
              id: "create",
              title: "Creating new version",
              detail: "DOCX and PDF are being generated",
            },
            {
              id: "verify",
              title: "Verification queued",
              detail: "Check pages, citations, references and rendering",
            },
            {
              id: "publish",
              title: "Publication pending",
              detail: "Version 3 appears only after checks pass",
            },
          ],
          preserved: {
            title: "Current version preserved",
            detail:
              "You can continue using version 2 while the new output is generated.",
          },
        }}
      />
    ),
  },
  {
    slug: "filing-receipt",
    figmaId: "04.07",
    figmaNode: "1064:146629",
    title: "Filing and download receipts",
    Screen: () => (
      <FilingReceiptScreen
        unavailable={fixtureUnavailable}
        links={{
          artifact: fixtureHref("word-document"),
          approval: fixtureHref("review-artifact-filing"),
        }}
        view={{
          heading: {
            title: "Meeting brief is filed",
            description: "Receipt FL-1042 · Completed at 10:51 AM",
          },
          saved: {
            title: "Saved successfully",
            detail:
              "Anduril meeting brief — 9 Oct 2026.docx is now in the selected client folder.",
          },
          receipt: [
            { label: "Action", value: "File artifact version" },
            { label: "Artifact", value: "meeting-brief-v2.docx · v2" },
            {
              label: "Destination",
              value: "Anduril / Documents / Meeting briefs",
            },
            { label: "Approved by", value: "Jordan Clayton · 10:50 AM" },
            {
              label: "Outcome",
              value: "Saved · Original source restrictions retained",
            },
            {
              label: "Retry behavior",
              value: "Existing receipt returned; no second copy created",
            },
          ],
          download: meetingBriefDownload,
          toasts: [
            {
              id: "filed",
              title: "Artifact filed",
              detail:
                "meeting-brief-v2.docx · Anduril / Meeting briefs · Source restrictions retained",
              status: "Saved",
              backToArtifact: true,
            },
            {
              id: "download",
              title: "Download ready",
              detail: "meeting-brief-v2.docx · Exact version 2",
            },
          ],
        }}
      />
    ),
  },
];
