"use client";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  parseNewsletterSurveyDraft,
  type NewsletterSavedSurvey,
} from "@capiro/shared/newsletter";
import { useCapiro } from "@/shared/capiro/CapiroBoundary";
import { useCapiroMutation, useCapiroQuery } from "@/shared/capiro/queries";
import type { RichDocumentController } from "../document-controller";
import {
  editSurvey,
  newSurveyForm,
  savedSurveyForm,
  type SurveyForm,
} from "./survey-draft";

/** The mounted authoring view has no durable receipt or retry contract. */
export function useSurveyDrafts(
  owner: RichDocumentController,
  documentId?: string,
) {
  const api = useCapiro();
  const scope = useMemo(
    () => ({ api, owner, documentId }),
    [api, owner, documentId],
  );
  const [previous, setPrevious] = useState(scope);
  const [open, setOpen] = useState(false),
    [form, setForm] = useState<SurveyForm>();
  const [unknown, setUnknown] = useState(false),
    [notice, setNotice] = useState<string>();
  const [showList, setShowList] = useState(true);
  const active = useRef(false);
  const mounted = useRef<typeof scope | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const query = useCapiroQuery(
    "workspace.richNewsletter.surveys.list",
    { params: { id: documentId ?? "" } },
    { enabled: open && !!documentId },
  );
  const mutation = useCapiroMutation("workspace.richNewsletter.surveys.save");
  useLayoutEffect(() => {
    mounted.current = scope;
    active.current = false;
    return () => {
      mounted.current = undefined;
    };
  }, [scope]);
  if (previous !== scope) {
    setPrevious(scope);
    setOpen(false);
    setForm(undefined);
    setUnknown(false);
    setNotice(undefined);
    setShowList(true);
    setPending(false);
  }
  const current = () =>
    mounted.current === scope && owner.getSnapshot().saved?.id === documentId;
  return {
    open,
    form: query.data && !showList ? form : undefined,
    items: query.data?.items,
    loading: query.loading,
    error: query.error,
    unknown,
    notice,
    pending,
    enter() {
      if (documentId && current() && !active.current) {
        setOpen(true);
        setShowList(!unknown);
        setNotice(undefined);
      }
    },
    close() {
      if (!active.current) {
        setOpen(false);
        if (!unknown) setForm(undefined);
      }
    },
    reload() {
      if (!active.current) {
        if (!unknown) setForm(undefined);
        setShowList(true);
        query.reload();
      }
    },
    create() {
      if (current() && query.data && !active.current && !unknown) {
        setForm(newSurveyForm());
        setShowList(false);
        setNotice(undefined);
      }
    },
    select(item: NewsletterSavedSurvey) {
      if (
        current() &&
        query.data?.items.includes(item) &&
        !active.current &&
        !unknown
      ) {
        setForm(savedSurveyForm(item));
        setShowList(false);
        setNotice(undefined);
      }
    },
    edit(change: (next: SurveyForm) => void) {
      if (current() && query.data && form && !active.current && !unknown)
        setForm(editSurvey(form, change));
    },
    async save() {
      if (
        !documentId ||
        !current() ||
        !query.data ||
        !form ||
        !form.name.trim() ||
        active.current ||
        unknown
      )
        return;
      active.current = true;
      setPending(true);
      setNotice(undefined);
      const body = {
        name: form.name.trim(),
        definition: form.definition,
        ...(form.saved
          ? { id: form.saved.id, revision: form.saved.revision }
          : {}),
      };
      try {
        const result = await mutation.run({ params: { id: documentId }, body });
        const received = parseNewsletterSurveyDraft(result, {
          revision: form.saved ? form.saved.revision + 1 : 1,
          ...(form.saved ? { id: form.saved.id } : {}),
        });
        if (!received.ok) throw new Error("Unconfirmed survey response");
        if (current()) {
          setForm(savedSurveyForm(received.value));
          setNotice(
            `Server returned saved draft revision ${received.value.revision}. The newsletter draft is unchanged. This does not publish a survey.`,
          );
        }
      } catch {
        if (current()) setUnknown(true);
      } finally {
        if (current()) {
          active.current = false;
          setPending(false);
        }
      }
    },
  };
}
export type SurveyDraftState = ReturnType<typeof useSurveyDrafts>;
