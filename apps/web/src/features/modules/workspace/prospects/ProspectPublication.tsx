"use client";
import type { SavedVersion } from "@/shared/capiro/operations/workspace-documents";
import { ActionButton } from "@/shared/module-ui";
import type { ProspectWriter } from "./recovery-authority";
import type { ProspectDraftScope } from "./manual-draft";
import { publicationSourceEligible } from "./publication";
import { useProspectPublication } from "./useProspectPublication";

export function ProspectPublication({
  scope,
  actor,
  version,
  clean,
}: {
  scope: ProspectDraftScope;
  actor: ProspectWriter;
  version: SavedVersion;
  clean: boolean;
}) {
  const publication = useProspectPublication(scope, actor);
  const current = publication.state?.current;
  if (!publication.ready)
    return (
      <section aria-label="Prospect publication">
        <p role={publication.recoveryError ? "alert" : "status"}>
          {publication.recoveryError ?? "Checking publication and recovery…"}
        </p>
        {publication.recoveryError && (
          <ActionButton onClick={publication.retry}>
            Retry publication access
          </ActionButton>
        )}
      </section>
    );
  return (
    <section aria-label="Prospect publication">
      <h3>Publish saved revision</h3>
      <p>
        Publishing preserves the selected saved revision in this document’s
        history. It does not share or send it.
      </p>
      {publication.state && (
        <p>
          {current
            ? `Current publication: ${new Date(current.publishedAt).toLocaleString()}`
            : "No published revision yet."}
        </p>
      )}
      {current && (
        <details>
          <summary>Publication provenance</summary>
          <dl>
            <dt>Published version</dt>
            <dd>{current.versionId}</dd>
            <dt>Saved source version</dt>
            <dd>{current.sourceVersionId}</dd>
            <dt>Publisher</dt>
            <dd>{current.actorId}</dd>
          </dl>
        </details>
      )}
      {publication.pending && <p role="status">Checking publication…</p>}
      {publication.error && <p role="alert">{publication.error}</p>}
      {publication.message && <p role="status">{publication.message}</p>}
      {!clean && (
        <p>Save your current edits before publishing a saved revision.</p>
      )}
      {publication.retained ? (
        <>
          <p>
            An earlier publication request is unconfirmed. Recovery may complete
            that exact original request.
          </p>
          <ActionButton
            disabled={publication.pending}
            onClick={publication.recover}
          >
            Recover original publication
          </ActionButton>
        </>
      ) : (
        <>
          {!publicationSourceEligible(
            version,
            publication.state?.stateHash,
          ) && (
            <p>Save the current document, then select that saved version.</p>
          )}
          <ActionButton
            disabled={
              publication.pending ||
              current?.sourceVersionId === version.id ||
              !clean ||
              !publicationSourceEligible(version, publication.state?.stateHash)
            }
            onClick={() => publication.publish(version)}
          >
            {current?.sourceVersionId === version.id
              ? "This saved revision is published"
              : "Publish this saved revision"}
          </ActionButton>
        </>
      )}
      <ActionButton
        disabled={publication.pending}
        onClick={publication.refresh}
      >
        Refresh publication status
      </ActionButton>
    </section>
  );
}
