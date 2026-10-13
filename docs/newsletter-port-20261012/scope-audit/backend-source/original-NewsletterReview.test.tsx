// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NewsletterReview from './NewsletterReview.js';

const api = vi.hoisted(() => ({ review: vi.fn() }));
vi.mock('./api.js', () => ({
  useNewsletterApi: () => api,
  newsletterError: (error: Error) => error.message,
}));
vi.mock('../../../../lib/use-api-scope.js', () => ({
  useApiScope: () => ({ tenantId: 'fixture' }),
}));
vi.mock('./NewsletterComments.js', () => ({ NewsletterComments: () => null }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe('newsletter review author navigation', () => {
  it.each(['owner', 'editor', 'viewer', 'commenter'])(
    'shows the edit route only for an owner or author (%s)',
    async (role) => {
      api.review.mockResolvedValue({
        id: 'doc',
        name: 'Weekly newsletter',
        role,
        html: '<p>Bill status update</p>',
        comments: [],
      });
      render(
        <MemoryRouter>
          <NewsletterReview documentId="doc" />
        </MemoryRouter>,
      );
      await screen.findByRole('heading', { name: 'Weekly newsletter' });
      const edit = screen.queryByRole('link', { name: 'Edit newsletter' });
      if (role === 'owner' || role === 'editor')
        expect(edit?.getAttribute('href')).toBe('/workspace/newsletters/doc');
      else expect(edit).toBeNull();
    },
  );
});
