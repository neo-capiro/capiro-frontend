import { useEffect, useId, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import type { NewsletterBlock } from '@capiro/shared/newsletter';
import type { NewsletterClient } from './api.js';
import { NewsletterImageAltText } from './NewsletterImageAltText.js';

export function NewsletterImageSize({
  size,
  scale,
  onSize,
  onScale,
}: {
  size: NewsletterBlock['imageSize'];
  scale: number;
  onSize: (size: NewsletterBlock['imageSize']) => void;
  onScale: (scale: number) => void;
}) {
  const id = useId();
  return (
    <fieldset className="nl-image-size">
      <legend>Size</legend>
      <div role="group" aria-label="Image size" className="nl-image-size-options">
        {(['original', 'fill', 'scale'] as const).map((value) => (
          <button
            type="button"
            key={value}
            aria-pressed={size === value}
            onClick={() => onSize(value)}
          >
            {value[0]!.toUpperCase() + value.slice(1)}
          </button>
        ))}
      </div>
      {size === 'scale' && (
        <div className="nl-image-scale">
          <label htmlFor={id}>Scale</label>
          <div>
            <input
              id={id}
              type="range"
              min={Math.min(10, Math.max(1, scale))}
              max={100}
              step={1}
              value={scale}
              onChange={(event) => onScale(Number(event.target.value))}
            />
            <output htmlFor={id}>{scale}%</output>
          </div>
        </div>
      )}
    </fieldset>
  );
}

export function NewsletterImageDescription({
  api,
  documentId,
  imageUrl,
  alt,
  available,
  reason,
  onChange,
  onGenerated,
}: {
  api: NewsletterClient;
  documentId: string;
  imageUrl: string;
  alt: string;
  available: boolean;
  reason?: string | null;
  onChange: (text: string) => void;
  onGenerated: (text: string, source: { imageUrl: string; alt: string }) => boolean;
}) {
  const id = useId();
  const helpId = useId();
  const [help, setHelp] = useState(false);
  const region = useRef<HTMLDivElement>(null);
  const helpButton = useRef<HTMLButtonElement>(null);
  const helpLink = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (!help) return;
    helpLink.current?.focus();
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !region.current?.contains(event.target)) setHelp(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setHelp(false);
        helpButton.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', key);
    };
  }, [help]);
  return (
    <div className="nl-image-description" ref={region}>
      <NewsletterImageAltText
        api={api}
        documentId={documentId}
        imageUrl={imageUrl}
        alt={alt}
        available={available}
        reason={reason}
        onGenerated={onGenerated}
        label={<label htmlFor={id}>Alt text</label>}
      >
        <div className="nl-alt-text-input">
          <input
            id={id}
            value={alt}
            placeholder="Describe what you see in the image"
            onChange={(event) => onChange(event.target.value)}
          />
          <button
            type="button"
            ref={helpButton}
            aria-label="Learn more about alt text"
            aria-expanded={help}
            aria-controls={help ? helpId : undefined}
            onClick={() => setHelp((open) => !open)}
          >
            <Info size={15} />
          </button>
        </div>
      </NewsletterImageAltText>
      {help && (
        <div
          role="dialog"
          aria-labelledby={`${helpId}-title`}
          id={helpId}
          className="nl-alt-text-help"
        >
          <h3 id={`${helpId}-title`}>Why add alt text?</h3>
          <p>
            Describe the image’s meaning for people using a screen reader or viewing your newsletter
            with images turned off. Include essential text, such as a bill number shown in a
            graphic.
          </p>
          <a
            ref={helpLink}
            href="https://www.w3.org/WAI/tutorials/images/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn more about alt text
          </a>
        </div>
      )}
    </div>
  );
}
