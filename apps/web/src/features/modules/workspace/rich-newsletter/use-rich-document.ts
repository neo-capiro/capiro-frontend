"use client";
import { useLayoutEffect, useMemo, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCapiro } from "../../../../shared/capiro/CapiroBoundary";
import { createRichNewsletterAdapter } from "../../../../shared/capiro/rich-newsletter";
import { createRichDocumentController } from "./document-controller";
import { createRichWriteJournal } from "./write-journal";

/** Session/client replacement changes the API owner and disposes private state. */
export function useRichDocument() {
  const api = useCapiro();
  const queryClient = useQueryClient();
  const owner = useMemo(
    () =>
      createRichDocumentController(
        createRichNewsletterAdapter(api),
        createRichWriteJournal(queryClient),
      ),
    [api, queryClient],
  );
  useLayoutEffect(() => owner.mount(), [owner]);
  const state = useSyncExternalStore(
    owner.subscribe,
    owner.getSnapshot,
    owner.getSnapshot,
  );
  return { owner, state };
}
