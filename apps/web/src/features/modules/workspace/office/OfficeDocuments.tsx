"use client";
import { useRouter } from "next/navigation";
import { DocumentLibrary } from "../../../meri/files/DocumentLibrary";
import { officeWorkspaceHref } from "../../../meri/office/OfficeWorkspaceLink";
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
  const router = useRouter();
  return (
    <section aria-label="Office documents">
      <h2 className={styles.sectionHeading}>Office documents</h2>
      <p className={styles.muted}>
        Word, Excel and PowerPoint documents Meri generated or you imported,
        from your newest saved conversation; choose another conversation or
        scope below to list more. Each opens here in the Office editor; every
        revision is immutable, Save keeps a private draft and Publish revision
        creates the next one.
      </p>
      <DocumentLibrary
        account={account}
        {...(clientId ? { clientId } : {})}
        officeOpen={(version) => router.push(officeWorkspaceHref(version))}
        autoOpen
      />
    </section>
  );
}
