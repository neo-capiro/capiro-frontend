import { useEffect, useRef, useState } from 'react';
import { Modal } from './controls.js';
import { NewsletterAssetRevisions } from './NewsletterAssetRevisions.js';
import {
  newsletterError,
  type NewsletterAsset,
  type NewsletterAssetDetails as AssetDetails,
  type NewsletterClient,
} from './api.js';

export async function copyNewsletterAssetUrl(url: string): Promise<string> {
  try {
    await navigator.clipboard.writeText(url);
    return 'URL copied.';
  } catch {
    return 'Clipboard access is unavailable. Select and copy the Image URL field.';
  }
}

export function NewsletterAssetDetails({
  api,
  asset,
  onClose,
  onRenamed,
  onInsert,
}: {
  api: NewsletterClient;
  asset: NewsletterAsset;
  onClose: () => void;
  onRenamed: (asset: NewsletterAsset) => void;
  onInsert: (asset: NewsletterAsset) => void;
}) {
  const [details, setDetails] = useState<AssetDetails | null>(null);
  const [name, setName] = useState(asset.name);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const [notice, setNotice] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [imageError, setImageError] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  useEffect(() => {
    let canceled = false;
    setLoading(true);
    setError('');
    api.assetDetails(asset.id).then(
      (value) => {
        if (canceled) return;
        setDetails(value);
        setName(value.name);
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
  }, [api, asset.id, reload]);
  const rename = async () => {
    if (
      pending.current ||
      !details ||
      details.currentRevision === false ||
      !name.trim() ||
      name.length > 200
    )
      return;
    pending.current = true;
    setSaving(true);
    setError('');
    try {
      const updated = await api.renameAsset(details.id, name.trim());
      setDetails((previous) => (previous ? { ...previous, ...updated } : null));
      setName(updated.name);
      onRenamed(updated);
      setNotice('File name saved.');
      setHistoryRefresh((value) => value + 1);
    } catch (error) {
      setError(newsletterError(error));
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };
  return (
    <Modal
      title="File Details"
      wide
      className="nl-asset-details"
      onClose={() => {
        if (!pending.current) onClose();
      }}
    >
      <div className="nl-modal-body">
        {loading && <p role="status">Loading file details…</p>}
        {error && (
          <div role="alert">
            <p>{error}</p>
            {!details && <button onClick={() => setReload((value) => value + 1)}>Try again</button>}
          </div>
        )}
        {details && (
          <div className="nl-asset-details-layout">
            <div className="nl-asset-details-preview">
              <img
                key={details.url}
                src={details.url}
                alt={details.name}
                onLoad={(event) => {
                  const image = event.currentTarget;
                  setDimensions(`${image.naturalWidth} × ${image.naturalHeight} px`);
                  setImageError(false);
                }}
                onError={() => {
                  setImageError(true);
                  setDimensions('');
                }}
              />
              {imageError && <p role="alert">The image preview could not load.</p>}
            </div>
            <div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void rename();
                }}
              >
                <label className="nl-field">
                  File name
                  <input
                    value={name}
                    maxLength={200}
                    disabled={saving || details.currentRevision === false}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
                {details.currentRevision !== false && (
                  <button
                    type="submit"
                    disabled={
                      saving || !name.trim() || name.length > 200 || name.trim() === details.name
                    }
                  >
                    {saving ? 'Saving…' : 'Save name'}
                  </button>
                )}
              </form>
              <dl>
                <dt>File type</dt>
                <dd>{details.mimeType.replace('image/', '').toUpperCase()}</dd>
                <dt>File size</dt>
                <dd>{details.sizeBytes.toLocaleString()} bytes</dd>
                <dt>Uploaded</dt>
                <dd>{new Date(details.createdAt).toLocaleString()}</dd>
                <dt>Version</dt>
                <dd>
                  {(details.revisionNumber ?? 1) === 1
                    ? 'Original'
                    : `Version ${details.revisionNumber}`}
                  {details.currentRevision ? ' · Latest' : ''}
                </dd>
                {dimensions && (
                  <>
                    <dt>Dimensions</dt>
                    <dd>{dimensions}</dd>
                  </>
                )}
              </dl>
              <label className="nl-field">
                Image URL
                <input
                  readOnly
                  value={details.url}
                  onFocus={(event) => event.currentTarget.select()}
                />
              </label>
              <button
                disabled={saving}
                onClick={() => {
                  void copyNewsletterAssetUrl(details.url).then(setNotice);
                }}
              >
                Copy URL
              </button>
              {notice && <p role="status">{notice}</p>}
            </div>
          </div>
        )}
        {details && (
          <NewsletterAssetRevisions
            api={api}
            assetId={asset.id}
            selectedId={details.id}
            disabled={saving || loading}
            refresh={historyRefresh}
            onSelect={(version) => {
              setDetails(version);
              setName(version.name);
              setDimensions('');
              setImageError(false);
              setNotice('');
            }}
          />
        )}
      </div>
      <footer className="nl-studio-import-actions">
        <button disabled={saving} onClick={onClose}>
          Close details
        </button>
        <button
          className="nl-primary"
          disabled={loading || saving || !details}
          onClick={() => {
            if (details) onInsert(details);
          }}
        >
          Insert
        </button>
      </footer>
    </Modal>
  );
}
