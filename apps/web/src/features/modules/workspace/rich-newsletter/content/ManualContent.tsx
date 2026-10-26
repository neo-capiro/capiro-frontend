"use client";
import { useState } from "react";
import {
  newsletterCustomVideoThumbnail,
  type NewsletterBlock,
} from "@capiro/shared/newsletter";
import { ActionButton } from "../../../../../shared/module-ui";
import { AssetReplaceControl } from "../assets/AssetReplaceControl";
import { Choice, Entry, Toggle } from "./Fields";
import ui from "../library/sections.module.css";

type Props = {
  block: NewsletterBlock;
  update: (value: Partial<NewsletterBlock>) => void;
};
export function VideoControls({ block, update }: Props) {
  const custom = (change: Partial<NewsletterBlock>) => {
    const next = { ...block, ...change };
    newsletterCustomVideoThumbnail(next);
    update({ ...change, video: next.video });
  };
  return (
    <>
      <Entry
        label="Video URL"
        value={block.url}
        change={(url) => custom({ url })}
      />
      <p>
        {block.video?.thumbnail === "auto"
          ? "This block retains its existing automatic thumbnail. Changing the URL or image switches to a manual thumbnail."
          : "Custom thumbnail"}{" "}
        — automatic thumbnail lookup is not available in this editor.
      </p>
      <Entry
        label="Thumbnail URL"
        value={block.imageUrl}
        change={(imageUrl) => custom({ imageUrl })}
      />
      <Entry
        label="Alt text"
        value={block.alt}
        maxLength={1000}
        change={(alt) => update({ alt })}
      />
      <AssetReplaceControl
        blockId={block.id}
        onInsert={(asset) => custom({ imageUrl: asset.url })}
      />
    </>
  );
}
export function AppControls({ block, update }: Props) {
  const app = block.app ?? {
    kind: "link-preview" as const,
    sourceUrl: "",
    title: "",
    description: "",
    imageUrl: "",
    size: "medium" as const,
    showImage: true,
    showDescription: true,
    showBackground: true,
  };
  const edit = (change: Partial<typeof app>) =>
    update({ app: { ...app, ...change } });
  return (
    <>
      <p>
        Enter this link preview manually. No external page is fetched. Source
        URLs must use public HTTPS without credentials.
      </p>
      <Entry
        label="Source URL"
        value={app.sourceUrl}
        change={(sourceUrl) => edit({ sourceUrl })}
      />
      <Choice
        label="Block size"
        value={app.size}
        values={["small", "medium", "large"]}
        change={(size) => edit({ size: size as typeof app.size })}
      />
      {(
        [
          ["showImage", "Show image"],
          ["showDescription", "Show description"],
          ["showBackground", "Show background"],
        ] as const
      ).map(([key, label]) => (
        <Toggle
          key={key}
          label={label}
          checked={app[key]}
          change={(checked) => edit({ [key]: checked })}
        />
      ))}
      <Entry
        label="Preview title"
        value={app.title}
        maxLength={2000}
        change={(title) => edit({ title })}
      />
      <Entry
        label="Preview description"
        value={app.description}
        maxLength={6000}
        change={(description) => edit({ description })}
      />
      <Entry
        label="Preview image URL"
        value={app.imageUrl}
        change={(imageUrl) => edit({ imageUrl })}
      />
      <AssetReplaceControl
        blockId={block.id}
        onInsert={(asset) => edit({ imageUrl: asset.url })}
      />
    </>
  );
}
export function ProductControls({ block, update }: Props) {
  const [selected, setSelected] = useState(0);
  const index = Math.min(selected, Math.max(0, block.items.length - 1));
  const item = block.items[index];
  const change = (key: string, value: string) =>
    update({
      items: block.items.map((entry, i) =>
        i === index ? { ...entry, [key]: value } : entry,
      ),
    });
  const move = (direction: number) => {
    const target = index + direction;
    if (target < 0 || target >= block.items.length) return;
    const items = [...block.items];
    [items[index], items[target]] = [items[target]!, items[index]!];
    update({ items });
    setSelected(target);
  };
  return (
    <>
      <p>
        Enter products manually. Recommendation blocks use these same fields; no
        products are fetched or generated.
      </p>
      {item && (
        <>
          {(
            [
              ["label", "Product name", 1000],
              ["url", "Product URL", 4000],
              ["imageUrl", "Image URL", 4000],
              ["price", "Price", 100],
              ["description", "Description", 10000],
            ] as const
          ).map(([key, label, max]) => (
            <Entry
              key={key}
              label={label}
              value={item[key] ?? ""}
              maxLength={max}
              change={(value) => change(key, value)}
            />
          ))}
        </>
      )}
      <Entry
        label="Button label"
        value={block.text}
        maxLength={200000}
        change={(text) => update({ text })}
      />
      {block.items.map((entry, i) => (
        <div className={ui.item} key={i}>
          <span className={ui.badge}>Manual</span>
          <h3>{entry.label || "Untitled product"}</h3>
          <p>
            {entry.price} {entry.url}
          </p>
          <div className={ui.actions}>
            <ActionButton
              className={ui.button}
              aria-pressed={i === index}
              onClick={() => setSelected(i)}
            >
              Edit product {i + 1}
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
                  disabled={i === block.items.length - 1}
                  onClick={() => move(1)}
                >
                  Move down
                </ActionButton>
                <ActionButton
                  className={ui.button}
                  onClick={() => {
                    update({ items: block.items.filter((_, at) => at !== i) });
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
        disabled={block.items.length >= 30}
        onClick={() => {
          update({
            items: [...block.items, { label: "New product", url: "" }],
          });
          setSelected(block.items.length);
        }}
      >
        Add product
      </ActionButton>
    </>
  );
}
