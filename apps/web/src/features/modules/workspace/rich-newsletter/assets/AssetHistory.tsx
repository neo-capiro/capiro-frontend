import { useEffect, useRef, useState } from "react";
import type { NewsletterAssetDetails } from "@capiro/shared/newsletter";
import { useCapiroQuery } from "../../../../../shared/capiro/queries";
import { ActionButton, Badge, Panel } from "../../../../../shared/module-ui";
import { assetName } from "./AssetLibrary";
import styles from "./assets.module.css";

/** Read-only metadata; no request/root echo exists and rows never authorize Insert. */
export function AssetHistory({ image }: { image: NewsletterAssetDetails }) {
  const [page, setPage] = useState(1);
  const heading = useRef<HTMLParagraphElement>(null);
  const history = useCapiroQuery("workspace.richNewsletter.assets.revisions", {
    params: { id: image.id },
    query: { page, pageSize: 10 },
  });
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const data = history.data;
  return (
    <div className={styles.panel}>
      <Panel title="Image versions">
        <p className={styles.file} tabIndex={-1} ref={heading}>
          {assetName(image.name)}
        </p>
        {history.loading && <p role="status">Loading saved versions…</p>}
        {history.error && (
          <p role="alert" className={styles.notice}>
            Saved versions unavailable. Refresh to try this read again.
          </p>
        )}
        {data && (
          <>
            <p className={styles.page}>
              Page {data.page} · {data.total} saved versions reported
            </p>
            {!data.items.length && (
              <p role="status">No saved versions on this page.</p>
            )}
            <ul className={styles.items} aria-label="Saved image versions">
              {data.items.map((item) => (
                <li key={item.id} className={styles.item}>
                  {item.currentRevision && <Badge>Current image</Badge>}
                  <h3>Version {item.revisionNumber}</h3>
                  <p>{assetName(item.name)}</p>
                  <p>{new Date(item.createdAt).toLocaleString()}</p>
                  <p>
                    {item.sizeBytes.toLocaleString()} bytes · {item.mimeType}
                  </p>
                </li>
              ))}
            </ul>
            <div className={styles.actions}>
              <ActionButton
                disabled={data.page <= 1}
                onClick={() => setPage(data.page - 1)}
              >
                Previous versions
              </ActionButton>
              <ActionButton
                disabled={
                  data.page >= 100_000 ||
                  data.page * data.pageSize >= data.total
                }
                onClick={() => setPage(data.page + 1)}
              >
                Next versions
              </ActionButton>
            </div>
          </>
        )}
        <ActionButton onClick={history.reload}>Refresh versions</ActionButton>
      </Panel>
    </div>
  );
}
