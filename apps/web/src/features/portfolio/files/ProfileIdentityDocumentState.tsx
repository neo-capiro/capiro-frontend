import { QueryState } from "@/shared/portfolio/ui/QueryState";
import type { useProfileIdentityDocument } from "./useProfileIdentityDocument";

export function ProfileIdentityDocumentState({
  document,
}: {
  document: ReturnType<typeof useProfileIdentityDocument>;
}) {
  const file = document.attachment;
  return (
    <div className="stack" aria-live="polite">
      {document.pending && (
        <p role="status">{document.stage ?? "Preparing document"}</p>
      )}
      <QueryState error={document.error} />
      {file && (
        <p role="status">
          {document.ready
            ? "The private document is ready for company matching. Its text will be read when you continue."
            : `Document status: ${file.blockedReason ?? file.lifecycleStatus}. Company matching is waiting for the document to become usable.`}
        </p>
      )}
      {file?.scanDisclosure && (
        <small className="muted">{file.scanDisclosure}</small>
      )}
      {file && !document.ready && (
        <button
          type="button"
          className="button ghost"
          onClick={() => void document.refresh()}
        >
          Check document status
        </button>
      )}
    </div>
  );
}
