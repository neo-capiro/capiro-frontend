"use client";

import { useState } from "react";
import type {
  NewsletterBlock,
  NewsletterBody,
} from "../../../../shared/capiro/operations/workspace-documents";
import {
  ActionButton,
  Field,
  Modal,
  TextArea,
  TextInput,
} from "../../../../shared/module-ui";
import styles from "../workspace.module.css";
import { safeNewsletterHref } from "./newsletter-model";

function RenderBlock({ block }: { block: NewsletterBlock }) {
  if (block.kind === "heading")
    return <h2 style={{ whiteSpace: "pre-line" }}>{block.text}</h2>;
  if (block.kind === "divider") return <hr />;
  if (block.kind === "spacer") return <div style={{ height: 24 }} />;
  if (block.kind === "button")
    return safeNewsletterHref(block.href ?? "") ? (
      <a href={safeNewsletterHref(block.href ?? "")} className={styles.link}>
        {block.text}
      </a>
    ) : (
      <strong>{block.text}</strong>
    );
  if (block.kind === "image" || block.kind === "logo")
    return safeNewsletterHref(block.href ?? "") ? (
      <img
        src={safeNewsletterHref(block.href ?? "")}
        alt={block.text}
        style={{ maxWidth: "100%", height: "auto" }}
      />
    ) : (
      <p>Image source needed · {block.text}</p>
    );
  if (block.kind === "code")
    return (
      <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
        {block.text}
      </pre>
    );
  return <p style={{ whiteSpace: "pre-line" }}>{block.text}</p>;
}

function BlockEditor({
  block,
  onSave,
  onClose,
}: {
  block: NewsletterBlock;
  onSave: (block: NewsletterBlock) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(block.text);
  const [href, setHref] = useState(block.href ?? "");
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={`Edit ${block.kind} block`}
      footer={
        <>
          <ActionButton onClick={onClose}>Cancel</ActionButton>
          <ActionButton
            primary
            disabled={Boolean(href) && !safeNewsletterHref(href)}
            onClick={() => {
              onSave({ ...block, text, href: href || undefined });
              onClose();
            }}
          >
            Save block
          </ActionButton>
        </>
      }
    >
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
              href && !safeNewsletterHref(href)
                ? "Use an http, https or mailto URL."
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
      </div>
    </Modal>
  );
}

export function NewsletterPaper({
  body,
  mobile,
  editable,
  onChange,
}: {
  body: NewsletterBody;
  mobile?: boolean;
  editable?: boolean;
  onChange?: (body: NewsletterBody) => void;
}) {
  const [selected, setSelected] = useState<NewsletterBlock>();
  function move(index: number, offset: number) {
    const next = [...body.blocks];
    const position = index + offset;
    if (position < 0 || position >= next.length) return;
    const current = next[index]!;
    next[index] = next[position]!;
    next[position] = current;
    onChange?.({ ...body, blocks: next });
  }
  return (
    <article
      className={`${styles.newsletterPaper} ${mobile ? styles.mobile : ""}`}
    >
      <p style={{ color: "#0a0a0a", fontSize: 11 }}>
        {body.firmName || "CLIENT UPDATE"}
      </p>
      <p style={{ fontSize: 10, letterSpacing: ".1em" }}>
        WEEKLY POLICY BRIEF / {new Date().toLocaleDateString()}
      </p>
      {body.blocks.map((block, index) => (
        <section key={block.id} className={styles.newsletterBlock}>
          <RenderBlock block={block} />
          {editable && (
            <div className={styles.actions}>
              <ActionButton onClick={() => setSelected(block)}>
                Edit
              </ActionButton>
              <ActionButton
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                ↑
              </ActionButton>
              <ActionButton
                disabled={index === body.blocks.length - 1}
                onClick={() => move(index, 1)}
              >
                ↓
              </ActionButton>
              <ActionButton
                onClick={() =>
                  onChange?.({
                    ...body,
                    blocks: body.blocks.filter(
                      (value) => value.id !== block.id,
                    ),
                  })
                }
              >
                Remove
              </ActionButton>
            </div>
          )}
        </section>
      ))}
      <p style={{ fontSize: 10 }}>
        {body.firmName}
        {body.mailingAddress ? ` · ${body.mailingAddress}` : ""}
      </p>
      {selected && (
        <BlockEditor
          block={selected}
          onClose={() => setSelected(undefined)}
          onSave={(block) =>
            onChange?.({
              ...body,
              blocks: body.blocks.map((value) =>
                value.id === block.id ? block : value,
              ),
            })
          }
        />
      )}
    </article>
  );
}
