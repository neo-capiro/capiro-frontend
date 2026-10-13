import { useCallback, useEffect, useRef, useState } from 'react';
import {
  newsletterBrandButtonStyle,
  newsletterId,
  newsletterCatalogStyle,
  type NewsletterBrandKit as BrandKit,
} from '@capiro/shared/newsletter';
import { newsletterFontCss, newsletterStyleCss } from '@capiro/shared/newsletter-render';
import { newsletterError, type NewsletterClient } from './api.js';
import { Check, ColorField, Modal, TextField, NewsletterFontField } from './controls.js';
import { NewsletterBrandContext, newsletterFontChoices } from './brand-context.js';
import { NewsletterWebFonts } from './NewsletterFontPicker.js';

const fingerprint = (kit: BrandKit) =>
  JSON.stringify({ ...kit, revision: undefined, updatedAt: undefined });
export function NewsletterBrandKit({
  api,
  initial,
  onSaved,
  onClose,
}: {
  api: NewsletterClient;
  initial: BrandKit;
  onSaved: (kit: BrandKit) => void;
  onClose: () => void;
}) {
  const [kit, setKit] = useState(() => structuredClone(initial));
  const latest = useRef(kit);
  const revision = useRef(kit.revision);
  const saved = useRef(fingerprint(kit));
  const serial = useRef(Promise.resolve());
  const mounted = useRef(true);
  const conflicted = useRef(false);
  const [category, setCategory] = useState('Logos');
  const [selection, setSelection] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Changes saved');
  const [uploading, setUploading] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);
  const fontInput = useRef<HTMLInputElement>(null);
  const change = (edit: (draft: BrandKit) => void) => {
    const draft = structuredClone(latest.current);
    edit(draft);
    latest.current = draft;
    setKit(draft);
    setError('');
    setStatus('Unsaved changes');
  };
  const persist = useCallback(async () => {
    const operation = serial.current
      .catch(() => {})
      .then(async () => {
        if (!mounted.current) return;
        if (conflicted.current)
          throw new Error('Reload the saved Brand Kit to resolve the conflicting edit.');
        while (mounted.current && saved.current !== fingerprint(latest.current)) {
          const snapshot = structuredClone(latest.current),
            sent = fingerprint(snapshot);
          if (mounted.current) setStatus('Saving…');
          try {
            const next = await api.saveBrandKit({ ...snapshot, revision: revision.current });
            revision.current = next.revision;
            saved.current = fingerprint(next);
            // Do not overwrite edits made while the request was in flight.
            latest.current =
              fingerprint(latest.current) === sent
                ? next
                : { ...latest.current, revision: next.revision, updatedAt: next.updatedAt };
            if (mounted.current) {
              setKit(latest.current);
              onSaved(next);
            }
          } catch (error) {
            if ((error as { response?: { status?: number } }).response?.status === 409)
              conflicted.current = true;
            if (mounted.current) {
              setError(newsletterError(error));
              setStatus('Changes not saved');
            }
            throw error;
          }
        }
        if (mounted.current) setStatus('Changes saved');
      });
    serial.current = operation;
    await operation;
  }, [api, onSaved]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => {
      if (uploading || saved.current !== fingerprint(latest.current)) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', leave);
    return () => window.removeEventListener('beforeunload', leave);
  }, [uploading]);
  useEffect(() => {
    if (saved.current === fingerprint(kit)) return;
    const timer = setTimeout(() => void persist().catch(() => {}), 650);
    return () => clearTimeout(timer);
  }, [kit, persist]);
  const close = async () => {
    if (uploading) return;
    try {
      await persist();
      onClose();
    } catch {}
  };
  const logo = kit.logos.find((item) => item.assetId === selection);
  const button = kit.buttons.find((item) => item.id === selection);
  const upload = async (file: File | undefined, kind: 'logo' | 'font') => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      if (kind === 'logo') {
        if (!['image/png', 'image/jpeg'].includes(file.type))
          throw new Error('Choose a PNG or JPG logo.');
        const asset = await api.upload(file);
        if (!mounted.current) return;
        change((draft) => {
          draft.logos.push({
            assetId: asset.id,
            name: asset.name,
            url: asset.url,
            link: '',
            alt: asset.name.replace(/\.[^.]+$/, ''),
          });
          if (!draft.primaryLogoId) draft.primaryLogoId = asset.id;
        });
      } else {
        const font = await api.uploadFont(file);
        if (!mounted.current) return;
        change((draft) => {
          draft.fonts.uploaded.push(font);
        });
      }
    } catch (error) {
      if (mounted.current) setError(newsletterError(error));
    } finally {
      if (mounted.current) setUploading(false);
    }
  };
  const previewStyle = (style: ReturnType<typeof newsletterBrandButtonStyle>) => {
    const node = document.createElement('span');
    node.setAttribute('style', newsletterStyleCss(style));
    const values: Record<string, string> = {};
    for (const key of Array.from(node.style))
      values[key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] =
        node.style.getPropertyValue(key);
    return values;
  };
  return (
    <NewsletterBrandContext.Provider
      value={{
        fonts: newsletterFontChoices(kit.fonts.uploaded),
        colors: [...kit.colors.primary, ...kit.colors.secondary],
      }}
    >
      <Modal title="Brand Kit" wide onClose={() => void close()}>
        <style>{newsletterFontCss(kit.fonts.uploaded)}</style>
        <NewsletterWebFonts
          requests={[
            { value: kit.fonts.heading },
            { value: kit.fonts.body },
            ...kit.buttons.map((button) => ({ value: button.fontFamily })),
          ]}
        />
        <input
          hidden
          type="file"
          ref={logoInput}
          accept="image/png,image/jpeg"
          onChange={(event) => {
            void upload(event.target.files?.[0], 'logo');
            event.target.value = '';
          }}
        />
        <input
          hidden
          type="file"
          ref={fontInput}
          accept=".ttf,.otf,.woff,.woff2"
          onChange={(event) => {
            void upload(event.target.files?.[0], 'font');
            event.target.value = '';
          }}
        />
        <div className="nl-brand-status">
          <span role="status">{uploading ? 'Uploading…' : status}</span>
          {error && <p role="alert">{error}</p>}
          {conflicted.current && (
            <button
              onClick={async () => {
                try {
                  const next = await api.brandKit();
                  latest.current = next;
                  revision.current = next.revision;
                  saved.current = fingerprint(next);
                  conflicted.current = false;
                  setKit(next);
                  onSaved(next);
                  setError('');
                  setStatus('Changes saved');
                } catch (error) {
                  setError(newsletterError(error));
                }
              }}
            >
              Reload saved kit
            </button>
          )}
        </div>
        <div className="nl-brand-layout">
          <nav aria-label="Brand Kit sections">
            {['Logos', 'Colors', 'Fonts', 'Buttons'].map((item) => (
              <button
                key={item}
                aria-pressed={category === item}
                onClick={() => {
                  setCategory(item);
                  setSelection(null);
                }}
              >
                {item}
              </button>
            ))}
          </nav>
          <div className="nl-brand-main">
            {category === 'Logos' && (
              <>
                <div className="nl-brand-grid">
                  {kit.logos.map((item) => (
                    <div className="nl-brand-card" key={item.assetId}>
                      <img src={item.url} alt={item.alt || item.name} />
                      <strong>{item.name}</strong>
                      {kit.primaryLogoId === item.assetId && <span>Primary</span>}
                      <button
                        aria-label={`Logo settings for ${item.name}`}
                        onClick={() => setSelection(item.assetId)}
                      >
                        Logo settings
                      </button>
                      <button
                        aria-label={`Delete logo ${item.name}`}
                        onClick={() =>
                          change((draft) => {
                            draft.logos = draft.logos.filter(
                              (logo) => logo.assetId !== item.assetId,
                            );
                            if (draft.primaryLogoId === item.assetId) draft.primaryLogoId = null;
                          })
                        }
                      >
                        Delete logo
                      </button>
                    </div>
                  ))}
                  <button
                    className="nl-brand-card"
                    disabled={uploading || kit.logos.length >= 20}
                    onClick={() => logoInput.current?.click()}
                  >
                    Add Logo
                  </button>
                </div>
                <p className="nl-muted">
                  For best results, upload a full-size PNG with a transparent background. JPG is
                  also supported.
                </p>
                {logo && (
                  <aside className="nl-brand-settings" aria-label="Logo settings">
                    <Check
                      label="Primary logo — use this logo for all new content"
                      checked={kit.primaryLogoId === logo.assetId}
                      onChange={(value) =>
                        change((draft) => {
                          draft.primaryLogoId = value ? logo.assetId : null;
                        })
                      }
                    />
                    <TextField
                      label="Logo name"
                      value={logo.name}
                      onChange={(value) =>
                        change((draft) => {
                          draft.logos.find((item) => item.assetId === logo.assetId)!.name = value;
                        })
                      }
                    />
                    <TextField
                      label="Logo link"
                      value={logo.link}
                      placeholder="https://"
                      onChange={(value) =>
                        change((draft) => {
                          draft.logos.find((item) => item.assetId === logo.assetId)!.link = value;
                        })
                      }
                    />
                    <TextField
                      label="Alt text"
                      value={logo.alt}
                      onChange={(value) =>
                        change((draft) => {
                          draft.logos.find((item) => item.assetId === logo.assetId)!.alt = value;
                        })
                      }
                    />
                    <button onClick={() => setSelection(null)}>Done</button>
                  </aside>
                )}
              </>
            )}
            {category === 'Colors' && (
              <>
                {(['primary', 'secondary'] as const).map((group) => (
                  <section key={group}>
                    <h3>{group === 'primary' ? 'Primary colors' : 'Secondary colors'}</h3>
                    <div className="nl-brand-grid">
                      {kit.colors[group].map((value, index) => (
                        <div className="nl-brand-card" key={index}>
                          <ColorField
                            label={`${group === 'primary' ? 'Primary' : 'Secondary'} color ${index + 1}`}
                            value={value}
                            onChange={(value) =>
                              change((draft) => {
                                draft.colors[group][index] = value;
                              })
                            }
                          />
                          <button
                            aria-label={`Delete ${group} color ${index + 1}`}
                            onClick={() =>
                              change((draft) => {
                                draft.colors[group].splice(index, 1);
                              })
                            }
                          >
                            Delete color
                          </button>
                        </div>
                      ))}
                      <button
                        className="nl-brand-card"
                        disabled={kit.colors[group].length >= 20}
                        onClick={() =>
                          change((draft) => {
                            draft.colors[group].push('#ffffff');
                          })
                        }
                      >
                        Add {group === 'primary' ? 'primary' : 'secondary'} color
                      </button>
                    </div>
                  </section>
                ))}
              </>
            )}
            {category === 'Fonts' && (
              <>
                <NewsletterFontField
                  label="Heading"
                  value={kit.fonts.heading}
                  onChange={(value) =>
                    change((draft) => {
                      draft.fonts.heading = value;
                    })
                  }
                />
                <NewsletterFontField
                  label="Subheading and body"
                  value={kit.fonts.body}
                  onChange={(value) =>
                    change((draft) => {
                      draft.fonts.body = value;
                    })
                  }
                />
                <h3>Font Preview</h3>
                <div className="nl-brand-font-preview">
                  <h2
                    style={
                      newsletterCatalogStyle(kit.fonts.heading) ?? { fontFamily: kit.fonts.heading }
                    }
                  >
                    Your weekly policy briefing
                  </h2>
                  <p
                    style={newsletterCatalogStyle(kit.fonts.body) ?? { fontFamily: kit.fonts.body }}
                  >
                    Keep clients informed about the bills, news and developments that matter to
                    them.
                  </p>
                </div>
                <button
                  disabled={uploading || kit.fonts.uploaded.length >= 20}
                  onClick={() => fontInput.current?.click()}
                >
                  Upload Font
                </button>
                <p className="nl-muted">
                  TTF, OTF, WOFF or WOFF2 · up to 2 MB. Email apps that do not support custom fonts
                  use Arial.
                </p>
                <h3>Uploaded Custom Fonts</h3>
                {kit.fonts.uploaded.map((font) => (
                  <div className="nl-flex" key={font.assetId}>
                    <span style={{ fontFamily: font.family }}>{font.name}</span>
                    <button
                      aria-label={`Delete font ${font.name}`}
                      onClick={() =>
                        change((draft) => {
                          draft.fonts.uploaded = draft.fonts.uploaded.filter(
                            (item) => item.assetId !== font.assetId,
                          );
                          if (draft.fonts.heading.startsWith(font.family))
                            draft.fonts.heading = 'Arial';
                          if (draft.fonts.body.startsWith(font.family)) draft.fonts.body = 'Arial';
                          for (const button of draft.buttons)
                            if (button.fontFamily.startsWith(font.family))
                              button.fontFamily = 'Arial';
                        })
                      }
                    >
                      Delete font
                    </button>
                  </div>
                ))}
              </>
            )}
            {category === 'Buttons' && (
              <>
                <div className="nl-brand-grid">
                  {kit.buttons.map((item) => (
                    <div className="nl-brand-card" key={item.id}>
                      <span
                        className="nl-brand-button-preview"
                        style={previewStyle(newsletterBrandButtonStyle(item))}
                      >
                        Button
                      </span>
                      {kit.primaryButtonId === item.id && <span>Primary</span>}
                      <strong>{item.name}</strong>
                      <button
                        aria-label={`Button settings for ${item.name}`}
                        onClick={() => setSelection(item.id)}
                      >
                        Button settings
                      </button>
                      <button
                        aria-label={`Delete button ${item.name}`}
                        onClick={() =>
                          change((draft) => {
                            draft.buttons = draft.buttons.filter((button) => button.id !== item.id);
                            if (draft.primaryButtonId === item.id) draft.primaryButtonId = null;
                          })
                        }
                      >
                        Delete button
                      </button>
                    </div>
                  ))}
                  <button
                    className="nl-brand-card"
                    disabled={kit.buttons.length >= 20}
                    onClick={() => {
                      const id = newsletterId();
                      change((draft) => {
                        draft.buttons.push({
                          id,
                          name: `Button ${draft.buttons.length + 1}`,
                          shape: 'rounded',
                          variant: 'filled',
                          background: draft.colors.primary[0] || '#141414',
                          color: '#ffffff',
                          fontFamily: draft.fonts.body,
                        });
                      });
                      setSelection(id);
                    }}
                  >
                    Add Button
                  </button>
                </div>
                {button && (
                  <aside className="nl-brand-settings" aria-label="Button settings">
                    <Check
                      label="Primary button"
                      checked={kit.primaryButtonId === button.id}
                      onChange={(value) =>
                        change((draft) => {
                          draft.primaryButtonId = value ? button.id : null;
                        })
                      }
                    />
                    <TextField
                      label="Button name"
                      value={button.name}
                      onChange={(value) =>
                        change((draft) => {
                          draft.buttons.find((item) => item.id === button.id)!.name = value;
                        })
                      }
                    />
                    <fieldset className="nl-brand-segments">
                      <legend>Shape</legend>
                      {(['square', 'rounded', 'pill'] as const).map((shape) => (
                        <label key={shape}>
                          <input
                            type="radio"
                            name="brand-button-shape"
                            value={shape}
                            checked={button.shape === shape}
                            onChange={() =>
                              change((draft) => {
                                draft.buttons.find((item) => item.id === button.id)!.shape = shape;
                              })
                            }
                          />
                          {shape[0]!.toUpperCase() + shape.slice(1)}
                        </label>
                      ))}
                    </fieldset>
                    <fieldset className="nl-brand-segments">
                      <legend>Style</legend>
                      {(['filled', 'outlined'] as const).map((variant) => (
                        <label key={variant}>
                          <input
                            type="radio"
                            name="brand-button-variant"
                            value={variant}
                            checked={button.variant === variant}
                            onChange={() =>
                              change((draft) => {
                                draft.buttons.find((item) => item.id === button.id)!.variant =
                                  variant;
                              })
                            }
                          />
                          {variant[0]!.toUpperCase() + variant.slice(1)}
                        </label>
                      ))}
                    </fieldset>
                    <ColorField
                      label="Background"
                      value={button.background}
                      onChange={(value) =>
                        change((draft) => {
                          draft.buttons.find((item) => item.id === button.id)!.background = value;
                        })
                      }
                    />
                    <ColorField
                      label="Text"
                      value={button.color}
                      onChange={(value) =>
                        change((draft) => {
                          draft.buttons.find((item) => item.id === button.id)!.color = value;
                        })
                      }
                    />
                    <NewsletterFontField
                      value={button.fontFamily}
                      onChange={(value) =>
                        change((draft) => {
                          draft.buttons.find((item) => item.id === button.id)!.fontFamily = value;
                        })
                      }
                    />
                    <button onClick={() => setSelection(null)}>Done</button>
                  </aside>
                )}
              </>
            )}
          </div>
        </div>
        <footer>
          <button className="nl-primary" disabled={uploading} onClick={() => void close()}>
            Close
          </button>
        </footer>
      </Modal>
    </NewsletterBrandContext.Provider>
  );
}
