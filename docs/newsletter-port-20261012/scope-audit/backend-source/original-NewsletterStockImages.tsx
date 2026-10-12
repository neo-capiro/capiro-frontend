import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Modal } from './controls.js';
import {
  newsletterError,
  type NewsletterAsset,
  type NewsletterClient,
  type NewsletterStockImage,
  type NewsletterStockPage,
  type NewsletterStockStatus,
} from './api.js';

export function NewsletterStockImages({
  api,
  onInsert,
  onBusy,
}: {
  api: NewsletterClient;
  onInsert: (asset: NewsletterAsset) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [status, setStatus] = useState<NewsletterStockStatus | null>(null);
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState({ search: '', page: 1 });
  const [pageInput, setPageInput] = useState('1');
  const [result, setResult] = useState<NewsletterStockPage | null>(null);
  const [selected, setSelected] = useState<NewsletterStockImage | null>(null);
  const [details, setDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const pending = useRef(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    setStatus(null);
    setLoading(true);
    setError('');
    api
      .stockImageStatus()
      .then((value) => {
        if (!cancelled) {
          setStatus(value);
          if (!value.available) setLoading(false);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setError(newsletterError(error));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api, reload]);
  useEffect(() => {
    if (!status?.available) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    setResult(null);
    setSelected(null);
    api
      .stockImages(query.search, query.page)
      .then((value) => {
        if (!cancelled) {
          setResult(value);
          setLoading(false);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setError(newsletterError(error));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api, status, query]);
  const pages = Math.ceil((result?.total ?? 0) / 10);
  const page = (value: number) => {
    setSelected(null);
    setError('');
    setDetails(false);
    setPageInput(String(value));
    setQuery((previous) => ({ ...previous, page: value }));
  };
  const commitPage = () => {
    const value = Number(pageInput);
    if (Number.isInteger(value) && value >= 1 && value <= pages) page(value);
    else setPageInput(String(query.page));
  };
  const insert = async () => {
    if (!selected || pending.current || loading || !status?.available) return;
    pending.current = true;
    setBusy(true);
    onBusy(true);
    setError('');
    try {
      const asset = await api.importStockImage(selected.id);
      if (active.current) onInsert(asset);
    } catch (error) {
      if (active.current) setError(newsletterError(error));
    } finally {
      pending.current = false;
      if (active.current) {
        setBusy(false);
        onBusy(false);
      }
    }
  };
  const disabled = busy || loading || !!error || !result;
  return (
    <div className="nl-studio-stock-container">
      <div
        className="nl-modal-body nl-studio-uploads"
        role="tabpanel"
        id="nl-studio-stock"
        aria-labelledby="nl-studio-stock-tab"
        aria-busy={loading || busy}
      >
        <form
          className="nl-studio-toolbar"
          onSubmit={(event) => {
            event.preventDefault();
            if (busy || !status?.available) return;
            setSelected(null);
            setDetails(false);
            setPageInput('1');
            setQuery({ search: draft.trim(), page: 1 });
          }}
        >
          <label className="nl-studio-search">
            Search stock images
            <input
              type="search"
              maxLength={100}
              placeholder="Search stock images"
              value={draft}
              disabled={busy || !status?.available}
              onChange={(event) => setDraft(event.target.value)}
            />
          </label>
          <button type="submit" disabled={busy || !status?.available}>
            Search
          </button>
        </form>
        <p>
          <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer">
            Photos provided by Pexels
          </a>
        </p>
        {loading && <p role="status">Loading stock images…</p>}
        {!loading && status && !status.available && <p role="status">{status.reason}</p>}
        {error && (
          <div role="alert">
            <p>{error}</p>
            {!busy && <button onClick={() => setReload((value) => value + 1)}>Try again</button>}
          </div>
        )}
        {!loading && !error && result && !result.items.length && (
          <p role="status">No stock images found. Try another search.</p>
        )}
        {selected && !loading && (
          <div className="nl-studio-display">
            <span role="status">1 item selected</span>
            <button
              disabled={busy}
              onClick={() => {
                setSelected(null);
                setDetails(false);
              }}
            >
              Deselect all
            </button>
            <button disabled={busy} onClick={() => setDetails(true)}>
              View details
            </button>
          </div>
        )}
        {!loading && !error && (
          <div className="nl-asset-grid nl-stock-grid" aria-label="Stock images">
            {result?.items.map((image) => (
              <div className="nl-stock-card" key={image.id}>
                <button
                  aria-label={`Select ${image.title || 'stock photo'} ${image.id}`}
                  aria-pressed={selected?.id === image.id}
                  disabled={busy}
                  onClick={() =>
                    setSelected((previous) => (previous?.id === image.id ? null : image))
                  }
                >
                  <img
                    src={image.thumbnailUrl}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  <span>{image.title || 'Stock photo'}</span>
                </button>
                <a href={image.sourceUrl} target="_blank" rel="noopener noreferrer">
                  Photo by {image.photographer} on Pexels
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
      <footer className="nl-studio-footer">
        <div className="nl-studio-pagination">
          <label>
            Items per page{' '}
            <select aria-label="Items per page" value="10" disabled>
              <option>10</option>
            </select>
          </label>
          <span>
            Showing results{' '}
            <strong>
              {result?.total ? (query.page - 1) * 10 + 1 : 0} –{' '}
              {Math.min(query.page * 10, result?.total ?? 0)} of {result?.total ?? 0}
            </strong>
          </span>
          <div className="nl-studio-page-buttons">
            <button
              aria-label="Go to first page"
              disabled={disabled || query.page === 1}
              onClick={() => page(1)}
            >
              <ChevronsLeft size={18} />
            </button>
            <button
              aria-label="Go to previous page"
              disabled={disabled || query.page === 1}
              onClick={() => page(query.page - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <label>
              Page{' '}
              <input
                aria-label="Page number"
                type="number"
                min={1}
                max={pages || 1}
                value={pageInput}
                disabled={disabled || !pages}
                onChange={(event) => setPageInput(event.target.value)}
                onBlur={commitPage}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    commitPage();
                  }
                }}
              />
            </label>
            <span>of {pages}</span>
            <button
              aria-label="Go to next page"
              disabled={disabled || query.page >= pages}
              onClick={() => page(query.page + 1)}
            >
              <ChevronRight size={18} />
            </button>
            <button
              aria-label="Go to last page"
              disabled={disabled || query.page >= pages}
              onClick={() => page(pages)}
            >
              <ChevronsRight size={18} />
            </button>
          </div>
        </div>
        <div className="nl-studio-insert">
          <span>{selected?.title}</span>
          <button
            className="nl-primary"
            disabled={busy || loading || !selected || !status?.available}
            onClick={() => void insert()}
          >
            {busy ? 'Adding image…' : 'Insert'}
          </button>
        </div>
      </footer>
      {details && selected && (
        <Modal
          title="Stock image details"
          onClose={() => {
            if (!pending.current) setDetails(false);
          }}
        >
          <div className="nl-modal-body nl-stock-details">
            <img src={selected.imageUrl} alt={selected.title} referrerPolicy="no-referrer" />
            <p>{selected.title}</p>
            <p>
              {selected.width} × {selected.height} pixels
            </p>
            <a href={selected.sourceUrl} target="_blank" rel="noopener noreferrer">
              Photo by {selected.photographer} on Pexels
            </a>
            <p>Insert saves a copy to your newsletter images.</p>
            {error && <p role="alert">{error}</p>}
          </div>
          <footer>
            <button disabled={busy} onClick={() => setDetails(false)}>
              Close
            </button>
            <button className="nl-primary" disabled={busy} onClick={() => void insert()}>
              {busy ? 'Adding image…' : 'Insert'}
            </button>
          </footer>
        </Modal>
      )}
    </div>
  );
}
