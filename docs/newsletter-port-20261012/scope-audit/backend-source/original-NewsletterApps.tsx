import { useEffect, useRef, useState } from 'react';
import type { NewsletterLinkPreviewBlock } from '@capiro/shared/newsletter';
import { Check, Modal, SelectField, TextField } from './controls.js';
import { newsletterError, type NewsletterClient, type NewsletterLinkPreview } from './api.js';

const providers = [
  {
    name: 'AddEvent Calendar Links',
    publisher: 'AddEvent, Inc',
    description: 'Add calendar links for hearings, briefings and other events.',
  },
  {
    name: 'Google Business Profile',
    publisher: 'Google',
    description: 'Add business information from a connected Google Business Profile.',
  },
  {
    name: 'Instagram',
    publisher: 'Instagram',
    description: 'Add posts from a connected Instagram account.',
  },
  {
    name: 'Link Preview',
    publisher: 'Capiro',
    description: 'Add an article or resource preview from a public HTTPS URL.',
    builtin: true,
  },
  {
    name: 'Playable Video',
    publisher: 'Playable',
    description: 'Add video content through a Playable account.',
  },
  {
    name: 'Yelp for Business',
    publisher: 'Yelp',
    description: 'Add information from a connected Yelp business.',
  },
];
const emptyPreview = (): NewsletterLinkPreviewBlock => ({
  kind: 'link-preview',
  sourceUrl: '',
  title: '',
  description: '',
  imageUrl: '',
  size: 'large',
  showImage: true,
  showDescription: true,
  showBackground: true,
});

export function NewsletterApps({
  api,
  documentId,
  app,
  onBeforeLoad,
  onChange,
}: {
  api: NewsletterClient;
  documentId: string;
  app?: NewsletterLinkPreviewBlock;
  onBeforeLoad: () => Promise<unknown>;
  onChange: (value: NewsletterLinkPreviewBlock) => void;
}) {
  const [choosing, setChoosing] = useState(!app);
  const [managing, setManaging] = useState(false);
  const [url, setUrl] = useState(app?.sourceUrl || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!pending.current) setUrl(app?.sourceUrl || '');
  }, [app?.sourceUrl]);
  const choose = () => {
    onChange(app || emptyPreview());
    setChoosing(false);
    setManaging(false);
    setError('');
  };
  const gallery = (
    <section className="nl-app-gallery" aria-label="Available apps">
      <h3>Available</h3>
      {providers.map((provider) => (
        <details key={provider.name}>
          <summary>
            <span>
              {provider.name}
              <small>By {provider.publisher}</small>
            </span>
          </summary>
          <p>{provider.description}</p>
          <p className="nl-muted">
            {provider.builtin
              ? 'Built in. No external account required.'
              : 'This integration is not available in Capiro yet.'}
          </p>
          <button
            disabled={busy || !provider.builtin}
            onClick={choose}
            className={provider.builtin ? 'nl-primary' : ''}
          >
            {provider.builtin ? 'Use Link Preview' : `Connect ${provider.name}`}
          </button>
        </details>
      ))}
    </section>
  );
  return (
    <div className="nl-app-controls">
      <div className="nl-flex">
        <h3>{choosing ? 'Select App' : 'Link Preview'}</h3>
        <button disabled={busy} onClick={() => setManaging(true)}>
          Manage apps
        </button>
      </div>
      {choosing ? (
        <>
          {gallery}
          {app && <button onClick={() => setChoosing(false)}>Back to Link Preview</button>}
        </>
      ) : (
        app && (
          <>
            <p>Create a preview of a public article, bill page or other resource.</p>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (pending.current || !url.trim()) return;
                try {
                  const parsed = new URL(url.trim());
                  if (
                    parsed.protocol !== 'https:' ||
                    parsed.username ||
                    parsed.password ||
                    url.length > 2048
                  )
                    throw new Error();
                } catch {
                  setError('Enter a public HTTPS URL without embedded credentials.');
                  return;
                }
                pending.current = true;
                setBusy(true);
                setError('');
                setWarnings([]);
                try {
                  await onBeforeLoad();
                  if (!mounted.current) return;
                  const preview: NewsletterLinkPreview = await api.linkPreview(
                    documentId,
                    url.trim(),
                  );
                  if (!mounted.current) return;
                  onChange({
                    ...app,
                    sourceUrl: preview.sourceUrl,
                    title: preview.title,
                    description: preview.description,
                    imageUrl: preview.imageUrl,
                  });
                  setUrl(preview.sourceUrl);
                  setWarnings(preview.warnings);
                } catch (cause) {
                  if (mounted.current) setError(newsletterError(cause));
                } finally {
                  pending.current = false;
                  if (mounted.current) setBusy(false);
                }
              }}
            >
              <label>
                Source URL
                <input
                  aria-label="Source URL"
                  type="url"
                  required
                  maxLength={2048}
                  value={url}
                  disabled={busy}
                  placeholder="https://"
                  onChange={(event) => setUrl(event.target.value)}
                />
              </label>
              <button className="nl-primary" disabled={busy || !url.trim()} type="submit">
                {busy ? 'Loading preview…' : app.sourceUrl ? 'Update preview' : 'Load preview'}
              </button>
            </form>
            {error && <p role="alert">{error}</p>}
            {warnings.map((warning) => (
              <p role="status" key={warning}>
                {warning}
              </p>
            ))}
            <fieldset disabled={busy}>
              <SelectField
                label="Block size"
                value={app.size}
                values={['small', 'medium', 'large']}
                onChange={(size) =>
                  onChange({ ...app, size: size as NewsletterLinkPreviewBlock['size'] })
                }
              />
              <Check
                label="Show image"
                checked={app.showImage}
                onChange={(showImage) => onChange({ ...app, showImage })}
              />
              <Check
                label="Show description"
                checked={app.showDescription}
                onChange={(showDescription) => onChange({ ...app, showDescription })}
              />
              <Check
                label="Show background"
                checked={app.showBackground}
                onChange={(showBackground) => onChange({ ...app, showBackground })}
              />
              {app.sourceUrl && (
                <>
                  <TextField
                    label="Preview title"
                    value={app.title}
                    onChange={(title) => onChange({ ...app, title })}
                  />
                  <TextField
                    label="Preview description"
                    multiline
                    value={app.description}
                    onChange={(description) => onChange({ ...app, description })}
                  />
                </>
              )}
            </fieldset>
            <button disabled={busy} onClick={() => setChoosing(true)}>
              Change app
            </button>
          </>
        )
      )}
      {managing && (
        <Modal title="Manage apps" onClose={() => setManaging(false)}>
          <div className="nl-modal-body">
            <p>
              Link Preview is built into Capiro. Other app connections are listed below with their
              current availability.
            </p>
            {gallery}
          </div>
          <footer>
            <button onClick={() => setManaging(false)}>Done</button>
          </footer>
        </Modal>
      )}
    </div>
  );
}
