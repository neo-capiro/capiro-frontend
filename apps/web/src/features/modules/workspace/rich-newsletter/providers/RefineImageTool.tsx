"use client";
import { useId, useState } from "react";
import { Switch } from "radix-ui";
import {
  parseNewsletterImageRefinement,
  type NewsletterBlock,
  type NewsletterImageRefinement,
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
import { RefinementResult } from "./RefinementResult";
import styles from "../assets/assets.module.css";
import toolStyles from "./provider-tools.module.css";

export function RefineImageTool({
  documentId,
  block,
  update,
}: {
  documentId: string;
  block: NewsletterBlock;
  update: (change: Partial<NewsletterBlock>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState<1 | 4>(1);
  const id = useId();
  const source = useImageSource(block.imageUrl);
  const capabilities = useCapiroQuery(
    "workspace.richNewsletter.capabilities",
    {},
    { enabled: open },
  );
  const mutation = useCapiroMutation("workspace.richNewsletter.refineImage");
  const proposal = useProviderProposal<NewsletterImageRefinement>(
    JSON.stringify([
      documentId,
      block.id,
      block.imageUrl,
      source.version,
      prompt,
      count,
    ]),
  );
  const capability = capabilities.data?.imageAi;
  const generate = () => {
    if (
      !source.ready ||
      source.error ||
      !prompt.trim() ||
      !capability?.available
    )
      return;
    void proposal.run(async () => {
      const result = parseNewsletterImageRefinement(
        await mutation.run(
          {
            params: { id: documentId },
            body: { prompt, count, sourceToken: source.sourceToken },
          },
          source.files,
        ),
        { count },
      );
      if (!result.ok)
        throw new Error("The refinement count did not match the request.");
      return result.value;
    });
  };
  return (
    <>
      <ActionButton onClick={() => setOpen(true)}>Refine with AI</ActionButton>
      <ProviderDialog
        open={open}
        close={() => setOpen(false)}
        title={proposal.result ? "Choose an image" : "Refine with AI"}
        description="Describe how you would like to change the image. Generated variants are saved to your image library."
        footer={
          !proposal.result && (
            <ActionButton
              primary
              disabled={
                !capability?.available ||
                proposal.blocked ||
                !source.ready ||
                !!source.error ||
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
        {proposal.result ? (
          <>
            <RefinementResult
              result={proposal.result}
              insert={(asset) => {
                if (proposal.useResult(() => update({ imageUrl: asset.url })))
                  setOpen(false);
              }}
            />
            <ActionButton onClick={proposal.discard}>
              Edit refinement instructions
            </ActionButton>
          </>
        ) : (
          <div className={styles.panel}>
            <Panel title="Image editing instructions">
              <fieldset disabled={proposal.blocked} className={toolStyles.form}>
                <ImageSourceField source={source} disabled={proposal.blocked} />
                <Field
                  label="Image editing instructions"
                  htmlFor={`${id}-prompt`}
                >
                  <TextArea
                    id={`${id}-prompt`}
                    maxLength={4000}
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                  />
                </Field>
                <label className={toolStyles.toggle} htmlFor={`${id}-multiple`}>
                  Generate multiple images (4)
                  <Switch.Root
                    id={`${id}-multiple`}
                    className={toolStyles.switch}
                    checked={count === 4}
                    onCheckedChange={(checked) => setCount(checked ? 4 : 1)}
                    disabled={proposal.blocked}
                  />
                </label>
                <p>
                  OpenAI receives the image and your instructions. Each
                  generated image uses your OpenAI API balance.
                </p>
              </fieldset>
            </Panel>
          </div>
        )}
      </ProviderDialog>
    </>
  );
}
