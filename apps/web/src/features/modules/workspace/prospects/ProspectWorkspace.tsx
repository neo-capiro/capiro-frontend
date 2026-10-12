"use client";
import Link from "next/link";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import { ActionButton, Panel, StatusPanel } from "../../../../shared/module-ui";
import { ProspectDraftCreate } from "./ProspectDraftCreate";
import styles from "../workspace.module.css";

export function ProspectWorkspace({
  prospectId,
  onOpen,
}: {
  prospectId: string;
  onOpen: (id: string) => void;
}) {
  const me = useCapiroQuery("me.read", {});
  const query = useCapiroQuery("workspace.prospect.drafts", {
    query: { prospectId },
  });
  const mismatch =
    me.data &&
    query.data &&
    query.data.drafts.some(
      (draft) =>
        draft.tenantId !== me.data?.tenant.id ||
        draft.prospectId !== prospectId,
    );
  const current =
    me.data &&
    query.data &&
    !mismatch &&
    !me.loading &&
    !query.loading &&
    !me.error &&
    !query.error;
  return (
    <section className={styles.screen}>
      <header className={styles.heading}>
        <div>
          <Link href={`/portfolio/prospects/${encodeURIComponent(prospectId)}`}>
            ← Prospect
          </Link>
          <h1>Prospect Workspace</h1>
          <p>
            Manual documents for this exact prospect. Conversion retains their
            origin.
          </p>
        </div>
        <ActionButton
          onClick={() => {
            me.reload();
            query.reload();
          }}
        >
          Refresh documents
        </ActionButton>
      </header>
      <StatusPanel
        loading={me.loading || query.loading}
        error={
          me.error ??
          query.error ??
          (mismatch
            ? new Error(
                "The document list does not match this prospect and tenant.",
              )
            : undefined)
        }
        onRetry={() => {
          me.reload();
          query.reload();
        }}
      >
        {current && (
          <>
            <Panel title="Documents">
              <div className={styles.form}>
                {query.data!.drafts.length ? (
                  query.data!.drafts.map((draft) => (
                    <article key={draft.id}>
                      <h3>{draft.docTitle}</h3>
                      <p>
                        {draft.status} ·{" "}
                        {draft.versions[0]
                          ? `Last saved version: ${new Date(draft.versions[0].createdAt).toLocaleString()}`
                          : "No saved version yet"}
                      </p>
                      <ActionButton onClick={() => onOpen(draft.id)}>
                        Open {draft.docTitle}
                      </ActionButton>
                    </article>
                  ))
                ) : (
                  <p>No documents are available for this prospect.</p>
                )}
              </div>
            </Panel>
            {me.data!.user.clerkUserId && (
              <Panel title="New manual document">
                <ProspectDraftCreate
                  key={`${me.data!.tenant.id}:${me.data!.user.id}:${me.data!.user.clerkUserId}:${prospectId}`}
                  prospectId={prospectId}
                  tenantId={me.data!.tenant.id}
                  ownerId={me.data!.user.clerkUserId}
                  userId={me.data!.user.id}
                  onCreated={onOpen}
                />
              </Panel>
            )}
          </>
        )}
      </StatusPanel>
      <p>
        Current membership, prospect status, converted-client access and
        document permissions are checked by the service. Ownership alone does
        not grant access.
      </p>
      <div className={styles.actions}>
        <ActionButton disabled>Sharing unavailable</ActionButton>
        <ActionButton disabled>Sending unavailable</ActionButton>
        <ActionButton disabled>Generation unavailable</ActionButton>
      </div>
    </section>
  );
}
