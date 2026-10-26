"use client";
import { useId, useState } from "react";
import type {
  NewsletterBlock,
  NewsletterTextProposal,
} from "@capiro/shared/newsletter";
import {
  ActionButton,
  Field,
  Panel,
  TextArea,
} from "../../../../../shared/module-ui";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import { useProviderProposal } from "./use-provider-proposal";
import {
  ProviderAvailability,
  ProviderDialog,
  ProviderNotice,
} from "./ProviderDialog";
import { ImageSourceField, useImageSource } from "./image-source";
import styles from "../assets/assets.module.css";
import toolStyles from "./provider-tools.module.css";

export function AltTextTool({
  documentId,
  block,
  update,
}: {
  documentId: string;
  block: NewsletterBlock;
  update: (change: Partial<NewsletterBlock>) => void;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const source = useImageSource(block.imageUrl);
  const capabilities = useCapiroQuery(
    "workspace.richNewsletter.capabilities",
    {},
    { enabled: open },
  );
  const mutation = useCapiroMutation("workspace.richNewsletter.altText");
  const proposal = useProviderProposal<NewsletterTextProposal>(
    JSON.stringify([
      documentId,
      block.id,
      block.imageUrl,
      block.alt,
      source.version,
    ]),
  );
  const capability = capabilities.data?.altTextAi;
  const generate = () => {
    if (!source.ready || source.error || !capability?.available) return;
    void proposal.run(() =>
      mutation.run(
        {
          params: { id: documentId },
          body: { sourceToken: source.sourceToken },
        },
        source.files,
      ),
    );
  };
  return (
    <>
      <ActionButton onClick={() => setOpen(true)}>
        Generate alt text
      </ActionButton>
      <ProviderDialog
        open={open}
        close={() => setOpen(false)}
        title="Alt text"
        description="Review the description before replacing the block’s alternative text."
        footer={
          proposal.result ? (
            <ActionButton
              primary
              onClick={() => {
                if (
                  proposal.useResult((result) => update({ alt: result.text }))
                )
                  setOpen(false);
              }}
            >
              Use alt text
            </ActionButton>
          ) : (
            <ActionButton
              primary
              disabled={
                !capability?.available ||
                proposal.blocked ||
                !source.ready ||
                !!source.error
              }
              onClick={generate}
            >
              Generate
            </ActionButton>
          )
        }
      >
        <ProviderNotice phase={proposal.phase} reason={proposal.reason} />
        <ProviderAvailability
          loading={capabilities.loading}
          available={capability?.available}
          reason={capability?.reason}
          retry={capabilities.reload}
        />
        <div className={styles.panel}>
          <Panel title={proposal.result ? "Proposed alt text" : "Image source"}>
            {proposal.result ? (
              <div className={styles.fields}>
                <Field label="Proposed alt text" htmlFor={id}>
                  <TextArea id={id} readOnly value={proposal.result.text} />
                </Field>
                <p>The image, link and style are retained.</p>
                <ActionButton onClick={proposal.discard}>
                  Review source again
                </ActionButton>
              </div>
            ) : (
              <div className={toolStyles.form}>
                <ImageSourceField source={source} disabled={proposal.blocked} />
                <p>
                  OpenAI receives this image. Generating a description uses your
                  OpenAI API balance.
                </p>
              </div>
            )}
          </Panel>
        </div>
      </ProviderDialog>
    </>
  );
}
