import { useEffect, useId, useRef, useState } from 'react';
import { newsletterSafeUrl } from '@capiro/shared/newsletter-render';

function videoUrl(value: string) {
  const safe = newsletterSafeUrl(value);
  return /^https?:\/\//i.test(safe) ? safe : '';
}
/** Like the source builder, edits apply live; Save dismisses the field. */
export function NewsletterVideoUrlControl({
  url,
  onChange,
  disabled = false,
}: {
  url: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    field = useRef<HTMLInputElement>(null);
  const restoreFocus = useRef(false);
  const id = useId(),
    safe = videoUrl(url);
  const close = () => {
    restoreFocus.current = true;
    setOpen(false);
  };
  useEffect(() => {
    if (!open && restoreFocus.current) {
      restoreFocus.current = false;
      trigger.current?.focus();
    }
  }, [open]);
  useEffect(() => {
    if (!open) return;
    field.current?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  return (
    <div
      ref={root}
      className="nl-video-url-actions"
      role="toolbar"
      aria-label="Video URL actions"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (open && event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
      }}
    >
      {open ? (
        <div role="group" aria-label="Edit video URL" className="nl-video-url-field">
          <label htmlFor={id}>Video URL</label>
          <input
            id={id}
            ref={field}
            value={url}
            placeholder="Please enter a URL"
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && safe && !disabled) {
                event.preventDefault();
                close();
              }
            }}
          />
          {url ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                onChange('');
                close();
              }}
            >
              Remove URL
            </button>
          ) : (
            <button type="button" onClick={() => close()}>
              Cancel
            </button>
          )}
          <button type="button" disabled={!safe || disabled} onClick={() => close()}>
            Save
          </button>
        </div>
      ) : (
        <>
          <button
            ref={trigger}
            type="button"
            disabled={disabled}
            aria-expanded={false}
            onClick={() => setOpen(true)}
          >
            {url ? 'Edit URL' : 'Add URL'}
          </button>
          {!!safe && (
            <a href={safe} target="_blank" rel="noopener noreferrer">
              Preview link
            </a>
          )}
        </>
      )}
    </div>
  );
}
