"use client";
import { DocumentLibrary } from "../../../meri/files/DocumentLibrary";
import { OfficeWorkspaceLinks } from "../../../meri/office/OfficeWorkspaceLink";
import styles from "./office-workspace.module.css";

/** The Workspace's Office documents: the immutable Word, Excel and PowerPoint versions Meri generated or a person
 * imported, listed from the same artifact library with their revision history, each opening in the editor here. */
export function OfficeDocuments({
  account,
  clientId,
}: {
  account: { tenantId: string; actorId: string };
  clientId?: string;
}) {
  return (
    <section aria-label="Office documents">
      <h2 className={styles.sectionHeading}>Office documents</h2>
      <p className={styles.muted}>
        Word, Excel and PowerPoint documents open here in the Office editor.
        Each revision is immutable; Save keeps a private draft and Publish
        revision creates the next one.
      </p>
      <OfficeWorkspaceLinks enabled>
        <DocumentLibrary
          account={account}
          {...(clientId ? { clientId } : {})}
          office
        />
      </OfficeWorkspaceLinks>
    </section>
  );
}
