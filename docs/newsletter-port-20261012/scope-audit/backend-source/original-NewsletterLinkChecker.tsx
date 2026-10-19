import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { newsletterSafeUrl } from '@capiro/shared/newsletter-render';
import { newsletterError } from './api.js';
import {
  newsletterBlockLinks,
  newsletterLinkBlock,
  type NewsletterReviewLink,
} from './newsletter-links.js';

export function NewsletterPreviewFrame({
  html,
  style,
  selected,
  links,
  onSelect,
}: {
  html: string;
  style?: CSSProperties;
  selected?: NewsletterReviewLink | null;
  links: NewsletterReviewLink[];
  onSelect?: (key: string) => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const latest = useRef({ selected, links, onSelect });
  latest.current = { selected, links, onSelect };
  const previousHighlight = useRef<{
    element: HTMLElement;
    outline: string;
    offset: string;
  } | null>(null);
  const clearHighlight = () => {
    const previous = previousHighlight.current;
    if (previous) {
      previous.element.style.outline = previous.outline;
      previous.element.style.outlineOffset = previous.offset;
      previousHighlight.current = null;
    }
  };
  const highlight = () => {
    clearHighlight();
    const doc = frame.current?.contentDocument;
    const link = latest.current.selected;
    if (!doc || !link) return;
    const wrapper = doc.getElementById(link.blockId);
    const anchor =
      wrapper && (newsletterBlockLinks(wrapper)[link.index] as HTMLElement | undefined);
    if (!anchor) return;
    previousHighlight.current = {
      element: anchor,
      outline: anchor.style.outline,
      offset: anchor.style.outlineOffset,
    };
    anchor.style.outline = '3px solid #007c89';
    anchor.style.outlineOffset = '4px';
    anchor.scrollIntoView?.({ block: 'center' });
  };
  useEffect(() => {
    highlight();
  }, [selected?.key]);
  return (
    <iframe
      ref={frame}
      title="Newsletter preview"
      sandbox="allow-same-origin"
      srcDoc={html}
      style={style}
      onLoad={() => {
        clearHighlight();
        const doc = frame.current?.contentDocument;
        if (!doc) return;
        // Scripts remain disabled. Preview clicks review destinations rather than navigate.
        doc.addEventListener('click', (event) => {
          const anchor = (event.target as Element).closest?.('a');
          if (!anchor) return;
          event.preventDefault();
          const wrapper = newsletterLinkBlock(anchor);
          const index = wrapper ? newsletterBlockLinks(wrapper).indexOf(anchor) : -1;
          const link = latest.current.links.find(
            (item) => item.blockId === wrapper?.id && item.index === index,
          );
          if (link) latest.current.onSelect?.(link.key);
        });
        highlight();
      }}
    />
  );
}

export function NewsletterLinkChecker({
  links,
  selectedKey,
  checked,
  onReview,
  onSelect,
  onSave,
  onBack,
}: {
  links: NewsletterReviewLink[];
  selectedKey: string | null;
  checked: Set<string>;
  onReview: (key: string) => void;
  onSelect: (key: string | null) => void;
  onSave: (link: NewsletterReviewLink, url: string) => Promise<NewsletterReviewLink>;
  onBack: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const index = links.findIndex((link) => link.key === selectedKey);
  const selected = links[index];
  useEffect(() => {
    setEditing(false);
    setError('');
    if (selectedKey && links.some((link) => link.key === selectedKey)) onReview(selectedKey);
  }, [selectedKey]);
  useEffect(() => {
    if (editing) input.current?.focus();
  }, [editing]);
  const select = (key: string | null) => {
    if (!busy) onSelect(key);
  };
  const count = links.filter((link) => checked.has(link.key)).length;
  return (
    <section className="nl-link-checker" aria-label="Email link checker">
      <div className="nl-link-checker-head">
        <button
          aria-label={selected ? 'Back to link list' : 'Back to email information'}
          disabled={busy}
          onClick={() => (selected ? select(null) : onBack())}
        >
          ←
        </button>
        <h3>{selected ? 'Link details' : `${count} of ${links.length} links checked`}</h3>
      </div>
      {selected ? (
        <>
          <strong className="nl-link-label">{selected.label}</strong>
          {editing ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (busy || !newsletterSafeUrl(value)) return;
                setBusy(true);
                setError('');
                void onSave(selected, value)
                  .then((next) => {
                    if (!mounted.current) return;
                    onReview(next.key);
                    setEditing(false);
                    onSelect(next.key);
                  })
                  .catch((error) => {
                    if (mounted.current) setError(newsletterError(error));
                  })
                  .finally(() => {
                    if (mounted.current) setBusy(false);
                  });
              }}
            >
              <label className="nl-field">
                <span>href</span>
                <input
                  ref={input}
                  aria-label="href"
                  value={value}
                  disabled={busy}
                  onChange={(event) => setValue(event.target.value)}
                />
              </label>
              {!newsletterSafeUrl(value) && (
                <p role="alert">
                  {value.trim() ? 'Enter a valid destination.' : 'This cannot be empty.'}
                </p>
              )}
              <div className="nl-link-edit-actions">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setEditing(false);
                    setError('');
                  }}
                >
                  Cancel
                </button>
                <button
                  className="nl-primary"
                  type="submit"
                  disabled={busy || !newsletterSafeUrl(value)}
                >
                  {busy ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <p className="nl-link-url">{selected.url || 'Missing destination'}</p>
              {selected.source !== 'managed' && (
                <button
                  onClick={() => {
                    setValue(selected.url);
                    setEditing(true);
                  }}
                >
                  Edit link
                </button>
              )}
            </>
          )}
          {error && <p role="alert">{error}</p>}
          {!selected.valid && (
            <p className="nl-link-warning" role="alert">
              This link needs a valid destination.
            </p>
          )}
          {selected.web ? (
            <div className="nl-link-site-preview">
              <h4>Website preview</h4>
              <iframe
                title={`Website preview: ${selected.label}`}
                src={newsletterSafeUrl(selected.url)}
                sandbox=""
                referrerPolicy="no-referrer"
              />
              <p className="nl-muted">
                Some websites prevent embedded previews. Open the link to verify its page.
              </p>
              <a
                href={newsletterSafeUrl(selected.url)}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
              >
                Open link
              </a>
            </div>
          ) : (
            <div className="nl-link-no-preview">
              <h4>No preview available</h4>
              <p>
                This link contains a merge tag, anchor, email address, telephone number, or another
                destination that cannot display a website preview.
              </p>
              {selected.managed && <p>Recipient-specific destinations are created in Outreach.</p>}
            </div>
          )}
          <p className="nl-link-position">
            Link {index + 1} of {links.length}
          </p>
          <div className="nl-link-navigation">
            <button
              disabled={busy || editing || index === 0}
              onClick={() => select(links[index - 1]!.key)}
            >
              Back
            </button>
            <button
              className="nl-primary"
              disabled={busy || editing}
              onClick={() => select(index === links.length - 1 ? null : links[index + 1]!.key)}
            >
              {index === links.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </>
      ) : (
        <>
          {!links.length && <p>No links in this newsletter.</p>}
          <ul className="nl-link-list">
            {links.map((link) => (
              <li key={link.key}>
                <button onClick={() => select(link.key)}>
                  <span aria-hidden="true" className="nl-link-reviewed">
                    {checked.has(link.key) ? '✓' : '↗'}
                  </span>
                  <span>
                    <strong>{link.label}</strong>
                    <small>{link.url || 'Missing destination'}</small>
                  </span>
                  <span aria-hidden="true">›</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="nl-muted">
            Select each link to inspect its destination and edit it. Checked counts reflect your
            review.
          </p>
        </>
      )}
    </section>
  );
}
