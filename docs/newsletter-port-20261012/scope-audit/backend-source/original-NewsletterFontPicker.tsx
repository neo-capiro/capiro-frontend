import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  newsletterCatalogStyle,
  newsletterWebFontUrls,
  type NewsletterFontRequest,
} from '@capiro/shared/newsletter';
import type { NewsletterFontChoice } from './brand-context.js';

export function NewsletterWebFonts({ requests }: { requests: readonly NewsletterFontRequest[] }) {
  return (
    <>
      {newsletterWebFontUrls(requests).map((url) => (
        <link key={url} rel="stylesheet" href={url} referrerPolicy="no-referrer" />
      ))}
    </>
  );
}
/** Searchable font selector with the source's family/weight/italic choices. */
export function NewsletterFontPicker({
  label,
  value,
  choices,
  onChange,
}: {
  label: string;
  value: string;
  choices: readonly NewsletterFontChoice[];
  onChange: (value: string) => void;
}) {
  const id = useId(),
    listId = `${id}-fonts`;
  const root = useRef<HTMLDivElement>(null),
    list = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0),
    [scrollTop, setScrollTop] = useState(0);
  const options = useMemo(() => {
    const items = choices.map((choice) =>
      Array.isArray(choice)
        ? { value: choice[0], label: choice[1] }
        : { value: choice, label: choice },
    );
    if (!items.some((item) => item.value === value)) items.push({ value, label: value });
    return items;
  }, [choices, value]);
  const selected = options.find((option) => option.value === value)!;
  const matches = useMemo(
    () =>
      options.filter((option) =>
        option.label.toLowerCase().includes((query ?? '').trim().toLowerCase()),
      ),
    [options, query],
  );
  const rowHeight = 36,
    start = Math.max(0, Math.floor(scrollTop / rowHeight) - 1),
    visible = matches.slice(start, start + 12);
  const reveal = (index: number) => {
    setActive(index);
    const scroll = list.current;
    if (scroll) {
      const top = index * rowHeight;
      if (top < scroll.scrollTop) scroll.scrollTop = top;
      else if (top + rowHeight > scroll.scrollTop + 288) scroll.scrollTop = top + rowHeight - 288;
      setScrollTop(scroll.scrollTop);
    }
  };
  useEffect(() => {
    if (!open) return;
    const index =
      query === null
        ? Math.max(
            0,
            matches.findIndex((item) => item.value === value),
          )
        : 0;
    reveal(index);
  }, [open, query, value]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery(null);
      }
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
    setQuery(null);
  };
  return (
    <div className="nl-font-picker" ref={root}>
      <input
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined}
        value={open && query !== null ? query : selected.label}
        placeholder="Select a font"
        autoComplete="off"
        onFocus={() => {
          setOpen(true);
          setQuery(null);
        }}
        onClick={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setScrollTop(0);
          if (list.current) list.current.scrollTop = 0;
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
            reveal(
              Math.max(
                0,
                Math.min(matches.length - 1, active + (event.key === 'ArrowDown' ? 1 : -1)),
              ),
            );
          }
          if (event.key === 'Enter' && open) {
            event.preventDefault();
            event.stopPropagation();
            if (matches[active]) choose(matches[active]!.value);
          }
          if (event.key === 'Escape' && open) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
            setQuery(null);
          }
          if (event.key === 'Tab') {
            setOpen(false);
            setQuery(null);
          }
        }}
      />
      <span className="nl-font-chevron" aria-hidden="true">
        {open ? '⌃' : '⌄'}
      </span>
      {open && (
        <div className="nl-font-popover">
          <div className="nl-font-list-heading">
            All fonts <span>{matches.length}</span>
          </div>
          <div
            ref={list}
            id={listId}
            role="listbox"
            aria-label={`${label} choices`}
            className="nl-font-list"
            onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
          >
            <div style={{ height: matches.length * rowHeight, position: 'relative' }}>
              {visible.map((option, offset) => {
                const index = start + offset;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    id={`${listId}-${index}`}
                    aria-selected={option.value === value}
                    aria-setsize={matches.length}
                    aria-posinset={index + 1}
                    className={active === index ? 'is-highlighted' : ''}
                    style={{
                      position: 'absolute',
                      top: index * rowHeight,
                      height: rowHeight,
                      ...newsletterCatalogStyle(option.value),
                    }}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(option.value)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
          {!matches.length && <p role="status">No fonts found.</p>}
          <NewsletterWebFonts requests={visible.map((option) => ({ value: option.value }))} />
        </div>
      )}
    </div>
  );
}
