import { newsletterCatalogStyle, newsletterWebFontUrls } from '@capiro/shared/newsletter';
import { newsletterBundledImageUrl } from '@capiro/shared/newsletter-render';
import { newsletterImagePlane } from './image-editor-crop.js';

export const IMAGE_ADJUSTMENTS = [
  'Brightness',
  'Saturation',
  'Contrast',
  'Gamma',
  'Clarity',
  'Exposure',
  'Shadows',
  'Highlights',
  'Whites',
  'Blacks',
  'Temperature',
  'Sharpness',
] as const;
export type ImageAdjustment = (typeof IMAGE_ADJUSTMENTS)[number];
export interface NewsletterImageText {
  text: string;
  x: number;
  y: number;
  font: string;
  size: number;
  color: string;
  background: string;
  bold: boolean;
  align: 'left' | 'center' | 'right';
  lineHeight: number;
  fontWeight?: number;
  italic?: boolean;
  letterSpacing?: number;
  rotation?: number;
  boxWidth?: number;
}
export interface NewsletterImageEdit {
  width: number;
  height: number;
  crop: { x: number; y: number; width: number; height: number };
  rotate: number;
  quarterTurns: number;
  flipX: boolean;
  flipY: boolean;
  filter: string;
  adjustments: Record<ImageAdjustment, number>;
  focus: 'None' | 'Radial' | 'Mirrored' | 'Linear' | 'Gaussian';
  blur: number;
  focusRegion: { x: number; y: number; size: number; angle: number };
  texts: NewsletterImageText[];
}
export function defaultNewsletterImageEdit(width: number, height: number): NewsletterImageEdit {
  return {
    width,
    height,
    crop: { x: 0, y: 0, width: 100, height: 100 },
    rotate: 0,
    quarterTurns: 0,
    flipX: false,
    flipY: false,
    filter: 'None',
    adjustments: Object.fromEntries(IMAGE_ADJUSTMENTS.map((key) => [key, 0])) as Record<
      ImageAdjustment,
      number
    >,
    focus: 'None',
    blur: 6,
    focusRegion: { x: 50, y: 50, size: 50, angle: 0 },
    texts: [],
  };
}
export function newsletterImageTextFont(text: NewsletterImageText, scale = 1): string {
  const face = newsletterCatalogStyle(text.font);
  const italic = text.italic ?? face?.fontStyle === 'italic';
  const weight = text.fontWeight ?? (text.bold ? 700 : (face?.fontWeight ?? 400));
  return `${italic ? 'italic ' : ''}${weight} ${text.size * scale}px ${face?.fontFamily ?? text.font}`;
}

const graphemes = (value: string) =>
  [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value)].map(
    (part) => part.segment,
  );

/** Keep explicit newlines and wrap whole words, splitting a long word only at grapheme boundaries. */
export function wrapNewsletterImageText(
  value: string,
  maxWidth: number,
  measure: (value: string) => number,
) {
  const result: string[] = [];
  for (const paragraph of value.replace(/\r\n?/g, '\n').split('\n')) {
    if (!paragraph) {
      result.push('');
      continue;
    }
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) {
        result.push(line);
        line = '';
      }
      for (const glyph of graphemes(word)) {
        if (line && measure(line + glyph) > maxWidth) {
          result.push(line);
          line = '';
        }
        line += glyph;
      }
    }
    result.push(line);
  }
  return result;
}

export interface NewsletterImageTextLayout {
  lines: { value: string; width: number }[];
  width: number;
  height: number;
}

/** Renderer and selection handles share the loaded font's actual measurements. */
export function newsletterImageTextLayout(
  context: CanvasRenderingContext2D,
  text: NewsletterImageText,
  imageWidth: number,
  scale = 1,
): NewsletterImageTextLayout {
  context.font = newsletterImageTextFont(text, scale);
  const spacing = (text.letterSpacing ?? 0) * scale;
  const nativeSpacing = typeof Reflect.get(context, 'letterSpacing') === 'string';
  if (nativeSpacing) Reflect.set(context, 'letterSpacing', `${spacing}px`);
  const measure = (value: string) =>
    context.measureText(value).width +
    (nativeSpacing ? 0 : spacing * Math.max(0, graphemes(value).length - 1));
  const maxWidth = text.boxWidth ? Math.max(1, (imageWidth * text.boxWidth) / 100) : Infinity;
  const values = text.boxWidth
    ? wrapNewsletterImageText(text.text, maxWidth, measure)
    : text.text.replace(/\r\n?/g, '\n').split('\n');
  const lines = values.map((value) => ({ value, width: measure(value) }));
  return {
    lines,
    width: text.boxWidth ? maxWidth : Math.max(1, ...lines.map((line) => line.width)),
    height: Math.max(1, lines.length) * text.size * scale * text.lineHeight,
  };
}

export function newsletterImageTextCenter(
  text: NewsletterImageText,
  layout: NewsletterImageTextLayout,
  imageWidth: number,
  imageHeight: number,
) {
  const align = text.align === 'center' ? 0.5 : text.align === 'right' ? 1 : 0;
  return {
    x: (imageWidth * text.x) / 100 + layout.width * (0.5 - align),
    y: (imageHeight * text.y) / 100 + layout.height / 2,
  };
}

const imageFontStylesheets = new Map<string, Promise<void>>();
/** Await the selected face before rasterizing; no newsletter text enters the stylesheet URL. */
export async function loadNewsletterImageFonts(texts: NewsletterImageText[]) {
  if (!texts.length) return;
  const urls = newsletterWebFontUrls(
    texts.map((text) => ({
      value: text.font,
      weight:
        text.fontWeight ??
        (text.bold ? 700 : (newsletterCatalogStyle(text.font)?.fontWeight ?? 400)),
      italic: text.italic ?? newsletterCatalogStyle(text.font)?.fontStyle === 'italic',
    })),
  );
  await Promise.all(
    urls.map((url) => {
      let pending = imageFontStylesheets.get(url);
      if (!pending) {
        pending = new Promise<void>((resolve, reject) => {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = url;
          link.referrerPolicy = 'no-referrer';
          link.dataset.newsletterImageFont = 'true';
          const timer = window.setTimeout(() => fail(), 10000);
          const fail = () => {
            window.clearTimeout(timer);
            link.remove();
            imageFontStylesheets.delete(url);
            reject(
              new Error(
                'The selected image font could not be loaded. Choose another font or try again.',
              ),
            );
          };
          link.onload = () => {
            window.clearTimeout(timer);
            resolve();
          };
          link.onerror = fail;
          document.head.append(link);
        });
        imageFontStylesheets.set(url, pending);
      }
      return pending;
    }),
  );
  if (document.fonts) {
    await Promise.all(
      texts.map(async (text) => {
        const faces = await new Promise<FontFace[]>((resolve, reject) => {
          const timer = window.setTimeout(
            () =>
              reject(
                new Error(
                  'The selected image font took too long to load. Choose another font or try again.',
                ),
              ),
            10000,
          );
          document.fonts.load(newsletterImageTextFont(text), text.text || ' ').then(
            (value) => {
              window.clearTimeout(timer);
              resolve(value);
            },
            (reason) => {
              window.clearTimeout(timer);
              reject(reason);
            },
          );
        });
        const catalog = newsletterCatalogStyle(text.font);
        if (!faces.length && catalog && newsletterWebFontUrls([{ value: text.font }]).length)
          throw new Error('The selected image font is unavailable. Choose another font.');
        if (!faces.length && text.font.startsWith('CapiroFont-'))
          throw new Error('The uploaded image font is unavailable. Choose another font.');
      }),
    );
  }
}

export function newsletterFocusGeometry(edit: NewsletterImageEdit, width: number, height: number) {
  const region = edit.focusRegion;
  const x = (width * region.x) / 100,
    y = (height * region.y) / 100;
  const radius = (Math.min(width, height) * region.size) / 200;
  const angle = (region.angle * Math.PI) / 180;
  return { x, y, radius, normalX: -Math.sin(angle), normalY: Math.cos(angle) };
}

const clamp = (value: number) => Math.min(255, Math.max(0, value));
/** Work on actual pixels: delivered mail never depends on CSS image filters. */
export function adjustNewsletterPixels(data: Uint8ClampedArray, edit: NewsletterImageEdit) {
  const a = edit.adjustments;
  const exposure = 2 ** (a.Exposure / 100);
  const gamma = 2 ** (-a.Gamma / 100);
  const contrast = (a.Contrast + 100) / 100;
  for (let i = 0; i < data.length; i += 4) {
    const original = [data[i]!, data[i + 1]!, data[i + 2]!];
    const luminance = (original[0]! * 0.2126 + original[1]! * 0.7152 + original[2]! * 0.0722) / 255;
    const lift =
      a.Brightness * 1.28 +
      a.Shadows * (1 - luminance) ** 2 * 0.64 +
      a.Highlights * luminance ** 2 * 0.64 +
      a.Whites * luminance ** 4 * 0.64 +
      a.Blacks * (1 - luminance) ** 4 * 0.64;
    let rgb = original.map(
      (value) => clamp((value * exposure + lift - 127.5) * contrast + 127.5) / 255,
    );
    // Gamma is applied after exposure and contrast, in normalized color space.
    rgb = rgb.map((value) => clamp(Math.max(0, value) ** gamma * 255));
    const grey = rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
    rgb = rgb.map((value) => grey + (value - grey) * (1 + a.Saturation / 100));
    rgb[0] = rgb[0]! + a.Temperature * 0.4;
    rgb[2] = rgb[2]! - a.Temperature * 0.4;
    if (edit.filter === 'Black & white') rgb = [grey, grey, grey];
    else if (edit.filter === 'Sepia')
      rgb = [
        rgb[0]! * 0.393 + rgb[1]! * 0.769 + rgb[2]! * 0.189,
        rgb[0]! * 0.349 + rgb[1]! * 0.686 + rgb[2]! * 0.168,
        rgb[0]! * 0.272 + rgb[1]! * 0.534 + rgb[2]! * 0.131,
      ];
    else if (edit.filter === 'Warm') {
      rgb[0] = rgb[0]! + 16;
      rgb[2] = rgb[2]! - 10;
    } else if (edit.filter === 'Cold') {
      rgb[0] = rgb[0]! - 10;
      rgb[2] = rgb[2]! + 16;
    } else if (edit.filter === 'Vintage')
      rgb = [rgb[0]! * 0.9 + 20, rgb[1]! * 0.9 + 10, rgb[2]! * 0.8];
    else if (edit.filter === 'Vivid') rgb = rgb.map((value) => grey + (value - grey) * 1.35);
    else if (edit.filter === 'Duotone') rgb = [40 + grey * 0.8, 22 + grey * 0.4, 80 + grey * 0.55];
    data[i] = clamp(rgb[0]!);
    data[i + 1] = clamp(rgb[1]!);
    data[i + 2] = clamp(rgb[2]!);
  }
}
export async function loadNewsletterImage(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () =>
      reject(new Error('Upload a copy of this image to Content studio before editing it.'));
    image.src = newsletterBundledImageUrl(url);
  });
  return image;
}
export function drawNewsletterImage(
  image: HTMLImageElement,
  edit: NewsletterImageEdit,
  maxSize = 4096,
) {
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, maxSize / Math.max(edit.width, edit.height));
  canvas.width = Math.max(1, Math.round(edit.width * scale));
  canvas.height = Math.max(1, Math.round(edit.height * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Image editing is unavailable in this browser.');
  const c = edit.crop;
  const plane = newsletterImagePlane(
    image.naturalWidth,
    image.naturalHeight,
    edit.rotate,
    edit.quarterTurns,
  );
  context.save();
  context.scale(
    canvas.width / ((plane.width * c.width) / 100),
    canvas.height / ((plane.height * c.height) / 100),
  );
  context.translate((-plane.width * c.x) / 100, (-plane.height * c.y) / 100);
  context.translate(plane.width / 2, plane.height / 2);
  context.scale(edit.flipX ? -1 : 1, edit.flipY ? -1 : 1);
  context.rotate(plane.radians);
  context.scale(plane.cover, plane.cover);
  context.drawImage(
    image,
    -image.naturalWidth / 2,
    -image.naturalHeight / 2,
    image.naturalWidth,
    image.naturalHeight,
  );
  context.restore();
  try {
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    adjustNewsletterPixels(pixels.data, edit);
    if (edit.adjustments.Sharpness || edit.adjustments.Clarity) {
      const original = pixels.data.slice();
      const strength = edit.adjustments.Sharpness / 100 + edit.adjustments.Clarity / 200;
      const width = canvas.width;
      for (let y = 1; y < canvas.height - 1; y++)
        for (let x = 1; x < width - 1; x++) {
          const index = (y * width + x) * 4;
          for (let channel = 0; channel < 3; channel++) {
            const p = index + channel;
            const blur =
              (original[p - 4]! +
                original[p + 4]! +
                original[p - width * 4]! +
                original[p + width * 4]!) /
              4;
            pixels.data[p] = clamp(original[p]! + (original[p]! - blur) * strength);
          }
        }
    }
    context.putImageData(pixels, 0, 0);
  } catch {
    throw new Error('Upload a copy of this image to Content studio before editing it.');
  }
  if (edit.focus !== 'None' && edit.blur) {
    const sharp = document.createElement('canvas');
    sharp.width = canvas.width;
    sharp.height = canvas.height;
    const sharpContext = sharp.getContext('2d')!;
    sharpContext.drawImage(canvas, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.filter = `blur(${edit.blur * scale}px)`;
    context.drawImage(sharp, 0, 0);
    context.filter = 'none';
    if (edit.focus !== 'Gaussian') {
      const region = newsletterFocusGeometry(edit, canvas.width, canvas.height);
      const mask =
        edit.focus === 'Radial'
          ? sharpContext.createRadialGradient(
              region.x,
              region.y,
              0,
              region.x,
              region.y,
              region.radius * 2,
            )
          : sharpContext.createLinearGradient(
              region.x - region.normalX * region.radius * 2,
              region.y - region.normalY * region.radius * 2,
              region.x + region.normalX * region.radius * 2,
              region.y + region.normalY * region.radius * 2,
            );
      if (edit.focus === 'Radial') {
        mask.addColorStop(0, '#fff');
        mask.addColorStop(0.5, '#fff');
        mask.addColorStop(1, 'transparent');
      } else if (edit.focus === 'Linear') {
        mask.addColorStop(0, '#fff');
        mask.addColorStop(0.5, '#fff');
        mask.addColorStop(1, 'transparent');
      } else {
        mask.addColorStop(0, 'transparent');
        mask.addColorStop(0.35, '#fff');
        mask.addColorStop(0.65, '#fff');
        mask.addColorStop(1, 'transparent');
      }
      sharpContext.globalCompositeOperation = 'destination-in';
      sharpContext.fillStyle = mask;
      sharpContext.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(sharp, 0, 0);
    }
  }
  for (const overlay of edit.texts) {
    const size = overlay.size * scale;
    context.save();
    const layout = newsletterImageTextLayout(context, overlay, canvas.width, scale);
    context.textAlign = overlay.align;
    context.textBaseline = 'top';
    const center = newsletterImageTextCenter(overlay, layout, canvas.width, canvas.height);
    context.translate(center.x, center.y);
    context.rotate(((overlay.rotation ?? 0) * Math.PI) / 180);
    context.translate(-layout.width / 2, -layout.height / 2);
    const anchor =
      overlay.align === 'center' ? layout.width / 2 : overlay.align === 'right' ? layout.width : 0;
    const spacing = (overlay.letterSpacing ?? 0) * scale;
    const nativeSpacing = typeof Reflect.get(context, 'letterSpacing') === 'string';
    if (nativeSpacing)
      (context as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
        `${spacing}px`;
    for (const [line, { value, width }] of layout.lines.entries()) {
      const position = line * size * overlay.lineHeight;
      const glyphs = graphemes(value);
      const left =
        anchor - (overlay.align === 'center' ? width / 2 : overlay.align === 'right' ? width : 0);
      if (/^#[a-f\d]{6}$/i.test(overlay.background)) {
        context.fillStyle = overlay.background;
        context.fillRect(left - 4, position, width + 8, size * overlay.lineHeight);
      }
      context.fillStyle = /^#[a-f\d]{6}$/i.test(overlay.color) ? overlay.color : '#ffffff';
      if (nativeSpacing || !spacing) context.fillText(value, anchor, position);
      else {
        context.textAlign = 'left';
        let cursor = left;
        for (const glyph of glyphs) {
          context.fillText(glyph, cursor, position);
          cursor += context.measureText(glyph).width + spacing;
        }
        context.textAlign = overlay.align;
      }
    }
    context.restore();
  }
  return canvas;
}
export function drawNewsletterCropPreview(
  image: HTMLImageElement,
  edit: NewsletterImageEdit,
  maxSize = 1000,
) {
  const plane = newsletterImagePlane(
    image.naturalWidth,
    image.naturalHeight,
    edit.rotate,
    edit.quarterTurns,
  );
  const canvas = drawNewsletterImage(
    image,
    {
      ...edit,
      width: plane.width,
      height: plane.height,
      crop: { x: 0, y: 0, width: 100, height: 100 },
      focus: 'None',
      texts: [],
    },
    maxSize,
  );
  const cropped = drawNewsletterImage(image, edit, maxSize);
  canvas
    .getContext('2d')!
    .drawImage(
      cropped,
      (canvas.width * edit.crop.x) / 100,
      (canvas.height * edit.crop.y) / 100,
      (canvas.width * edit.crop.width) / 100,
      (canvas.height * edit.crop.height) / 100,
    );
  return canvas;
}
export async function newsletterEditedImageFile(
  image: HTMLImageElement,
  edit: NewsletterImageEdit,
) {
  await loadNewsletterImageFonts(edit.texts);
  const canvas = drawNewsletterImage(image, edit);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) =>
        value ? resolve(value) : reject(new Error('The edited image could not be saved.')),
      'image/png',
    ),
  );
  return new File([blob], 'newsletter-edited.png', { type: 'image/png' });
}
