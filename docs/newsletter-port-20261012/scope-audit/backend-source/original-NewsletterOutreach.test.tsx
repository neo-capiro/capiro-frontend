// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultNewsletterConfig, governmentAffairsNewsletter } from '@capiro/shared/newsletter';
import type { OutreachTarget } from './v2/targets.js';
const mocks = vi.hoisted(() => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../../../lib/use-api.js', () => ({ useApi: () => mocks.api }));
vi.mock('../../../lib/use-api-scope.js', () => ({ useApiScope: () => 'fixture-owner' }));
vi.mock('./v2/StepRecipientsSelect.js', () => ({
  StepRecipientsSelect: ({ onChange }: { onChange: (patch: { targets: object[] }) => void }) => (
    <button
      onClick={() =>
        onChange({
          targets: [
            {
              key: 'directory-1',
              type: 'individual',
              recipients: [{ email: 'client@example.test', name: 'Avery Client' }],
              cc: [],
              bcc: [],
            },
          ],
        })
      }
    >
      Select directory destination
    </button>
  ),
}));
import { NewsletterOutreach, newsletterDestinations } from './NewsletterOutreach.js';
function setup({
  sendable = true,
  excluded = [] as string[],
  resumeTest = false,
  statusError = false,
} = {}) {
  const version = {
    id: 'version-3',
    subject: 'This week in policy',
    body: '<p>Saved legislative briefing</p>',
    sendable,
    recipientEmail: 'client@example.test',
  };
  const record = {
    id: 'record-1',
    name: 'Weekly newsletter',
    status: 'draft',
    subject: 'This week in policy',
    senderConnectionId: 'mailbox-1',
    targets: [],
    versions: resumeTest ? [version] : [],
    intentId: null,
    tests: resumeTest
      ? [
          {
            id: 'test-1',
            requestKey: 'original-request',
            senderConnectionId: 'mailbox-1',
            versionId: version.id,
          },
        ]
      : [],
    excluded,
    stage: {
      id: 'stage-1',
      documentId: 'document-1',
      revision: 3,
      config: defaultNewsletterConfig(),
      design: governmentAffairsNewsletter(),
    },
  };
  mocks.api.get.mockImplementation(async (url: string) => {
    if (url.includes('/integrations'))
      return {
        data: [
          {
            id: 'mailbox-1',
            provider: 'google_workspace',
            status: 'connected',
            accountEmail: 'team@example.test',
          },
        ],
      };
    if (url.includes('/send-intents')) {
      if (statusError) throw new Error('Status service unavailable');
      return {
        data: {
          status: 'complete',
          totals: { sent: 1 },
          deliveries: [
            {
              id: 'delivery-1',
              to: [
                { email: url.endsWith('/test-1') ? 'owner@example.test' : 'client@example.test' },
              ],
              status: 'sent',
              errorMessage: null,
            },
          ],
        },
      };
    }
    return { data: record };
  });
  mocks.api.post.mockImplementation(async (url: string) => {
    if (url.endsWith('/prepare'))
      return {
        data: {
          versions: [version],
          excluded,
        },
      };
    return { data: { intentId: url.endsWith('/test') ? 'test-1' : 'intent-1' } };
  });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/engagement/outreach?newsletter=record-1']}>
        <NewsletterOutreach clients={[]} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { record, version, qc };
}
afterEach(() => vi.clearAllMocks());
describe('newsletter Outreach delivery', () => {
  it('selects destinations, previews the staged content and sends only immutable version IDs', async () => {
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Select directory destination' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview newsletter' }));
    await screen.findByTitle('Newsletter email preview');
    expect(mocks.api.post.mock.calls[0]![1]).toMatchObject({
      recipients: [{ email: 'client@example.test' }],
      subject: 'This week in policy',
      senderConnectionId: 'mailbox-1',
    });
    expect(screen.getByTitle('Newsletter email preview').getAttribute('srcdoc')).toContain(
      'Saved legislative briefing',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Continue to send' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send to 1 destinations' }));
    await waitFor(() =>
      expect(mocks.api.post).toHaveBeenCalledWith(
        '/api/engagement/newsletters/record-1/send',
        expect.objectContaining({ versionIds: ['version-3'], senderConnectionId: 'mailbox-1' }),
      ),
    );
    const sendBody = mocks.api.post.mock.calls.find((call) => call[0].endsWith('/send'))![1];
    expect(sendBody).not.toHaveProperty('body');
    expect(sendBody).not.toHaveProperty('recipients');
    await screen.findByText(/1 sent/);
  });
  it('uses the included recipient label after exclusions and prevents sending held versions', async () => {
    setup({ sendable: false, excluded: ['former@example.test'] });
    fireEvent.click(await screen.findByRole('button', { name: 'Select directory destination' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview newsletter' }));
    await screen.findByTitle('Newsletter email preview');
    expect(screen.getByLabelText('Preview for').textContent).toContain('client@example.test');
    expect(screen.getByText(/1 unsubscribed destinations excluded/)).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'Continue to send' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole('button', { name: 'Send test to my inbox' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
  it('expands group destinations into private individual copies and deduplicates across directories', () => {
    const targets = [
      {
        key: 'g',
        type: 'group',
        recipients: [
          { email: 'a@example.test', name: 'A' },
          { email: 'b@example.test', name: 'B' },
        ],
        cc: [],
        bcc: [],
      },
      {
        key: 'i',
        type: 'individual',
        recipients: [{ email: 'a@example.test', name: 'A' }],
        cc: [],
        bcc: [],
      },
    ] as OutreachTarget[];
    expect(newsletterDestinations(targets).map((r) => r.email)).toEqual([
      'a@example.test',
      'b@example.test',
    ]);
    expect(newsletterDestinations(targets).every((r) => !('groupMembers' in r))).toBe(true);
  });
  it('retains group member client identities and combines list copies without mixing duplicate identities', () => {
    const targets: OutreachTarget[] = [
      {
        key: 'group',
        type: 'group',
        recipients: [
          {
            id: 'group-a',
            email: 'A@EXAMPLE.test',
            name: 'Other Avery',
            clientId: 'other-client',
            directoryContactId: 'other-contact',
          },
          {
            id: 'group-b',
            email: 'b@example.test',
            name: 'Blair Client',
            clientId: 'client-b',
            directoryContactId: 'contact-b',
          },
        ],
        cc: ['copy@example.test'],
        bcc: ['private@example.test'],
      },
      {
        key: 'individual',
        type: 'individual',
        recipients: [
          {
            id: 'person-a',
            email: 'a@example.test',
            name: 'Avery Client',
            directoryContactId: 'contact-a',
          },
        ],
        cc: [],
        bcc: [],
      },
      {
        key: 'list',
        type: 'list',
        recipients: [
          {
            id: 'list-b',
            email: 'b@example.test',
            name: 'Blair Client',
            clientId: 'client-b',
            directoryContactId: 'contact-b',
          },
        ],
        cc: ['whole-list@example.test'],
        bcc: [],
        memberCc: { 'list-b': ['member-copy@example.test'] },
        memberBccContacts: {
          'list-b': [
            {
              id: 'copy',
              name: 'Private copy',
              email: 'member-private@example.test',
              source: 'manual',
            },
          ],
        },
      },
    ];
    expect(newsletterDestinations(targets)).toEqual([
      {
        email: 'a@example.test',
        name: 'Avery Client',
        clientId: undefined,
        directoryContactId: 'contact-a',
        cc: ['copy@example.test'],
        bcc: ['private@example.test'],
      },
      {
        email: 'b@example.test',
        name: 'Blair Client',
        clientId: 'client-b',
        directoryContactId: 'contact-b',
        cc: ['whole-list@example.test', 'member-copy@example.test', 'copy@example.test'],
        bcc: ['member-private@example.test', 'private@example.test'],
      },
    ]);
  });
  it('shows the confirmed test recipient and refreshes its status without submitting another email', async () => {
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Select directory destination' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview newsletter' }));
    await screen.findByTitle('Newsletter email preview');
    fireEvent.click(screen.getByRole('button', { name: 'Send test to my inbox' }));
    await screen.findByText('owner@example.test — sent');
    expect(screen.getByRole('complementary', { name: 'Test email status' }).textContent).toContain(
      '1 sent',
    );
    const testCalls = () => mocks.api.post.mock.calls.filter((call) => call[0].endsWith('/test'));
    expect(testCalls()).toHaveLength(1);
    expect(testCalls()[0]![1]).toMatchObject({
      versionIds: ['version-3'],
      senderConnectionId: 'mailbox-1',
    });
    fireEvent.click(screen.getByRole('button', { name: 'View test status' }));
    await waitFor(() =>
      expect(
        mocks.api.get.mock.calls.filter((call) => call[0].endsWith('/test-1')).length,
      ).toBeGreaterThan(1),
    );
    expect(testCalls()).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Continue to send' })).toBeTruthy();
  });
  it('reuses the test request key after an ambiguous submission failure', async () => {
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Select directory destination' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview newsletter' }));
    await screen.findByTitle('Newsletter email preview');
    mocks.api.post.mockRejectedValueOnce(new Error('Connection lost after queueing'));
    fireEvent.click(screen.getByRole('button', { name: 'Send test to my inbox' }));
    await screen.findByText('Connection lost after queueing');
    fireEvent.click(screen.getByRole('button', { name: 'Send test to my inbox' }));
    await screen.findByText('owner@example.test — sent');
    const testCalls = mocks.api.post.mock.calls.filter((call) => call[0].endsWith('/test'));
    expect(testCalls).toHaveLength(2);
    expect(testCalls[0]![1]).toEqual(testCalls[1]![1]);
    expect(testCalls[0]![1].requestKey).toBeTruthy();
  });
  it('restores the existing test and exclusions when reopening an Outreach draft', async () => {
    setup({ resumeTest: true, excluded: ['former@example.test'] });
    await screen.findByText('owner@example.test — sent');
    expect(screen.getByText(/1 unsubscribed destinations excluded/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'View test status' }));
    expect(mocks.api.post).not.toHaveBeenCalled();
  });
  it('keeps a failed status lookup separate from sending another test', async () => {
    setup({ resumeTest: true, statusError: true });
    await screen.findByText(/Test delivery status could not be loaded/);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh test status' }));
    await waitFor(() =>
      expect(
        mocks.api.get.mock.calls.filter((call) => call[0].endsWith('/test-1')).length,
      ).toBeGreaterThan(1),
    );
    expect(mocks.api.post).not.toHaveBeenCalled();
    expect(screen.queryByText(/1 sent/)).toBeNull();
  });
});
