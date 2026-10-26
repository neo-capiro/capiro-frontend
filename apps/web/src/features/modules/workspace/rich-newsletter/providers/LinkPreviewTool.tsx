"use client";
import { useId, useState } from "react";
import { Switch } from "radix-ui";
import type {
  NewsletterBlock,
  NewsletterLinkProposal,
  NewsletterLinkPreviewBlock,
} from "@capiro/shared/newsletter";
import {
  ActionButton,
  Field,
  Panel,
  SelectInput,
  TextArea,
  TextInput,
} from "../../../../../shared/module-ui";
import { useCapiroMutation } from "../../../../../shared/capiro/queries";
import { useProviderProposal } from "./use-provider-proposal";
import { ProviderDialog, ProviderNotice } from "./ProviderDialog";
import { ProposalImage } from "./ProposalImage";
import styles from "../assets/assets.module.css";
import toolStyles from "./provider-tools.module.css";

export function LinkPreviewTool({
  documentId,
  block,
  update,
}: {
  documentId: string;
  block: NewsletterBlock;
  update: (change: Partial<NewsletterBlock>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(block.app?.sourceUrl || block.url);
  const id = useId();
  const mutation = useCapiroMutation("workspace.richNewsletter.linkPreview");
  const proposal = useProviderProposal<NewsletterLinkProposal>(
    JSON.stringify([documentId, block.id, block.app, block.url, url]),
  );
  const app: NewsletterLinkPreviewBlock = block.app ?? {
    kind: "link-preview",
    sourceUrl: block.url,
    title: block.text,
    description: "",
    imageUrl: block.imageUrl,
    size: "large",
    showImage: true,
    showDescription: true,
    showBackground: true,
  };
  const edit = (change: Partial<NewsletterLinkPreviewBlock>) =>
    update({ app: { ...app, ...change } });
  return (
    <div className={toolStyles.form}>
      <h3>Link Preview</h3>
      <Field label="Preview source URL" htmlFor={`${id}-current-source`}>
        <TextInput
          id={`${id}-current-source`}
          value={app.sourceUrl}
          maxLength={2048}
          onChange={(event) => edit({ sourceUrl: event.target.value })}
        />
      </Field>
      <Field label="Preview title" htmlFor={`${id}-title`}>
        <TextInput
          id={`${id}-title`}
          value={app.title}
          maxLength={2000}
          onChange={(event) => edit({ title: event.target.value })}
        />
      </Field>
      <Field label="Preview description" htmlFor={`${id}-description`}>
        <TextArea
          id={`${id}-description`}
          value={app.description}
          maxLength={6000}
          onChange={(event) => edit({ description: event.target.value })}
        />
      </Field>
      <Field label="Block size" htmlFor={`${id}-size`}>
        <SelectInput
          id={`${id}-size`}
          value={app.size}
          options={[
            { value: "small", label: "Small" },
            { value: "medium", label: "Medium" },
            { value: "large", label: "Large" },
          ]}
          onValueChange={(value) => {
            if (value === "small" || value === "medium" || value === "large")
              edit({ size: value });
          }}
        />
      </Field>
      {(
        [
          ["showImage", "Show image"],
          ["showDescription", "Show description"],
          ["showBackground", "Show background"],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className={toolStyles.toggle} htmlFor={`${id}-${key}`}>
          {label}
          <Switch.Root
            id={`${id}-${key}`}
            className={toolStyles.switch}
            checked={app[key]}
            onCheckedChange={(checked) => edit({ [key]: checked })}
          />
        </label>
      ))}
      <ActionButton
        onClick={() => {
          if (!proposal.blocked && !proposal.result) setUrl(app.sourceUrl);
          setOpen(true);
        }}
      >
        Update link preview
      </ActionButton>
      <ProviderDialog
        open={open}
        close={() => setOpen(false)}
        title="Website preview"
        description="Review the title, description and destination before using the preview."
        footer={
          proposal.result ? (
            <ActionButton
              primary
              onClick={() => {
                if (
                  proposal.useResult((result) =>
                    edit({
                      sourceUrl: result.sourceUrl,
                      title: result.title,
                      description: result.description,
                      imageUrl: result.imageUrl,
                    }),
                  )
                )
                  setOpen(false);
              }}
            >
              Use link preview
            </ActionButton>
          ) : (
            <ActionButton
              primary
              disabled={!url.trim() || proposal.blocked}
              onClick={() => {
                if (url.trim())
                  void proposal.run(() =>
                    mutation.run({ params: { id: documentId }, body: { url } }),
                  );
              }}
            >
              Load preview
            </ActionButton>
          )
        }
      >
        <ProviderNotice phase={proposal.phase} reason={proposal.reason} />
        <div className={styles.panel}>
          <Panel title={proposal.result ? "Proposed preview" : "Source URL"}>
            <div className={styles.fields}>
              {proposal.result ? (
                <>
                  {proposal.result.imageUrl && (
                    <ProposalImage
                      url={proposal.result.imageUrl}
                      label="Proposed link preview image"
                    />
                  )}
                  <Field label="Final destination" htmlFor={`${id}-final`}>
                    <output id={`${id}-final`} className={styles.value}>
                      {proposal.result.sourceUrl}
                    </output>
                  </Field>
                  <Field label="Proposed title" htmlFor={`${id}-result-title`}>
                    <output id={`${id}-result-title`} className={styles.value}>
                      {proposal.result.title || "No title supplied"}
                    </output>
                  </Field>
                  <Field
                    label="Proposed description"
                    htmlFor={`${id}-result-description`}
                  >
                    <output
                      id={`${id}-result-description`}
                      className={`${styles.value} ${toolStyles.proposal}`}
                    >
                      {proposal.result.description || "No description supplied"}
                    </output>
                  </Field>
                  {proposal.result.warnings.map((warning, index) => (
                    <p role="status" key={index}>
                      {warning}
                    </p>
                  ))}
                  <p>
                    {proposal.result.imageUrl
                      ? "A preview image was saved to your image library."
                      : "This preview has no image."}{" "}
                    The final destination may differ after redirects.
                  </p>
                  <ActionButton onClick={proposal.discard}>
                    Review another URL
                  </ActionButton>
                </>
              ) : (
                <>
                  <Field label="Source URL" htmlFor={`${id}-source`}>
                    <TextInput
                      id={`${id}-source`}
                      type="url"
                      maxLength={2048}
                      value={url}
                      disabled={proposal.blocked}
                      onChange={(event) => setUrl(event.target.value)}
                    />
                  </Field>
                  <p>
                    Load preview retrieves the public page and may save its
                    image to your library. It does not change this newsletter
                    until you use the proposed result.
                  </p>
                </>
              )}
            </div>
          </Panel>
        </div>
      </ProviderDialog>
    </div>
  );
}
