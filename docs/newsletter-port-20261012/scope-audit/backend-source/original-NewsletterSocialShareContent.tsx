import { GripVertical } from 'lucide-react';
import {
  defaultNewsletterSocialShare,
  newsletterSocialSettings,
  NEWSLETTER_SOCIAL_SHARE_PLATFORMS,
  type NewsletterBlock,
  type NewsletterSocialShare,
} from '@capiro/shared/newsletter';
import { Field, TextField } from './controls.js';

const sharePlatforms = NEWSLETTER_SOCIAL_SHARE_PLATFORMS.filter(([key]) => key !== 'forward');

export function NewsletterSocialShareContent({
  block,
  onChange,
}: {
  block: NewsletterBlock;
  onChange: (edit: (block: NewsletterBlock) => void) => void;
}) {
  const share = block.social?.share || defaultNewsletterSocialShare();
  const update = (edit: (share: NewsletterSocialShare) => void) =>
    onChange((draft) => {
      draft.social = structuredClone(newsletterSocialSettings(draft));
      draft.social.share ||= defaultNewsletterSocialShare();
      edit(draft.social.share);
    });
  const move = (from: number, to: number) => {
    if (
      !Number.isInteger(from) ||
      from < 0 ||
      from >= share.items.length ||
      to < 0 ||
      to >= share.items.length ||
      from === to
    )
      return;
    update((value) => {
      const [item] = value.items.splice(from, 1);
      value.items.splice(to, 0, item!);
    });
  };
  return (
    <section aria-label="Social sharing">
      {share.source === 'custom' ? (
        <TextField
          label="Custom URL"
          value={share.customUrl}
          placeholder="Please enter a URL"
          onChange={(customUrl) =>
            update((value) => {
              value.customUrl = customUrl;
            })
          }
        />
      ) : (
        <>
          <p role="status">
            Campaign sharing is not enabled. Use a public article or bill page instead.
          </p>
          <button
            type="button"
            onClick={() =>
              update((value) => {
                value.source = 'custom';
              })
            }
          >
            Use a public URL
          </button>
        </>
      )}
      {share.items.some((item) => item.platform === 'forward') && (
        <p role="status">
          Forwarding is not enabled. Remove this channel or choose another channel before staging.
        </p>
      )}
      {share.items.map((item, index) => (
        <div
          className="nl-item-card"
          key={index}
          onDragOver={(event) => {
            if (event.dataTransfer.types.includes('application/x-capiro-share-index'))
              event.preventDefault();
          }}
          onDrop={(event) => {
            const value = event.dataTransfer.getData('application/x-capiro-share-index');
            if (!/^\d+$/.test(value)) return;
            event.preventDefault();
            event.stopPropagation();
            move(Number(value), index);
          }}
        >
          <div className="nl-flex">
            <button
              draggable
              aria-label={`Drag social share ${index + 1}`}
              onDragStart={(event) => {
                event.stopPropagation();
                event.dataTransfer.setData('application/x-capiro-share-index', String(index));
                event.dataTransfer.effectAllowed = 'move';
              }}
            >
              <GripVertical size={16} />
            </button>
            <button
              aria-label={`Delete social share ${index + 1}`}
              onClick={() =>
                update((value) => {
                  value.items.splice(index, 1);
                })
              }
            >
              Delete
            </button>
          </div>
          <Field label={`Share channel ${index + 1}`}>
            <select
              value={item.platform}
              onChange={(event) =>
                update((value) => {
                  value.items[index] = {
                    platform: event.target.value as typeof item.platform,
                    label: '',
                  };
                })
              }
            >
              {item.platform === 'forward' && (
                <option value="forward" disabled>
                  Forwarding not enabled
                </option>
              )}
              {sharePlatforms.map(([key, label]) => (
                <option
                  key={key}
                  value={key}
                  disabled={
                    key !== item.platform && share.items.some((other) => other.platform === key)
                  }
                >
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <TextField
            label={`Share label ${index + 1}`}
            placeholder="Enter link text label"
            value={item.label}
            onChange={(label) =>
              update((value) => {
                value.items[index]!.label = label;
              })
            }
          />
          <div className="nl-flex">
            <button
              aria-label={`Move social share ${index + 1} up`}
              disabled={index === 0}
              onClick={() => move(index, index - 1)}
            >
              Move up
            </button>
            <button
              aria-label={`Move social share ${index + 1} down`}
              disabled={index === share.items.length - 1}
              onClick={() => move(index, index + 1)}
            >
              Move down
            </button>
          </div>
        </div>
      ))}
      <button
        disabled={share.items.length >= sharePlatforms.length}
        onClick={() => {
          const next = sharePlatforms.find(
            ([key]) => !share.items.some((item) => item.platform === key),
          );
          if (next)
            update((value) => {
              value.items.push({ platform: next[0], label: 'Share' });
            });
        }}
      >
        Add another social link
      </button>
    </section>
  );
}
