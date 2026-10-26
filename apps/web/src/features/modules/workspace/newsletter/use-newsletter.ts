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
import {
  newsletterMatchesSaved,
  type NewsletterSave,
} from "./newsletter-atomic-save";
export function useNewsletter({
  onClose,
  existing,
  initialClientId,
  saveOwner,
  onAtomicBound,
}: {
  onClose: () => void;
  existing?: WorkspaceDraftDocument;
  initialClientId: string;
  saveOwner?: NewsletterSave;
  onAtomicBound?: (draft: WorkspaceDraftDocument) => void;
}) {
  const [step, setStep] = useState<"template" | "builder" | "review" | "stage">(
    existing ? "builder" : "template",
  );
  const me = useCapiroQuery("me.read", {});
  const clients = useCapiroQuery("workspace.clients", {});
  const [clientId, updateClientId] = useState(
    existing ? (existing.clientId ?? "") : initialClientId,
  );
  const scopeGeneration = useRef(0);
  useEffect(
    () => () => {
      scopeGeneration.current += 1;
    },
    [existing?.id, initialClientId],
  );
  function setClientId(next: string) {
    if (next !== clientId) scopeGeneration.current += 1;
    updateClientId(next);
  }
  const [localTitle, setLocalTitle] = useState(
    existing?.docTitle ?? "Weekly policy newsletter",
  );
  const [localBody, setBody] = useState<NewsletterBody>(
    existing?.documents.flatMap((document) =>
      !document.sourceBriefVersion && document.body.newsletter
        ? [document.body.newsletter]
        : [],
    )[0] ?? createNewsletter("weekly"),
  );
  const [localDraft, setDraft] = useState(existing);
  const [localSaved, setSaved] = useState(Boolean(existing));
  const title = saveOwner?.input?.title ?? localTitle;
  const body = saveOwner?.input?.body ?? localBody;
  const draft = saveOwner?.currentDraft ?? localDraft;
  const saved = saveOwner ? newsletterMatchesSaved(saveOwner) : localSaved;
  const setTitle = (title: string) =>
    saveOwner?.input
      ? saveOwner.setInput({ ...saveOwner.input, title })
      : setLocalTitle(title);
  const updateBody = (body: NewsletterBody) =>
    saveOwner?.input
      ? saveOwner.setInput({ ...saveOwner.input, body })
      : setBody(body);
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
    Boolean(saveOwner?.pending) ||
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
    if (saveOwner?.frozen) return;
    setHistory((previous) => [...previous.slice(-49), body]);
    setFuture([]);
    updateBody(next);
    setSaved(false);
  }
  function select(preset: string) {
    edit(createNewsletter(preset, me.data?.tenant.name));
    setStep("builder");
  }
  function undo() {
    if (saveOwner?.frozen) return;
    const prior = history.at(-1);
    if (!prior) return;
    setFuture((previous) => [...previous, body]);
    updateBody(prior);
    setHistory((previous) => previous.slice(0, -1));
    setSaved(false);
  }
  function redo() {
    if (saveOwner?.frozen) return;
    const next = future.at(-1);
    if (!next) return;
    setHistory((previous) => [...previous, body]);
    updateBody(next);
    setFuture((previous) => previous.slice(0, -1));
    setSaved(false);
  }
  async function save(exit = false) {
    if (existing) {
      if ((draft?.clientId ?? null) !== (clientId || null)) {
        setLocalError(
          new Error(
            "This saved newsletter belongs to a different client. Open it in its original client scope.",
          ),
        );
        return;
      }
      if (!saveOwner) {
        setLocalError(
          new Error(
            "Reopen this saved newsletter to verify its atomic save state.",
          ),
        );
        return;
      }
      if ((await saveOwner.save()) === true && exit) onClose();
      return;
    }
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
      if (clientId && !client)
        throw new Error(
          "The selected client is unavailable. Refresh before saving.",
        );
      if (record && (record.clientId ?? null) !== (clientId || null))
        throw new Error(
          "This saved newsletter belongs to a different client. Open it in its original client scope.",
        );
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
      if (scope === scopeGeneration.current)
        setLocalError(
          failure instanceof Error
            ? failure
            : new Error("Newsletter save could not be completed."),
        );
    } finally {
      saving.current = false;
    }
  }
  function acceptClientAssociation(bound: WorkspaceDraftDocument) {
    if (
      !draft ||
      bound.id !== draft.id ||
      !bound.clientId ||
      bound.clientAssociation === "held"
    )
      return;
    if (saveOwner) {
      onAtomicBound?.(bound);
      return;
    }
    scopeGeneration.current += 1;
    setDraft(bound);
    updateClientId(bound.clientId);
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
    acceptClientAssociation,
  };
}
