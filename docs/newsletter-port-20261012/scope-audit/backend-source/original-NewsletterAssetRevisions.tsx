import { useEffect, useState } from 'react';
import {
  newsletterError,
  type NewsletterAssetDetails,
  type NewsletterAssetRevisionPage,
  type NewsletterClient,
} from './api.js';

export function NewsletterAssetRevisions({
  api,
  assetId,
  selectedId,
  disabled,
  refresh,
  onSelect,
}: {
  api: NewsletterClient;
  assetId: string;
  selectedId: string;
  disabled: boolean;
  refresh: number;
  onSelect: (asset: NewsletterAssetDetails) => void;
}) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<NewsletterAssetRevisionPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let canceled = false;
    setLoading(true);
    setError('');
    api.assetRevisions(assetId, page).then(
      (value) => {
        if (canceled) return;
        const lastPage = Math.max(1, Math.ceil(value.total / value.pageSize));
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setResult(value);
        setLoading(false);
      },
      (error) => {
        if (canceled) return;
        setError(newsletterError(error));
        setLoading(false);
      },
    );
    return () => {
      canceled = true;
    };
  }, [api, assetId, page, refresh, reload]);
  return (
    <section className="nl-asset-revisions" aria-label="Revision History">
      <h4>Revision History</h4>
      <p className="nl-muted">
        Choose a version to preview, then Insert to use it in your newsletter.
      </p>
      {loading && <p role="status">Loading image versions…</p>}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button disabled={disabled} onClick={() => setReload((value) => value + 1)}>
            Try history again
          </button>
        </div>
      )}
      {!!result && !error && (
        <>
          <div className="nl-asset-revision-grid">
            {result.items.map((item) => {
              const label =
                item.revisionNumber === 1 ? 'Original' : `Version ${item.revisionNumber}`;
              return (
                <button
                  key={item.id}
                  aria-label={`Preview ${label}`}
                  aria-pressed={selectedId === item.id}
                  disabled={disabled || loading}
                  onClick={() => onSelect(item)}
                >
                  <img src={item.url} alt="" />
                  <span>
                    {label}
                    {item.currentRevision ? ' · Latest' : ''}
                  </span>
                  <small>{new Date(item.createdAt).toLocaleString()}</small>
                </button>
              );
            })}
          </div>
          <div className="nl-asset-revision-pages">
            <button
              disabled={disabled || loading || page <= 1}
              onClick={() => setPage((value) => value - 1)}
            >
              Previous versions
            </button>
            <span>
              Page {page} of {Math.max(1, Math.ceil(result.total / result.pageSize))}
            </span>
            <button
              disabled={disabled || loading || page * result.pageSize >= result.total}
              onClick={() => setPage((value) => value + 1)}
            >
              Next versions
            </button>
          </div>
        </>
      )}
    </section>
  );
}
