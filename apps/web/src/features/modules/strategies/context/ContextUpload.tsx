"use client";

import {
  ActionButton,
  DataTable,
  Field,
  Modal,
  Panel,
  SelectInput,
} from "../../../../shared/module-ui";
import styles from "../strategies.module.css";
import { useContextImport } from "./use-context-import";

export function ContextUpload({
  clientId: initialClient,
  onClose,
  onSaved,
}: {
  clientId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const {
    lifetime,
    clients,
    strategies,
    clientId,
    setClientId,
    strategyId,
    setStrategyId,
    files,
    setFiles,
    reviews,
    setReviews,
    busy,
    error,
    warnings,
    discard,
    setDiscard,
    addFiles,
    readFiles,
    save,
    hasReview,
  } = useContextImport(initialClient, onSaved);
  return (
    <>
      <Modal
        open
        onOpenChange={(open) => {
          if (!open && !busy) setDiscard(true);
        }}
        title={hasReview ? "Review what Meri found" : "Upload context"}
        description="1 · Choose files → 2 · Review supported information"
        footer={
          <>
            <ActionButton disabled={busy} onClick={() => setDiscard(true)}>
              Cancel
            </ActionButton>
            <ActionButton
              primary
              disabled={busy || !clientId || !files.length}
              onClick={hasReview ? save : readFiles}
            >
              {busy
                ? "Working…"
                : hasReview
                  ? "Save selected information"
                  : "Read files"}
            </ActionButton>
            {hasReview &&
              files.some((row) => row.state === "Needs attention") && (
                <ActionButton disabled={busy} onClick={readFiles}>
                  Retry remaining files
                </ActionButton>
              )}
          </>
        }
      >
        <div className={styles.form}>
          <Panel title="Client and strategy scope">
            <div className={styles.grid}>
              <Field label="Client *" htmlFor="context-upload-client">
                <SelectInput
                  id="context-upload-client"
                  disabled={busy || files.some((row) => row.attachmentId)}
                  value={clientId}
                  onValueChange={(value) => {
                    setClientId(value);
                    setStrategyId("");
                  }}
                  options={[
                    { value: "", label: "Choose client" },
                    ...(clients.data ?? []).map((client) => ({
                      value: client.id,
                      label: client.name,
                    })),
                  ]}
                />
              </Field>
              <Field label="Strategy scope" htmlFor="context-upload-strategy">
                <SelectInput
                  id="context-upload-strategy"
                  disabled={busy || reviews.length > 0}
                  value={strategyId}
                  onValueChange={setStrategyId}
                  options={[
                    { value: "", label: "All strategies for this client" },
                    ...(strategies.data ?? [])
                      .filter((strategy) => strategy.clientId === clientId)
                      .map((strategy) => ({
                        value: strategy.id,
                        label: strategy.title,
                      })),
                  ]}
                />
              </Field>
            </div>
          </Panel>
          {!hasReview && (
            <Panel
              title="Add source files"
              description="Up to 10 files · 25 MiB per file · PDF, DOC(X), PPT(X), XLS(X), CSV, TXT, MD, JSON, PNG and JPG"
            >
              <input
                aria-label="Choose context source files"
                type="file"
                multiple
                disabled={busy}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.md,.json,.png,.jpg,.jpeg"
                onChange={(event) => addFiles(event.target.files)}
              />
            </Panel>
          )}
          <Panel title="Selected files">
            <DataTable
              rows={files}
              rowKey={(row) => row.key}
              caption="Context import source files"
              columns={[
                { key: "file", label: "FILE", render: (row) => row.file.name },
                {
                  key: "size",
                  label: "SIZE",
                  render: (row) => `${(row.file.size / 1024).toFixed(0)} KB`,
                },
                {
                  key: "status",
                  label: "STATUS",
                  render: (row) => (
                    <span>
                      {row.state}
                      <span className={styles.secondary}>{row.error}</span>
                    </span>
                  ),
                },
                {
                  key: "remove",
                  label: "ACTION",
                  render: (row) => (
                    <ActionButton
                      disabled={busy || Boolean(row.attachmentId)}
                      onClick={() =>
                        setFiles((previous) =>
                          previous.filter((value) => value.key !== row.key),
                        )
                      }
                    >
                      Remove
                    </ActionButton>
                  ),
                },
              ]}
            />
          </Panel>
          {reviews.map((review) => (
            <Panel
              key={review.key}
              title={review.analysis.source.fileName}
              description={
                review.saved
                  ? "Saved to context library"
                  : "Select the information to keep"
              }
            >
              {review.analysis.documents.map((document) => (
                <article key={document.id}>
                  <label className={styles.check}>
                    <input
                      type="checkbox"
                      disabled={busy || review.saved}
                      checked={review.selected.includes(document.id)}
                      onChange={(event) =>
                        setReviews((previous) =>
                          previous.map((value) =>
                            value.key === review.key
                              ? {
                                  ...value,
                                  selected: event.target.checked
                                    ? [...value.selected, document.id]
                                    : value.selected.filter(
                                        (id) => id !== document.id,
                                      ),
                                }
                              : value,
                          ),
                        )
                      }
                    />
                    <strong>{document.title}</strong>
                  </label>
                  {document.sections.map((section, index) => (
                    <details key={index}>
                      <summary>{section.heading}</summary>
                      <p>{section.content}</p>
                      {section.evidence.map((evidence, position) => (
                        <blockquote key={position}>
                          {evidence.quote}
                          <span className={styles.secondary}>
                            {evidence.sourceRef}
                          </span>
                        </blockquote>
                      ))}
                    </details>
                  ))}
                </article>
              ))}
            </Panel>
          ))}
          {warnings.map((warning, index) => (
            <p className={styles.notice} key={index}>
              {warning}
            </p>
          ))}
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
        </div>
      </Modal>
      <Modal
        open={discard}
        onOpenChange={setDiscard}
        title="Leave this context import?"
        description="Only information already acknowledged as saved remains in the library."
        footer={
          <>
            <ActionButton onClick={() => setDiscard(false)}>
              Keep reviewing
            </ActionButton>
            <ActionButton
              primary
              onClick={() => {
                lifetime.current.abort();
                onClose();
              }}
            >
              Leave import
            </ActionButton>
          </>
        }
      >
        <p>
          Selected source uploads remain attached to this client. Unsaved review
          selections are not imported.
        </p>
      </Modal>
    </>
  );
}
