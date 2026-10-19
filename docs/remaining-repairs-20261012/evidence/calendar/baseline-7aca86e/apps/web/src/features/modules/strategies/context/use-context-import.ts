"use client";
import { useEffect, useRef, useState } from "react";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import type { ContextImportAnalysis } from "../../../../shared/capiro/operations/strategies-imports";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import { uploadCapiroAttachment } from "../../../../shared/capiro/uploads";
type FileRow = {
  key: string;
  file: File;
  attachmentId?: string;
  state: string;
  error?: string;
};
type Review = {
  key: string;
  analysis: ContextImportAnalysis;
  selected: string[];
  saved?: boolean;
};
const mimeByExtension: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  tsv: "text/tab-separated-values",
  txt: "text/plain",
  md: "text/markdown",
  json: "application/json",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};
function normalizedFile(file: File) {
  const type =
    file.type ||
    mimeByExtension[file.name.split(".").at(-1)?.toLowerCase() ?? ""];
  return type && type !== file.type
    ? new File([file], file.name, { type, lastModified: file.lastModified })
    : file;
}

export function useContextImport(
  initialClient: string | undefined,
  onSaved: () => void,
) {
  const api = useCapiro();
  const lifetime = useRef(new AbortController());
  useEffect(() => {
    lifetime.current = new AbortController();
    return () => lifetime.current.abort();
  }, []);
  const clients = useCapiroQuery("clients.list", {});
  const strategies = useCapiroQuery("strategies.list", {});
  const [clientId, setClientId] = useState(initialClient ?? "");
  const [strategyId, setStrategyId] = useState("");
  const [files, setFiles] = useState<FileRow[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [discard, setDiscard] = useState(false);
  function patch(key: string, value: Partial<FileRow>) {
    if (!lifetime.current.signal.aborted)
      setFiles((previous) =>
        previous.map((row) => (row.key === key ? { ...row, ...value } : row)),
      );
  }
  function addFiles(input: FileList | null) {
    if (!input) return;
    const incoming = [...input].map(normalizedFile);
    if (
      incoming.length + files.length > 10 ||
      incoming.some((file) => file.size < 1 || file.size > 25 * 1024 * 1024)
    ) {
      setError("Choose up to 10 files, each no larger than 25 MiB.");
      return;
    }
    setError("");
    setFiles((previous) => [
      ...previous,
      ...incoming.map((file) => ({
        key: crypto.randomUUID(),
        file,
        state: "Ready",
      })),
    ]);
  }
  async function readFiles() {
    setBusy(true);
    setError("");
    const signal = lifetime.current.signal;
    for (const row of files.filter(
      (value) => !["Reviewed", "Saved"].includes(value.state),
    )) {
      try {
        let attachmentId = row.attachmentId;
        if (!attachmentId) {
          patch(row.key, { state: "Uploading" });
          const ticket = await api.request(
            "strategies.context.file.ticket",
            {
              body: {
                clientId,
                fileName: row.file.name,
                contentType: row.file.type,
                contentLength: row.file.size,
              },
            },
            { signal },
          );
          await uploadCapiroAttachment(ticket, row.file, { signal });
          const confirmed = await api.request(
            "strategies.context.file.confirm",
            {
              body: {
                clientId,
                fileName: row.file.name,
                contentType: row.file.type,
                s3Key: ticket.s3Key,
                source: "strategy_context",
              },
            },
            { signal },
          );
          attachmentId = confirmed.id;
          patch(row.key, { attachmentId });
        }
        patch(row.key, { state: "Reading source", error: undefined });
        const resolved = await api.request(
          "strategies.context.import.resolve",
          {
            body: {
              clientId,
              strategyId: strategyId || undefined,
              attachmentId,
            },
          },
          { signal },
        );
        if (signal.aborted) return;
        setWarnings((previous) => [...previous, ...resolved.warnings]);
        for (const chunk of resolved.chunks) {
          patch(row.key, { state: `Analyzing part ${chunk.index + 1}` });
          const analysis = await api.request(
            "strategies.context.import.analyze",
            { body: { token: chunk.token } },
            { signal },
          );
          if (signal.aborted) return;
          setWarnings((previous) => [...previous, ...analysis.warnings]);
          if (analysis.documents.length && analysis.token)
            setReviews((previous) => [
              ...previous.filter(
                (value) => value.key !== `${row.key}:${chunk.index}`,
              ),
              {
                key: `${row.key}:${chunk.index}`,
                analysis,
                selected: analysis.documents.map((document) => document.id),
              },
            ]);
        }
        patch(row.key, { state: "Reviewed" });
      } catch (failure) {
        if (signal.aborted) return;
        patch(row.key, {
          state: "Needs attention",
          error:
            failure instanceof Error
              ? failure.message
              : "This source could not be read.",
        });
      }
    }
    if (!signal.aborted) setBusy(false);
  }
  async function save() {
    setBusy(true);
    setError("");
    const signal = lifetime.current.signal;
    try {
      for (const review of reviews.filter(
        (value) =>
          !value.saved && value.selected.length && value.analysis.token,
      )) {
        const result = await api.request(
          "strategies.context.import.save",
          {
            body: {
              token: review.analysis.token!,
              selectedDocumentIds: review.selected,
            },
          },
          { signal },
        );
        if (signal.aborted) return;
        setWarnings((previous) => [...previous, ...result.warnings]);
        setReviews((previous) =>
          previous.map((value) =>
            value.key === review.key ? { ...value, saved: true } : value,
          ),
        );
        onSaved();
      }
    } catch (failure) {
      if (!signal.aborted)
        setError(
          failure instanceof Error
            ? failure.message
            : "Selected information could not be saved.",
        );
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  }
  const hasReview = reviews.length > 0;
  return {
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
  };
}
