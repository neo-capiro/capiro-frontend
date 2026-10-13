// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { newsletterBundledImageUrl } from '@capiro/shared/newsletter-render';
import { loadNewsletterImage } from './image-editor.js';
import { newsletterImageFile } from './NewsletterImageAi.js';
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function imageFixture() {
  class ImageFixture {
    naturalWidth = 1200;
    naturalHeight = 620;
    crossOrigin = '';
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    currentUrl = '';
    set src(url: string) {
      this.currentUrl = url;
      queueMicrotask(() => this.onload?.());
    }
    get src() {
      return this.currentUrl;
    }
  }
  vi.stubGlobal('Image', ImageFixture);
}
it('normalizes only known local legacy sample URLs, retaining remote and owned asset URLs', () => {
  expect(newsletterBundledImageUrl('/newsletter/newsroom.svg')).toBe('/newsletter/newsroom.png');
  for (const url of [
    'https://example.com/newsletter/newsroom.svg',
    '/newsletter/custom.svg',
    '/workspace-api/newsletters/assets/file/token',
    '/newsletter/newsroom.png',
  ])
    expect(newsletterBundledImageUrl(url)).toBe(url);
});
it('loads the same PNG dimensions used by the template preview for editing', async () => {
  imageFixture();
  const image = await loadNewsletterImage('/newsletter/newsroom.svg');
  expect(image.src).toBe('/newsletter/newsroom.png');
  expect(image.crossOrigin).toBe('anonymous');
  expect([image.naturalWidth, image.naturalHeight]).toEqual([1200, 620]);
});
it('prepares that same PNG as the original revision and OpenAI input', async () => {
  imageFixture();
  const draw = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: draw,
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
    this: HTMLCanvasElement,
    callback,
  ) {
    expect([this.width, this.height]).toEqual([1200, 620]);
    callback(new Blob(['png'], { type: 'image/png' }));
  });
  const file = await newsletterImageFile('/newsletter/newsroom.svg');
  expect(file.type).toBe('image/png');
  expect(draw.mock.calls[0]?.[0].src).toBe('/newsletter/newsroom.png');
});
