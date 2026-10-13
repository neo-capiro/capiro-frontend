import { useEffect, useRef, useState } from 'react';
import { newsletterSafeUrl } from '@capiro/shared/newsletter-render';
import { NewsletterContentStudio } from './NewsletterContentStudio.js';
import { NewsletterImageReplaceMenu } from './NewsletterImageReplaceMenu.js';
import { NewsletterAdvancedImageEditor } from './NewsletterAdvancedImageEditor.js';
import { newsletterImageFile } from './NewsletterImageAi.js';
import { newsletterError, newsletterImageToken, type NewsletterClient } from './api.js';

/** A captured section owns the media operation, even if another section is selected later. */
export function NewsletterSurveyMedia({
  api,
  documentId,
  value,
  alt,
  label,
  onChange,
  onBusy,
}: {
  api: NewsletterClient;
  documentId: string;
  value: string;
  alt: string;
  label: string;
  onChange: (url: string, alt?: string) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [studio, setStudio] = useState<string | null>(null);
  const [editor, setEditor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = useRef(false);
  const pending = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const latest = useRef({ value, alt, onChange, onBusy });
  latest.current = { value, alt, onChange, onBusy };
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const upload = async (file: File) => {
    if (pending.current) return;
    if (!file.size || file.size > 10 * 1024 * 1024) {
      setError('Choose an image between 1 byte and 10 MB.');
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) {
      setError('Choose a PNG, JPG, GIF or WebP image.');
      return;
    }
    const source = { value, alt };
    pending.current = true;
    setBusy(true);
    latest.current.onBusy(true);
    setError('');
    try {
      const asset = await api.upload(file);
      if (!active.current) return;
      if (latest.current.value !== source.value) {
        setError('The image changed while uploading. The upload is saved in Content Studio.');
        return;
      }
      latest.current.onChange(
        new URL(asset.url, window.location.href).href,
        latest.current.alt === source.alt ? asset.altText : undefined,
      );
    } catch (error) {
      if (active.current) setError(newsletterError(error));
    } finally {
      pending.current = false;
      if (active.current) {
        setBusy(false);
        latest.current.onBusy(false);
      }
    }
  };
  return (
    <section aria-label={label} className="nl-survey-media">
      {newsletterSafeUrl(value, true) && <img src={newsletterSafeUrl(value, true)} alt={alt} />}
      <input
        ref={fileInput}
        aria-label={`Upload ${label.toLowerCase()}`}
        type="file"
        hidden
        accept="image/png,image/jpeg,image/gif,image/webp"
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void upload(file);
        }}
      />
      <div className="nl-flex">
        <NewsletterImageReplaceMenu
          label={value ? 'Replace' : 'Add'}
          disabled={busy}
          canEdit={!!newsletterSafeUrl(value, true)}
          onUpload={() => fileInput.current?.click()}
          onBrowse={() => setStudio(value)}
          onAdvanced={() => setEditor(value)}
        />
        {value && (
          <button type="button" disabled={busy} onClick={() => onChange('')}>
            Remove {label.toLowerCase()}
          </button>
        )}
      </div>
      {busy && <p role="status">Uploading image…</p>}
      {error && <p role="alert">{error}</p>}
      {studio !== null && (
        <NewsletterContentStudio
          api={api}
          onClose={() => setStudio(null)}
          onInsert={(asset) => {
            if (!active.current) return;
            if (latest.current.value !== studio) {
              setError('The image changed. Reopen Content Studio to replace its current version.');
              setStudio(null);
              return;
            }
            onChange(new URL(asset.url, window.location.href).href, asset.altText);
            setStudio(null);
          }}
        />
      )}
      {editor && (
        <NewsletterAdvancedImageEditor
          key={editor}
          url={editor}
          onClose={() => setEditor(null)}
          onSave={async (file) => {
            if (!active.current || latest.current.value !== editor)
              throw new Error('The source image changed. Reopen the image editor.');
            const original = newsletterImageToken(editor)
              ? undefined
              : await newsletterImageFile(editor);
            if (!active.current || latest.current.value !== editor)
              throw new Error('The source image changed. Reopen the image editor.');
            const asset = await api.saveImageRevision(file, editor, original, documentId);
            if (!active.current) return;
            if (latest.current.value !== editor)
              throw new Error('The source image changed. The edit is saved in Content Studio.');
            latest.current.onChange(asset.url);
            setEditor(null);
          }}
        />
      )}
    </section>
  );
}
