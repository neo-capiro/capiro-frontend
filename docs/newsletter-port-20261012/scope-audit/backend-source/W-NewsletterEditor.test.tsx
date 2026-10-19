// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  defaultNewsletterConfig,
  governmentAffairsNewsletter,
  createNewsletterBlock,
  defaultNewsletterBrandKit,
  type NewsletterCampaign,
} from '@capiro/shared/newsletter';
import { cloneSection, locateBlock, moveBlock, sanitizeNewsletterMarkup } from './model.js';
import { renderNewsletterDesign } from '@capiro/shared/newsletter-render';
const mocks = vi.hoisted(() => ({ client: {} as Record<string, ReturnType<typeof vi.fn>> }));
vi.mock('./api.js', async () => ({
  ...(await vi.importActual('./api.js')),
  useNewsletterApi: () => mocks.client,
}));
vi.mock('../../../../lib/use-api-scope.js', () => ({ useApiScope: () => 'tenant-owner' }));
vi.mock('./image-editor.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./image-editor.js')>()),
  loadNewsletterImage: vi.fn(async () => ({ naturalWidth: 1200, naturalHeight: 620 })),
  newsletterEditedImageFile: vi.fn(
    async () => new File(['crop'], 'newsletter-edited.png', { type: 'image/png' }),
  ),
}));
vi.mock('./NewsletterImageAi.js', async () => ({
  ...(await vi.importActual('./NewsletterImageAi.js')),
  newsletterImageFile: vi.fn(async () => {
    const file = new File(['fixture'], 'newsletter-image.png', { type: 'image/png' });
    Object.defineProperty(file, 'arrayBuffer', { value: async () => new ArrayBuffer(8) });
    return file;
  }),
  saveNewsletterImageRevision: vi.fn(
    async (
      api: import('./api.js').NewsletterClient,
      url: string,
      file: File,
      documentId?: string,
    ) => api.saveImageRevision(file, url, undefined, documentId),
  ),
}));
import { NewsletterEditor } from './NewsletterEditor.js';
function setup(
  htmlCheckAvailable = false,
  brandKit = defaultNewsletterBrandKit(),
  altTextAvailable = false,
) {
  const document: NewsletterCampaign = {
    id: 'doc1',
    name: 'Weekly newsletter',
    ownerId: 'u1',
    revision: 1,
    status: 'draft',
    updatedAt: new Date().toISOString(),
    design: governmentAffairsNewsletter(),
    config: defaultNewsletterConfig(),
  };
  mocks.client.get = vi.fn().mockResolvedValue(document);
  mocks.client.brandKit = vi.fn().mockResolvedValue(brandKit);
  mocks.client.save = vi.fn(async (next) => ({ ...next, revision: next.revision + 1 }));
  mocks.client.capabilities = vi.fn().mockResolvedValue({
    ai: { available: false },
    altTextAi: { available: altTextAvailable },
    inboxPreview: { available: false },
    htmlCheck: { available: htmlCheckAvailable },
    send: { available: false },
  });
  mocks.client.library = vi.fn().mockResolvedValue([]);
  mocks.client.list = vi.fn().mockResolvedValue([]);
  mocks.client.generateAltText = vi.fn().mockResolvedValue('The Capitol dome against a blue sky.');
  mocks.client.videoThumbnail = vi.fn().mockResolvedValue({
    sourceUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
    provider: 'youtube',
    title: 'Public video',
    imageUrl: 'https://assets.example/video.png',
  });
  mocks.client.saveImageRevision = vi.fn().mockResolvedValue({
    id: 'cropped-image',
    url: `https://capiro.example/workspace-api/newsletters/assets/file/${'b'.repeat(64)}`,
    mimeType: 'image/png',
    name: 'newsletter-edited.png',
  });
  mocks.client.upload = vi.fn().mockResolvedValue({
    id: 'uploaded-image',
    name: 'New policy image.png',
    mimeType: 'image/png',
    url: 'https://assets.example/uploaded.png',
  });
  mocks.client.assetFolders = vi.fn().mockResolvedValue([]);
  mocks.client.assetPage = vi
    .fn()
    .mockResolvedValue({ items: [], page: 1, pageSize: 25, total: 0 });
  mocks.client.saveLibrary = vi.fn().mockResolvedValue({ id: 'template1' });
  mocks.client.preview = vi
    .fn()
    .mockResolvedValue({ html: '<p>Preview</p>', plainText: 'Preview', checks: [] });
  mocks.client.stage = vi
    .fn()
    .mockResolvedValue({ route: '/engagement/outreach?newsletterStage=stage1' });
  mocks.client.htmlCheck = vi.fn().mockResolvedValue({
    provider: 'Mailtrap',
    revision: 2,
    checkedAt: '2026-10-07T12:00:00Z',
    issues: ['Unsupported CSS: display grid'],
    report: { status: 'success', errors: ['Unsupported CSS: display grid'] },
  });
  render(
    <MemoryRouter>
      <NewsletterEditor documentId="doc1" />
    </MemoryRouter>,
  );
  return document;
}
afterEach(() => vi.clearAllMocks());
describe('newsletter editor', () => {
  it('omits hosted surveys from new blocks and lets an existing survey be removed before staging', async () => {
    const doc = setup(),
      survey = createNewsletterBlock('survey');
    survey.text = 'Client priorities survey';
    doc.design.sections[0]!.blocks.push(survey);
    await screen.findByLabelText('Newsletter name');
    expect(
      within(screen.getByRole('complementary')).queryByRole('button', {
        name: 'Survey',
        exact: true,
      }),
    ).toBeNull();
    fireEvent.click(within(screen.getByRole('main')).getByText(survey.text));
    expect(screen.queryByRole('button', { name: 'Create Survey' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Remove survey block' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stage in Outreach →' }));
    fireEvent.click(screen.getByRole('button', { name: /^Stage in Outreach$/ }));
    await waitFor(() => expect(mocks.client.stage).toHaveBeenCalled());
    expect(
      mocks.client
        .save!.mock.calls.at(-1)?.[0]
        .design.sections[0].blocks.some((block: { id: string }) => block.id === survey.id),
    ).toBe(false);
  });
  it('removes a video URL from the canvas while retaining its thumbnail, alt text and linked design', async () => {
    const doc = setup(),
      video = createNewsletterBlock('video', {
        url: 'https://example.com/committee',
        imageUrl: 'https://assets.example/custom.png',
        alt: 'Illustrative committee briefing',
        video: {
          thumbnail: 'custom',
          sourceUrl: 'https://example.com/committee',
          paddingLinked: true,
        },
        style: { paddingTop: 18, paddingBottom: 18, paddingLeft: 18, paddingRight: 18 },
      });
    doc.design.sections[0]!.blocks.push(video);
    await screen.findByLabelText('Newsletter name');
    fireEvent.click(within(screen.getByRole('main')).getByRole('img', { name: video.alt }));
    const tools = within(screen.getByRole('toolbar', { name: 'Video URL actions' }));
    fireEvent.click(tools.getByRole('button', { name: 'Edit URL' }));
    fireEvent.click(tools.getByRole('button', { name: 'Remove URL' }));
    expect(
      within(screen.getByRole('complementary'))
        .getByRole('textbox', { name: 'URL' })
        .getAttribute('value'),
    ).toBe('');
    expect(
      within(screen.getByRole('main')).getByRole('img', { name: video.alt }).getAttribute('src'),
    ).toBe(video.imageUrl);
    expect(tools.getByRole('button', { name: 'Add URL' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Save and exit' }));
    await waitFor(() =>
      expect(
        mocks.client
          .save!.mock.calls.at(-1)?.[0]
          .design.sections[0].blocks.find((item: { id: string }) => item.id === video.id),
      ).toMatchObject({
        url: '',
        imageUrl: video.imageUrl,
        alt: video.alt,
        video: { thumbnail: 'custom', paddingLinked: true },
        style: video.style,
      }),
    );
    expect(mocks.client.videoThumbnail).not.toHaveBeenCalled();
  });
  it('applies live canvas URL edits and withholds a thumbnail for the old URL after a newer source is chosen', async () => {
    const doc = setup(),
      oldUrl = 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
      nextUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      video = createNewsletterBlock('video', { url: oldUrl });
    doc.design.sections[0]!.blocks.push(video);
    let oldDone!: (value: unknown) => void, newDone!: (value: unknown) => void;
    mocks.client.videoThumbnail!.mockImplementation(
      (_id: string, url: string) =>
        new Promise((done) => {
          if (url === oldUrl) oldDone = done;
          else newDone = done;
        }),
    );
    await screen.findByLabelText('Newsletter name');
    fireEvent.click(screen.getByLabelText('Add video URL'));
    await waitFor(() => expect(oldDone).toBeDefined(), { timeout: 4000 });
    const tools = within(screen.getByRole('toolbar', { name: 'Video URL actions' }));
    fireEvent.click(tools.getByRole('button', { name: 'Edit URL' }));
    fireEvent.change(tools.getByRole('textbox', { name: 'Video URL' }), {
      target: { value: nextUrl },
    });
    expect(
      within(screen.getByRole('complementary'))
        .getByRole('textbox', { name: 'URL' })
        .getAttribute('value'),
    ).toBe(nextUrl);
    await act(async () =>
      oldDone({
        sourceUrl: oldUrl,
        provider: 'youtube',
        title: 'Old video',
        imageUrl: 'https://assets.example/old-video.png',
      }),
    );
    expect(within(screen.getByRole('main')).queryByRole('img', { name: 'Watch video' })).toBeNull();
    fireEvent.click(tools.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(newDone).toBeDefined(), { timeout: 4000 });
    await act(async () =>
      newDone({
        sourceUrl: nextUrl,
        provider: 'youtube',
        title: 'New video',
        imageUrl: 'https://assets.example/new-video.png',
      }),
    );
    await waitFor(() =>
      expect(
        within(screen.getByRole('main'))
          .getByRole('img', { name: 'Watch video' })
          .getAttribute('src'),
      ).toBe('https://assets.example/new-video.png'),
    );
    expect(tools.getByRole('link', { name: 'Preview link' }).getAttribute('href')).toBe(nextUrl);
  });
  it('uses Video Design/Visibility, applies a captured automatic thumbnail and saves it with the latest draft', async () => {
    const doc = setup();
    const video = createNewsletterBlock('video', {
      url: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
      video: { thumbnail: 'auto', sourceUrl: '', paddingLinked: true },
      style: { paddingTop: 18, paddingBottom: 18, paddingLeft: 18, paddingRight: 18 },
    });
    doc.design.sections[0]!.blocks.push(video);
    await screen.findByLabelText('Newsletter name');
    const panel = within(screen.getByRole('complementary'));
    fireEvent.click(screen.getByLabelText('Add video URL'));
    expect(panel.getByRole('tab', { name: 'Design' })).toBeDefined();
    expect(panel.getByRole('tab', { name: 'Visibility' })).toBeDefined();
    expect(panel.queryByRole('tab', { name: 'Styles' })).toBeNull();
    expect(panel.queryByRole('textbox', { name: 'Text' })).toBeNull();
    await waitFor(
      () => expect(mocks.client.videoThumbnail).toHaveBeenCalledWith('doc1', video.url),
      { timeout: 4000 },
    );
    await waitFor(() => expect(panel.getByRole('button', { name: 'Replace' })).toBeDefined());
    fireEvent.change(panel.getByRole('textbox', { name: 'Alt text' }), {
      target: { value: 'Illustrative committee briefing' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save and exit' }));
    await waitFor(() => {
      const saves = mocks.client.save!.mock.calls;
      expect(
        saves.at(-1)?.[0].design.sections[0].blocks.find((b: { id: string }) => b.id === video.id),
      ).toMatchObject({
        imageUrl: 'https://assets.example/video.png',
        alt: 'Illustrative committee briefing',
        video: { thumbnail: 'auto', sourceUrl: video.url, paddingLinked: true },
      });
    });
  });
  it('does not apply a mismatched video result and rejects WebP custom video thumbnails', async () => {
    const doc = setup();
    const video = createNewsletterBlock('video', {
      url: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
    });
    doc.design.sections[0]!.blocks.push(video);
    mocks.client.videoThumbnail!.mockResolvedValue({
      sourceUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      provider: 'youtube',
      title: 'Wrong source',
      imageUrl: 'https://assets.example/wrong.png',
    });
    await screen.findByLabelText('Newsletter name');
    fireEvent.click(screen.getByLabelText('Add video URL'));
    await screen.findByText('The video changed. Your thumbnail is available in Content Studio.');
    fireEvent.click(screen.getByRole('button', { name: 'Choose file' }));
    const input = screen.getByLabelText('Upload newsletter image');
    expect(input.getAttribute('accept')).toBe('image/png,image/jpeg,image/gif');
    fireEvent.change(input, {
      target: { files: [new File(['webp'], 'custom.webp', { type: 'image/webp' })] },
    });
    await screen.findByText('Video thumbnails must be PNG, JPG or GIF files.');
    expect(mocks.client.upload).not.toHaveBeenCalled();
    expect(within(screen.getByRole('complementary')).queryByRole('img')).toBeNull();
  });
  it('uploads into the captured image, resets its previous crop and preserves current alt/link settings when another block is selected', async () => {
    const doc = setup();
    const images = doc.design.sections.flatMap((s) => s.blocks).filter((b) => b.kind === 'image');
    const target = images[0]!,
      other = images[1]!;
    target.crop = { x: 20, y: 30, width: 4, height: 3 };
    target.alt = 'Illustrative Capitol';
    target.url = 'https://example.com/bill';
    let resolve!: (asset: { url: string }) => void;
    mocks.client.upload!.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    await screen.findByLabelText('Newsletter name');
    fireEvent.click(within(screen.getByRole('main')).getByRole('img', { name: target.alt }));
    fireEvent.click(
      within(screen.getByRole('complementary')).getByRole('button', { name: 'Replace' }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Upload Image' }));
    const file = new File(['png'], 'New policy image.png', { type: 'image/png' });
    const input = screen.getByLabelText('Upload newsletter image');
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.change(input, { target: { files: [file] } });
    expect(mocks.client.upload).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Uploading image…')).toBeTruthy();
    fireEvent.click(within(screen.getByRole('main')).getByRole('img', { name: other.alt }));
    await act(async () => {
      resolve({ url: 'https://assets.example/uploaded.png' });
    });
    await waitFor(() => expect(mocks.client.save).toHaveBeenCalled());
    const saved = mocks.client.save!.mock.calls.at(-1)![0] as NewsletterCampaign;
    expect(
      locateBlock(saved.design, target.id)!.list.find((b) => b.id === target.id),
    ).toMatchObject({
      imageUrl: 'https://assets.example/uploaded.png',
      crop: null,
      alt: target.alt,
      url: target.url,
    });
    expect(locateBlock(saved.design, other.id)!.list.find((b) => b.id === other.id)).toMatchObject({
      imageUrl: other.imageUrl,
      alt: other.alt,
    });
    fireEvent.click(within(screen.getByRole('main')).getByRole('button', { name: 'Undo' }));
    expect(screen.queryByText('Image added.')).toBeNull();
    await waitFor(() => expect(mocks.client.save).toHaveBeenCalledTimes(2));
    const reverted = mocks.client.save!.mock.calls.at(-1)![0] as NewsletterCampaign;
    expect(
      locateBlock(reverted.design, target.id)!.list.find((b) => b.id === target.id),
    ).toMatchObject({
      imageUrl: target.imageUrl,
      crop: target.crop,
      alt: target.alt,
      url: target.url,
    });
  });
  it('does not overwrite an image changed while its upload was pending', async () => {
    const doc = setup();
    const target = doc.design.sections.flatMap((s) => s.blocks).find((b) => b.kind === 'image')!;
    let resolve!: (asset: { url: string }) => void;
    mocks.client.upload!.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    await screen.findByLabelText('Newsletter name');
    fireEvent.click(within(screen.getByRole('main')).getByRole('img', { name: target.alt }));
    fireEvent.click(screen.getByRole('button', { name: 'Choose file' }));
    fireEvent.change(screen.getByLabelText('Upload newsletter image'), {
      target: { files: [new File(['png'], 'new.png', { type: 'image/png' })] },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Image URL' }), {
      target: { value: 'https://assets.example/current.png' },
    });
    await act(async () => {
      resolve({ url: 'https://assets.example/stale.png' });
    });
    await screen.findByText(
      'The image changed during upload. Your upload is available in Content Studio.',
    );
    await waitFor(() => expect(mocks.client.save).toHaveBeenCalled());
    const saved = mocks.client.save!.mock.calls.at(-1)![0] as NewsletterCampaign;
    expect(
      locateBlock(saved.design, target.id)!.list.find((b) => b.id === target.id)?.imageUrl,
    ).toBe('https://assets.example/current.png');
  });
  it('ignores an upload that finishes after leaving the editor and opening another session', async () => {
    const doc = setup();
    const target = doc.design.sections.flatMap((s) => s.blocks).find((b) => b.kind === 'image')!;
    let resolve!: (asset: { url: string }) => void;
    mocks.client.upload!.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    await screen.findByLabelText('Newsletter name');
    fireEvent.click(within(screen.getByRole('main')).getByRole('img', { name: target.alt }));
    fireEvent.click(screen.getByRole('button', { name: 'Choose file' }));
    fireEvent.change(screen.getByLabelText('Upload newsletter image'), {
      target: { files: [new File(['png'], 'new.png', { type: 'image/png' })] },
    });
    cleanup();
    setup();
    await screen.findByLabelText('Newsletter name');
    await act(async () => {
      resolve({ url: 'https://assets.example/stale.png' });
    });
    expect(mocks.client.save).not.toHaveBeenCalled();
    expect(screen.queryByText('Image added.')).toBeNull();
  });
  it('rejects empty and oversized uploads before contacting Workspace and allows a deliberate retry', async () => {
    const doc = setup();
    const target = doc.design.sections.flatMap((s) => s.blocks).find((b) => b.kind === 'image')!;
    await screen.findByLabelText('Newsletter name');
    fireEvent.click(within(screen.getByRole('main')).getByRole('img', { name: target.alt }));
    fireEvent.click(screen.getByRole('button', { name: 'Choose file' }));
    const input = screen.getByLabelText('Upload newsletter image');
    fireEvent.change(input, {
      target: { files: [new File([], 'empty.png', { type: 'image/png' })] },
    });
    await screen.findByText('Choose an image that is not empty.');
    const oversized = new File(['fixture'], 'too-large.png', { type: 'image/png' });
    Object.defineProperty(oversized, 'size', { value: 10 * 1024 * 1024 + 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Choose file' }));
    fireEvent.change(input, { target: { files: [oversized] } });
    await screen.findByText('Images must be 10 MB or smaller.');
    expect(mocks.client.upload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Choose file' }));
    fireEvent.change(input, {
      target: { files: [new File(['png'], 'Policy update.png', { type: 'image/png' })] },
    });
    await screen.findByText('Image added.');
    expect(mocks.client.upload).toHaveBeenCalledTimes(1);
  });
  it('launches Photopea from the replacement menu and cancelling keeps the original newsletter', async () => {
    const doc = setup();
    const target = doc.design.sections.flatMap((s) => s.blocks).find((b) => b.kind === 'image')!;
    await screen.findByLabelText('Newsletter name');
    fireEvent.click(within(screen.getByRole('main')).getByRole('img', { name: target.alt }));
    fireEvent.click(
      within(screen.getByRole('complementary')).getByRole('button', { name: 'Replace' }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit with Photopea' }));
    const dialog = screen.getByRole('dialog', { name: 'Advanced image editor' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(mocks.client.save).not.toHaveBeenCalled();
    expect(mocks.client.upload).not.toHaveBeenCalled();
    expect(mocks.client.saveImageRevision).not.toHaveBeenCalled();
  });
  it('saves only the reviewed rich-text link, refreshes the preview and retains the review count when returning to email information', async () => {
    const doc = setup();
    const block = doc.design.sections.flatMap((s) => s.blocks).find((b) => b.kind === 'paragraph')!;
    block.html =
      '<p>Read <a href="https://example.com/same">Bill A</a> and <a href="https://example.com/same">Bill B</a>.</p>';
    mocks.client.preview!.mockImplementation(async () => ({
      html: renderNewsletterDesign(
        mocks.client.save!.mock.calls.at(-1)?.[0]?.design || doc.design,
        doc.config,
        { sanitizeHtml: sanitizeNewsletterMarkup, editor: true },
      ),
      plainText: '',
      checks: [],
    }));
    await screen.findByLabelText('Newsletter name');
    fireEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: /^Preview$/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Preview' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Check email links' }));
    const initialCount = within(dialog).getByRole('heading', {
      name: /0 of \d+ links checked/,
    }).textContent;
    fireEvent.click(within(dialog).getByRole('button', { name: /Bill B/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Edit link' }));
    fireEvent.change(within(dialog).getByLabelText('href'), {
      target: { value: 'https://example.com/bill-b' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /^Save$/ }));
    await waitFor(() => expect(within(dialog).queryByLabelText('href')).toBeNull());
    expect(mocks.client.save).toHaveBeenCalledTimes(1);
    const saved = mocks.client.save!.mock.calls[0]![0] as NewsletterCampaign;
    const changed = locateBlock(saved.design, block.id)!.list.find((b) => b.id === block.id)!;
    expect(changed.html).toContain('href="https://example.com/same"');
    expect(changed.html).toContain('href="https://example.com/bill-b"');
    expect(mocks.client.preview).toHaveBeenCalledTimes(2);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Back to link list' }));
    expect(
      within(dialog).getByRole('heading', { name: initialCount!.replace(/^0/, '1') }),
    ).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Back to email information' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Check email links' }));
    expect(
      within(dialog).getByRole('heading', { name: initialCount!.replace(/^0/, '1') }),
    ).toBeTruthy();
  });
  it('retries a failed reviewed-link save with the same local edit and does not report it saved early', async () => {
    const doc = setup();
    const block = doc.design.sections.flatMap((s) => s.blocks).find((b) => b.kind === 'button')!;
    block.text = 'Open source bill';
    block.url = 'https://example.com/original';
    mocks.client.save!.mockRejectedValueOnce(new Error('Server unavailable'));
    mocks.client.preview!.mockImplementation(async () => ({
      html: renderNewsletterDesign(doc.design, doc.config, {
        sanitizeHtml: sanitizeNewsletterMarkup,
        editor: true,
      }),
      plainText: '',
      checks: [],
    }));
    await screen.findByLabelText('Newsletter name');
    fireEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: /^Preview$/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Preview' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Check email links' }));
    fireEvent.click(within(dialog).getByRole('button', { name: /Open source bill/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Edit link' }));
    fireEvent.change(within(dialog).getByLabelText('href'), {
      target: { value: 'https://example.com/updated' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /^Save$/ }));
    expect(await within(dialog).findByText('Server unavailable')).toBeTruthy();
    expect(within(dialog).getByLabelText('href')).toHaveValue('https://example.com/updated');
    expect(mocks.client.preview).toHaveBeenCalledTimes(1);
    fireEvent.click(within(dialog).getByRole('button', { name: /^Save$/ }));
    await waitFor(() => expect(within(dialog).queryByLabelText('href')).toBeNull());
    expect(mocks.client.save).toHaveBeenCalledTimes(2);
    expect((mocks.client.save!.mock.calls[1]![0] as NewsletterCampaign).revision).toBe(1);
    expect(mocks.client.save!.mock.calls[0]![0].design).toEqual(
      mocks.client.save!.mock.calls[1]![0].design,
    );
  });
  it('saves Photopea output to the captured image even if another block is selected while saving', async () => {
    const doc = setup(),
      images = doc.design.sections.flatMap((s) => s.blocks).filter((b) => b.kind === 'image');
    const block = images[0]!,
      other = images[1]!;
    block.imageUrl = `https://capiro.example/workspace-api/newsletters/assets/file/${'a'.repeat(64)}`;
    block.imageSize = 'scale';
    block.imageScale = 55;
    block.url = 'https://example.com/bill';
    let finish!: (value: unknown) => void;
    mocks.client.saveImageRevision!.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await screen.findByLabelText('Newsletter name');
    fireEvent.click(within(screen.getByRole('main')).getByRole('img', { name: block.alt }));
    fireEvent.click(
      within(screen.getByRole('complementary')).getByRole('button', { name: 'Advanced editor' }),
    );
    const frame = screen.getByTitle('Photopea image editor') as HTMLIFrameElement;
    const send = vi.spyOn(frame.contentWindow!, 'postMessage').mockImplementation(() => {});
    const receive = (data: unknown) =>
      fireEvent(
        window,
        new MessageEvent('message', {
          origin: 'https://www.photopea.com',
          source: frame.contentWindow,
          data,
        }),
      );
    receive('done');
    await waitFor(() =>
      expect(send).toHaveBeenCalledWith(expect.any(ArrayBuffer), 'https://www.photopea.com'),
    );
    receive('done');
    fireEvent.click(screen.getByRole('button', { name: 'Save image' }));
    receive('capiro:export:1');
    receive(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]).buffer);
    await waitFor(() => expect(mocks.client.saveImageRevision).toHaveBeenCalledTimes(1));
    fireEvent.click(within(screen.getByRole('main')).getByRole('img', { name: other.alt }));
    await act(async () => finish({ url: '/edited.png' }));
    expect(screen.queryByRole('dialog', { name: 'Advanced image editor' })).toBeNull();
    expect(mocks.client.saveImageRevision).toHaveBeenCalledWith(
      expect.any(File),
      block.imageUrl,
      undefined,
      'doc1',
    );
    await waitFor(() => expect(mocks.client.save).toHaveBeenCalledTimes(1));
    const saved = mocks.client.save!.mock.calls[0]![0] as NewsletterCampaign;
    expect(
      saved.design.sections.flatMap((s) => s.blocks).find((b) => b.id === block.id),
    ).toMatchObject({
      imageUrl: '/edited.png',
      alt: block.alt,
      url: block.url,
      imageSize: 'scale',
      imageScale: 55,
      style: block.style,
      crop: null,
    });
    expect(
      saved.design.sections.flatMap((s) => s.blocks).find((b) => b.id === other.id)?.imageUrl,
    ).toBe(other.imageUrl);
  });
  it('applies inline crop only after Done, preserves image settings, and restores the original with document Undo', async () => {
    const doc = setup();
    const block = doc.design.sections.flatMap((s) => s.blocks).find((b) => b.kind === 'image')!;
    block.imageUrl = `https://capiro.example/workspace-api/newsletters/assets/file/${'a'.repeat(64)}`;
    block.imageSize = 'scale';
    block.imageScale = 55;
    block.url = 'https://example.com/bill';
    await screen.findByLabelText('Newsletter name');
    fireEvent.click(within(screen.getByRole('main')).getByRole('img', { name: block.alt }));
    fireEvent.click(
      within(screen.getByRole('toolbar', { name: 'Image actions' })).getByRole('button', {
        name: 'Crop',
      }),
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Square' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Square' }));
    expect(mocks.client.save).not.toHaveBeenCalled();
    expect(mocks.client.saveImageRevision).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByRole('button', { name: 'Move image crop' }).getAttribute('width')).toBe(
      '1200',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Crop image' })).toBeNull());
    expect(mocks.client.saveImageRevision).toHaveBeenCalledTimes(1);
    expect(mocks.client.saveImageRevision).toHaveBeenCalledWith(
      expect.any(File),
      block.imageUrl,
      undefined,
      'doc1',
    );
    await waitFor(() => expect(mocks.client.save).toHaveBeenCalledTimes(1));
    const saved = mocks.client.save!.mock.calls[0]![0] as NewsletterCampaign;
    expect(
      saved.design.sections.flatMap((s) => s.blocks).find((b) => b.id === block.id),
    ).toMatchObject({
      imageUrl: `https://capiro.example/workspace-api/newsletters/assets/file/${'b'.repeat(64)}`,
      crop: null,
      alt: block.alt,
      url: block.url,
      imageSize: 'scale',
      imageScale: 55,
      style: block.style,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    const image = within(screen.getByRole('main')).getByRole('img', {
      name: block.alt,
    }) as HTMLImageElement;
    expect(image.getAttribute('src')).toBe(block.imageUrl);
    expect(image.style.width).toBe('55%');
  });
  it('cancels inline crop with Escape and leaves the draft and image library untouched', async () => {
    const doc = setup(),
      block = doc.design.sections.flatMap((s) => s.blocks).find((b) => b.kind === 'image')!;
    await screen.findByLabelText('Newsletter name');
    fireEvent.click(within(screen.getByRole('main')).getByRole('img', { name: block.alt }));
    fireEvent.click(
      within(screen.getByRole('toolbar', { name: 'Image actions' })).getByRole('button', {
        name: 'Crop',
      }),
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Square' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Square' }));
    const beforeUnload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(beforeUnload);
    expect(beforeUnload.defaultPrevented).toBe(true);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Square' }), {
      key: 'Escape',
    });
    expect(screen.queryByRole('region', { name: 'Crop image' })).toBeNull();
    expect(mocks.client.save).not.toHaveBeenCalled();
    expect(mocks.client.saveImageRevision).not.toHaveBeenCalled();
    const cleanLeave = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(cleanLeave);
    expect(cleanLeave.defaultPrevented).toBe(false);
  });
  it('protects the crop target while saving and ignores its response after unmount', async () => {
    const doc = setup(),
      images = doc.design.sections.flatMap((s) => s.blocks).filter((b) => b.kind === 'image');
    const block = images[0]!;
    block.imageUrl = `https://capiro.example/workspace-api/newsletters/assets/file/${'a'.repeat(64)}`;
    let finish!: (value: unknown) => void;
    mocks.client.saveImageRevision!.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await screen.findByLabelText('Newsletter name');
    fireEvent.click(within(screen.getByRole('main')).getByRole('img', { name: block.alt }));
    fireEvent.click(
      within(screen.getByRole('toolbar', { name: 'Image actions' })).getByRole('button', {
        name: 'Crop',
      }),
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Square' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Square' }));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(mocks.client.saveImageRevision).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Actions' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Stage in Outreach/ })).toBeDisabled();
    expect(
      within(screen.getByRole('navigation', { name: 'Newsletter tools' })).getByRole('button', {
        name: 'Styles',
      }),
    ).toBeDisabled();
    fireEvent.click(within(screen.getByRole('main')).getAllByRole('img')[1]!);
    expect(screen.getByRole('region', { name: 'Crop image' })).toBeTruthy();
    cleanup();
    await act(async () => finish({ url: '/cropped.png' }));
    expect(mocks.client.save).not.toHaveBeenCalled();
  });
  it('dismisses Actions and Save as a template without discarding an active crop', async () => {
    const doc = setup(),
      block = doc.design.sections.flatMap((s) => s.blocks).find((b) => b.kind === 'image')!;
    await screen.findByLabelText('Newsletter name');
    fireEvent.click(within(screen.getByRole('main')).getByRole('img', { name: block.alt }));
    fireEvent.click(
      within(screen.getByRole('toolbar', { name: 'Image actions' })).getByRole('button', {
        name: 'Crop',
      }),
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Square' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Square' }));
    const cropWidth = screen.getByRole('button', { name: 'Move image crop' }).getAttribute('width');
    const actions = screen.getByRole('button', { name: 'Actions' });
    fireEvent.click(actions);
    fireEvent.keyDown(actions, { key: 'Escape' });
    expect(actions).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(actions);
    expect(screen.getByRole('button', { name: 'Move image crop' })).toHaveAttribute(
      'width',
      cropWidth,
    );
    fireEvent.click(actions);
    fireEvent.pointerDown(screen.getByRole('textbox', { name: 'Newsletter name' }));
    expect(actions).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(actions);
    fireEvent.click(screen.getByRole('button', { name: 'Save as a template' }));
    let dialog = screen.getByRole('dialog', { name: 'Save as a template' });
    fireEvent.keyDown(within(dialog).getByRole('button', { name: 'Cancel' }), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Move image crop' })).toHaveAttribute(
      'width',
      cropWidth,
    );
    fireEvent.click(actions);
    fireEvent.click(screen.getByRole('button', { name: 'Save as a template' }));
    dialog = screen.getByRole('dialog', { name: 'Save as a template' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(mocks.client.saveLibrary).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Move image crop' })).toHaveAttribute(
      'width',
      cropWidth,
    );
    expect(mocks.client.saveImageRevision).not.toHaveBeenCalled();
    expect(mocks.client.save).not.toHaveBeenCalled();
    expect(within(screen.getByRole('main')).getByRole('img', { name: block.alt })).toHaveAttribute(
      'src',
      block.imageUrl.replace(/\.svg$/, '.png'),
    );
  });
  it('retains the crop when Change template is dismissed and clears its old target when a template is applied', async () => {
    const doc = setup(),
      block = doc.design.sections.flatMap((s) => s.blocks).find((b) => b.kind === 'image')!;
    await screen.findByLabelText('Newsletter name');
    fireEvent.click(within(screen.getByRole('main')).getByRole('img', { name: block.alt }));
    fireEvent.click(
      within(screen.getByRole('toolbar', { name: 'Image actions' })).getByRole('button', {
        name: 'Crop',
      }),
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Square' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Square' }));
    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Change template' }));
    const dialog = await screen.findByRole('dialog', { name: 'Change template' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.getByRole('button', { name: 'Square' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Change template' }));
    const newDialog = await screen.findByRole('dialog', { name: 'Change template' });
    fireEvent.click(
      within(
        within(newDialog)
          .getAllByRole('article')
          .find((card) => card.textContent?.includes('1 column layout'))!,
      ).getByRole('button', { name: 'Apply' }),
    );
    expect(screen.queryByRole('region', { name: 'Crop image' })).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(mocks.client.saveImageRevision).not.toHaveBeenCalled();
    await waitFor(() => expect(mocks.client.save).toHaveBeenCalledTimes(1));
    expect(
      (mocks.client.save!.mock.calls[0]![0] as NewsletterCampaign).design.sections
        .flatMap((s) => s.blocks)
        .some((b) => b.id === block.id),
    ).toBe(false);
  });
  it('saves scale changes from the image slider, renders the saved width and remembers scale across size modes', async () => {
    const doc = setup();
    const block = doc.design.sections.flatMap((s) => s.blocks).find((b) => b.kind === 'image')!;
    await screen.findByLabelText('Newsletter name');
    fireEvent.click(within(screen.getByRole('main')).getByRole('img', { name: block.alt }));
    const size = within(screen.getByRole('group', { name: 'Image size' }));
    fireEvent.click(size.getByRole('button', { name: 'Scale' }));
    const scale = screen.getByRole('slider', { name: 'Scale' }) as HTMLInputElement;
    expect(scale.min).toBe('10');
    expect(scale.max).toBe('100');
    fireEvent.change(scale, { target: { value: '55' } });
    expect(screen.getByText('55%')).toBeTruthy();
    await waitFor(() => expect(mocks.client.save).toHaveBeenCalled());
    const saved = mocks.client.save!.mock.calls.at(-1)![0] as NewsletterCampaign;
    expect(
      saved.design.sections.flatMap((s) => s.blocks).find((b) => b.id === block.id),
    ).toMatchObject({
      imageSize: 'scale',
      imageScale: 55,
      imageUrl: block.imageUrl,
      alt: block.alt,
    });
    const html = new DOMParser().parseFromString(
      renderNewsletterDesign(saved.design, saved.config, {
        sanitizeHtml: sanitizeNewsletterMarkup,
      }),
      'text/html',
    );
    const image = [...html.querySelectorAll('img')].find((item) => item.alt === block.alt)!;
    expect(image.style.width).toBe('55%');
    fireEvent.click(size.getByRole('button', { name: 'Fill' }));
    expect(screen.queryByRole('slider', { name: 'Scale' })).toBeNull();
    fireEvent.click(size.getByRole('button', { name: 'Scale' }));
    expect((screen.getByRole('slider', { name: 'Scale' }) as HTMLInputElement).value).toBe('55');
    fireEvent.click(size.getByRole('button', { name: 'Original' }));
    const liveImage = within(screen.getByRole('main')).getByRole('img', {
      name: block.alt,
    }) as HTMLImageElement;
    expect(liveImage.style.width).toBe('auto');
  });
  it('opens and dismisses alt-text help without changing the draft or losing keyboard focus', async () => {
    const doc = setup();
    const block = doc.design.sections.flatMap((s) => s.blocks).find((b) => b.kind === 'image')!;
    await screen.findByLabelText('Newsletter name');
    fireEvent.click(within(screen.getByRole('main')).getByRole('img', { name: block.alt }));
    const help = screen.getByRole('button', { name: 'Learn more about alt text' });
    fireEvent.click(help);
    const dialog = screen.getByRole('dialog', { name: 'Why add alt text?' });
    const link = within(dialog).getByRole('link', { name: 'Learn more about alt text' });
    expect(document.activeElement).toBe(link);
    expect((screen.getByLabelText('Alt text') as HTMLInputElement).value).toBe(block.alt);
    fireEvent.keyDown(link, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Why add alt text?' })).toBeNull();
    expect(document.activeElement).toBe(help);
    fireEvent.click(help);
    fireEvent.pointerDown(screen.getByRole('textbox', { name: 'Newsletter name' }));
    expect(screen.queryByRole('dialog', { name: 'Why add alt text?' })).toBeNull();
    expect(mocks.client.save).not.toHaveBeenCalled();
    expect(mocks.client.generateAltText).not.toHaveBeenCalled();
  });
  it('routes canvas image actions into the current image workflows and focuses its link destination', async () => {
    const doc = setup();
    const block = doc.design.sections.flatMap((s) => s.blocks).find((b) => b.kind === 'image')!;
    await screen.findByLabelText('Newsletter name');
    fireEvent.click(within(screen.getByRole('main')).getByRole('img', { name: block.alt }));
    const actions = () => within(screen.getByRole('toolbar', { name: 'Image actions' }));
    fireEvent.click(actions().getByRole('button', { name: 'Replace' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Browse Library' }));
    const studio = await screen.findByRole('dialog', { name: 'Content Studio' });
    fireEvent.click(within(studio).getByRole('button', { name: 'Close' }));
    fireEvent.click(actions().getByRole('button', { name: 'Crop' }));
    const crop = screen.getByRole('region', { name: 'Crop image' });
    fireEvent.click(within(crop).getByRole('button', { name: 'Cancel' }));
    fireEvent.click(actions().getByRole('button', { name: 'Edit' }));
    const editor = screen.getByRole('dialog', { name: 'Edit image' });
    fireEvent.click(within(editor).getByRole('button', { name: 'Close' }));
    fireEvent.click(actions().getByRole('button', { name: 'Refine with AI' }));
    const ai = screen.getByRole('dialog', { name: 'Refine with AI' });
    fireEvent.click(within(ai).getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Styles' }));
    fireEvent.click(actions().getByRole('button', { name: 'Add link' }));
    const destination = screen.getByRole('textbox', { name: 'Link destination' });
    expect(document.activeElement).toBe(destination);
    expect(mocks.client.save).not.toHaveBeenCalled();
    fireEvent.change(destination, { target: { value: 'https://example.com/bill' } });
    await waitFor(() => expect(mocks.client.save).toHaveBeenCalled());
    const saved = mocks.client.save!.mock.calls.at(-1)![0] as NewsletterCampaign;
    expect(
      saved.design.sections.flatMap((s) => s.blocks).find((b) => b.id === block.id),
    ).toMatchObject({ url: 'https://example.com/bill', imageUrl: block.imageUrl, alt: block.alt });
  });
  it('generates editable image alt text and saves it without changing the image or link', async () => {
    const doc = setup(false, defaultNewsletterBrandKit(), true);
    const block = doc.design.sections.flatMap((s) => s.blocks).find((b) => b.kind === 'image')!;
    block.alt = 'Original alt text';
    block.url = 'https://example.com/bill';
    await screen.findByLabelText('Newsletter name');
    fireEvent.click(within(screen.getByRole('main')).getByRole('img', { name: block.alt }));
    fireEvent.click(screen.getByRole('button', { name: 'Generate for me' }));
    await waitFor(() =>
      expect((screen.getByLabelText('Alt text') as HTMLInputElement).value).toBe(
        'The Capitol dome against a blue sky.',
      ),
    );
    await waitFor(() => expect(mocks.client.save).toHaveBeenCalled());
    const saved = mocks.client.save!.mock.calls[0]![0] as NewsletterCampaign;
    expect(
      saved.design.sections.flatMap((s) => s.blocks).find((b) => b.id === block.id),
    ).toMatchObject({
      alt: 'The Capitol dome against a blue sky.',
      imageUrl: block.imageUrl,
      url: block.url,
    });
    expect(mocks.client.generateAltText).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText('Alt text'), {
      target: { value: 'Client-approved wording' },
    });
    expect((screen.getByLabelText('Alt text') as HTMLInputElement).value).toBe(
      'Client-approved wording',
    );
  });
  it('keeps a manual alt-text edit made while OpenAI is still responding', async () => {
    const doc = setup(false, defaultNewsletterBrandKit(), true);
    const block = doc.design.sections.flatMap((s) => s.blocks).find((b) => b.kind === 'image')!;
    block.alt = 'Original alt text';
    let resolve!: (text: string) => void;
    mocks.client.generateAltText!.mockImplementation(
      () =>
        new Promise<string>((r) => {
          resolve = r;
        }),
    );
    await screen.findByLabelText('Newsletter name');
    fireEvent.click(within(screen.getByRole('main')).getByRole('img', { name: block.alt }));
    fireEvent.click(screen.getByRole('button', { name: 'Generate for me' }));
    await waitFor(() => expect(mocks.client.generateAltText).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText('Alt text'), {
      target: { value: 'My manual description' },
    });
    await act(async () => {
      resolve('Stale generated description');
    });
    expect((screen.getByLabelText('Alt text') as HTMLInputElement).value).toBe(
      'My manual description',
    );
    expect(
      screen.getByText('Image or alt text changed. Generate again for the current image.'),
    ).toBeTruthy();
  });
  it('applies an older image version only after Insert, retaining the image link and alt text', async () => {
    const doc = setup();
    const block = doc.design.sections
      .flatMap((section) => section.blocks)
      .find((block) => block.kind === 'image')!;
    block.alt = 'Original policy illustration';
    block.url = 'https://example.com/policy';
    block.crop = { x: 40, y: 50, width: 4, height: 3 };
    const latest = {
      id: 'latest',
      name: 'Edited policy.png',
      mimeType: 'image/png',
      url: 'https://assets.example/latest.png',
      createdAt: '2026-10-07T12:00:00Z',
      sizeBytes: 512,
      revisionNumber: 2,
      currentRevision: true,
    };
    const original = {
      ...latest,
      id: 'original',
      name: 'Original policy.png',
      url: 'https://assets.example/original.png',
      revisionNumber: 1,
      currentRevision: false,
    };
    mocks.client.assetPage!.mockResolvedValue({ items: [latest], page: 1, pageSize: 25, total: 1 });
    mocks.client.assetDetails = vi.fn().mockResolvedValue(latest);
    mocks.client.assetRevisions = vi
      .fn()
      .mockResolvedValue({ items: [latest, original], page: 1, pageSize: 10, total: 2 });
    await screen.findByLabelText('Newsletter name');
    fireEvent.click(
      within(screen.getByRole('main')).getByRole('img', { name: 'Original policy illustration' }),
    );
    fireEvent.click(
      within(screen.getByRole('complementary')).getByRole('button', { name: 'Replace' }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Browse Library' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Select Edited policy.png' }));
    fireEvent.click(screen.getByRole('button', { name: 'View Details' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Preview Original' }));
    expect(mocks.client.save).not.toHaveBeenCalled();
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'File Details' })).getByRole('button', {
        name: 'Insert',
      }),
    );
    await waitFor(() => expect(mocks.client.save).toHaveBeenCalled());
    const saved = mocks.client.save!.mock.calls[0]![0] as NewsletterCampaign;
    expect(
      saved.design.sections
        .flatMap((section) => section.blocks)
        .find((item) => item.id === block.id),
    ).toMatchObject({ imageUrl: original.url, alt: block.alt, url: block.url, crop: null });
  });
  it('applies a library selection only after Insert and clears the previous crop while retaining alt and link settings', async () => {
    const doc = setup();
    const block = doc.design.sections
      .flatMap((section) => section.blocks)
      .find((block) => block.kind === 'image')!;
    block.crop = { x: 20, y: 30, width: 4, height: 3 };
    block.alt = 'Illustrative Capitol';
    block.url = 'https://example.com/bill';
    mocks.client.assetPage!.mockResolvedValue({
      items: [
        {
          id: 'new-asset',
          name: 'New policy image.png',
          mimeType: 'image/png',
          url: 'https://assets.example/new.png',
        },
      ],
      page: 1,
      pageSize: 25,
      total: 1,
    });
    await screen.findByLabelText('Newsletter name');
    const canvas = screen.getByRole('main');
    fireEvent.click(within(canvas).getByRole('img', { name: 'Illustrative Capitol' }));
    fireEvent.click(
      within(screen.getByRole('complementary')).getByRole('button', { name: 'Replace' }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Browse Library' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Select New policy image.png' }));
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Content Studio' })).getByRole('button', {
        name: 'Close',
      }),
    );
    expect(mocks.client.save).not.toHaveBeenCalled();
    fireEvent.click(
      within(screen.getByRole('complementary')).getByRole('button', { name: 'Replace' }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Browse Library' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Select New policy image.png' }));
    fireEvent.click(screen.getByRole('button', { name: 'Insert' }));
    await waitFor(() => expect(mocks.client.save).toHaveBeenCalled());
    const saved = mocks.client.save!.mock.calls[0]![0] as NewsletterCampaign;
    const applied = saved.design.sections
      .flatMap((section) => section.blocks)
      .find((image) => image.id === block.id)!;
    expect(applied).toMatchObject({
      imageUrl: 'https://assets.example/new.png',
      crop: null,
      alt: 'Illustrative Capitol',
      url: 'https://example.com/bill',
    });
  });
  it('uses the primary button for inserted blocks and saves its custom font references with the draft', async () => {
    const kit = defaultNewsletterBrandKit();
    const id = '22222222-2222-4222-8222-222222222222';
    kit.fonts.uploaded = [
      {
        assetId: id,
        name: 'Firm Sans',
        family: `CapiroFont-${id}`,
        url: 'https://app.capiro.ai/font',
        format: 'woff2',
      },
    ];
    kit.buttons[0]!.fontFamily = `CapiroFont-${id}, Arial, sans-serif`;
    kit.buttons[0]!.background = '#123456';
    kit.primaryButtonId = kit.buttons[0]!.id;
    setup(false, kit);
    await screen.findByLabelText('Newsletter name');
    fireEvent.click(screen.getByRole('button', { name: 'Button' }));
    expect(screen.getByLabelText('Button text')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save as a template' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(mocks.client.saveLibrary).toHaveBeenCalledTimes(1));
    const design = mocks.client.save!.mock.calls[0]![0].design;
    const inserted = design.sections
      .flatMap(
        (section: {
          blocks: Array<{ kind: string; style: { background: string; fontFamily: string } }>;
        }) => section.blocks,
      )
      .find(
        (block: { kind: string; style: { background: string } }) =>
          block.kind === 'button' && block.style.background === '#123456',
      );
    expect(inserted.style.fontFamily).toBe(kit.buttons[0]!.fontFamily);
    expect(design.fonts).toEqual(kit.fonts.uploaded);
  });
  it('saves the latest draft before checking its HTML and keeps test delivery in Outreach', async () => {
    setup(true);
    await screen.findByLabelText('Newsletter name');
    fireEvent.change(screen.getByLabelText('Newsletter name'), {
      target: { value: 'Edited client update' },
    });
    fireEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: /^Preview$/ }));
    fireEvent.click(await screen.findByRole('tab', { name: /^Inbox$/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Run HTML compatibility check' }));
    await screen.findByText('Unsupported CSS: display grid');
    expect(mocks.client.htmlCheck).toHaveBeenCalledWith('doc1', 2);
    expect(mocks.client.save!.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.client.htmlCheck!.mock.invocationCallOrder[0]!,
    );
    expect(screen.getByText(/Send test to myself/)).toBeTruthy();
  });
  it('requires a sandbox connection before running a compatibility check', async () => {
    setup(false);
    await screen.findByLabelText('Newsletter name');
    fireEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: /^Preview$/ }));
    fireEvent.click(await screen.findByRole('tab', { name: /^Inbox$/ }));
    expect(
      (screen.getByRole('button', { name: 'Run HTML compatibility check' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(mocks.client.htmlCheck).not.toHaveBeenCalled();
  });
  it('shows a failed check without a success report or automatic retry', async () => {
    setup(true);
    mocks.client.htmlCheck!.mockRejectedValue(new Error('Sandbox allowance reached'));
    await screen.findByLabelText('Newsletter name');
    fireEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: /^Preview$/ }));
    fireEvent.click(await screen.findByRole('tab', { name: /^Inbox$/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Run HTML compatibility check' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText('No compatibility issues were reported.')).toBeNull();
    expect(mocks.client.htmlCheck).toHaveBeenCalledTimes(1);
  });
  it('saves edited templates to Workspace after saving the latest draft', async () => {
    setup();
    await screen.findByLabelText('Newsletter name');
    fireEvent.change(screen.getByLabelText('Newsletter name'), {
      target: { value: 'Client policy update' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save as a template' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'My weekly briefing' } });
    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }));
    await waitFor(() =>
      expect(mocks.client.saveLibrary).toHaveBeenCalledWith(
        'doc1',
        'My weekly briefing',
        '',
        undefined,
      ),
    );
    expect(mocks.client.save!.mock.calls[0]![0].name).toBe('Client policy update');
    expect(mocks.client.save!.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.client.saveLibrary!.mock.invocationCallOrder[0]!,
    );
  });
  it('stages the newly saved revision and leaves recipient selection to Outreach', async () => {
    setup();
    await screen.findByLabelText('Newsletter name');
    fireEvent.change(screen.getByLabelText('Newsletter name'), {
      target: { value: 'Updated newsletter' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Stage in Outreach →' }));
    fireEvent.click(screen.getByRole('button', { name: /^Stage in Outreach$/ }));
    await waitFor(() => expect(mocks.client.stage).toHaveBeenCalledWith('doc1', 2));
    expect(screen.queryByText('Import contacts')).toBeNull();
  });
  it('prevents a parent from being dropped into its own descendant and supports cross-section moves', () => {
    const design = governmentAffairsNewsletter();
    const parent = design.sections[1]!.blocks.find((b) => b.kind === 'columns')!;
    const nested = createNewsletterBlock('columns');
    parent.columns[0]!.push(nested);
    expect(
      moveBlock(design, parent.id, {
        sectionId: design.sections[1]!.id,
        columnId: nested.id,
        column: 0,
      }),
    ).toBe(false);
    const child = parent.columns[0]![0]!;
    expect(moveBlock(design, child.id, { sectionId: design.sections[2]!.id })).toBe(true);
    expect(design.sections[2]!.blocks.at(-1)!.id).toBe(child.id);
    expect(locateBlock(design, child.id)?.list).toBe(design.sections[2]!.blocks);
    const copy = cloneSection(design.sections[1]!);
    expect(copy.id).not.toBe(design.sections[1]!.id);
    expect(copy.blocks[0]!.id).not.toBe(design.sections[1]!.blocks[0]!.id);
  });
  it('removes executable paste markup before putting it on the canvas', () => {
    const html = sanitizeNewsletterMarkup(
      '<script>evil()</script><img src="javascript:evil()" onerror="evil()"><p style="background:url(https://evil.example)">Safe</p>',
    );
    expect(html).toContain('Safe');
    expect(html).not.toMatch(/script|javascript|onerror|url\(/);
  });
  it('adds a real Apps Link Preview, saves the selected app before import and autosaves the resulting card', async () => {
    setup();
    mocks.client.linkPreview = vi.fn().mockResolvedValue({
      sourceUrl: 'https://news.example/policy',
      title: 'Committee update',
      description: 'Illustrative policy story.',
      imageUrl: '',
      warnings: [],
    });
    await screen.findByLabelText('Newsletter name');
    fireEvent.click(screen.getByRole('button', { name: /^Apps$/ }));
    const sidebar = within(screen.getByRole('complementary'));
    fireEvent.click(sidebar.getByText('Link Preview').closest('summary')!);
    fireEvent.click(sidebar.getByRole('button', { name: 'Use Link Preview' }));
    fireEvent.change(sidebar.getByLabelText('Source URL'), {
      target: { value: 'https://news.example/policy' },
    });
    fireEvent.click(sidebar.getByRole('button', { name: 'Load preview' }));
    await waitFor(() =>
      expect(mocks.client.linkPreview).toHaveBeenCalledWith('doc1', 'https://news.example/policy'),
    );
    await waitFor(() =>
      expect(
        mocks.client
          .save!.mock.calls.at(-1)![0]
          .design.sections.some((section: { blocks: { app?: { title: string } }[] }) =>
            section.blocks.some((block) => block.app?.title === 'Committee update'),
          ),
      ).toBe(true),
    );
    expect(
      within(screen.getByRole('main'))
        .getByRole('link', { name: /Committee update/ })
        .getAttribute('href'),
    ).toBe('https://news.example/policy');
    expect(
      within(screen.getByRole('main')).getByRole('link', { name: /Committee update/ }),
    ).toHaveStyle({ color: '#1f2937', background: '#f3f4f6' });
    expect(screen.queryByLabelText('Apps text')).toBeNull();
  });
});
