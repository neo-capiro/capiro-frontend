"use client";
import { useState } from "react";
import type { MemoryDraftSubmissionReceipt } from "@capiro/shared/settings-memory-drafts";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import { useSettingsMutation } from "../../useSettingsMutation";
import {
  draftBelongsToFile,
  editableDraft,
  type DraftSelection,
} from "./model";
type Recovery = { id: string; requestId: string } | null;
function useDraftReads(
  type: string,
  slug: string,
  selection: DraftSelection | null,
  recovery: Recovery,
) {
  const read = useCapiroQuery(
    "settings.memory.drafts.read",
    { params: { type, slug, id: selection?.id ?? "" } },
    { enabled: !!selection && !selection.fresh },
  );
  const recovered = useCapiroQuery(
    "settings.memory.drafts.submissionReceipt",
    {
      params: {
        type,
        slug,
        id: recovery?.id ?? "",
        requestId: recovery?.requestId ?? "",
      },
    },
    { enabled: !!recovery },
  );
  return { read, recovered };
}
/** View selection and current reads; durable uncertainty stays in the shared Settings writer. */
export function useMemoryDraftEditor(
  type: string,
  slug: string,
  notifySubmitted?: () => void,
) {
  const file = useCapiroQuery("settings.memory.drafts.file", {
    params: { type, slug },
  });
  const account = useCapiroQuery("me.read", {});
  const writer = useSettingsMutation(`memory-draft:${type}:${slug}`);
  const [selection, setSelection] = useState<DraftSelection | null>(null);
  const [submitted, setSubmitted] =
    useState<MemoryDraftSubmissionReceipt | null>(null);
  const [recovery, setRecovery] = useState<Recovery>(null);
  const { read, recovered } = useDraftReads(type, slug, selection, recovery);
  const target =
    file.data?.type === type && file.data.slug === slug ? file.data : null;
  const matching = !!(
    target &&
    selection &&
    read.data &&
    account.data &&
    draftBelongsToFile(read.data, target, selection.id, account.data.user.id)
  );
  const draft =
    target && selection && (selection.fresh || matching)
      ? editableDraft(
          target,
          selection.id,
          selection.fresh ? undefined : read.data,
        )
      : null;
  const reload = () => {
    if (selection?.fresh) setSelection(null);
    else read.reload();
    file.reload();
  };
  const close = () => {
    setSelection(null);
    file.reload();
  };
  const onSaved = (id: string) => {
    setSelection({ id, fresh: false });
    read.reload();
    file.reload();
  };
  const onSubmitted = (receipt: MemoryDraftSubmissionReceipt) => {
    setSubmitted(receipt);
    close();
    notifySubmitted?.();
  };
  const recover = () =>
    writer.reconcile((write) => {
      setSubmitted(null);
      const id = String(write.input.params?.id ?? "");
      onSaved(id);
      if (write.operation === "settings.memory.drafts.submit") {
        setRecovery({
          id,
          requestId: String(write.input.body?.requestId ?? ""),
        });
        notifySubmitted?.();
      }
    });
  return {
    file,
    account,
    writer,
    selection,
    setSelection,
    submitted,
    read,
    recovered,
    target,
    matching,
    draft,
    reload,
    close,
    onSaved,
    onSubmitted,
    recover,
  };
}
