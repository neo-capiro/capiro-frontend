import { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Grid2X2,
  List,
  Upload,
  Image,
} from 'lucide-react';
import { Modal, TextField } from './controls.js';
import { NewsletterAssetDetails, copyNewsletterAssetUrl } from './NewsletterAssetDetails.js';
import { NewsletterAssetFolders } from './NewsletterAssetFolders.js';
import { NewsletterStockImages } from './NewsletterStockImages.js';
import {
  newsletterError,
  type NewsletterAsset,
  type NewsletterAssetPage,
  type NewsletterAssetQuery,
  type NewsletterClient,
} from './api.js';

export function NewsletterContentStudio({
  api,
  onClose,
  onInsert,
}: {
  api: NewsletterClient;
  onClose: () => void;
  onInsert: (asset: NewsletterAsset) => void;
}) {
  const [query, setQuery] = useState<NewsletterAssetQuery>({
    page: 1,
    pageSize: 25,
    search: '',
    sort: 'newest',
  });
  const [result, setResult] = useState<NewsletterAssetPage | null>(null);
  const [selection, setSelection] = useState<NewsletterAsset[]>([]);
  const selected = selection.length === 1 ? selection[0] : null;
  const [details, setDetails] = useState<NewsletterAsset | null>(null);
  const [fileActions, setFileActions] = useState(false);
  const [copyAsset, setCopyAsset] = useState<NewsletterAsset | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [actions, setActions] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importError, setImportError] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [reload, setReload] = useState(0);
  const [pageInput, setPageInput] = useState('1');
  const [notice, setNotice] = useState('');
  const [source, setSource] = useState<'uploads' | 'stock'>('uploads');
  const [uploadProgress, setUploadProgress] = useState<{
    completed: number;
    total: number;
    name: string;
  } | null>(null);
  const [uploadFailures, setUploadFailures] = useState<{ name: string; message: string }[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const pages = Math.ceil((result?.total ?? 0) / query.pageSize);
  const setPage = (page: number) => {
    setQuery((previous) => ({ ...previous, page }));
    setPageInput(String(page));
    setSelection([]);
    setFileActions(false);
  };
  useEffect(() => {
    let canceled = false;
    setLoading(true);
    setError('');
    const timer = window.setTimeout(
      () => {
        api
          .assetPage(query)
          .then((page) => {
            if (canceled) return;
            if (!page.total && query.page > 1) {
              setPage(1);
              return;
            }
            if (page.total && (query.page - 1) * query.pageSize >= page.total) {
              setPage(Math.ceil(page.total / query.pageSize));
              return;
            }
            setResult(page);
            setLoading(false);
          })
          .catch((error) => {
            if (!canceled) {
              setError(newsletterError(error));
              setLoading(false);
            }
          });
      },
      query.search ? 200 : 0,
    );
    return () => {
      canceled = true;
      window.clearTimeout(timer);
    };
  }, [api, query, reload]);
  const filter = (next: Partial<NewsletterAssetQuery>) => {
    setQuery((previous) => ({ ...previous, ...next, page: 1 }));
    setPageInput('1');
    setSelection([]);
    setFileActions(false);
  };
  const add = async (operation: () => Promise<NewsletterAsset>, imported = false) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    setImportError('');
    setUploadFailures([]);
    try {
      const asset = await operation();
      filter({ search: '', sort: 'newest' });
      setSelection([asset]);
      setReload((value) => value + 1);
      setImportOpen(false);
      setImportUrl('');
      setNotice(`${asset.name} added. Select Insert to use it in your newsletter.`);
    } catch (error) {
      if (imported) setImportError(newsletterError(error));
      else setError(newsletterError(error));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const uploadFiles = async (files: File[]) => {
    if (pending.current || !files.length) return;
    pending.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    setUploadFailures([]);
    setActions(false);
    const folderId = query.folder && query.folder !== 'unfiled' ? query.folder : undefined;
    const uploaded: NewsletterAsset[] = [];
    const failures: { name: string; message: string }[] = [];
    try {
      for (const [index, file] of files.entries()) {
        setUploadProgress({ completed: index, total: files.length, name: file.name });
        try {
          if (!file.size) throw new Error('Choose an image that is not empty.');
          if (file.size > 10 * 1024 * 1024) throw new Error('Images must be 10 MB or smaller.');
          const asset = folderId ? await api.upload(file, folderId) : await api.upload(file);
          uploaded.push(asset);
        } catch (error) {
          failures.push({ name: file.name, message: newsletterError(error) });
          setUploadFailures([...failures]);
        }
        setUploadProgress({ completed: index + 1, total: files.length, name: file.name });
      }
      if (uploaded.length) {
        filter({ search: '', sort: 'newest' });
        setSelection(uploaded.length === 1 ? uploaded : []);
        setNotice(
          uploaded.length === 1
            ? `${uploaded[0]!.name} added. Select Insert to use it in your newsletter.`
            : `${uploaded.length} images added. Select an image, then Insert to use it in your newsletter.`,
        );
      }
      setReload((value) => value + 1);
    } finally {
      setUploadProgress(null);
      pending.current = false;
      setBusy(false);
    }
  };
  const commitPage = () => {
    const requested = Number(pageInput);
    if (Number.isInteger(requested) && requested >= 1 && requested <= pages) setPage(requested);
    else setPageInput(String(query.page));
  };
  const remove = async () => {
    if (pending.current || !selection.length) return;
    pending.current = true;
    setBusy(true);
    setDeleteError('');
    try {
      const result = await api.deleteAssets(selection.map((asset) => asset.id));
      setSelection([]);
      setDeleteOpen(false);
      setFileActions(false);
      setReload((value) => value + 1);
      setNotice(
        `${result.deleted} ${result.deleted === 1 ? 'file' : 'files'} deleted from the library.`,
      );
    } catch (error) {
      setDeleteError(newsletterError(error));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return (
    <Modal
      title="Content Studio"
      wide
      className="nl-content-studio"
      onClose={() => {
        if (!pending.current) onClose();
      }}
    >
      <input
        ref={fileInput}
        type="file"
        hidden
        multiple
        disabled={busy}
        accept="image/png,image/jpeg,image/gif,image/webp"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = '';
          void uploadFiles(files);
        }}
      />
      <div className="nl-studio-layout">
        <aside className="nl-studio-sources" aria-label="Content sources">
          <div role="tablist" aria-label="Content Studio sources">
            <button
              role="tab"
              aria-selected={source === 'uploads'}
              disabled={busy}
              onClick={() => setSource('uploads')}
              aria-controls="nl-studio-uploads"
              id="nl-studio-uploads-tab"
            >
              <Upload size={19} /> Uploads
            </button>
            <button
              role="tab"
              aria-selected={source === 'stock'}
              aria-controls="nl-studio-stock"
              id="nl-studio-stock-tab"
              disabled={busy}
              onClick={() => {
                setSource('stock');
                setSelection([]);
                setFileActions(false);
                setActions(false);
              }}
            >
              <Image size={19} /> Stock images
            </button>
          </div>
        </aside>
        {source === 'stock' ? (
          <NewsletterStockImages
            api={api}
            onInsert={onInsert}
            onBusy={(value) => {
              pending.current = value;
              setBusy(value);
            }}
          />
        ) : (
          <div
            className="nl-modal-body nl-studio-uploads"
            role="tabpanel"
            id="nl-studio-uploads"
            aria-labelledby="nl-studio-uploads-tab"
            aria-busy={loading || busy}
          >
            <div className="nl-studio-toolbar">
              <label className="nl-studio-search">
                Search files
                <input
                  type="search"
                  value={query.search}
                  maxLength={200}
                  placeholder="Search files"
                  disabled={busy}
                  onChange={(event) => filter({ search: event.target.value })}
                />
              </label>
              <div className="nl-studio-upload">
                <button
                  className="nl-primary"
                  disabled={busy}
                  onClick={() => fileInput.current?.click()}
                >
                  {uploadProgress ? 'Uploading…' : busy ? 'Adding image…' : 'Upload'}
                </button>
                <button
                  className="nl-primary"
                  aria-label="Actions"
                  aria-haspopup="menu"
                  aria-expanded={actions}
                  disabled={busy}
                  onClick={() => setActions(!actions)}
                >
                  <ChevronDown size={16} />
                </button>
                {actions && (
                  <div role="menu" className="nl-studio-menu">
                    <button
                      role="menuitem"
                      onClick={() => {
                        setActions(false);
                        setImportOpen(true);
                        setImportError('');
                      }}
                    >
                      Import from URL
                    </button>
                  </div>
                )}
              </div>
            </div>
            <NewsletterAssetFolders
              api={api}
              folder={query.folder}
              selectedIds={loading || error ? [] : selection.map((asset) => asset.id)}
              busy={busy}
              pending={pending}
              onBusy={setBusy}
              onFilter={(folder) => filter({ folder })}
              onComplete={(message, options) => {
                if (options?.folder !== undefined) filter({ folder: options.folder });
                else if (options?.clearSelection !== false) setSelection([]);
                setNotice(message);
                setReload((value) => value + 1);
              }}
            />
            <div className="nl-studio-display">
              <label>
                Sort by{' '}
                <select
                  aria-label="Sort by"
                  value={query.sort}
                  disabled={busy}
                  onChange={(event) =>
                    filter({ sort: event.target.value as NewsletterAssetQuery['sort'] })
                  }
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name-asc">Name A–Z</option>
                  <option value="name-desc">Name Z–A</option>
                </select>
              </label>
              <div className="nl-studio-view">
                <button
                  aria-label="Grid view"
                  aria-pressed={view === 'grid'}
                  onClick={() => setView('grid')}
                >
                  <Grid2X2 size={18} />
                </button>
                <button
                  aria-label="List view"
                  aria-pressed={view === 'list'}
                  onClick={() => setView('list')}
                >
                  <List size={18} />
                </button>
              </div>
            </div>
            {!!result?.items.length && (
              <div className="nl-studio-file-actions">
                <button
                  disabled={busy || loading || !!error}
                  onClick={() => {
                    setSelection(selection.length === result.items.length ? [] : result.items);
                    setFileActions(false);
                  }}
                >
                  {selection.length === result.items.length
                    ? 'Clear selection'
                    : 'Select all on page'}
                </button>
                <span>{selection.length} selected</span>
                {selected && (
                  <div className="nl-studio-upload">
                    <button
                      disabled={busy || loading || !!error}
                      onClick={() => setDetails(selected)}
                    >
                      View Details
                    </button>
                    <button
                      aria-label="File actions"
                      aria-haspopup="menu"
                      aria-expanded={fileActions}
                      disabled={busy || loading || !!error}
                      onClick={() => setFileActions(!fileActions)}
                    >
                      <ChevronDown size={17} />
                    </button>
                    {fileActions && (
                      <div className="nl-studio-menu" role="menu">
                        <button
                          role="menuitem"
                          onClick={() => {
                            setFileActions(false);
                            void copyNewsletterAssetUrl(selected.url).then((message) => {
                              setNotice(message);
                              if (message !== 'URL copied.') setCopyAsset(selected);
                            });
                          }}
                        >
                          Copy URL
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {!!selection.length && (
                  <button
                    disabled={busy || loading || !!error}
                    onClick={() => {
                      setDeleteError('');
                      setDeleteOpen(true);
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
            <p className="nl-muted">PNG, JPEG, GIF or WebP · up to 10 MB each</p>
            {uploadProgress && (
              <div className="nl-studio-upload-progress" role="status">
                <label>
                  Uploading images: {uploadProgress.completed} of {uploadProgress.total} complete
                  <progress
                    aria-label="Image upload progress"
                    max={uploadProgress.total}
                    value={uploadProgress.completed}
                  />
                </label>
                <span>{uploadProgress.name}</span>
              </div>
            )}
            {!!uploadFailures.length && (
              <div role="alert">
                <p>
                  {uploadFailures.length} {uploadFailures.length === 1 ? 'upload' : 'uploads'} could
                  not finish. Check the library before choosing those files again.
                </p>
                <ul>
                  {uploadFailures.map((failure, index) => (
                    <li key={index}>
                      {failure.name}: {failure.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {error && (
              <div role="alert">
                <p>{error}</p>
                <button onClick={() => setReload((value) => value + 1)} disabled={busy}>
                  Try again
                </button>
              </div>
            )}
            {notice && <p role="status">{notice}</p>}
            {loading && <p role="status">Loading images…</p>}
            {!loading && !error && !result?.items.length && (
              <div className="nl-studio-empty">
                <Upload size={42} />
                <h3>
                  {query.search
                    ? 'No matching files'
                    : query.folder
                      ? 'Folder is empty'
                      : 'No uploaded files yet'}
                </h3>
                <p>
                  {query.search
                    ? 'Try another search.'
                    : query.folder
                      ? 'Add or move images into this folder.'
                      : 'Upload images to include in your newsletters.'}
                </p>
              </div>
            )}
            <div className={`nl-asset-grid${view === 'list' ? ' nl-studio-list' : ''}`}>
              {result?.items.map((asset) => (
                <button
                  key={asset.id}
                  aria-label={`Select ${asset.name}`}
                  aria-pressed={selection.some((item) => item.id === asset.id)}
                  disabled={loading || busy || !!error}
                  onClick={() => {
                    setSelection((previous) =>
                      previous.some((item) => item.id === asset.id)
                        ? previous.filter((item) => item.id !== asset.id)
                        : [...previous, asset],
                    );
                    setFileActions(false);
                  }}
                >
                  <img src={asset.url} alt="" />
                  <span>{asset.name}</span>
                  {view === 'list' && (
                    <span>{asset.mimeType.replace('image/', '').toUpperCase()}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {source === 'uploads' && (
        <footer className="nl-studio-footer">
          <div className="nl-studio-pagination">
            <label>
              Items per page{' '}
              <select
                aria-label="Items per page"
                value={query.pageSize}
                disabled={busy}
                onChange={(event) =>
                  filter({
                    pageSize: Number(event.target.value) as NewsletterAssetQuery['pageSize'],
                  })
                }
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size}>{size}</option>
                ))}
              </select>
            </label>
            <span>
              Showing results{' '}
              <strong>
                {result?.total ? (query.page - 1) * query.pageSize + 1 : 0} –{' '}
                {Math.min(query.page * query.pageSize, result?.total ?? 0)} of {result?.total ?? 0}
              </strong>
            </span>
            <div className="nl-studio-page-buttons">
              <button
                aria-label="Go to first page"
                disabled={busy || loading || !!error || query.page === 1}
                onClick={() => setPage(1)}
              >
                <ChevronsLeft size={18} />
              </button>
              <button
                aria-label="Go to previous page"
                disabled={busy || loading || !!error || query.page === 1}
                onClick={() => setPage(query.page - 1)}
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
                  disabled={busy || loading || !!error || !pages}
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
                disabled={busy || loading || !!error || query.page >= pages}
                onClick={() => setPage(query.page + 1)}
              >
                <ChevronRight size={18} />
              </button>
              <button
                aria-label="Go to last page"
                disabled={busy || loading || !!error || query.page >= pages}
                onClick={() => setPage(pages)}
              >
                <ChevronsRight size={18} />
              </button>
            </div>
          </div>
          <div className="nl-studio-insert">
            <span>
              {selected?.name || (selection.length > 1 ? 'Select one image to insert.' : '')}
            </span>
            <button
              className="nl-primary"
              disabled={busy || loading || !!error || !selected}
              onClick={() => {
                if (selected) onInsert(selected);
              }}
            >
              Insert
            </button>
          </div>
        </footer>
      )}
      {details && (
        <NewsletterAssetDetails
          api={api}
          asset={details}
          onClose={() => setDetails(null)}
          onInsert={onInsert}
          onRenamed={(asset) => {
            setDetails(asset);
            setSelection((previous) =>
              previous.map((item) => (item.id === asset.id ? asset : item)),
            );
            setReload((value) => value + 1);
          }}
        />
      )}
      {copyAsset && (
        <Modal title="Image URL" onClose={() => setCopyAsset(null)}>
          <div className="nl-modal-body">
            <p>Clipboard access is unavailable. Select and copy the image URL.</p>
            <label className="nl-field">
              Image URL
              <input
                readOnly
                value={copyAsset.url}
                onFocus={(event) => event.currentTarget.select()}
              />
            </label>
          </div>
        </Modal>
      )}
      {deleteOpen && (
        <Modal
          title="Are you sure?"
          onClose={() => {
            if (!pending.current) setDeleteOpen(false);
          }}
        >
          <div className="nl-modal-body">
            <p>
              Delete {selection.length} {selection.length === 1 ? 'file' : 'files'} from the
              library, including their saved versions?
            </p>
            <p>Images remain available in newsletters that already use them.</p>
            <ul className="nl-studio-delete-list">
              {selection.map((asset) => (
                <li key={asset.id}>{asset.name}</li>
              ))}
            </ul>
            {deleteError && <p role="alert">{deleteError}</p>}
          </div>
          <div className="nl-studio-import-actions">
            <button disabled={busy} onClick={() => setDeleteOpen(false)}>
              Cancel
            </button>
            <button className="nl-primary" disabled={busy} onClick={() => void remove()}>
              {busy ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
      {importOpen && (
        <Modal
          title="Import URL"
          onClose={() => {
            if (!pending.current) setImportOpen(false);
          }}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (importUrl.trim())
                void add(
                  () =>
                    query.folder && query.folder !== 'unfiled'
                      ? api.importAsset(importUrl.trim(), query.folder)
                      : api.importAsset(importUrl.trim()),
                  true,
                );
            }}
          >
            <div className="nl-modal-body">
              <TextField
                label="Import a file from a URL:"
                value={importUrl}
                onChange={setImportUrl}
                placeholder="https://example.com/image.png"
              />
              {importError && <p role="alert">{importError}</p>}
            </div>
            <div className="nl-studio-import-actions">
              <button type="submit" className="nl-primary" disabled={busy || !importUrl.trim()}>
                {busy ? 'Importing…' : 'Import'}
              </button>
              <button type="button" disabled={busy} onClick={() => setImportOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Modal>
  );
}
