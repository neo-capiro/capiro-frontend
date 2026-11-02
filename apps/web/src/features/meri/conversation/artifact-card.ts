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

/** The card's title and one-line description: the file's own name, kind, size and version once its details are read. */
export function artifactCardSummary(preview: ArtifactPreview | null): {
  title: string;
  description: string;
} {
  if (!preview)
    return {
      title: "Generated file",
      description: "Reading the file details…",
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
