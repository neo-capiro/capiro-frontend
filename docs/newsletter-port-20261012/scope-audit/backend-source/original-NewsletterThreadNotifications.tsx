import { useEffect, useRef, useState } from 'react';
import {
  newsletterError,
  type NewsletterClient,
  type NewsletterThreadNotifications as Settings,
} from './api.js';
import { Modal } from './controls.js';

/** New-thread choices stay in the composer until its comment is saved. */
export function NewsletterThreadNotifications({
  api,
  documentId,
  rootId,
  currentUserId,
  draftUserIds,
  onSaved,
  onClose,
}: {
  api: NewsletterClient;
  documentId: string;
  rootId?: string;
  currentUserId: string;
  draftUserIds?: string[];
  onSaved: (userIds: string[]) => void;
  onClose: () => void;
}) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const saving = useRef(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void api
      .threadNotifications(documentId, rootId)
      .then((next) => {
        if (!active) return;
        setSettings(next);
        setSelected(
          (rootId ? next.userIds : (draftUserIds ?? next.userIds)).filter((id) =>
            next.items.some((item) => item.userId === id),
          ),
        );
      })
      .catch((error) => {
        if (active) setError(newsletterError(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api, documentId, rootId, draftUserIds, reload]);
  const close = () => {
    if (!saving.current) onClose();
  };
  const save = async () => {
    if (saving.current || !settings?.editable || loading) return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      const ids = rootId
        ? (await api.saveThreadNotifications(documentId, rootId, selected)).userIds
        : selected;
      onSaved(ids);
    } catch (error) {
      setError(newsletterError(error));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  return (
    <Modal title="Notify account users" onClose={close}>
      <div className="nl-modal-body nl-thread-notifications">
        <p>
          The users selected below will receive email notifications about comments in this thread.
        </p>
        {loading && <p role="status">Loading account users…</p>}
        {error && (
          <p role="alert">
            {error}
            {!settings && !loading && (
              <button onClick={() => setReload((value) => value + 1)}>Retry</button>
            )}
          </p>
        )}
        {!loading && settings && (
          <>
            {!settings.emailAvailable && (
              <p role="status" className="nl-muted">
                Email delivery is currently unavailable. Your choices will be saved for this thread.
              </p>
            )}
            <fieldset disabled={busy || !settings.editable}>
              <legend className="nl-sr-only">Users to notify</legend>
              {settings.items.map((item) => (
                <label key={item.userId}>
                  <input
                    type="checkbox"
                    checked={selected.includes(item.userId)}
                    onChange={(event) =>
                      setSelected((ids) =>
                        event.target.checked
                          ? [...new Set([...ids, item.userId])]
                          : ids.filter((id) => id !== item.userId),
                      )
                    }
                  />
                  <span>
                    {item.name}
                    {item.userId === currentUserId ? ' (you)' : ''}
                    <small>{item.email}</small>
                  </span>
                </label>
              ))}
              {!settings.items.length && <p>No account users have access to this newsletter.</p>}
            </fieldset>
          </>
        )}
      </div>
      <footer>
        <button disabled={busy} onClick={close}>
          Cancel
        </button>
        <button
          className="nl-primary"
          disabled={busy || loading || !settings?.editable}
          onClick={() => void save()}
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      </footer>
    </Modal>
  );
}
