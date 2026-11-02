import type { ArtifactPreview } from "../../../shared/meri-documents/artifact-access";
import type { OfficeTarget } from "../office/OfficeWorkspaceLink";

/** The conversation the card is shown in; a General conversation has no client. */
export type ArtifactCardScope = Readonly<{
  conversationId: string;
  clientId: string | null;
}>;

export const formatBytes = (bytes: number) =>
  bytes < 1024
    ? `${bytes} B`
    : bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const labels: Readonly<Record<string, string>> = {
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "Word document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    "Excel workbook",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "PowerPoint deck",
  "application/pdf": "PDF",
  "text/plain": "Text file",
  "application/xml": "XML",
  "application/zip": "ZIP archive",
};
export const mimeLabel = (mimeType: string) => labels[mimeType] ?? mimeType;

const when = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});
/** "Original" or "Revision" for a generated version, "Captured" for a workspace file, with its creation time. */
export const versionLabel = (preview: ArtifactPreview) =>
  `${
    preview.kind === "generated"
      ? preview.parentVersionId === null
        ? "Original"
        : "Revision"
      : "Captured"
  }, ${when.format(new Date(preview.createdAt))}`;

/** The card's own command; the newest command supersedes an older one. */
export type ArtifactCardStatus =
  | { kind: "idle" }
  | { kind: "working"; action: "preview" | "download" }
  | { kind: "failed"; action: "preview" | "download"; code: string }
  | { kind: "downloaded"; filename: string; inspected: boolean };

/**
 * Where the card's details stand. The mount read runs only while the card is idle with nothing read; a
 * Download started before it answered cancels it, so after that download (or any failure) the details are
 * unread until the person asks again.
 */
export type ArtifactDetails = "read" | "reading" | "refused" | "unread";
export function artifactDetails(
  preview: ArtifactPreview | null,
  status: ArtifactCardStatus,
): ArtifactDetails {
  if (preview) return "read";
  if (
    status.kind === "idle" ||
    (status.kind === "working" && status.action === "preview")
  )
    return "reading";
  if (status.kind === "failed" && status.action === "preview") return "refused";
  return "unread";
}

/** "Read details again" is offered whenever nothing is read and no command is in flight. */
export const offersReadAgain = (
  preview: ArtifactPreview | null,
  status: ArtifactCardStatus,
) => {
  const details = artifactDetails(preview, status);
  return (
    (details === "refused" || details === "unread") && status.kind !== "working"
  );
};

/** The card's outcome line; a download only claims a match with an inspected version when one was read. */
export const artifactOutcome = (status: ArtifactCardStatus) =>
  status.kind === "failed"
    ? `${status.action === "preview" ? "File details" : "Download"} unavailable (${status.code}). Nothing was substituted.`
    : status.kind === "downloaded"
      ? status.inspected
        ? `Downloaded ${status.filename}; its bytes matched the inspected version.`
        : `Downloaded ${status.filename}.`
      : "";

const unreadDescription: Readonly<
  Record<Exclude<ArtifactDetails, "read">, string>
> = {
  reading: "Reading the file details…",
  refused: "The file details could not be read.",
  unread: "The file details have not been read.",
};

/** The card's title and one-line description: the file's own name, kind, size and version once its details are read. */
export function artifactCardSummary(
  preview: ArtifactPreview | null,
  details: Exclude<ArtifactDetails, "read"> = "reading",
): {
  title: string;
  description: string;
} {
  if (!preview)
    return {
      title: "Generated file",
      description: unreadDescription[details],
    };
  return {
    title: preview.filename,
    description: `${mimeLabel(preview.mimeType)} · ${formatBytes(preview.bytes)} · ${versionLabel(preview)}`,
  };
}

/**
 * What the Workspace link needs of a published version: the card knows the conversation and client it is
 * shown in, and the read details give the type. Only a generated document is an Office target.
 */
export function officeTargetFor(
  scope: ArtifactCardScope,
  versionId: string,
  preview: ArtifactPreview | null,
): OfficeTarget | null {
  if (!preview || preview.kind !== "generated") return null;
  return {
    versionId,
    mimeType: preview.mimeType,
    binding: { conversationId: scope.conversationId },
    scopes: scope.clientId
      ? [{ kind: "client", resourceId: scope.clientId }]
      : [],
  };
}
