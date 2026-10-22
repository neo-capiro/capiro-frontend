"use client";
import { useEffect, useRef, useState } from "react";
import type {
  NewsletterBody,
  WorkspaceDraftDocument,
} from "../../../../shared/capiro/operations/workspace-documents";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../shared/capiro/queries";
import { createNewsletter, newsletterDocumentBlocks } from "./newsletter-model";
export function useNewsletter({
  onClose,
  existing,
  initialClientId,
}: {
  onClose: () => void;
  existing?: WorkspaceDraftDocument;
  initialClientId: string;
}) {
  const [step, setStep] = useState<"template" | "builder" | "review" | "stage">(
    existing ? "builder" : "template",
  );
  const me = useCapiroQuery("me.read", {});
  const clients = useCapiroQuery("workspace.clients", {});
  const [clientId, updateClientId] = useState(existing ? existing.clientId ?? "" : initialClientId);
  const scopeGeneration = useRef(0);
  useEffect(() => () => { scopeGeneration.current += 1; }, [existing?.id, initialClientId]);
  function setClientId(next: string) {
    if (next !== clientId) scopeGeneration.current += 1;
    updateClientId(next);
  }
  const [title, setTitle] = useState(
    existing?.docTitle ?? "Weekly policy newsletter",
  );
  const [body, setBody] = useState<NewsletterBody>(
    existing?.documents.flatMap((document) =>
      !document.sourceBriefVersion && document.body.newsletter
        ? [document.body.newsletter]
        : [],
    )[0] ?? createNewsletter("weekly"),
  );
  const [draft, setDraft] = useState(existing);
  const [saved, setSaved] = useState(Boolean(existing));
  const [mobile, setMobile] = useState(false);
  const [history, setHistory] = useState<NewsletterBody[]>([]);
  const [future, setFuture] = useState<NewsletterBody[]>([]);
  const [confirmClose, setConfirmClose] = useState(false);
  const create = useCapiroMutation("workspace.draft.create");
  const saveDocument = useCapiroMutation("workspace.document.update");
  const saveMetadata = useCapiroMutation("workspace.draft.update");
  const snapshot = useCapiroMutation("workspace.draft.snapshot");
  const saving = useRef(false);
  const pending =
    create.pending ||
    saveDocument.pending ||
    saveMetadata.pending ||
    snapshot.pending;
  const [localError, setLocalError] = useState<Error>();
  const error =
    localError ??
    create.error ??
    saveDocument.error ??
    saveMetadata.error ??
    snapshot.error;
  function edit(next: NewsletterBody) {
    setHistory((previous) => [...previous.slice(-49), body]);
    setFuture([]);
    setBody(next);
    setSaved(false);
  }
  function select(preset: string) {
    edit(createNewsletter(preset, me.data?.tenant.name));
    setStep("builder");
  }
  function undo() {
    const prior = history.at(-1);
    if (!prior) return;
    setFuture((previous) => [...previous, body]);
    setBody(prior);
    setHistory((previous) => previous.slice(0, -1));
    setSaved(false);
  }
  function redo() {
    const next = future.at(-1);
    if (!next) return;
    setHistory((previous) => [...previous, body]);
    setBody(next);
    setFuture((previous) => previous.slice(0, -1));
    setSaved(false);
  }
  async function save(exit = false) {
    if (saving.current) return;
    saving.current = true;
    const scope = scopeGeneration.current;
    const requireCurrentScope = () => {
      if (scope !== scopeGeneration.current)
        throw new Error("The client view changed. Reload before saving again.");
    };
    setLocalError(undefined);
    try {
      let record = draft;
      const client = clients.data?.items.find((value) => value.id === clientId);
      if (clientId && !client) throw new Error("The selected client is unavailable. Refresh before saving.");
      if (record && (record.clientId ?? null) !== (clientId || null))
        throw new Error("This saved newsletter belongs to a different client. Open it in its original client scope.");
      if (!record) {
        record = await create.run({
          body: {
            product: "Newsletter",
            client: client?.name,
            clientId: client?.id ?? null,
            docTitle: title,
          },
        });
        requireCurrentScope();
        setDraft(record);
      }
      const document =
        record.documents.find(
          (value) => !value.sourceBriefVersion && value.body.newsletter,
        ) ?? record.documents.find((value) => !value.sourceBriefVersion);
      if (!document)
        throw new Error("Workspace did not create the primary document.");
      await saveDocument.run({
        params: { draftId: record.id, docId: document.id },
        body: {
          name: title,
          body: { blocks: newsletterDocumentBlocks(body), newsletter: body },
        },
      });
      requireCurrentScope();
      await saveMetadata.run({
        params: { id: record.id },
        body: { docTitle: title },
      });
      requireCurrentScope();
      await snapshot.run({
        params: { draftId: record.id },
        body: { label: "Newsletter revision" },
      });
      requireCurrentScope();
      setSaved(true);
      if (exit) onClose();
    } catch (failure) {
      if (scope === scopeGeneration.current) setLocalError(
        failure instanceof Error
          ? failure
          : new Error("Newsletter save could not be completed."),
      );
    } finally {
      saving.current = false;
    }
  }
  const documentId = (
    draft?.documents.find(
      (value) => !value.sourceBriefVersion && value.body.newsletter,
    ) ?? draft?.documents.find((value) => !value.sourceBriefVersion)
  )?.id;
  return {
    step,
    setStep,
    clients,
    clientId,
    setClientId,
    title,
    setTitle,
    body,
    draft,
    saved,
    setSaved,
    mobile,
    setMobile,
    history,
    future,
    confirmClose,
    setConfirmClose,
    pending,
    error,
    edit,
    select,
    undo,
    redo,
    save,
    documentId,
  };
}
