/* eslint-disable @next/next/no-img-element */
import { Button } from "@capiro/ui/button";
import type { WorkspaceDraft } from "./contracts";
import styles from "./workspace-documents.module.css";

function DocumentUpdated({ value }: { value: string }) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()))
    return <span>Updated time unavailable</span>;
  return (
    <time dateTime={date.toISOString()} title={date.toLocaleString()}>
      {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
    </time>
  );
}

export function WorkspaceDocumentTable({
  rows,
  destination,
}: {
  rows: WorkspaceDraft[];
  destination?: string;
}) {
  return (
    <div className={`tableWrap ${styles.container}`}>
      <table className={styles.table}>
        <caption className="srOnly">Current Workspace documents</caption>
        <thead>
          <tr>
            <th scope="col">Document</th>
            <th scope="col">Status</th>
            <th scope="col">Updated</th>
            <th scope="col">
              <span className="srOnly">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((draft) => (
            <tr key={draft.id} data-destination={Boolean(destination)}>
              <td className={styles.documentCell}>
                <div className={styles.documentSummary}>
                  <img
                    className={styles.icon}
                    src="/design/411-52106-imgIconFileText.svg"
                    width={16}
                    height={16}
                    alt=""
                  />
                  <div className={styles.documentInfo}>
                    <strong className={styles.title}>{draft.docTitle}</strong>
                    <p className={styles.product}>
                      {draft.product ?? "Document"}
                    </p>
                  </div>
                </div>
              </td>
              <td className={styles.statusCell}>
                <span className={styles.status} data-status={draft.status}>
                  {draft.status === "complete" ? "Completed" : "Draft"}
                </span>
              </td>
              <td className={styles.updatedCell}>
                <DocumentUpdated value={draft.updatedAt} />
              </td>
              <td className={styles.openCell}>
                {destination ? (
                  <Button
                    asChild
                    variant="ghost"
                    className={`button ghost ${styles.action}`}
                  >
                    <a href={`${destination}/workspace/${draft.id}`}>
                      Open workspace
                    </a>
                  </Button>
                ) : (
                  <small>Workspace destination unavailable</small>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="empty">No documents can be matched to this client.</p>
      )}
    </div>
  );
}
