"use client";
import {
  NEWSLETTER_BLOCK_LABELS,
  type NewsletterBlock,
} from "@capiro/shared/newsletter";
import {
  ActionButton,
  Field,
  TextArea,
  TextInput,
} from "../../../../shared/module-ui";
import { RichText } from "./RichText";
import styles from "./rich-newsletter.module.css";

export function RichBlockControls({
  block,
  update,
  remove,
}: {
  block: NewsletterBlock;
  update: (change: Partial<NewsletterBlock>) => void;
  remove: () => void;
}) {
  const text = ["heading", "paragraph", "button", "logo"].includes(block.kind);
  const image = ["image", "logo", "video"].includes(block.kind);
  return (
    <section className={styles.controls} aria-label="Selected block">
      <h2>{NEWSLETTER_BLOCK_LABELS[block.kind]}</h2>
      {text && (
        <RichText
          key={block.id}
          html={block.html}
          text={block.text}
          onChange={(html, text) => update({ html, text })}
        />
      )}
      {block.kind === "code" && (
        <Field label="HTML content" htmlFor="rich-html">
          <TextArea
            id="rich-html"
            value={block.html}
            onChange={(event) => update({ html: event.target.value })}
          />
        </Field>
      )}
      {image && (
        <>
          <Field label="Image URL" htmlFor="rich-image">
            <TextInput
              id="rich-image"
              value={block.imageUrl}
              onChange={(event) => update({ imageUrl: event.target.value })}
            />
          </Field>
          <Field label="Alternative text" htmlFor="rich-alt">
            <TextInput
              id="rich-alt"
              value={block.alt}
              onChange={(event) => update({ alt: event.target.value })}
            />
          </Field>
        </>
      )}
      {["button", "image", "logo", "video"].includes(block.kind) && (
        <Field label="Link URL" htmlFor="rich-link">
          <TextInput
            id="rich-link"
            value={block.url}
            onChange={(event) => update({ url: event.target.value })}
          />
        </Field>
      )}
      <Field label="Text color" htmlFor="rich-color">
        <TextInput
          id="rich-color"
          type="color"
          value={block.style.color || "#111827"}
          onChange={(event) =>
            update({ style: { ...block.style, color: event.target.value } })
          }
        />
      </Field>
      <Field label="Top padding" htmlFor="rich-padding">
        <TextInput
          id="rich-padding"
          type="number"
          min={0}
          max={100}
          value={block.style.paddingTop ?? 0}
          onChange={(event) =>
            update({
              style: {
                ...block.style,
                paddingTop: Math.max(
                  0,
                  Math.min(100, Number(event.target.value)),
                ),
              },
            })
          }
        />
      </Field>
      {!text && !image && block.kind !== "code" && (
        <p>
          Advanced controls for this block are not available yet. Its content is
          retained in the preview.
        </p>
      )}
      <ActionButton onClick={remove}>Remove block</ActionButton>
    </section>
  );
}
