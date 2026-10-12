import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { NewsletterCampaignConfig, NewsletterDesign } from '@capiro/shared/newsletter';
import { Monitor, Smartphone, ArrowLeft, Send, Check } from 'lucide-react';
import { useApi } from '../../../lib/use-api.js';
import { useApiScope } from '../../../lib/use-api-scope.js';
import type { Client } from '../../clients/clientTypes.js';
import { StepRecipientsSelect } from './v2/StepRecipientsSelect.js';
import { sanitizeTargets, type OutreachTarget } from './v2/targets.js';
import { recipientKey } from './v2/types.js';
import type { CollisionResolution } from './v2/RecipientCollisions.js';
import type { OutreachSenderInbox } from './v2/NewOutreachWizard.js';
import './newsletter-outreach.css';

interface Version {
  id: string;
  subject: string;
  body: string;
  sendable: boolean;
  auditStatus: string;
  approvalStatus: string;
  recipientEmail: string;
}
interface NewsletterOutreachRecord {
  id: string;
  name: string;
  status: string;
  subject: string;
  senderConnectionId: string | null;
  targets: OutreachTarget[];
  versions: Version[];
  intentId: string | null;
  tests?: TestReference[];
  excluded?: string[];
  stage: {
    id: string;
    documentId: string;
    revision: number;
    config: NewsletterCampaignConfig;
    design: NewsletterDesign;
  };
}
interface TestReference {
  id: string;
  requestKey: string;
  senderConnectionId: string;
  versionId: string;
}
interface Intent {
  id: string;
  status: string;
  totals: Record<string, number>;
  error: string | null;
  deliveries: Array<{
    id: string;
    status: string;
    to: Array<{ email: string }>;
    errorMessage: string | null;
  }>;
}

/** Newsletter lists/groups become private copies; no shared To exposes a client's
 * address or gives another group member their unsubscribe capability. */
export function newsletterDestinations(targets: OutreachTarget[]) {
  // A newsletter group is a source of individual contacts, rather than the
  // generic Outreach projection's one representative with shared To members.
  // Prefer the first personal entry's identity when a directory address repeats.
  const rows = (['individual', 'list', 'group'] as const).flatMap((type) =>
    targets
      .filter((target) => target.type === type)
      .flatMap((target) =>
        target.recipients.map((recipient) => {
          const key = recipientKey(recipient);
          return {
            ...recipient,
            cc: [
              ...(recipient.cc ?? []),
              ...target.cc,
              ...(target.ccContacts?.map((c) => c.email) ?? []),
              ...(target.type === 'list' ? (target.memberCc?.[key] ?? []) : []),
              ...(target.type === 'list'
                ? (target.memberCcContacts?.[key]?.map((c) => c.email) ?? [])
                : []),
            ],
            bcc: [
              ...(recipient.bcc ?? []),
              ...target.bcc,
              ...(target.bccContacts?.map((c) => c.email) ?? []),
              ...(target.type === 'list' ? (target.memberBcc?.[key] ?? []) : []),
              ...(target.type === 'list'
                ? (target.memberBccContacts?.[key]?.map((c) => c.email) ?? [])
                : []),
            ],
          };
        }),
      ),
  );
  const byEmail = new Map<
    string,
    {
      email: string;
      name?: string;
      clientId?: string;
      directoryContactId?: string;
      cc: string[];
      bcc: string[];
    }
  >();
  for (const row of rows) {
    const email = (row.email ?? '').trim().toLowerCase();
    if (!email) continue;
    const prior = byEmail.get(email);
    const copy = (values: string[] = []) => [
      ...new Set(values.map((v) => v.trim().toLowerCase()).filter((v) => v && v !== email)),
    ];
    byEmail.set(email, {
      email,
      name: prior ? prior.name : row.name,
      clientId: prior ? prior.clientId : row.clientId,
      directoryContactId: prior ? prior.directoryContactId : row.directoryContactId,
      cc: copy([...(prior?.cc ?? []), ...(row.cc ?? [])]),
      bcc: copy([...(prior?.bcc ?? []), ...(row.bcc ?? [])]),
    });
  }
  return [...byEmail.values()];
}
function errorMessage(error: unknown) {
  const value = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data
    ?.message;
  return Array.isArray(value)
    ? value.join(' ')
    : (value ?? (error as Error)?.message ?? 'Please try again.');
}
export function NewsletterOutreach({ clients }: { clients: Client[] }) {
  const scope = useApiScope();
  const location = useLocation();
  return <NewsletterOutreachSession key={`${scope}:${location.search}`} clients={clients} />;
}
export function NewsletterOutreachSession({ clients }: { clients: Client[] }) {
  const api = useApi();
  const scope = useApiScope();
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const params = new URLSearchParams(location.search);
  const id = params.get('newsletter');
  const stageId = params.get('newsletterStage');
  const [record, setRecord] = useState<NewsletterOutreachRecord | null>(null);
  const [targets, setTargets] = useState<OutreachTarget[]>([]);
  const [collisionResolution, setCollisionResolution] = useState<CollisionResolution>(null);
  const [subject, setSubject] = useState('');
  const [sender, setSender] = useState('');
  const [step, setStep] = useState(0);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [selectedVersion, setSelectedVersion] = useState(0);
  const [versions, setVersions] = useState<Version[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [intentId, setIntentId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sendKey = useRef<string | null>(null);
  const testKeys = useRef(new Map<string, string>());
  const [tests, setTests] = useState<TestReference[]>([]);
  const initialized = useRef(false);
  const recordQuery = useQuery({
    queryKey: ['newsletter-outreach', scope, id, stageId],
    retry: false,
    queryFn: async () =>
      (id
        ? await api.get<NewsletterOutreachRecord>(
            `/api/engagement/newsletters/${encodeURIComponent(id)}`,
          )
        : await api.post<NewsletterOutreachRecord>(
            `/api/engagement/newsletters/stages/${encodeURIComponent(stageId ?? '')}/open`,
          )
      ).data,
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    const row = recordQuery.data;
    if (!row || initialized.current) return;
    initialized.current = true;
    if (!id) {
      navigate(`/engagement/outreach?newsletter=${encodeURIComponent(row.id)}`, { replace: true });
      return;
    }
    setRecord(row);
    setTargets(sanitizeTargets(row.targets));
    setSubject(row.subject);
    setSender(row.senderConnectionId ?? '');
    setVersions(row.versions);
    setIntentId(row.intentId);
    setExcluded(row.excluded ?? []);
    setTests(row.tests ?? []);
    for (const test of row.tests ?? []) {
      const key = `${test.senderConnectionId}:${test.versionId}`;
      if (!testKeys.current.has(key)) testKeys.current.set(key, test.requestKey);
    }
    setStep(row.intentId ? 2 : row.versions.length ? 1 : 0);
  }, [recordQuery.data, id, navigate]);
  const integrations = useQuery({
    queryKey: ['engagement-integrations', 'newsletter', scope],
    queryFn: async () =>
      (
        await api.get<Array<OutreachSenderInbox & { status: string }>>(
          '/api/engagement/integrations',
        )
      ).data,
  });
  const inboxes = (integrations.data ?? []).filter(
    (r) => r.status === 'connected' && ['google_workspace', 'microsoft_365'].includes(r.provider),
  );
  const destinations = useMemo(() => newsletterDestinations(targets), [targets]);
  const intent = useQuery({
    queryKey: ['newsletter-send-intent', scope, intentId],
    enabled: Boolean(intentId),
    queryFn: async () =>
      (
        await api.get<Intent>(
          `/api/engagement/outreach/send-intents/${encodeURIComponent(intentId!)}`,
        )
      ).data,
    refetchInterval: (query) =>
      ['queued', 'running'].includes(query.state.data?.status ?? '') ? 3000 : false,
  });
  const selectedTest = tests.find(
    (test) =>
      test.senderConnectionId === sender && test.versionId === versions[selectedVersion]?.id,
  );
  const testIntent = useQuery({
    queryKey: ['newsletter-test-intent', scope, selectedTest?.id],
    enabled: Boolean(selectedTest),
    retry: false,
    queryFn: async () =>
      (
        await api.get<Intent>(
          `/api/engagement/outreach/send-intents/${encodeURIComponent(selectedTest!.id)}`,
        )
      ).data,
    refetchInterval: (query) =>
      ['queued', 'running'].includes(query.state.data?.status ?? '') ? 3000 : false,
  });
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('capiro:workflow-lock', { detail: { locked: true } }));
    return () => {
      window.dispatchEvent(new CustomEvent('capiro:workflow-lock', { detail: { locked: false } }));
    };
  }, []);
  const invalidatePreview = () => {
    setVersions([]);
    setExcluded([]);
    sendKey.current = null;
  };
  const prepare = async () => {
    if (!record) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post<{ versions: Version[]; excluded: string[] }>(
        `/api/engagement/newsletters/${record.id}/prepare`,
        {
          recipients: destinations,
          targets,
          senderConnectionId: sender,
          subject,
        },
      );
      setVersions(data.versions);
      setExcluded(data.excluded);
      setSelectedVersion(0);
      setStep(1);
      sendKey.current = null;
      setTests([]);
      testKeys.current.clear();
      void qc.invalidateQueries({ queryKey: ['engagement-outreach'] });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const send = async (test = false) => {
    if (!record) return;
    const versionId = versions[selectedVersion]?.id;
    if (test && !versionId) return;
    if (test && selectedTest) {
      await testIntent.refetch();
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (!test) sendKey.current ??= crypto.randomUUID();
      const testKey = `${sender}:${versionId}`;
      if (test && !testKeys.current.has(testKey))
        testKeys.current.set(testKey, crypto.randomUUID());
      const requestKey = test ? testKeys.current.get(testKey)! : sendKey.current!;
      const { data } = await api.post<{ intentId: string }>(
        `/api/engagement/newsletters/${record.id}/${test ? 'test' : 'send'}`,
        {
          requestKey,
          senderConnectionId: sender,
          versionIds: test ? [versionId!] : versions.map((v) => v.id),
        },
      );
      if (test)
        setTests((previous) => [
          { id: data.intentId, requestKey, senderConnectionId: sender, versionId: versionId! },
          ...previous.filter(
            (entry) => entry.senderConnectionId !== sender || entry.versionId !== versionId,
          ),
        ]);
      else {
        setIntentId(data.intentId);
        setStep(2);
        void qc.invalidateQueries({ queryKey: ['engagement-outreach'] });
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  if (recordQuery.isError)
    return (
      <section className="newsletter-outreach" role="alert">
        <h2>Newsletter could not be opened</h2>
        <p>{errorMessage(recordQuery.error)}</p>
        <Link to="/workspace">Return to Workspace</Link>
      </section>
    );
  if (!record) return <p role="status">Opening your staged newsletter…</p>;
  const ready = versions.length > 0 && versions.every((v) => v.sendable);
  return (
    <section className="newsletter-outreach">
      <header>
        <Link to="/engagement/outreach">
          <ArrowLeft size={18} />
          Outreach
        </Link>
        <div>
          <h1>{record.name}</h1>
          <p>Workspace revision {record.stage.revision}</p>
        </div>
        <Link to={`/workspace/newsletters/${record.stage.documentId}`}>Edit in Workspace</Link>
      </header>
      <nav aria-label="Newsletter delivery steps">
        {['Destinations', 'Preview', 'Send'].map((label, index) => (
          <button
            key={label}
            aria-current={step === index ? 'step' : undefined}
            disabled={busy || Boolean(intentId) || index > step}
            onClick={() => setStep(index)}
          >
            <span>{index < step ? <Check size={16} /> : index + 1}</span>
            {label}
          </button>
        ))}
      </nav>
      {error ? (
        <p className="newsletter-outreach-error" role="alert">
          {error}
        </p>
      ) : null}
      {step === 0 ? (
        <>
          <h2>Select destinations</h2>
          <p>
            Choose people from your directories or saved audiences. Each destination receives a
            separate copy, including members selected through a group. Repeated addresses are
            combined into one destination.
          </p>
          <div className="newsletter-outreach-fields">
            <label>
              Send from
              <select
                aria-label="Send from"
                value={sender}
                onChange={(e) => {
                  setSender(e.target.value);
                  invalidatePreview();
                }}
              >
                <option value="">Select a connected mailbox</option>
                {inboxes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.accountEmail ?? r.provider}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Subject
              <input
                value={subject}
                maxLength={300}
                onChange={(e) => {
                  setSubject(e.target.value);
                  invalidatePreview();
                }}
              />
            </label>
          </div>
          {integrations.isError ? (
            <p role="alert">Connected mailboxes could not be loaded.</p>
          ) : !integrations.isLoading && !inboxes.length ? (
            <p>
              Connect a Google Workspace or Microsoft 365 mailbox in Engagement integrations to
              send.
            </p>
          ) : null}
          <StepRecipientsSelect
            deliveryMode="newsletter"
            clients={clients}
            targets={targets}
            clientId={record.stage.config.clientId}
            collisionResolution={collisionResolution}
            onCollisionResolutionChange={setCollisionResolution}
            onChange={(patch) => {
              if (patch.targets) {
                setTargets(patch.targets);
                invalidatePreview();
              }
            }}
          />
          <footer>
            <span>{destinations.length} destinations</span>
            <button
              className="primary"
              disabled={busy || !destinations.length || !sender || !subject.trim()}
              onClick={() => void prepare()}
            >
              {busy ? 'Preparing preview…' : 'Preview newsletter'}
            </button>
          </footer>
        </>
      ) : step === 1 ? (
        <>
          <div className="newsletter-outreach-previewbar">
            <label>
              Preview for
              <select
                value={selectedVersion}
                onChange={(e) => setSelectedVersion(Number(e.target.value))}
              >
                {versions.map((v, i) => (
                  <option key={v.id} value={i}>
                    {v.recipientEmail}
                  </option>
                ))}
              </select>
            </label>
            <button aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}>
              <Monitor size={18} />
              Desktop
            </button>
            <button aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')}>
              <Smartphone size={18} />
              Mobile
            </button>
            <button
              disabled={busy || !versions[selectedVersion]?.sendable}
              onClick={() => void send(true)}
            >
              {busy
                ? 'Queuing email…'
                : selectedTest
                  ? 'View test status'
                  : 'Send test to my inbox'}
            </button>
          </div>
          <p>
            From: {inboxes.find((r) => r.id === sender)?.accountEmail} · Subject: {subject}
          </p>
          {selectedTest ? (
            <aside className="newsletter-outreach-test" aria-label="Test email status">
              <strong>Test email to your inbox</strong>
              {testIntent.isError ? (
                <p role="alert">
                  Test delivery status could not be loaded.{' '}
                  <button onClick={() => void testIntent.refetch()}>Refresh test status</button>
                </p>
              ) : !testIntent.data ? (
                <p role="status">Loading test delivery status…</p>
              ) : (
                <>
                  <p role="status">
                    {testIntent.data.status} · {testIntent.data.totals.sent ?? 0} sent ·{' '}
                    {testIntent.data.totals.failed ?? 0} failed ·{' '}
                    {testIntent.data.totals.unknown ?? 0} awaiting confirmation
                  </p>
                  <ul>
                    {testIntent.data.deliveries.map((delivery) => (
                      <li key={delivery.id}>
                        {delivery.to.map((recipient) => recipient.email).join(', ')} —{' '}
                        {delivery.status}
                        {delivery.errorMessage ? `: ${delivery.errorMessage}` : ''}
                      </li>
                    ))}
                  </ul>
                  {testIntent.data.error ? <p role="alert">{testIntent.data.error}</p> : null}
                  <p>
                    Client addresses and Cc/Bcc are excluded from this test. Check the received
                    email before sending to your destinations.
                  </p>
                </>
              )}
            </aside>
          ) : null}
          {excluded.length ? (
            <p role="status">{excluded.length} unsubscribed destinations excluded.</p>
          ) : null}
          {versions.some((v) => !v.sendable) ? (
            <p role="alert">
              Some drafts need verification or review before sending. Resolve them in Reviews, or
              edit the source in Workspace and stage it again.
            </p>
          ) : null}
          {versions[selectedVersion] ? (
            <iframe
              title="Newsletter email preview"
              sandbox=""
              srcDoc={versions[selectedVersion]!.body}
              className={`newsletter-outreach-frame ${device}`}
            />
          ) : (
            <p>No subscribed destinations remain. Select another audience.</p>
          )}
          <footer>
            <button onClick={() => setStep(0)}>Back to destinations</button>
            <button className="primary" disabled={busy || !ready} onClick={() => setStep(2)}>
              Continue to send
            </button>
          </footer>
        </>
      ) : (
        <>
          <h2>{intentId ? 'Newsletter delivery' : 'Send newsletter'}</h2>
          {intentId ? (
            <>
              {intent.isError ? (
                <p role="alert">
                  Delivery status could not be loaded.{' '}
                  <button onClick={() => void intent.refetch()}>Refresh status</button>
                </p>
              ) : (
                <p role="status">
                  {intent.data?.status ?? 'Loading delivery status…'} ·{' '}
                  {intent.data?.totals.sent ?? 0} sent · {intent.data?.totals.failed ?? 0} failed ·{' '}
                  {intent.data?.totals.unknown ?? 0} awaiting confirmation
                </p>
              )}
              <ul>
                {intent.data?.deliveries.map((d) => (
                  <li key={d.id}>
                    {d.to.map((r) => r.email).join(', ')} — {d.status}
                    {d.errorMessage ? `: ${d.errorMessage}` : ''}
                  </li>
                ))}
              </ul>
              {['queued', 'running'].includes(intent.data?.status ?? '') ? (
                <button
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await api.post(`/api/engagement/outreach/send-intents/${intentId}/cancel`);
                      await intent.refetch();
                    } catch (e) {
                      setError(errorMessage(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Cancel remaining deliveries
                </button>
              ) : null}
              <Link to="/engagement/outreach">Return to Outreach</Link>
            </>
          ) : (
            <>
              <p>
                {versions.length} separate emails from{' '}
                {inboxes.find((r) => r.id === sender)?.accountEmail}.
              </p>
              <p>
                <strong>{subject}</strong>
              </p>
              <p>
                Your newsletter is saved. Sending uses the content and destinations shown in the
                preview.
              </p>
              <footer>
                <button onClick={() => setStep(1)}>Back to preview</button>
                <button className="primary" disabled={busy || !ready} onClick={() => void send()}>
                  <Send size={18} />
                  {busy ? 'Queuing newsletter…' : `Send to ${versions.length} destinations`}
                </button>
              </footer>
            </>
          )}
        </>
      )}
    </section>
  );
}
