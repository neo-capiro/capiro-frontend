import { useEffect, useRef, useState } from 'react';
import {
  newsletterVideoSource,
  type NewsletterBlock,
  type NewsletterStyle,
} from '@capiro/shared/newsletter';
import { newsletterError, type NewsletterClient, type NewsletterVideoThumbnail } from './api.js';
import { Check, ColorField, NumberField, SelectField, TextField } from './controls.js';
import { NewsletterImageReplaceMenu } from './NewsletterImageReplaceMenu.js';
import { NewsletterImageDescription } from './NewsletterImageControls.js';
import { newsletterBundledImageUrl } from '@capiro/shared/newsletter-render';

const corners = [
  ['radiusTopLeft', 'Top left'],
  ['radiusTopRight', 'Top right'],
  ['radiusBottomLeft', 'Bottom left'],
  ['radiusBottomRight', 'Bottom right'],
] as const;
export function NewsletterVideoDesign({
  block,
  api,
  documentId,
  onChange,
  onBeforeLoad,
  onThumbnail,
  onUpload,
  onBrowse,
  onAdvanced,
  uploading,
  disabled,
  altAvailable,
  altReason,
  onAltGenerated,
}: {
  block: NewsletterBlock;
  api: NewsletterClient;
  documentId: string;
  onChange: (edit: (block: NewsletterBlock) => void) => void;
  onBeforeLoad: () => Promise<unknown>;
  onThumbnail: (
    result: NewsletterVideoThumbnail,
    source: { url: string; imageUrl: string },
  ) => boolean;
  onUpload: () => void;
  onBrowse: () => void;
  onAdvanced: () => void;
  uploading: boolean;
  disabled: boolean;
  altAvailable: boolean;
  altReason?: string | null;
  onAltGenerated: (text: string, source: { imageUrl: string; alt: string }) => boolean;
}) {
  const [help, setHelp] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  const handlers = useRef({ onBeforeLoad, onThumbnail });
  handlers.current = { onBeforeLoad, onThumbnail };
  const automatic = (block.video?.thumbnail || (block.imageUrl ? 'custom' : 'auto')) === 'auto';
  const source = newsletterVideoSource(block.url),
    resolved = newsletterVideoSource(block.video?.sourceUrl || '');
  const key = source?.url || '',
    resolvedKey = resolved?.url || '',
    previousImage = block.imageUrl;
  useEffect(() => {
    let canceled = false;
    setError('');
    setBusy(false);
    if (!automatic || !key || (resolvedKey === key && previousImage)) return;
    const timer = window.setTimeout(() => {
      setBusy(true);
      void (async () => {
        try {
          await handlers.current.onBeforeLoad();
          if (canceled) return;
          const result = await api.videoThumbnail(documentId, key);
          if (canceled) return;
          if (!handlers.current.onThumbnail(result, { url: key, imageUrl: previousImage }))
            setError('The video changed. Your thumbnail is available in Content Studio.');
        } catch (error) {
          if (!canceled) setError(newsletterError(error));
        } finally {
          if (!canceled) setBusy(false);
        }
      })();
    }, 600);
    return () => {
      canceled = true;
      window.clearTimeout(timer);
    };
  }, [api, documentId, block.id, automatic, key, resolvedKey, previousImage, retry]);
  const style = block.style;
  const setStyle = <K extends keyof NewsletterStyle>(key: K, value: NewsletterStyle[K]) =>
    onChange((draft) => {
      draft.style[key] = value;
    });
  const splitCorners = corners.some(([key]) => style[key] !== undefined);
  const custom = (action: () => void) => {
    onChange((draft) => {
      draft.video = { ...draft.video, thumbnail: 'custom', sourceUrl: draft.url };
    });
    action();
  };
  return (
    <section aria-label="Video design">
      <div className="nl-flex">
        <h3>Video URL</h3>
        <button
          type="button"
          aria-label="Video URL info"
          aria-expanded={help}
          onClick={() => setHelp((v) => !v)}
        >
          Info
        </button>
      </div>
      <TextField
        label="URL"
        value={block.url}
        placeholder="https://www.example.com"
        onChange={(url) =>
          onChange((draft) => {
            draft.url = url;
            draft.linkType = 'web';
          })
        }
      />
      {help && (
        <p role="status">
          The thumbnail opens the video in a separate browser window when a recipient clicks it.{' '}
          <a
            href="https://mailchimp.com/help/use-video-content-blocks-new-builder/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn more
          </a>
        </p>
      )}
      <p>
        YouTube and Vimeo links generate a thumbnail automatically. The thumbnail links to this URL.
      </p>
      {!block.imageUrl && (
        <>
          <h3>Upload a custom video thumbnail</h3>
          <p>Accepts PNG, JPG and GIF files up to 10 MB.</p>
        </>
      )}
      {block.imageUrl && (
        <div className="nl-image-preview">
          <img src={newsletterBundledImageUrl(block.imageUrl)} alt={block.alt} />
        </div>
      )}
      <div className="nl-flex">
        <NewsletterImageReplaceMenu
          label={block.imageUrl ? 'Replace' : 'Add'}
          disabled={uploading || disabled}
          canEdit={!!block.imageUrl}
          onUpload={() => custom(onUpload)}
          onBrowse={() => custom(onBrowse)}
          onAdvanced={() => custom(onAdvanced)}
        />
        <button disabled={uploading || disabled} onClick={() => custom(onUpload)}>
          Choose file
        </button>
        {!automatic && source && (
          <button
            disabled={disabled || uploading}
            onClick={() =>
              onChange((draft) => {
                draft.video = { ...draft.video, thumbnail: 'auto', sourceUrl: '' };
              })
            }
          >
            Use automatic thumbnail
          </button>
        )}
      </div>
      {busy && <p role="status">Generating video thumbnail…</p>}
      {uploading && <p role="status">Uploading thumbnail…</p>}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button disabled={busy || disabled} onClick={() => setRetry((v) => v + 1)}>
            Retry thumbnail
          </button>
          <p>Choose a custom thumbnail if this video is unavailable.</p>
        </div>
      )}
      <NewsletterImageDescription
        api={api}
        documentId={documentId}
        imageUrl={block.imageUrl}
        alt={block.alt}
        available={altAvailable}
        reason={altReason}
        onChange={(alt) =>
          onChange((draft) => {
            draft.alt = alt;
          })
        }
        onGenerated={onAltGenerated}
      />
      <ColorField
        label="Block background color"
        value={style.background || 'transparent'}
        onChange={(value) => setStyle('background', value)}
      />
      <SelectField
        label="Border"
        value={style.borderStyle || 'none'}
        values={[
          'none',
          'solid',
          'dashed',
          'dotted',
          'double',
          'inset',
          'outset',
          'groove',
          'ridge',
        ]}
        onChange={(value) => setStyle('borderStyle', value)}
      />
      {style.borderStyle && style.borderStyle !== 'none' && (
        <div className="nl-grid2">
          <NumberField
            label="Border width"
            value={style.borderWidth ?? 1}
            max={30}
            onChange={(value) => setStyle('borderWidth', value)}
          />
          <ColorField
            label="Border color"
            value={style.borderColor || '#777777'}
            onChange={(value) => setStyle('borderColor', value)}
          />
        </div>
      )}
      <h3>Rounded corners</h3>
      {splitCorners ? (
        <div className="nl-grid2">
          {corners.map(([key, label]) => (
            <NumberField
              key={key}
              label={label}
              value={style[key] ?? style.radius ?? 0}
              max={1000}
              onChange={(value) => setStyle(key, value)}
            />
          ))}
        </div>
      ) : (
        <NumberField
          label="Rounded corners"
          value={style.radius ?? 0}
          max={1000}
          onChange={(value) => setStyle('radius', value)}
        />
      )}
      <button
        type="button"
        aria-pressed={!splitCorners}
        onClick={() =>
          onChange((draft) => {
            if (splitCorners) {
              draft.style.radius = draft.style.radiusTopLeft ?? draft.style.radius ?? 0;
              for (const [key] of corners) delete draft.style[key];
            } else {
              for (const [key] of corners) draft.style[key] = draft.style.radius ?? 0;
            }
          })
        }
      >
        Apply to all sides
      </button>
      <SelectField
        label="Alignment"
        value={style.align || 'center'}
        values={['left', 'center', 'right']}
        onChange={(value) => setStyle('align', value)}
      />
      <h3>Padding</h3>
      {block.video?.paddingLinked ? (
        <NumberField
          label="Padding"
          value={style.paddingTop ?? 12}
          max={1000}
          onChange={(value) =>
            onChange((draft) => {
              Object.assign(draft.style, {
                paddingTop: value,
                paddingBottom: value,
                paddingLeft: value,
                paddingRight: value,
              });
            })
          }
        />
      ) : (
        <div className="nl-grid2">
          {(['Top', 'Bottom', 'Left', 'Right'] as const).map((side) => {
            const key = `padding${side}` as
              'paddingTop' | 'paddingBottom' | 'paddingLeft' | 'paddingRight';
            return (
              <NumberField
                key={key}
                label={`Padding ${side.toLowerCase()}`}
                value={style[key] ?? (['Left', 'Right'].includes(side) ? 24 : 12)}
                max={1000}
                onChange={(value) => setStyle(key, value)}
              />
            );
          })}
        </div>
      )}
      <Check
        label="Apply to all sides"
        checked={!!block.video?.paddingLinked}
        onChange={(linked) =>
          onChange((draft) => {
            draft.video = {
              ...draft.video,
              thumbnail: draft.video?.thumbnail || (draft.imageUrl ? 'custom' : 'auto'),
              sourceUrl: draft.video?.sourceUrl || draft.url,
              paddingLinked: linked,
            };
            if (!linked) return;
            const value = draft.style.paddingTop ?? 12;
            Object.assign(draft.style, {
              paddingTop: value,
              paddingBottom: value,
              paddingLeft: value,
              paddingRight: value,
            });
          })
        }
      />
    </section>
  );
}
