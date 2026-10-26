"use client";
import { useState } from "react";
import {
  defaultNewsletterSocialShare,
  newsletterSocialSettings,
  newsletterSocialPlatform,
  NEWSLETTER_SOCIAL_PLATFORMS,
  NEWSLETTER_SOCIAL_SHARE_PLATFORMS,
  NEWSLETTER_SOCIAL_ICON_STYLES,
  type NewsletterBlock,
  type NewsletterLink,
  type NewsletterSocialSettings,
} from "@capiro/shared/newsletter";
import { ActionButton } from "../../../../../shared/module-ui";
import { Choice, Entry, NumberEntry } from "./Fields";
import ui from "../library/sections.module.css";
import styles from "./content.module.css";

export function SocialControls({
  block,
  update,
}: {
  block: NewsletterBlock;
  update: (change: Partial<NewsletterBlock>) => void;
}) {
  const [selected, setSelected] = useState(0);
  const [mobile, setMobile] = useState(false);
  const social = newsletterSocialSettings(block);
  const share = social.share ?? defaultNewsletterSocialShare();
  const sharing = social.mode === "share";
  const items = sharing ? share.items : block.items;
  const index = Math.min(selected, Math.max(0, items.length - 1));
  const item = items[index];
  const settings = (change: Partial<NewsletterSocialSettings>) =>
    update({ social: { ...social, ...change } });
  const replaceItems = (
    next: (NewsletterLink | (typeof share.items)[number])[],
  ) =>
    sharing
      ? settings({ share: { ...share, items: next as typeof share.items } })
      : update({ items: next as NewsletterLink[] });
  const edit = (change: object) =>
    replaceItems(
      items.map((entry, i) => (i === index ? { ...entry, ...change } : entry)),
    );
  const move = (direction: number) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target]!, next[index]!];
    replaceItems(next);
    setSelected(target);
  };
  const add = () => {
    if (sharing) {
      const available = NEWSLETTER_SOCIAL_SHARE_PLATFORMS.find(
        ([key]) => !share.items.some((entry) => entry.platform === key),
      );
      if (available)
        replaceItems([
          ...share.items,
          { platform: available[0], label: available[1] },
        ]);
    } else if (items.length < 30)
      replaceItems([
        ...block.items,
        { platform: "website", label: "Website", url: "" },
      ]);
    setSelected(items.length);
  };
  const device = mobile && !block.linkedStyles ? "mobile" : "desktop";
  return (
    <>
      <Choice
        label="Social type"
        value={sharing ? "share" : "follow"}
        values={[
          ["follow", "Follow"],
          ["share", "Share"],
        ]}
        change={(mode) => {
          const previous = sharing ? "shareDisplay" : "followDisplay";
          const display =
            mode === "share" ? social.shareDisplay : social.followDisplay;
          settings({
            mode: mode as "share" | "follow",
            [previous]: social.display,
            display: display ?? social.display,
            ...(mode === "share" ? { share } : {}),
          });
          setSelected(0);
        }}
      />
      {sharing && (
        <>
          <Choice
            label="Content to share"
            value={share.source}
            values={[
              ["custom", "Custom URL"],
              ["campaign", "Campaign URL"],
            ]}
            change={(source) =>
              settings({
                share: { ...share, source: source as "custom" | "campaign" },
              })
            }
          />
          {share.source === "custom" ? (
            <Entry
              label="Custom URL"
              value={share.customUrl}
              change={(customUrl) =>
                settings({ share: { ...share, customUrl } })
              }
            />
          ) : (
            <p>
              Campaign sharing needs the campaign URL supplied by the existing
              delivery owner. This editor does not send or create that URL.
            </p>
          )}
        </>
      )}
      {item && (
        <>
          <Choice
            label={sharing ? "Share channel" : "Social channel"}
            value={
              sharing
                ? item.platform!
                : newsletterSocialPlatform(item as NewsletterLink)
            }
            values={
              sharing
                ? NEWSLETTER_SOCIAL_SHARE_PLATFORMS.filter(
                    ([key]) =>
                      !share.items.some(
                        (entry, i) => i !== index && entry.platform === key,
                      ),
                  )
                : NEWSLETTER_SOCIAL_PLATFORMS.map(
                    ([key, label]) => [key, label] as const,
                  )
            }
            change={(platform) => edit({ platform })}
          />
          {!sharing && (
            <Entry
              label="Social URL"
              value={(item as NewsletterLink).url}
              change={(url) => edit({ url })}
            />
          )}
          <Entry
            label={sharing ? "Share label" : "Social label"}
            value={item.label}
            maxLength={1000}
            change={(label) => edit({ label })}
          />
        </>
      )}
      {items.map((entry, i) => (
        <div key={i} className={ui.item}>
          <span className={ui.badge}>{sharing ? "Share" : "Follow"}</span>
          <h3>{entry.label || "Untitled channel"}</h3>
          {!sharing && <p>{(entry as NewsletterLink).url || "No URL"}</p>}
          <div className={ui.actions}>
            <ActionButton
              className={ui.button}
              aria-pressed={i === index}
              onClick={() => setSelected(i)}
            >
              Edit channel {i + 1}
            </ActionButton>
            {i === index && (
              <>
                <ActionButton
                  className={ui.button}
                  disabled={i === 0}
                  onClick={() => move(-1)}
                >
                  Move up
                </ActionButton>
                <ActionButton
                  className={ui.button}
                  disabled={i === items.length - 1}
                  onClick={() => move(1)}
                >
                  Move down
                </ActionButton>
                <ActionButton
                  className={ui.button}
                  onClick={() => {
                    replaceItems(items.filter((_, at) => at !== i));
                    setSelected(Math.max(0, i - 1));
                  }}
                >
                  Delete
                </ActionButton>
              </>
            )}
          </div>
        </div>
      ))}
      <ActionButton
        className={ui.button}
        disabled={items.length >= (sharing ? 6 : 30)}
        onClick={add}
      >
        Add another social link
      </ActionButton>
      <details>
        <summary>Icon Styles</summary>
        <div className={styles.stack}>
          <Choice
            label="Display"
            value={social.display}
            values={[
              ["icon", "Icon only"],
              ["icon-text", "Icon & Text"],
              ["text", "Text only"],
            ]}
            change={(display) =>
              settings({
                display: display as NewsletterSocialSettings["display"],
              })
            }
          />
          <Choice
            label="Icon style"
            value={social.iconStyle}
            values={NEWSLETTER_SOCIAL_ICON_STYLES}
            change={(iconStyle) =>
              settings({
                iconStyle: iconStyle as NewsletterSocialSettings["iconStyle"],
              })
            }
          />
          <Choice
            label="Icon device"
            value={mobile ? "Mobile" : "Desktop"}
            values={["Desktop", "Mobile"]}
            change={(value) => setMobile(value === "Mobile")}
          />
          {mobile && block.linkedStyles && (
            <p>Mobile uses desktop icon settings while styles are linked.</p>
          )}
          <Choice
            label="Icon size"
            value={social[device].size}
            values={["small", "medium", "large"]}
            change={(size) =>
              settings({ [device]: { ...social[device], size } })
            }
          />
          <Choice
            label="Layout"
            value={social[device].layout}
            values={["horizontal", "vertical"]}
            change={(layout) =>
              settings({ [device]: { ...social[device], layout } })
            }
          />
          <NumberEntry
            label="Spacing"
            value={social[device].spacing}
            min={2}
            max={60}
            step={2}
            change={(spacing) => {
              if (spacing !== undefined && spacing % 2 === 0)
                settings({ [device]: { ...social[device], spacing } });
            }}
          />
        </div>
      </details>
    </>
  );
}
