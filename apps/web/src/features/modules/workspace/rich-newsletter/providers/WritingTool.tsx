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
import styles from "../assets/assets.module.css";
import toolStyles from "./provider-tools.module.css";

export function WritingTool({
  documentId,
  block,
  update,
  presets,
  proposalScope,
  usageDescription = "Use text replaces this block’s text and formatting. You can Undo the change before saving.",
}: {
  documentId: string;
  block: NewsletterBlock;
  update: (change: Partial<NewsletterBlock>) => void;
  presets?: readonly { label: string; prompt: string }[];
  proposalScope?: string;
  usageDescription?: string;
}) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState(block.text);
  const [prompt, setPrompt] = useState("");
  const id = useId();
  const capabilities = useCapiroQuery(
    "workspace.richNewsletter.capabilities",
    {},
    { enabled: open },
  );
  const mutation = useCapiroMutation("workspace.richNewsletter.write");
  const proposal = useProviderProposal<NewsletterTextProposal>(
    JSON.stringify([
      documentId,
      block.id,
      block.kind,
      block.text,
      block.html,
      source,
      prompt,
      proposalScope,
    ]),
  );
  const capability = capabilities.data?.ai;
  const close = () => setOpen(false);
  const generate = () => {
    if (!source.trim() || !prompt.trim() || !capability?.available) return;
    void proposal.run(() =>
      mutation.run({
        params: { id: documentId },
        body: { text: source, prompt, kind: block.kind },
      }),
    );
  };
  return (
    <>
      {presets ? (
        presets.map((preset) => (
          <ActionButton
            key={preset.label}
            disabled={proposal.blocked}
            onClick={() => {
              setPrompt(preset.prompt);
              setOpen(true);
            }}
          >
            {preset.label}
          </ActionButton>
        ))
      ) : (
        <ActionButton onClick={() => setOpen(true)}>Write with AI</ActionButton>
      )}
      <ProviderDialog
        open={open}
        close={close}
        title={proposal.result ? "Review the draft" : "Write with AI"}
        description={
          proposal.result
            ? "Check the wording and sources before using it."
            : "Build a concise update from your source text."
        }
        footer={
          proposal.result ? (
            <ActionButton
              primary
              onClick={() => {
                if (
                  proposal.useResult((result) =>
                    update({ text: result.text, html: "" }),
                  )
                )
                  close();
              }}
            >
              Use text
            </ActionButton>
          ) : (
            <ActionButton
              primary
              disabled={
                !capability?.available ||
                proposal.blocked ||
                !source.trim() ||
                !prompt.trim()
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
          <Panel
            title={proposal.result ? "Draft text" : "Your source material"}
          >
            {proposal.result ? (
              <div className={styles.fields}>
                <Field label="Proposed text" htmlFor={`${id}-result`}>
                  <TextArea
                    id={`${id}-result`}
                    value={proposal.result.text}
                    readOnly
                  />
                </Field>
                <p>{usageDescription}</p>
                <ActionButton onClick={proposal.discard}>
                  Edit instructions
                </ActionButton>
              </div>
            ) : (
              <fieldset disabled={proposal.blocked} className={toolStyles.form}>
                <Field
                  label="Source text and source URLs"
                  htmlFor={`${id}-source`}
                  description="Only supplied text is used. URLs are included as text; this tool does not retrieve their pages."
                >
                  <TextArea
                    id={`${id}-source`}
                    maxLength={30_000}
                    value={source}
                    onChange={(event) => setSource(event.target.value)}
                  />
                </Field>
                <Field label="Instructions" htmlFor={`${id}-prompt`}>
                  <TextArea
                    id={`${id}-prompt`}
                    maxLength={4000}
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                  />
                </Field>
                <p>
                  The connected writing provider receives this source text and
                  your instructions. Generating may use your provider balance.
                </p>
              </fieldset>
            )}
          </Panel>
        </div>
      </ProviderDialog>
    </>
  );
}
