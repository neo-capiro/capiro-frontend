import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createNewsletterLayout,
  defaultNewsletterConfig,
  governmentAffairsNewsletter,
  type NewsletterCampaign,
  type NewsletterDesign,
  type NewsletterLibraryItem,
} from '@capiro/shared/newsletter';
import { renderNewsletterDesign } from '@capiro/shared/newsletter-render';
import { newsletterError, useNewsletterApi, type NewsletterClient } from './api.js';
import { Modal, SelectField, TextField, Tabs } from './controls.js';
import { sanitizeNewsletterMarkup } from './model.js';
import './newsletter.css';

export function NewsletterTemplateChooser() {
  const api = useNewsletterApi();
  return <NewsletterTemplateChooserSession api={api} />;
}
export function NewsletterTemplateChooserSession({
  api,
  onApply,
}: {
  api: NewsletterClient;
  onApply?: (design: NewsletterDesign) => void;
}) {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<NewsletterLibraryItem[]>([]);
  const [drafts, setDrafts] = useState<NewsletterCampaign[]>([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('All templates');
  const [purpose, setPurpose] = useState('All purposes');
  const [style, setStyle] = useState('All styles');
  const [industry, setIndustry] = useState('All industries');
  const [folder, setFolder] = useState('All folders');
  const [preview, setPreview] = useState<{
    name: string;
    id: string;
    design: NewsletterDesign;
  } | null>(null);
  const [previewDevice, setPreviewDevice] = useState('Desktop');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let canceled = false;
    Promise.all([api.library('template'), api.list()])
      .then(([saved, documents]) => {
        if (!canceled) {
          setTemplates(saved);
          setDrafts(documents);
        }
      })
      .catch((e) => {
        if (!canceled) setError(newsletterError(e));
      });
    return () => {
      canceled = true;
    };
  }, [api]);
  const create = async (id: string, design: NewsletterDesign) => {
    setBusy(true);
    setError('');
    try {
      if (onApply) {
        onApply(design);
        return;
      }
      const doc = await api.create(id);
      navigate(`/workspace/newsletters/${doc.id}`, { replace: true });
    } catch (e) {
      setError(newsletterError(e));
      setBusy(false);
    }
  };
  const editLibrary = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await action();
      setTemplates(await api.library('template'));
    } catch (error) {
      setError(newsletterError(error));
    } finally {
      setBusy(false);
    }
  };
  const card = (
    name: string,
    id: string,
    description: string,
    design: NewsletterDesign,
    thumbnail = false,
  ) => (
    <article className="nl-template-card" key={id}>
      {thumbnail ? (
        <img src="/newsletter/template-preview.svg" alt="Government affairs weekly newsletter" />
      ) : (
        <div className="nl-template-mini">{name}</div>
      )}
      <strong>{name}</strong>
      <span>{description}</span>
      <div className="nl-flex">
        <button disabled={busy} onClick={() => void create(id, design)}>
          Apply
        </button>
        <button
          onClick={() => {
            setPreview({ name, id, design });
            setPreviewDevice('Desktop');
          }}
        >
          Preview
        </button>
      </div>
      {templates.some((template) => template.id === id) && (
        <div className="nl-flex">
          <button
            disabled={busy}
            onClick={() => {
              const item = templates.find((template) => template.id === id)!;
              const name = window.prompt('Template name', item.name);
              if (!name?.trim()) return;
              const nextFolder = window.prompt('Folder', item.folder);
              if (nextFolder !== null)
                void editLibrary(() => api.updateLibrary(id, name, nextFolder));
            }}
          >
            Rename / move
          </button>
          <button
            disabled={busy}
            onClick={() => {
              if (window.confirm(`Delete the saved template “${name}”?`))
                void editLibrary(() => api.removeLibrary(id));
            }}
          >
            Delete
          </button>
        </div>
      )}
    </article>
  );
  const match = (name: string) => name.toLowerCase().includes(search.toLowerCase());
  return (
    <div className="nl-root nl-template-chooser">
      <header>
        <h1>Select a template</h1>
        {!onApply && (
          <button onClick={() => navigate('/workspace/documents/new')}>Back to Workspace</button>
        )}
      </header>
      <p>
        Build a weekly client briefing, save your edited layout, and stage it in Outreach when it’s
        ready.
      </p>
      {error ? <p role="alert">{error}</p> : null}
      <TextField label="Search newsletter templates" value={search} onChange={setSearch} />
      <Tabs
        value={tab}
        values={[
          'All templates',
          'Basic layouts',
          'Fully designed',
          'Drafts',
          'Saved templates',
          'Code your own',
        ]}
        onChange={setTab}
      />
      <div className="nl-flex">
        <SelectField
          label="Purpose"
          value={purpose}
          values={['All purposes', 'Educate & inform']}
          onChange={setPurpose}
        />
        <SelectField
          label="Style"
          value={style}
          values={['All styles', 'Newsletter']}
          onChange={setStyle}
        />
        <SelectField
          label="Industry"
          value={industry}
          values={['All industries', 'Government affairs']}
          onChange={setIndustry}
        />
        {tab === 'Saved templates' ? (
          <SelectField
            label="Folder"
            value={folder}
            values={['All folders', ...new Set(templates.map((t) => t.folder).filter(Boolean))]}
            onChange={setFolder}
          />
        ) : null}
      </div>
      <div className="nl-template-grid">
        {['All templates', 'Fully designed'].includes(tab) && match('Weekly newsletter')
          ? card(
              'Weekly newsletter',
              'bp_weekly_newsletter',
              'Educate & inform · Government affairs',
              governmentAffairsNewsletter(),
              true,
            )
          : null}
        {['All templates', 'Basic layouts'].includes(tab) &&
        purpose === 'All purposes' &&
        style === 'All styles' &&
        industry === 'All industries'
          ? [1, 2, 3, 4]
              .filter((columns) => match(`${columns} column layout`))
              .map((columns) =>
                card(
                  `${columns} column layout`,
                  `layout:${columns}`,
                  'Start with a basic layout',
                  createNewsletterLayout(columns),
                ),
              )
          : null}
        {['All templates', 'Saved templates'].includes(tab)
          ? templates
              .filter(
                (t) =>
                  !!t.design && match(t.name) && (folder === 'All folders' || t.folder === folder),
              )
              .map((t) => card(t.name, t.id, t.folder || 'Saved template', t.design!))
          : null}
        {tab === 'Drafts'
          ? drafts
              .filter((d) => match(d.name))
              .map((d) =>
                onApply ? (
                  card(d.name, d.id, 'Draft layout', d.design)
                ) : (
                  <article className="nl-template-card" key={d.id}>
                    <div className="nl-template-mini">{d.name}</div>
                    <strong>{d.name}</strong>
                    <span>
                      {d.status === 'staged' ? 'Staged in Outreach' : 'Draft'} ·{' '}
                      {new Date(d.updatedAt).toLocaleDateString()}
                    </span>
                    <button onClick={() => navigate(`/workspace/newsletters/${d.id}`)}>
                      Continue editing
                    </button>
                  </article>
                ),
              )
          : null}
        {tab === 'Code your own'
          ? card(
              'Paste your HTML',
              'code:html',
              'Create a newsletter with your own HTML',
              createNewsletterLayout(1, true),
            )
          : null}
      </div>
      <button
        className="nl-secondary"
        disabled={busy}
        onClick={() => void create('layout:1', createNewsletterLayout(1))}
      >
        Start from scratch
      </button>
      {tab === 'Saved templates' && !templates.length ? (
        <p>
          No saved templates yet. Save your edited newsletter as a template from the builder’s
          Actions menu.
        </p>
      ) : null}
      {tab === 'Drafts' && !drafts.length ? <p>No newsletter drafts yet.</p> : null}
      {preview ? (
        <Modal title={preview.name} wide onClose={() => setPreview(null)}>
          <div className="nl-modal-body">
            <Tabs
              value={previewDevice}
              values={['Desktop', 'Mobile']}
              onChange={setPreviewDevice}
            />
            <iframe
              title="Template preview"
              sandbox=""
              srcDoc={renderNewsletterDesign(
                preview.design,
                {
                  ...defaultNewsletterConfig(),
                  ...templates.find((template) => template.id === preview.id)?.config,
                },
                {
                  sanitizeHtml: sanitizeNewsletterMarkup,
                  editor: true,
                },
              )}
              style={{
                display: 'block',
                width: previewDevice === 'Mobile' ? 375 : '100%',
                maxWidth: '100%',
                height: 600,
                border: 0,
                margin: '20px auto',
              }}
            />
          </div>
          <footer>
            <button onClick={() => setPreview(null)}>Back</button>
            <button
              className="nl-primary"
              disabled={busy}
              onClick={() => void create(preview.id, preview.design)}
            >
              Apply template
            </button>
          </footer>
        </Modal>
      ) : null}
    </div>
  );
}
