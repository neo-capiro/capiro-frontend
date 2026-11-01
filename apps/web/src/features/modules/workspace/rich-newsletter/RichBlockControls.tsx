"use client";
import { useState } from "react";
import {
  NEWSLETTER_BLOCK_LABELS,
  type NewsletterBlock,
  type NewsletterDesign,
} from "@capiro/shared/newsletter";
import { ActionButton, Field, TextArea } from "../../../../shared/module-ui";
import { BlockProviderTools } from "./providers/BlockProviderTools";
import { RichText } from "./RichText";
import { AssetReplaceControl } from "./assets/AssetReplaceControl";
import { Entry, Choice, NumberEntry, Toggle } from "./content/Fields";
import { BlockStyles } from "./content/StyleFields";
import { BlockPlacement } from "./content/BlockPlacement";
import { SocialControls } from "./content/SocialControls";
import {
  AppControls,
  ProductControls,
  VideoControls,
} from "./content/ManualContent";
import type { StructureAction } from "./content/structure";
import styles from "./content/content.module.css";
import ui from "./library/sections.module.css";
import workspace from "./workspace.module.css";

export function RichBlockControls({
  block,
  documentId,
  design,
  structure,
  update,
  remove,
}: {
  block: NewsletterBlock;
  documentId?: string;
  design: NewsletterDesign;
  structure: (action: StructureAction) => void;
  update: (change: Partial<NewsletterBlock>) => void;
  remove: () => void;
}) {
  const [tab, setTab] = useState("Content");
  const text = ["heading", "paragraph"].includes(block.kind);
  const image = ["image", "logo"].includes(block.kind);
  return (
    <section className={styles.panel} aria-label="Selected block">
      <h2>
        {["product", "product-rec"].includes(block.kind)
          ? "Product cards"
          : NEWSLETTER_BLOCK_LABELS[block.kind]}
      </h2>
      <div className={workspace.tabs} aria-label="Block settings view">
        {["Content", "Styles"].map((name) => (
          <button
            key={name}
            aria-pressed={tab === name}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>
      {tab === "Styles" ? (
        <BlockStyles block={block} update={update} />
      ) : (
        <>
          <div className={ui.fields}>
            {text && (
              <RichText
                key={block.id}
                html={block.html}
                text={block.text}
                onChange={(html, text) => update({ html, text })}
              />
            )}
            {block.kind === "heading" && (
              <Choice
                label="Heading level"
                value={String(block.headingLevel)}
                values={["1", "2", "3", "4"]}
                change={(level) =>
                  update({
                    headingLevel: Number(
                      level,
                    ) as NewsletterBlock["headingLevel"],
                  })
                }
              />
            )}
            {["button", "logo"].includes(block.kind) && (
              <Entry
                label="Block text"
                value={block.text}
                maxLength={200000}
                change={(text) => update({ text })}
              />
            )}
            {block.kind === "code" && (
              <Field label="HTML content" htmlFor="rich-html">
                <TextArea
                  id="rich-html"
                  value={block.html}
                  maxLength={200000}
                  onChange={(event) => update({ html: event.target.value })}
                />
              </Field>
            )}
            {image && (
              <>
                <Entry
                  label="Image URL"
                  value={block.imageUrl}
                  change={(imageUrl) => update({ imageUrl })}
                />
                <Entry
                  label="Alternative text"
                  value={block.alt}
                  maxLength={1000}
                  change={(alt) => update({ alt })}
                />
                <AssetReplaceControl
                  blockId={block.id}
                  onInsert={(asset) => update({ imageUrl: asset.url })}
                />
                <Choice
                  label="Image size"
                  value={block.imageSize}
                  values={["original", "fill", "scale"]}
                  change={(imageSize) =>
                    update({
                      imageSize: imageSize as NewsletterBlock["imageSize"],
                    })
                  }
                />
                {block.imageSize === "scale" && (
                  <NumberEntry
                    label="Image scale"
                    value={block.imageScale}
                    min={1}
                    max={100}
                    change={(imageScale) => {
                      if (imageScale !== undefined) update({ imageScale });
                    }}
                  />
                )}
              </>
            )}
            {["button", "image", "logo"].includes(block.kind) && (
              <>
                <Entry
                  label="Link URL"
                  value={block.url}
                  change={(url) => update({ url })}
                />
                <Choice
                  label="Link type"
                  value={block.linkType}
                  values={["web", "email", "phone", "file", "anchor"]}
                  change={(linkType) =>
                    update({
                      linkType: linkType as NewsletterBlock["linkType"],
                    })
                  }
                />
                <Toggle
                  label="Open in new tab"
                  checked={block.openNewTab}
                  change={(openNewTab) => update({ openNewTab })}
                />
              </>
            )}
            {block.kind === "social" && (
              <SocialControls block={block} update={update} />
            )}
            {block.kind === "video" && (
              <VideoControls block={block} update={update} />
            )}
            {block.kind === "apps" && (
              <AppControls block={block} update={update} />
            )}
            {["product", "product-rec"].includes(block.kind) && (
              <ProductControls block={block} update={update} />
            )}
            {["apps", "product", "product-rec"].includes(block.kind) && (
              <>
                <Choice
                  label="Content category"
                  value={block.sourceKind}
                  values={[
                    "bill",
                    "news",
                    "tweet",
                    "event",
                    "product",
                    "people",
                  ]}
                  change={(sourceKind) =>
                    update({
                      sourceKind: sourceKind as NewsletterBlock["sourceKind"],
                    })
                  }
                />
                <p>
                  This category is retained metadata. It does not fetch client
                  records or establish permission to use them.
                </p>
              </>
            )}
            {block.kind === "survey" && (
              <p>
                The stored survey definition is retained. Hosted survey
                configuration remains with the survey authoring owner.
              </p>
            )}
            {block.kind === "footer" && (
              <p>
                The footer uses the newsletter’s company, address and permission
                reminder. Existing values remain unchanged.
              </p>
            )}
            <details>
              <summary>Placement</summary>
              <BlockPlacement
                block={block}
                design={design}
                change={structure}
                update={update}
              />
            </details>
          </div>
          <ActionButton className={ui.button} onClick={remove}>
            Remove block
          </ActionButton>
        </>
      )}
      {/* A view-only tab change must not replace pending/unknown proposal owners.
          BlockProviderTools retains its genuine API/document/block scope keys. */}
      <div hidden={tab !== "Content"}>
        <BlockProviderTools
          documentId={documentId}
          block={block}
          update={update}
        />
      </div>
    </section>
  );
}
