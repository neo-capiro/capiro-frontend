"use client";
import { useId, useState } from "react";
import {
  newsletterVideoSource,
  parseNewsletterVideoThumbnail,
  type NewsletterBlock,
  type NewsletterVideoThumbnail,
} from "@capiro/shared/newsletter";
import {
  ActionButton,
  Field,
  Panel,
  TextInput,
} from "../../../../../shared/module-ui";
import { useCapiroMutation } from "../../../../../shared/capiro/queries";
import { useProviderProposal } from "./use-provider-proposal";
import { ProviderDialog, ProviderNotice } from "./ProviderDialog";
import styles from "../assets/assets.module.css";

export function VideoThumbnailTool({
  documentId,
  block,
  update,
}: {
  documentId: string;
  block: NewsletterBlock;
  update: (change: Partial<NewsletterBlock>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(block.url || block.video?.sourceUrl || "");
  const id = useId();
  const source = newsletterVideoSource(url);
  const mutation = useCapiroMutation("workspace.richNewsletter.videoThumbnail");
  const proposal = useProviderProposal<NewsletterVideoThumbnail>(
    JSON.stringify([
      documentId,
      block.id,
      block.url,
      block.imageUrl,
      block.video,
      url,
    ]),
  );
  const generate = () => {
    if (!source) return;
    void proposal.run(async () => {
      const result = parseNewsletterVideoThumbnail(
        await mutation.run({ params: { id: documentId }, body: { url } }),
        { sourceUrl: source.url, provider: source.provider },
      );
      if (!result.ok)
        throw new Error("The video source did not match the request.");
      return result.value;
    });
  };
  return (
    <>
      <ActionButton
        onClick={() => {
          if (!proposal.blocked && !proposal.result)
            setUrl(block.url || block.video?.sourceUrl || "");
          setOpen(true);
        }}
      >
        Video URL and thumbnail
      </ActionButton>
      <ProviderDialog
        open={open}
        close={() => setOpen(false)}
        title="Video URL"
        description="Add the video your readers can open."
        footer={
          proposal.result ? (
            <ActionButton
              primary
              onClick={() => {
                if (
                  proposal.useResult((result) =>
                    update({
                      url: result.sourceUrl,
                      imageUrl: result.imageUrl,
                      video: {
                        ...block.video,
                        sourceUrl: result.sourceUrl,
                        thumbnail: "auto",
                      },
                    }),
                  )
                )
                  setOpen(false);
              }}
            >
              Use video thumbnail
            </ActionButton>
          ) : (
            <ActionButton
              primary
              disabled={!source || proposal.blocked}
              onClick={generate}
            >
              Create thumbnail
            </ActionButton>
          )
        }
      >
        <ProviderNotice phase={proposal.phase} reason={proposal.reason} />
        <div className={styles.panel}>
          <Panel
            title={proposal.result ? "Proposed video thumbnail" : "Video link"}
          >
            <div className={styles.fields}>
              {proposal.result ? (
                <>
                  <Field label="Video title" htmlFor={`${id}-title`}>
                    <output id={`${id}-title`} className={styles.value}>
                      {proposal.result.title || "No title supplied"}
                    </output>
                  </Field>
                  <Field label="Video source" htmlFor={`${id}-source`}>
                    <output id={`${id}-source`} className={styles.value}>
                      {proposal.result.sourceUrl}
                    </output>
                  </Field>
                  <p>
                    A thumbnail was saved to your image library. Use video
                    thumbnail changes this block’s video link and image;
                    existing alternative text is retained.
                  </p>
                  <ActionButton onClick={proposal.discard}>
                    Review another URL
                  </ActionButton>
                </>
              ) : (
                <>
                  <Field
                    label="Video URL"
                    htmlFor={id}
                    description="YouTube or Vimeo. You can still enter a custom image and link in the block controls."
                  >
                    <TextInput
                      id={id}
                      type="url"
                      maxLength={2048}
                      value={url}
                      disabled={proposal.blocked}
                      onChange={(event) => setUrl(event.target.value)}
                    />
                  </Field>
                  <p>
                    Create thumbnail retrieves video metadata and saves a
                    thumbnail to your image library. Your newsletter changes
                    only after you review and use the result.
                  </p>
                  {url && !source && (
                    <p role="alert">Enter a supported YouTube or Vimeo URL.</p>
                  )}
                </>
              )}
            </div>
          </Panel>
        </div>
      </ProviderDialog>
    </>
  );
}
