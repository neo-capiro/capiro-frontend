import { findNewsletterBlock, type NewsletterCampaign } from '@capiro/shared/newsletter';
import {
  newsletterMergeText,
  newsletterSafeUrl,
  renderNewsletterDesign,
} from '@capiro/shared/newsletter-render';
import { sanitizeNewsletterMarkup } from './model.js';

export interface NewsletterReviewLink {
  key: string;
  blockId: string;
  index: number;
  label: string;
  url: string;
  valid: boolean;
  web: boolean;
  managed: boolean;
  source: 'url' | 'item' | 'html' | 'app' | 'managed';
  originalHtml?: string;
}

/** These identifiers come from renderer wrappers, not custom HTML attributes. */
export function newsletterLinkBlock(anchor: Element): HTMLElement | null {
  for (let node = anchor.parentElement; node; node = node.parentElement)
    if (node.id && node.classList.contains(`nl-block-${node.id}`)) return node;
  return null;
}
export function newsletterBlockLinks(wrapper: Element): Element[] {
  return Array.from(wrapper.querySelectorAll('a')).filter(
    (anchor) =>
      newsletterLinkBlock(anchor) === wrapper &&
      (anchor.hasAttribute('href') || !anchor.hasAttribute('id')),
  );
}

/** Keep raw recipient tags even when the displayed preview has live sample values. */
export function newsletterReviewLinks(document: NewsletterCampaign): NewsletterReviewLink[] {
  const html = renderNewsletterDesign(document.design, document.config, {
    sanitizeHtml: sanitizeNewsletterMarkup,
    editor: true,
  });
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(parsed.querySelectorAll('a')).flatMap((anchor) => {
    const wrapper = newsletterLinkBlock(anchor);
    const block = wrapper && findNewsletterBlock(document.design, wrapper.id);
    if (!block || !wrapper) return [];
    const index = newsletterBlockLinks(wrapper).indexOf(anchor);
    if (index < 0) return [];
    let source: NewsletterReviewLink['source'] = 'managed';
    let url = anchor.getAttribute('href') || '';
    if (block.kind === 'apps' && block.app?.sourceUrl) {
      source = 'app';
      url = block.app.sourceUrl;
    } else if (['heading', 'paragraph', 'code'].includes(block.kind) && block.html) {
      source = 'html';
    } else if (['button', 'video', 'image', 'logo'].includes(block.kind)) {
      source = 'url';
      url = block.url;
    } else if (block.kind === 'social' && block.social?.mode === 'share') {
      source = 'managed';
    } else if (['social', 'product', 'product-rec'].includes(block.kind)) {
      source = 'item';
      url = block.items[index]?.url || '';
    }
    const safe = newsletterSafeUrl(url);
    const merge = source !== 'app' && /\*\|[^|]+\|\*/.test(url);
    const knownMerge =
      source === 'app' ||
      !/\*\|[^|]+\|\*/.test(newsletterMergeText(url, document.config, { liveMergeTags: true }));
    const valid =
      !!safe && knownMerge && (!url.startsWith('#') || !!parsed.getElementById(url.slice(1)));
    return [
      {
        key: `${block.id}:${index}:${url}`,
        blockId: block.id,
        index,
        label:
          anchor.textContent?.trim() ||
          anchor.querySelector('img')?.getAttribute('alt') ||
          'Linked image',
        url,
        valid,
        web: !!safe && !merge && /^https?:\/\//i.test(safe),
        managed: source === 'managed' || (merge && !!safe && knownMerge),
        source,
        ...(source === 'html' ? { originalHtml: block.html } : {}),
      },
    ];
  });
}

/** A failed save may be retried against the same local edit, never another target. */
export function editNewsletterReviewLink(
  document: NewsletterCampaign,
  link: NewsletterReviewLink,
  value: string,
): boolean {
  const safe = newsletterSafeUrl(value);
  if (!safe)
    throw new Error(
      'Enter a valid web, email, telephone, anchor or supported merge-tag destination.',
    );
  const block = findNewsletterBlock(document.design, link.blockId);
  if (!block || link.source === 'managed')
    throw new Error('This destination is managed in Outreach.');
  const changed = () => new Error('The link changed. Reopen its details before editing it.');
  if (link.source === 'app') {
    if (block.kind !== 'apps' || !block.app) throw changed();
    let parsed: URL;
    try {
      parsed = new URL(safe);
    } catch {
      throw new Error('Link previews require a public HTTPS URL.');
    }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password)
      throw new Error('Link previews require a public HTTPS URL without embedded credentials.');
    if (block.app.sourceUrl === safe) return false;
    if (block.app.sourceUrl !== link.url) throw changed();
    block.app.sourceUrl = safe;
    return true;
  }
  if (link.source === 'html') {
    if (
      !['heading', 'paragraph', 'code', 'apps'].includes(block.kind) ||
      link.originalHtml === undefined
    )
      throw changed();
    const fragment = new DOMParser().parseFromString(
      sanitizeNewsletterMarkup(link.originalHtml),
      'text/html',
    );
    const anchors = Array.from(fragment.querySelectorAll('a')).filter(
      (a) => a.hasAttribute('href') || !a.hasAttribute('id'),
    );
    const anchor = anchors[link.index];
    if (!anchor || (anchor.getAttribute('href') || '') !== link.url) throw changed();
    anchor.setAttribute('href', safe);
    const next = sanitizeNewsletterMarkup(fragment.body.innerHTML);
    if (block.html === next) return false;
    if (block.html !== link.originalHtml) throw changed();
    block.html = next;
    return true;
  }
  if (link.source === 'url') {
    if (!['button', 'video', 'image', 'logo'].includes(block.kind)) throw changed();
    if (block.url === safe) return false;
    if (block.url !== link.url) throw changed();
    block.url = safe;
    return true;
  }
  if (!['social', 'product', 'product-rec'].includes(block.kind)) throw changed();
  const item = block.items[link.index];
  if (!item) throw changed();
  if (item.url === safe) return false;
  if (item.url !== link.url) throw changed();
  item.url = safe;
  return true;
}
