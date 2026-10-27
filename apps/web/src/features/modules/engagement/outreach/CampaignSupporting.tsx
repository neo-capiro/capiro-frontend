"use client";
import { useEffect, useRef, useState } from "react";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import { uploadCapiroAttachment } from "../../../../shared/capiro/uploads";
import type { OutreachCampaignState } from "../../../../shared/capiro/operations/outreach-campaign-schemas";
import {
  ActionButton,
  Field,
  Panel,
  StatusPanel,
  TextArea,
  TextInput,
} from "../../../../shared/module-ui";
import styles from "./outreach-workflow.module.css";
export function CampaignSupporting({
  state,
  update,
  disabled,
}: {
  state: OutreachCampaignState;
  update: (patch: Partial<OutreachCampaignState>) => void;
  disabled: boolean;
}) {
  const api = useCapiro();
  const lifetime = useRef(new AbortController());
  useEffect(() => {
    const abort = new AbortController();
    lifetime.current = abort;
    return () => abort.abort();
  }, [state.clientId]);
  const attachments = useCapiroQuery("engagement.campaign.attachments", {
    query: state.clientId ? { clientId: state.clientId } : { unlinked: "true" },
  });
  const [uploading, setUploading] = useState(false),
    [uploadError, setUploadError] = useState<string>();
  const [sample, setSample] = useState(""),
    [sampleName, setSampleName] = useState("");
  const upload = async (file: File) => {
    const signal = lifetime.current.signal;
    setUploading(true);
    setUploadError(undefined);
    try {
      const metadata = {
        ...(state.clientId ? { clientId: state.clientId } : {}),
        fileName: file.name,
        contentType: file.type,
      };
      const ticket = await api.request(
        "strategies.context.file.ticket",
        { body: { ...metadata, contentLength: file.size } },
        { signal },
      );
      await uploadCapiroAttachment(ticket, file, { signal });
      const saved = await api.request(
        "engagement.campaign.attachment.confirm",
        { body: { ...metadata, s3Key: ticket.s3Key, source: "outreach" } },
        { signal },
      );
      signal.throwIfAborted();
      if (saved.clientId !== state.clientId || saved.fileName !== file.name)
        throw new Error("The uploaded file did not match this campaign.");
      update({ attachmentIds: [...state.attachmentIds, saved.id] });
      attachments.reload();
    } catch (caught) {
      if (!signal.aborted)
        setUploadError(
          caught instanceof Error
            ? caught.message
            : "Upload could not be confirmed. Check the file list before uploading again.",
        );
    } finally {
      if (!signal.aborted) setUploading(false);
    }
  };
  return (
    <div className={styles.grid}>
      <Panel
        title="Attachments"
        description="Select client files or upload an attachment. Files are checked before sending."
      >
        <div className={styles.fields}>
          <StatusPanel
            loading={attachments.loading}
            error={attachments.error}
            onRetry={attachments.reload}
          />
          {(attachments.data ?? []).map((file) => (
            <label className={styles.choice} key={file.id}>
              <span>
                {file.fileName}
                <small> · {file.scanStatus}</small>
              </span>
              <input
                type="checkbox"
                disabled={
                  disabled ||
                  uploading ||
                  (!state.attachmentIds.includes(file.id) &&
                    state.attachmentIds.length >= 25)
                }
                checked={state.attachmentIds.includes(file.id)}
                onChange={(event) =>
                  update({
                    attachmentIds: event.target.checked
                      ? [...state.attachmentIds, file.id]
                      : state.attachmentIds.filter((id) => id !== file.id),
                  })
                }
              />
            </label>
          ))}
          {state.attachmentIds
            .filter((id) => !attachments.data?.some((file) => file.id === id))
            .map((id) => (
              <div key={id} className={styles.choice}>
                <span>
                  Previously selected attachment · details unavailable
                </span>
                <ActionButton
                  disabled={disabled}
                  onClick={() =>
                    update({
                      attachmentIds: state.attachmentIds.filter(
                        (item) => item !== id,
                      ),
                    })
                  }
                >
                  Remove
                </ActionButton>
              </div>
            ))}
          <Field label="Upload a file" htmlFor="outreach-attachment">
            <input
              id="outreach-attachment"
              type="file"
              disabled={
                disabled || uploading || state.attachmentIds.length >= 25
              }
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
                event.target.value = "";
              }}
            />
          </Field>
          {uploading && <p role="status">Uploading attachment…</p>}
          {uploadError && <p role="alert">{uploadError}</p>}
          <p className={styles.hint}>
            Up to 25 attachments, 25 MiB per file. An attachment does not
            automatically become a generation source.
          </p>
        </div>
      </Panel>
      <Panel
        title="Writing samples"
        description="Optional examples guide style. They do not become factual evidence."
      >
        <div className={styles.fields}>
          {state.styleSamples.map((row, index) => (
            <div className={styles.selected} key={row.sampleKey}>
              <strong>{row.label || "Writing sample"}</strong>
              <p className={styles.previewText}>{row.body}</p>
              <ActionButton
                disabled={disabled}
                onClick={() =>
                  update({
                    styleSamples: state.styleSamples.filter(
                      (_, i) => i !== index,
                    ),
                  })
                }
              >
                Remove sample
              </ActionButton>
            </div>
          ))}
          <Field label="Sample name" htmlFor="sample-name">
            <TextInput
              id="sample-name"
              value={sampleName}
              maxLength={240}
              onChange={(event) => setSampleName(event.target.value)}
            />
          </Field>
          <Field label="Example email" htmlFor="sample-body">
            <TextArea
              id="sample-body"
              rows={4}
              maxLength={12000}
              value={sample}
              onChange={(event) => setSample(event.target.value)}
            />
          </Field>
          <ActionButton
            disabled={
              disabled || !sample.trim() || state.styleSamples.length >= 10
            }
            onClick={() => {
              update({
                styleSamples: [
                  ...state.styleSamples,
                  {
                    sampleKey: crypto.randomUUID(),
                    label: sampleName || null,
                    subject: null,
                    body: sample,
                  },
                ],
              });
              setSample("");
              setSampleName("");
            }}
          >
            Add writing sample
          </ActionButton>
        </div>
      </Panel>
    </div>
  );
}
