import { GripVertical } from 'lucide-react';
import {
  NEWSLETTER_SOCIAL_PLATFORMS,
  NEWSLETTER_SOCIAL_ICON_STYLES,
  newsletterSocialPlatform,
  newsletterSocialSettings,
  defaultNewsletterSocialShare,
  type NewsletterBlock,
  type NewsletterSocialDevice,
} from '@capiro/shared/newsletter';
import { Field, SelectField, TextField } from './controls.js';
import { NewsletterSocialShareContent } from './NewsletterSocialShareContent.js';

export function NewsletterSocialContent({
  block,
  onChange,
}: {
  block: NewsletterBlock;
  onChange: (edit: (block: NewsletterBlock) => void) => void;
}) {
  const mode = block.social?.mode || 'follow';
  const changeMode = (mode: 'follow' | 'share') =>
    onChange((draft) => {
      const settings = structuredClone(newsletterSocialSettings(draft));
      if ((settings.mode || 'follow') === mode) return;
      if (settings.mode === 'share') settings.shareDisplay = settings.display;
      else settings.followDisplay = settings.display;
      settings.mode = mode;
      settings.display =
        mode === 'share' ? settings.shareDisplay || 'icon-text' : settings.followDisplay || 'icon';
      if (mode === 'share') settings.share ||= defaultNewsletterSocialShare();
      draft.social = settings;
    });
  return (
    <>
      <fieldset className="nl-social-type">
        <legend>Social type</legend>
        <label className="nl-check">
          <input type="radio" checked={mode === 'follow'} onChange={() => changeMode('follow')} />
          Follow
        </label>
        <p>Links to your social channels</p>
        <label className="nl-check">
          <input type="radio" checked={mode === 'share'} onChange={() => changeMode('share')} />
          Share
        </label>
        <p>Recipients post to their social channels</p>
      </fieldset>
      {mode === 'share' ? (
        <NewsletterSocialShareContent block={block} onChange={onChange} />
      ) : (
        <NewsletterSocialFollowContent block={block} onChange={onChange} />
      )}
    </>
  );
}

function NewsletterSocialFollowContent({
  block,
  onChange,
}: {
  block: NewsletterBlock;
  onChange: (edit: (block: NewsletterBlock) => void) => void;
}) {
  const move = (from: number, to: number) => {
    if (
      from === to ||
      !Number.isInteger(from) ||
      from < 0 ||
      from >= block.items.length ||
      to < 0 ||
      to >= block.items.length
    )
      return;
    onChange((draft) => {
      const [item] = draft.items.splice(from, 1);
      draft.items.splice(to, 0, item!);
    });
  };
  return (
    <section aria-label="Social profiles">
      <p>Links to your social channels</p>
      {block.items.map((item, index) => {
        const platform = newsletterSocialPlatform(item);
        return (
          <div
            className="nl-item-card"
            key={index}
            onDragOver={(event) => {
              if (event.dataTransfer.types.includes('application/x-capiro-social-index'))
                event.preventDefault();
            }}
            onDrop={(event) => {
              const value = event.dataTransfer.getData('application/x-capiro-social-index');
              if (!/^\d+$/.test(value)) return;
              event.preventDefault();
              event.stopPropagation();
              move(Number(value), index);
            }}
          >
            <div className="nl-flex">
              <button
                draggable
                aria-label={`Drag social link ${index + 1}`}
                onDragStart={(event) => {
                  event.stopPropagation();
                  event.dataTransfer.setData('application/x-capiro-social-index', String(index));
                  event.dataTransfer.effectAllowed = 'move';
                }}
              >
                <GripVertical size={16} />
              </button>
              <button
                aria-label={`Delete social link ${index + 1}`}
                onClick={() =>
                  onChange((draft) => {
                    draft.items.splice(index, 1);
                  })
                }
              >
                Delete
              </button>
            </div>
            <Field label={`Social channel ${index + 1}`}>
              <select
                value={platform}
                onChange={(event) => {
                  const selected = NEWSLETTER_SOCIAL_PLATFORMS.find(
                    ([key]) => key === event.target.value,
                  )!;
                  onChange((draft) => {
                    draft.items[index] = {
                      platform: selected[0],
                      label: selected[0] === 'twitter' ? 'X' : selected[1],
                      url: selected[2],
                    };
                  });
                }}
              >
                {NEWSLETTER_SOCIAL_PLATFORMS.map(([key, label]) => (
                  <option
                    key={key}
                    value={key}
                    disabled={
                      key !== platform &&
                      block.items.some((other) => newsletterSocialPlatform(other) === key)
                    }
                  >
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <TextField
              label={`Social URL ${index + 1}`}
              value={item.url}
              onChange={(value) =>
                onChange((draft) => {
                  draft.items[index]!.url = value;
                })
              }
            />
            <TextField
              label={`Social label ${index + 1}`}
              value={item.label}
              onChange={(value) =>
                onChange((draft) => {
                  draft.items[index]!.label = value;
                })
              }
            />
            <div className="nl-flex">
              <button
                aria-label={`Move social link ${index + 1} up`}
                disabled={index === 0}
                onClick={() => move(index, index - 1)}
              >
                Move up
              </button>
              <button
                aria-label={`Move social link ${index + 1} down`}
                disabled={index === block.items.length - 1}
                onClick={() => move(index, index + 1)}
              >
                Move down
              </button>
            </div>
          </div>
        );
      })}
      <button
        disabled={block.items.length >= NEWSLETTER_SOCIAL_PLATFORMS.length}
        onClick={() => {
          const next = NEWSLETTER_SOCIAL_PLATFORMS.find(
            ([key]) => !block.items.some((item) => newsletterSocialPlatform(item) === key),
          );
          if (next)
            onChange((draft) => {
              draft.items.push({
                platform: next[0],
                label: next[0] === 'twitter' ? 'X' : next[1],
                url: next[2],
              });
            });
        }}
      >
        Add another social link
      </button>
    </section>
  );
}

export function NewsletterSocialStyles({
  block,
  mobile,
  onChange,
}: {
  block: NewsletterBlock;
  mobile: boolean;
  onChange: (edit: (block: NewsletterBlock) => void) => void;
}) {
  const settings = newsletterSocialSettings(block),
    device = mobile ? settings.mobile : settings.desktop;
  const update = (edit: (settings: NonNullable<NewsletterBlock['social']>) => void) =>
    onChange((draft) => {
      draft.social = structuredClone(newsletterSocialSettings(draft));
      edit(draft.social);
    });
  const updateDevice = (edit: (device: NewsletterSocialDevice) => void) =>
    update((settings) => edit(mobile ? settings.mobile : settings.desktop));
  return (
    <section aria-label="Social icon styles">
      <h3>Icon Styles</h3>
      <SelectField
        label="Display"
        value={settings.display}
        values={[
          ['icon', 'Icon only'],
          ['icon-text', 'Icon & Text'],
          ['text', 'Text only'],
        ]}
        onChange={(value) =>
          update((settings) => {
            settings.display = value;
          })
        }
      />
      {settings.display !== 'text' && (
        <>
          <SelectField
            label="Icon Style"
            value={settings.iconStyle}
            values={NEWSLETTER_SOCIAL_ICON_STYLES.map(([key, label]) => [key, label])}
            onChange={(value) =>
              update((settings) => {
                settings.iconStyle = value;
              })
            }
          />
          <SelectField
            label="Icon size"
            value={device.size}
            values={[
              ['small', 'Small'],
              ['medium', 'Medium'],
              ['large', 'Large'],
            ]}
            onChange={(value) =>
              updateDevice((device) => {
                device.size = value;
              })
            }
          />
        </>
      )}
      <SelectField
        label="Layout"
        value={device.layout}
        values={[
          ['horizontal', 'Horizontal'],
          ['vertical', 'Vertical'],
        ]}
        onChange={(value) =>
          updateDevice((device) => {
            device.layout = value;
          })
        }
      />
      <Field label="Spacing">
        <input
          aria-label="Spacing"
          type="range"
          min="2"
          max="60"
          step="2"
          value={device.spacing}
          onChange={(event) =>
            updateDevice((device) => {
              device.spacing = Number(event.target.value);
            })
          }
        />
        <output>{device.spacing}px</output>
      </Field>
    </section>
  );
}
