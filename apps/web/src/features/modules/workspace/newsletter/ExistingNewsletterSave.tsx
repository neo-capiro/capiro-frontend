"use client";
import { useLayoutEffect, useRef, useState, type ComponentType } from "react";
import type { WorkspaceDraftDocument } from "@/shared/capiro/operations/workspace-documents";
import { useCapiroQuery } from "@/shared/capiro/queries";
import { ActionButton } from "@/shared/module-ui";
import type { OrdinarySaveScope } from "../ordinary-save/ordinary-save";
import { useOrdinaryDraftSave } from "../ordinary-save/useOrdinaryDraftSave";
import {
  newsletterSaveModel,
  type NewsletterInput,
  type NewsletterSave,
} from "./newsletter-atomic-save";

export type NewsletterEditorProps = {
  existing?: WorkspaceDraftDocument;
  initialClientId?: string;
  onClose: () => void;
  saveOwner?: NewsletterSave;
  onAtomicBound?: (draft: WorkspaceDraftDocument) => void;
};
type Props = NewsletterEditorProps & {
  existing: WorkspaceDraftDocument;
  editor: ComponentType<NewsletterEditorProps>;
};
type Actor = Pick<OrdinarySaveScope, "tenantId" | "userId" | "actorId">;

export function ExistingNewsletterSave(props: Props) {
  const me = useCapiroQuery("me.read", {});
  if (!me.data)
    return (
      <section role={me.error ? "alert" : "status"}>
        {me.error?.message ?? "Checking current newsletter access…"}
      </section>
    );
  const actor = {
    tenantId: me.data.tenant.id,
    userId: me.data.user.id,
    actorId: me.data.user.clerkUserId,
  };
  return (
    <AssociatedNewsletter
      key={JSON.stringify([actor, props.existing.id, props.existing.clientId])}
      {...props}
      actor={actor}
    />
  );
}
function AssociatedNewsletter(props: Props & { actor: Actor }) {
  const [association, setAssociation] = useState<{
    draft: WorkspaceDraftDocument;
    input: NewsletterInput;
  }>();
  const draft = association?.draft ?? props.existing;
  return (
    <NewsletterSession
      {...props}
      key={`${draft.id}:${draft.clientId ?? "firm"}`}
      existing={draft}
      carriedInput={association?.input}
      onBound={(bound, input) => setAssociation({ draft: bound, input })}
    />
  );
}
function NewsletterSession({
  existing,
  actor,
  carriedInput,
  onBound,
  editor: Editor,
  onClose,
}: Props & {
  actor: Actor;
  carriedInput?: NewsletterInput;
  onBound: (draft: WorkspaceDraftDocument, input: NewsletterInput) => void;
}) {
  const save = useOrdinaryDraftSave(
    { ...actor, draftId: existing.id, clientId: existing.clientId ?? null },
    newsletterSaveModel,
    carriedInput,
  );
  const latestInput = useRef(save.input);
  useLayoutEffect(() => {
    latestInput.current = save.input;
  }, [save.input]);
  if (!save.ready)
    return (
      <section role={save.recoveryError ? "alert" : "status"}>
        <p>
          {save.recoveryError ??
            "Checking current newsletter and retained save…"}
        </p>
        {save.recoveryError && (
          <ActionButton onClick={save.retryRecovery}>
            Retry document recovery
          </ActionButton>
        )}
        <ActionButton onClick={onClose}>← Workspace</ActionButton>
      </section>
    );
  return (
    <Editor
      existing={existing}
      onClose={onClose}
      saveOwner={save}
      onAtomicBound={(bound) => {
        if (latestInput.current) onBound(bound, latestInput.current);
      }}
    />
  );
}
