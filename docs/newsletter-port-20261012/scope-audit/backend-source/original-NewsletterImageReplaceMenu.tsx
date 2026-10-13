import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Image } from 'lucide-react';

export function NewsletterImageReplaceMenu({
  onUpload,
  onBrowse,
  onAdvanced,
  disabled = false,
  canEdit,
  canvas = false,
  label = 'Replace',
}: {
  onUpload: () => void;
  onBrowse: () => void;
  onAdvanced: () => void;
  disabled?: boolean;
  canEdit: boolean;
  canvas?: boolean;
  label?: 'Replace' | 'Add';
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const close = (restore = false) => {
    setOpen(false);
    if (restore) trigger.current?.focus();
  };
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus();
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    window.addEventListener('pointerdown', outside);
    return () => window.removeEventListener('pointerdown', outside);
  }, [open]);
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);
  const choose = (action: () => void) => {
    close(true);
    action();
  };
  return (
    <div
      ref={root}
      className="nl-image-replace"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        {canvas && <Image size={16} />} {label} <ChevronDown size={14} />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Replace image"
          id={menuId}
          className="nl-image-replace-menu"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              close(true);
              return;
            }
            if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const items = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>(
                '[role="menuitem"]:not(:disabled)',
              ),
            );
            const index = items.indexOf(document.activeElement as HTMLButtonElement);
            const next =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? items.length - 1
                  : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
            items[next]?.focus();
          }}
        >
          <button type="button" role="menuitem" tabIndex={-1} onClick={() => choose(onUpload)}>
            Upload Image
          </button>
          <button type="button" role="menuitem" tabIndex={-1} onClick={() => choose(onBrowse)}>
            Browse Library
          </button>
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            disabled={!canEdit}
            onClick={() => choose(onAdvanced)}
          >
            Edit with Photopea
          </button>
        </div>
      )}
    </div>
  );
}
