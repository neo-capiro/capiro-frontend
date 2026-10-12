// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { governmentAffairsNewsletter, type NewsletterLibraryItem } from '@capiro/shared/newsletter';
import { NewsletterTemplateChooserSession } from './NewsletterTemplateChooser.js';
import type { NewsletterClient } from './api.js';

afterEach(() => vi.restoreAllMocks());
function fixture(onApply?: (design: ReturnType<typeof governmentAffairsNewsletter>) => void) {
  const template: NewsletterLibraryItem = {
    id: 'saved-1',
    name: 'My policy briefing',
    folder: 'Clients',
    updatedAt: new Date().toISOString(),
    design: governmentAffairsNewsletter(),
    config: {
      company: 'Sample firm',
      mailingAddress: 'Sample office',
      permissionReminder: 'Subscribed client updates.',
    },
  };
  template.design!.sourceClientIds = ['client-source'];
  const api = {
    library: vi.fn().mockResolvedValue([template]),
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: 'new-1' }),
    updateLibrary: vi.fn().mockResolvedValue({ ok: true }),
    removeLibrary: vi.fn().mockResolvedValue({ ok: true }),
  };
  function Location() {
    return <output data-testid="location">{useLocation().pathname}</output>;
  }
  render(
    <MemoryRouter>
      <NewsletterTemplateChooserSession
        api={api as unknown as NewsletterClient}
        onApply={onApply}
      />
      <Location />
    </MemoryRouter>,
  );
  return { api, template };
}
describe('newsletter template selection', () => {
  it('creates the selected basic layout and navigates to its Workspace editor', async () => {
    const { api } = fixture();
    await screen.findByText('My policy briefing', { selector: 'strong' });
    fireEvent.click(screen.getByRole('tab', { name: 'Basic layouts' }));
    const card = screen.getByText('3 column layout', { selector: 'strong' }).closest('article')!;
    fireEvent.click(card.querySelector('button')!);
    await waitFor(() => expect(api.create).toHaveBeenCalledWith('layout:3'));
    await waitFor(() =>
      expect(screen.getByTestId('location').textContent).toBe('/workspace/newsletters/new-1'),
    );
  });
  it('previews saved branding and applies the saved design with its client restrictions', async () => {
    const onApply = vi.fn();
    const { api, template } = fixture(onApply);
    await screen.findByText('My policy briefing', { selector: 'strong' });
    fireEvent.click(screen.getByRole('tab', { name: 'Saved templates' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    const preview = screen.getByTitle('Template preview');
    expect(preview.getAttribute('srcdoc')).toContain('Sample firm');
    expect(preview.getAttribute('srcdoc')).toContain('Sample office');
    fireEvent.click(screen.getByRole('button', { name: 'Apply template' }));
    expect(onApply).toHaveBeenCalledWith(template.design);
    expect(api.create).not.toHaveBeenCalled();
  });
  it('renames and moves a saved template and refreshes the library', async () => {
    const { api } = fixture();
    await screen.findByText('My policy briefing', { selector: 'strong' });
    fireEvent.click(screen.getByRole('tab', { name: 'Saved templates' }));
    vi.spyOn(window, 'prompt')
      .mockReturnValueOnce('Weekly client update')
      .mockReturnValueOnce('Firm templates');
    fireEvent.click(screen.getByRole('button', { name: 'Rename / move' }));
    await waitFor(() =>
      expect(api.updateLibrary).toHaveBeenCalledWith(
        'saved-1',
        'Weekly client update',
        'Firm templates',
      ),
    );
    await waitFor(() => expect(api.library).toHaveBeenCalledTimes(2));
  });
});
