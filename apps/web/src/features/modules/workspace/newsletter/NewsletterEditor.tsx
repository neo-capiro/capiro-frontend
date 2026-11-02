"use client";
import type { WorkspaceDraftDocument } from "@/shared/capiro/operations/workspace-documents";
import { RichNewsletterSession } from "../rich-newsletter/RichNewsletterSession";
import { ExistingNewsletterSave } from "./ExistingNewsletterSave";
import { SavedNewsletterSession } from "./SavedNewsletterSession";

/** Canonical entry. A stored Workspace draft keeps its existing atomic save owner. */
export function NewsletterEditor({
  existing,
  documentId,
  onClose,
}: {
  existing?: WorkspaceDraftDocument;
  documentId?: string;
  onClose: () => void;
}) {
  return existing ? (
    <ExistingNewsletterSave
      existing={existing}
      onClose={onClose}
      editor={SavedNewsletterSession}
    />
  ) : (
    <RichNewsletterSession documentId={documentId} onClose={onClose} />
  );
}
