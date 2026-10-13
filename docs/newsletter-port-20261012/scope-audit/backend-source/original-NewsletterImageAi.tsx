import { useState } from 'react';
import { newsletterBundledImageUrl } from '@capiro/shared/newsletter-render';
import type { NewsletterAsset, NewsletterClient } from './api.js';
import { newsletterError, newsletterImageToken } from './api.js';
import { Check, Modal, TextField } from './controls.js';

export async function newsletterImageFile(url: string): Promise<File> {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () =>
      reject(new Error('Upload a copy to Content studio to refine this image.'));
    image.src = newsletterBundledImageUrl(url);
  });
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 4096 / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image editing is unavailable in this browser.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob(
        (value) =>
          value ? resolve(value) : reject(new Error('This image could not be prepared.')),
        'image/png',
      );
    } catch {
      reject(new Error('Upload a copy to Content studio to refine this image.'));
    }
  });
  return new File([blob], 'newsletter-image.png', { type: 'image/png' });
}

export async function saveNewsletterImageRevision(
  api: NewsletterClient,
  url: string,
  edited: File,
  documentId?: string,
) {
  const original = newsletterImageToken(url) ? undefined : await newsletterImageFile(url);
  return api.saveImageRevision(edited, url, original, documentId);
}

export function NewsletterImageAi({
  api,
  documentId,
  url,
  available,
  reason,
  onClose,
  onGenerated,
  onApply,
}: {
  api: NewsletterClient;
  documentId: string;
  url: string;
  available: boolean;
  reason?: string | null;
  onClose: () => void;
  onGenerated: (items: NewsletterAsset[]) => void;
  onApply: (item: NewsletterAsset) => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [multiple, setMultiple] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<NewsletterAsset[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <Modal
      title="Refine with AI"
      wide
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="nl-modal-body">
        <p>Describe how to change this image. OpenAI receives the image and your instructions.</p>
        {!items.length && (
          <img
            className="nl-crop-preview"
            src={newsletterBundledImageUrl(url)}
            alt="Image to refine"
          />
        )}
        <TextField
          label="Image editing instructions"
          value={prompt}
          multiline
          onChange={setPrompt}
        />
        <Check label="Generate multiple images (4)" checked={multiple} onChange={setMultiple} />
        <p className="nl-muted">
          Uses your OpenAI API balance. Each generated image incurs usage charges.
        </p>
        {!available && (
          <p role="status">{reason || 'Connect OpenAI in AI settings to refine images.'}</p>
        )}
        {error && <p role="alert">{error}</p>}
        <button
          className="nl-primary"
          disabled={busy || !available || !prompt.trim()}
          onClick={async () => {
            setBusy(true);
            setError('');
            try {
              const file = await newsletterImageFile(url);
              const generated = await api.refineImage(
                documentId,
                file,
                prompt,
                multiple ? 4 : 1,
                url,
              );
              setItems(generated);
              setSelected(generated[0]?.id || null);
              onGenerated(generated);
            } catch (error) {
              setError(newsletterError(error));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'Generating…' : items.length ? 'Generate again' : 'Generate'}
        </button>
        <div className="nl-asset-grid">
          {items.map((item, index) => (
            <button
              key={item.id}
              aria-label={`Select option ${index + 1}`}
              aria-pressed={selected === item.id}
              disabled={busy}
              onClick={() => setSelected(item.id)}
            >
              <img src={item.url} alt={`Generated option ${index + 1}`} />
              <span>
                Option {index + 1}
                {selected === item.id ? ' · Selected' : ''}
              </span>
            </button>
          ))}
        </div>
        {!!items.length && (
          <p className="nl-muted">
            Generated images are saved in Content studio. Choose one to apply.
          </p>
        )}
      </div>
      <footer>
        <button disabled={busy} onClick={onClose}>
          Cancel
        </button>
        <button
          className="nl-primary"
          disabled={busy || !selected}
          onClick={() => {
            const item = items.find((item) => item.id === selected);
            if (item) {
              onApply(item);
              onClose();
            }
          }}
        >
          Use image
        </button>
      </footer>
    </Modal>
  );
}
