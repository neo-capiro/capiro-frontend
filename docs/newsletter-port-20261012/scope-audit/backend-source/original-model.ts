import {
  cloneNewsletterBlocks,
  createNewsletterBlock,
  createNewsletterSection,
  newsletterId,
  type NewsletterBlock,
  type NewsletterDesign,
  type NewsletterSection,
} from '@capiro/shared/newsletter';
import { newsletterSafeUrl } from '@capiro/shared/newsletter-render';
export interface BlockLocation {
  list: NewsletterBlock[];
  index: number;
}
export function newsletterPreviewLinks(html: string) {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(parsed.querySelectorAll('a[href]')).map((link) => {
    const url = link.getAttribute('href') || '';
    const merge = /^\*\|[^|]+\|\*$/.test(url);
    const safe = newsletterSafeUrl(url);
    const missingAnchor = url.startsWith('#') && !parsed.getElementById(url.slice(1));
    return {
      label: link.textContent?.trim() || 'Linked image',
      url,
      status:
        merge && safe
          ? 'Resolved in Outreach'
          : !safe || missingAnchor
            ? 'Check destination'
            : 'Valid destination',
      openable: !!safe && !merge && !url.startsWith('#'),
    };
  });
}
export function locateBlock(design: NewsletterDesign, id: string): BlockLocation | null {
  const walk = (list: NewsletterBlock[]): BlockLocation | null => {
    for (let index = 0; index < list.length; index++) {
      const block = list[index]!;
      if (block.id === id) return { list, index };
      for (const column of block.columns) {
        const found = walk(column);
        if (found) return found;
      }
    }
    return null;
  };
  for (const section of design.sections) {
    const found = walk(section.blocks);
    if (found) return found;
  }
  return null;
}
export function duplicateBlock(design: NewsletterDesign, id: string) {
  const found = locateBlock(design, id);
  if (!found) return;
  const copy = cloneNewsletterBlocks([found.list[found.index]!])[0]!;
  found.list.splice(found.index + 1, 0, copy);
  return copy.id;
}
export function moveBlock(
  design: NewsletterDesign,
  id: string,
  target: { sectionId: string; columnId?: string; column?: number; beforeId?: string },
) {
  const source = locateBlock(design, id);
  if (!source || target.beforeId === id || target.columnId === id) return false;
  const block = source.list[source.index]!;
  const includes = (blocks: NewsletterBlock[]): boolean =>
    blocks.some((b) => b.id === target.columnId || includes(b.columns.flat()));
  if (includes(block.columns.flat())) return false; // Never move a parent into its descendants.
  const section = design.sections.find((s) => s.id === target.sectionId);
  if (!section) return false;
  const container = target.columnId ? locateBlock(design, target.columnId) : null;
  const destination = container
    ? container.list[container.index]!.columns[target.column ?? 0]
    : section.blocks;
  if (!destination) return false;
  source.list.splice(source.index, 1);
  const index = target.beforeId
    ? destination.findIndex((b) => b.id === target.beforeId)
    : destination.length;
  destination.splice(index < 0 ? destination.length : index, 0, block);
  return true;
}
export const SECTION_CATEGORIES = [
  'Header',
  'Hero',
  'Promo',
  'Features',
  'Editorial',
  'Bill updates',
  'Reviews',
  'Image gallery',
  'Footer',
] as const;
export function prebuiltSection(category: string, variant = 0): NewsletterSection {
  const b = createNewsletterBlock;
  const h = b('heading', {
    text:
      category === 'Hero'
        ? 'This week in policy'
        : category === 'Reviews'
          ? 'What our clients are saying'
          : `${category} headline`,
    headingLevel: category === 'Hero' ? 1 : 2,
  });
  const p = b('paragraph', {
    text: 'Add a sourced update, explain the implications for your client, and identify the next step.',
  });
  const image = b('image', {
    imageUrl: '/newsletter/policy-desk.svg',
    alt: 'Policy briefing illustration',
  });
  const button = b('button', { text: 'Learn more', url: 'https://www.congress.gov/' });
  const column = (left: NewsletterBlock[], right: NewsletterBlock[]) =>
    b('columns', { columns: [left, right], ratio: variant % 2 ? '1:2' : '2' });
  const blocks =
    category === 'Header'
      ? [b('logo', { text: 'YOUR FIRM', style: { bold: true, fontSize: 32 } }), b('divider')]
      : category === 'Footer'
        ? [b('social', { items: [{ label: 'WEBSITE', url: 'https://capiro.ai/' }] }), b('footer')]
        : category === 'Image gallery'
          ? [column([image], [cloneNewsletterBlocks([image])[0]!])]
          : category === 'Bill updates'
            ? [
                h,
                column(
                  [
                    b('heading', { text: 'Bill status', headingLevel: 3 }),
                    b('paragraph', { text: 'Add the bill number, latest action, and a source link.' }),
                  ],
                  [
                    b('heading', { text: 'Client implications', headingLevel: 3 }),
                    b('paragraph', { text: 'Explain the impact, upcoming milestones, and next steps.' }),
                  ],
                ),
              ]
            : category === 'Features'
              ? [h, column([p], [cloneNewsletterBlocks([p])[0]!])]
              : variant % 2
                ? [column([h, p, button], [image])]
                : [h, image, p, button];
  return createNewsletterSection(category, blocks);
}
export function cloneSection(section: NewsletterSection) {
  return {
    ...structuredClone(section),
    id: newsletterId(),
    blocks: cloneNewsletterBlocks(section.blocks),
  };
}
/** Client paste/display hygiene. The API validates again before saving/rendering. */
/** Bake crops into raster bytes so email clients do not need object-fit support. */
export async function rasterizeNewsletterCrop(
  url: string,
  crop: NonNullable<NewsletterBlock['crop']>,
): Promise<File> {
  const source = new Image();
  source.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    source.onload = () => resolve();
    source.onerror = () =>
      reject(
        new Error('This image cannot be edited. Upload a copy to Content studio and try again.'),
      );
    source.src = url;
  });
  const ratio = crop.width / crop.height;
  const width = Math.min(source.naturalWidth, source.naturalHeight * ratio);
  const height = Math.min(source.naturalHeight, source.naturalWidth / ratio);
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 2048 / Math.max(width, height));
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image editing is unavailable in this browser.');
  context.drawImage(
    source,
    ((source.naturalWidth - width) * crop.x) / 100,
    ((source.naturalHeight - height) * crop.y) / 100,
    width,
    height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  const blob = await new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob(
        (value) => (value ? resolve(value) : reject(new Error('The image could not be saved.'))),
        'image/png',
      );
    } catch {
      reject(new Error('Upload a copy of this image to Content studio before editing it.'));
    }
  });
  return new File([blob], 'newsletter-crop.png', { type: 'image/png' });
}
export function sanitizeNewsletterMarkup(html: string) {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const allowed = new Set([
    'P',
    'BR',
    'STRONG',
    'B',
    'EM',
    'I',
    'U',
    'S',
    'SPAN',
    'DIV',
    'A',
    'H1',
    'H2',
    'H3',
    'H4',
    'UL',
    'OL',
    'LI',
    'TABLE',
    'THEAD',
    'TBODY',
    'TR',
    'TD',
    'TH',
    'IMG',
    'HR',
    'BLOCKQUOTE',
    'PRE',
    'CODE',
  ]);
  parsed
    .querySelectorAll('script,style,iframe,object,embed,svg,math,form,link,meta,base')
    .forEach((el) => el.remove());
  for (const el of Array.from(parsed.body.querySelectorAll('*'))) {
    if (!allowed.has(el.tagName)) {
      el.replaceWith(...Array.from(el.childNodes));
      continue;
    }
    for (const attribute of Array.from(el.attributes)) {
      const name = attribute.name;
      const value = attribute.value;
      if (name === 'id' && el.tagName === 'A' && /^[a-z\d_-]{1,100}$/i.test(value)) continue;
      else if (name === 'href' && el.tagName === 'A') {
        const safe = newsletterSafeUrl(value);
        if (safe) el.setAttribute(name, safe);
        else el.removeAttribute(name);
      } else if (name === 'src' && el.tagName === 'IMG') {
        const safe = newsletterSafeUrl(value, true);
        if (safe) el.setAttribute(name, safe);
        else el.removeAttribute(name);
      } else if (
        (name === 'alt' && el.tagName === 'IMG') ||
        (['width', 'height', 'colspan', 'rowspan'].includes(name) && /^\d{1,4}$/.test(value))
      )
        continue;
      else if (name === 'style') {
        const style = (el as HTMLElement).style;
        const keep: string[] = [];
        for (const key of [
          'color',
          'background-color',
          'font-family',
          'font-size',
          'font-weight',
          'font-style',
          'text-align',
          'text-decoration',
          'line-height',
        ]) {
          const entry = style.getPropertyValue(key);
          if (/^[#a-z0-9 .,\-"']{1,100}$/i.test(entry) && !/url|expression|var\(/i.test(entry))
            keep.push(`${key}:${entry}`);
        }
        el.setAttribute('style', keep.join(';'));
      } else el.removeAttribute(name);
    }
    if (el.tagName === 'A') el.setAttribute('rel', 'noopener noreferrer');
  }
  return parsed.body.innerHTML;
}
