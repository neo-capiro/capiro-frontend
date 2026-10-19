import { useEffect, useRef, useState } from 'react';
import {
  type NewsletterBlock,
  type NewsletterSavedSurvey,
  type NewsletterStyle,
} from '@capiro/shared/newsletter';
import {
  Check,
  ColorField,
  Modal,
  NewsletterFontField,
  NumberField,
  SelectField,
  Tabs,
  TextField,
} from './controls.js';
import { newsletterError, type NewsletterClient } from './api.js';
import { NewsletterSurveyBuilder } from './NewsletterSurveyBuilder.js';

export function NewsletterSurveyDesign({
  block,
  defaults,
  api,
  documentId,
  onChange,
  onBeforeLoad,
}: {
  block: NewsletterBlock;
  defaults: NewsletterStyle;
  api: NewsletterClient;
  documentId: string;
  onChange: (change: (block: NewsletterBlock) => void) => void;
  onBeforeLoad: () => Promise<unknown>;
}) {
  const [items, setItems] = useState<NewsletterSavedSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [intro, setIntro] = useState(false);
  const [builder, setBuilder] = useState<NewsletterSavedSurvey | 'new' | null>(null);
  const [device, setDevice] = useState('Desktop');
  const [reload, setReload] = useState(0);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    void (async () => {
      try {
        await onBeforeLoad();
        const result = await api.surveys(documentId);
        if (alive) {
          setItems(result);
          if (!result.length && !block.survey?.saved && reload === 0) setIntro(true);
        }
      } catch (error) {
        if (alive) setError(newsletterError(error));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // The key in NewsletterEditor identifies the captured document/block; edits do not restart loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, documentId, reload]);
  const mobile = device === 'Mobile' && !block.linkedStyles;
  const style = { ...defaults, ...block.style, ...(mobile ? block.mobileStyle : {}) };
  const globalStyle = { ...defaults, ...block.style };
  const setStyle = (key: keyof NewsletterStyle, value: NewsletterStyle[keyof NewsletterStyle]) =>
    onChange((draft) => {
      const target = mobile ? draft.mobileStyle : draft.style;
      Object.assign(target, { [key]: value });
    });
  const setGlobalStyle = (
    key: keyof NewsletterStyle,
    value: NewsletterStyle[keyof NewsletterStyle],
  ) =>
    onChange((draft) => {
      Object.assign(draft.style, { [key]: value });
    });
  const radius = globalStyle.radius || 0;
  const shape = radius === 1000 ? 'pill' : radius === 8 ? 'round' : radius ? 'custom' : 'square';
  const size =
    style.paddingTop === style.paddingBottom &&
    style.paddingLeft === (style.paddingTop || 0) * 2 &&
    style.paddingRight === style.paddingLeft
      ? style.paddingTop === 8
        ? 'small'
        : style.paddingTop === 12
          ? 'medium'
          : style.paddingTop === 18
            ? 'large'
            : 'custom'
      : 'custom';
  const acceptSaved = (result: NewsletterSavedSurvey) => {
    if (!active.current) return;
    setItems((value) => [result, ...value.filter((item) => item.id !== result.id)]);
    onChange((draft) => {
      if (draft.survey) draft.survey.saved = structuredClone(result);
    });
  };
  return (
    <section aria-label="Survey button design">
      {loading && <p role="status">Loading saved surveys…</p>}
      {error && (
        <>
          <p role="alert">{error}</p>
          <button type="button" onClick={() => setReload((value) => value + 1)}>
            Retry saved surveys
          </button>
        </>
      )}
      {!loading && !error && (
        <>
          {items.length ? (
            <SelectField
              label="Link to survey"
              value={block.survey?.saved?.id || ''}
              values={[
                '',
                ...items.map((item) => [item.id, `${item.name} · Draft`] as [string, string]),
              ]}
              onChange={(value) =>
                onChange((draft) => {
                  if (draft.survey)
                    draft.survey.saved = structuredClone(
                      items.find((item) => item.id === value) || null,
                    );
                })
              }
            />
          ) : (
            <p className="nl-survey-empty">You haven't created any surveys yet.</p>
          )}
          {block.survey?.saved && (
            <p role="status">
              Linked draft: {block.survey.saved.name} · Revision {block.survey.saved.revision}
            </p>
          )}
          <div className="nl-flex">
            <button type="button" onClick={() => setBuilder('new')}>
              Create Survey
            </button>
            {block.survey?.saved && (
              <button
                type="button"
                onClick={() =>
                  setBuilder(
                    items.find((item) => item.id === block.survey?.saved?.id) ||
                      block.survey!.saved!,
                  )
                }
              >
                Edit survey
              </button>
            )}
            <button type="button" onClick={() => setReload((value) => value + 1)}>
              Refresh surveys
            </button>
          </div>
        </>
      )}
      <TextField
        label="Button text"
        value={block.text}
        onChange={(value) =>
          onChange((draft) => {
            draft.text = value;
            draft.html = '';
          })
        }
      />
      <SelectField
        label="Button shape"
        value={shape}
        values={['square', 'round', 'pill', 'custom']}
        onChange={(value) =>
          setGlobalStyle(
            'radius',
            value === 'pill' ? 1000 : value === 'round' ? 8 : value === 'square' ? 0 : 16,
          )
        }
      />
      {shape === 'custom' && (
        <NumberField
          label="Rounded corners"
          value={radius}
          max={1000}
          onChange={(value) => setGlobalStyle('radius', value)}
        />
      )}
      <h3>Colors</h3>
      <ColorField
        label="Button color"
        value={globalStyle.background || '#141414'}
        onChange={(value) => setGlobalStyle('background', value)}
      />
      <ColorField
        label="Text color"
        value={globalStyle.color || '#ffffff'}
        onChange={(value) => setGlobalStyle('color', value)}
      />
      <ColorField
        label="Block background color"
        value={block.survey?.blockBackground || ''}
        onChange={(value) =>
          onChange((draft) => {
            if (draft.survey) draft.survey.blockBackground = value;
          })
        }
      />
      <h3>Border</h3>
      <SelectField
        label="Border"
        value={globalStyle.borderStyle || 'none'}
        values={[
          'none',
          'solid',
          'dashed',
          'dotted',
          'double',
          'inset',
          'outset',
          'groove',
          'ridge',
        ]}
        onChange={(value) => setGlobalStyle('borderStyle', value)}
      />
      <div className="nl-grid2">
        <ColorField
          label="Border color"
          value={globalStyle.borderColor || '#f05f26'}
          onChange={(value) => setGlobalStyle('borderColor', value)}
        />
        <NumberField
          label="Border width"
          value={globalStyle.borderWidth ?? 1}
          max={30}
          onChange={(value) => setGlobalStyle('borderWidth', value)}
        />
      </div>
      <h3>Device-specific</h3>
      <Check
        label="Link Desktop and Mobile Styles"
        checked={block.linkedStyles}
        onChange={(value) =>
          onChange((draft) => {
            draft.linkedStyles = value;
            if (!value)
              draft.mobileStyle = {
                fontFamily: style.fontFamily,
                fontSize: style.fontSize,
                letterSpacing: style.letterSpacing,
                bold: style.bold,
                italic: style.italic,
                underline: style.underline,
                align: style.align,
                paddingTop: style.paddingTop,
                paddingBottom: style.paddingBottom,
                paddingLeft: style.paddingLeft,
                paddingRight: style.paddingRight,
              };
          })
        }
      />
      <Tabs value={device} values={['Desktop', 'Mobile']} onChange={setDevice} />
      <NewsletterFontField
        label="Font"
        value={style.fontFamily || 'Arial'}
        onChange={(value) => setStyle('fontFamily', value)}
      />
      <div className="nl-grid2">
        <NumberField
          label="Font size"
          value={style.fontSize ?? 16}
          min={1}
          max={200}
          onChange={(value) => setStyle('fontSize', value)}
        />
        <NumberField
          label="Letter spacing"
          value={style.letterSpacing ?? 0}
          max={30}
          step={0.1}
          onChange={(value) => setStyle('letterSpacing', value)}
        />
      </div>
      <div className="nl-format">
        {(['bold', 'italic', 'underline'] as const).map((key) => (
          <button
            type="button"
            key={key}
            aria-label={key}
            aria-pressed={!!style[key]}
            onClick={() =>
              onChange((draft) =>
                Object.assign(mobile ? draft.mobileStyle : draft.style, {
                  [key]: !style[key],
                  ...(key === 'bold' ? { fontWeight: !style[key] ? 700 : 400 } : {}),
                }),
              )
            }
          >
            {key}
          </button>
        ))}
      </div>
      <SelectField
        label="Size"
        value={size}
        values={['small', 'medium', 'large', 'custom']}
        onChange={(value) => {
          if (value === 'custom') return;
          const padding = value === 'small' ? 8 : value === 'medium' ? 12 : 18;
          onChange((draft) => {
            Object.assign(mobile ? draft.mobileStyle : draft.style, {
              paddingTop: padding,
              paddingBottom: padding,
              paddingLeft: padding * 2,
              paddingRight: padding * 2,
            });
            if (draft.survey) draft.survey.paddingLinked = false;
          });
        }}
      />
      <SelectField
        label="Alignment"
        value={style.align || 'center'}
        values={['left', 'center', 'right']}
        onChange={(value) => setStyle('align', value)}
      />
      <h3>Padding</h3>
      <div className="nl-grid2">
        {(['Top', 'Bottom', 'Left', 'Right'] as const).map((side) => {
          const key = `padding${side}` as
            'paddingTop' | 'paddingBottom' | 'paddingLeft' | 'paddingRight';
          return (
            <NumberField
              key={side}
              label={`Padding ${side.toLowerCase()}`}
              value={style[key] ?? (side === 'Top' || side === 'Bottom' ? 12 : 24)}
              max={1000}
              onChange={(value) =>
                onChange((draft) =>
                  Object.assign(
                    mobile ? draft.mobileStyle : draft.style,
                    draft.survey?.paddingLinked
                      ? {
                          paddingTop: value,
                          paddingBottom: value,
                          paddingLeft: value,
                          paddingRight: value,
                        }
                      : { [key]: value },
                  ),
                )
              }
            />
          );
        })}
      </div>
      <Check
        label="Apply to all sides"
        checked={!!block.survey?.paddingLinked}
        onChange={(value) =>
          onChange((draft) => {
            if (draft.survey) draft.survey.paddingLinked = value;
            if (value)
              Object.assign(mobile ? draft.mobileStyle : draft.style, {
                paddingTop: style.paddingTop ?? 12,
                paddingBottom: style.paddingTop ?? 12,
                paddingLeft: style.paddingTop ?? 12,
                paddingRight: style.paddingTop ?? 12,
              });
          })
        }
      />
      <p className="nl-muted">
        Saved survey drafts cannot be staged until hosted response delivery is complete.
      </p>
      {intro && (
        <Modal title="Create a survey" onClose={() => setIntro(false)}>
          <h3>Learn what matters to your clients</h3>
          <p>Create a reusable survey draft with questions, branding and custom messages.</p>
          <button
            type="button"
            onClick={() => {
              setIntro(false);
              setBuilder('new');
            }}
          >
            Create Survey
          </button>
        </Modal>
      )}
      {builder && (
        <NewsletterSurveyBuilder
          api={api}
          mediaApi={api}
          documentId={documentId}
          initial={builder === 'new' ? undefined : builder}
          onDraftSaved={acceptSaved}
          onClose={() => setBuilder(null)}
          onSaved={(result) => {
            acceptSaved(result);
            setBuilder(null);
          }}
        />
      )}
    </section>
  );
}
