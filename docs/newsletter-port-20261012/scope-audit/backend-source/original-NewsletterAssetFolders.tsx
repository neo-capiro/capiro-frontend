import { useEffect, useState, type MutableRefObject } from 'react';
import { ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { Modal } from './controls.js';
import { newsletterError, type NewsletterAssetFolder, type NewsletterClient } from './api.js';

type FolderDialog =
  { kind: 'create'; move: boolean } | { kind: 'rename' | 'delete'; folder: NewsletterAssetFolder };
export function NewsletterAssetFolders({
  api,
  folder,
  selectedIds,
  busy,
  pending,
  onBusy,
  onFilter,
  onComplete,
}: {
  api: NewsletterClient;
  folder?: string;
  selectedIds: string[];
  busy: boolean;
  pending: MutableRefObject<boolean>;
  onBusy: (busy: boolean) => void;
  onFilter: (folder: string | undefined) => void;
  onComplete: (message: string, options?: { folder?: string; clearSelection?: boolean }) => void;
}) {
  const [folders, setFolders] = useState<NewsletterAssetFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState('');
  const [writeError, setWriteError] = useState('');
  const [reload, setReload] = useState(0);
  const [moveMenu, setMoveMenu] = useState(false);
  const [dialog, setDialog] = useState<FolderDialog | null>(null);
  const [name, setName] = useState('');
  const activeFolder = folders.find((item) => item.id === folder);
  useEffect(() => {
    let canceled = false;
    setLoading(true);
    setReadError('');
    api.assetFolders().then(
      (items) => {
        if (!canceled) {
          setFolders(items);
          setLoading(false);
        }
      },
      (error) => {
        if (!canceled) {
          setReadError(newsletterError(error));
          setLoading(false);
        }
      },
    );
    return () => {
      canceled = true;
    };
  }, [api, reload]);
  useEffect(() => {
    if (!selectedIds.length) setMoveMenu(false);
  }, [selectedIds.length]);
  const open = (next: FolderDialog) => {
    setDialog(next);
    setName(next.kind === 'rename' ? next.folder.name : '');
    setMoveMenu(false);
    setWriteError('');
  };
  const run = async <T,>(operation: () => Promise<T>, complete: (result: T) => void) => {
    if (pending.current) return;
    pending.current = true;
    onBusy(true);
    setWriteError('');
    try {
      const result = await operation();
      complete(result);
      setDialog(null);
      setMoveMenu(false);
      setReload((value) => value + 1);
    } catch (error) {
      setWriteError(newsletterError(error));
    } finally {
      pending.current = false;
      onBusy(false);
    }
  };
  const submit = () => {
    if (!dialog) return;
    if (dialog.kind === 'create') {
      const ids = dialog.move ? selectedIds : undefined;
      if (!name.trim() || name.length > 100) return;
      void run(
        () => api.createAssetFolder(name.trim(), ids),
        (created) =>
          onComplete(
            ids
              ? `${ids.length} ${ids.length === 1 ? 'file' : 'files'} moved to ${created.name}.`
              : `${created.name} folder created.`,
            { folder: created.id },
          ),
      );
    } else if (dialog.kind === 'rename') {
      if (!name.trim() || name.length > 100) return;
      void run(
        () => api.renameAssetFolder(dialog.folder.id, name.trim()),
        (updated) => onComplete(`Folder renamed to ${updated.name}.`, { clearSelection: false }),
      );
    } else {
      void run(
        () => api.deleteAssetFolder(dialog.folder.id),
        () => onComplete('Folder deleted. Its images are now in Unfiled.', { folder: 'unfiled' }),
      );
    }
  };
  return (
    <>
      <div className="nl-studio-folders">
        <label>
          Folder{' '}
          <select
            aria-label="Folder"
            value={folder || ''}
            disabled={busy || loading}
            onChange={(event) => {
              setMoveMenu(false);
              setWriteError('');
              onFilter(event.target.value || undefined);
            }}
          >
            <option value="">All files</option>
            <option value="unfiled">Unfiled</option>
            {folder && folder !== 'unfiled' && !activeFolder && (
              <option value={folder}>Folder unavailable</option>
            )}
            {folders.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={busy || loading || !!readError}
          onClick={() => open({ kind: 'create', move: false })}
        >
          Add Folder
        </button>
        {activeFolder && (
          <>
            <button
              aria-label={`Rename ${activeFolder.name} folder`}
              disabled={busy || loading || !!readError}
              onClick={() => open({ kind: 'rename', folder: activeFolder })}
            >
              <Pencil size={16} />
            </button>
            <button
              aria-label={`Delete ${activeFolder.name} folder`}
              disabled={busy || loading || !!readError}
              onClick={() => open({ kind: 'delete', folder: activeFolder })}
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
        {!!selectedIds.length && (
          <div className="nl-studio-upload">
            <button
              aria-haspopup="menu"
              aria-expanded={moveMenu}
              disabled={busy || loading || !!readError}
              onClick={() => {
                setMoveMenu(!moveMenu);
                setWriteError('');
              }}
            >
              Move To <ChevronDown size={16} />
            </button>
            {moveMenu && (
              <div
                className="nl-studio-menu nl-studio-folder-menu"
                role="menu"
                aria-label="Move to folder"
              >
                <button
                  role="menuitem"
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () => api.moveAssets(selectedIds, null),
                      (result) =>
                        onComplete(
                          `${result.moved} ${result.moved === 1 ? 'file' : 'files'} moved to Unfiled.`,
                        ),
                    )
                  }
                >
                  Unfiled
                </button>
                {folders.map((item) => (
                  <button
                    role="menuitem"
                    disabled={busy}
                    key={item.id}
                    onClick={() =>
                      void run(
                        () => api.moveAssets(selectedIds, item.id),
                        (result) =>
                          onComplete(
                            `${result.moved} ${result.moved === 1 ? 'file' : 'files'} moved to ${item.name}.`,
                          ),
                      )
                    }
                  >
                    {item.name}
                  </button>
                ))}
                <button
                  role="menuitem"
                  disabled={busy}
                  onClick={() => open({ kind: 'create', move: true })}
                >
                  Add Folder
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {loading && <p role="status">Loading folders…</p>}
      {readError && (
        <div role="alert">
          <p>{readError}</p>
          <button disabled={busy} onClick={() => setReload((value) => value + 1)}>
            Try folders again
          </button>
        </div>
      )}
      {writeError && !dialog && <p role="alert">{writeError}</p>}
      {dialog && (
        <Modal
          title={
            dialog.kind === 'create'
              ? 'Add Folder'
              : dialog.kind === 'rename'
                ? 'Rename Folder'
                : 'Delete Folder'
          }
          onClose={() => {
            if (!pending.current) setDialog(null);
          }}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <div className="nl-modal-body">
              {dialog.kind === 'delete' ? (
                <>
                  <p>Delete the {dialog.folder.name} folder?</p>
                  <p>Its images will remain in your library under Unfiled.</p>
                </>
              ) : (
                <label className="nl-field">
                  Folder name
                  <input
                    value={name}
                    maxLength={100}
                    disabled={busy}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
              )}
              {dialog.kind === 'create' && dialog.move && (
                <p>
                  {selectedIds.length} selected{' '}
                  {selectedIds.length === 1 ? 'file will' : 'files will'} move into this folder.
                </p>
              )}
              {writeError && <p role="alert">{writeError}</p>}
            </div>
            <footer className="nl-studio-import-actions">
              <button type="button" disabled={busy} onClick={() => setDialog(null)}>
                Cancel
              </button>
              <button
                type="submit"
                className="nl-primary"
                disabled={busy || (dialog.kind !== 'delete' && (!name.trim() || name.length > 100))}
              >
                {busy
                  ? 'Saving…'
                  : dialog.kind === 'create'
                    ? 'Add Folder'
                    : dialog.kind === 'rename'
                      ? 'Save'
                      : 'Delete Folder'}
              </button>
            </footer>
          </form>
        </Modal>
      )}
    </>
  );
}
