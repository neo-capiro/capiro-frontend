"use client";

import { useState } from "react";
import type { NewsletterBlock } from "../../../../shared/capiro/operations/workspace-documents";
import {
  ActionButton,
  Field,
  TextArea,
  TextInput,
} from "../../../../shared/module-ui";
import styles from "../workspace.module.css";
import { safeNewsletterHref } from "./newsletter-model";
import { AssetReplaceControl } from "../rich-newsletter/assets/AssetReplaceControl";

export function SavedBlockFields({
  block,
  onSave,
}: {
  block: NewsletterBlock;
  onSave: (block: NewsletterBlock) => void;
}) {
  const [text, setText] = useState(block.text);
  const [href, setHref] = useState(block.href ?? "");
  const image = block.kind === "image" || block.kind === "logo";
  const validHref =
    !href ||
    Boolean(safeNewsletterHref(href) && (!image || /^https?:/i.test(href)));
  return (
    <>
      <ActionButton
        primary
        disabled={!validHref}
        onClick={() => onSave({ ...block, text, href: href || undefined })}
      >
        Apply content
      </ActionButton>
      <div className={styles.form}>
        <Field
          label={
            ["image", "logo"].includes(block.kind)
              ? "Alternative text"
              : "Content"
          }
          htmlFor="newsletter-block-text"
        >
          <TextArea
            id="newsletter-block-text"
            value={text}
            maxLength={20000}
            onChange={(event) => setText(event.target.value)}
          />
        </Field>
        {["button", "image", "logo", "social"].includes(block.kind) && (
          <Field
            label="Link or image URL"
            htmlFor="newsletter-block-url"
            error={
              !validHref
                ? image
                  ? "Use an http or https image URL."
                  : "Use an http, https or mailto URL."
                : undefined
            }
          >
            <TextInput
              id="newsletter-block-url"
              value={href}
              maxLength={2048}
              onChange={(event) => setHref(event.target.value)}
            />
          </Field>
        )}
        {image && (
          <AssetReplaceControl
            blockId={block.id}
            onInsert={(asset) => setHref(asset.url)}
          />
        )}
      </div>
    </>
  );
}
