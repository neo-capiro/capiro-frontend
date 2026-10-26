"use client";
import { useState } from "react";
import { RichNewsletterEditor } from "../RichNewsletterEditor";
import { NewsletterReview } from "./NewsletterReview";

/** URL entry never reads until explicit open; editable entry is a separate intent. */
export function NewsletterReviewEntry({
  documentId,
  onClose,
}: {
  documentId: string;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  return editing ? (
    <RichNewsletterEditor documentId={documentId} onClose={onClose} />
  ) : (
    <NewsletterReview
      documentId={documentId}
      onClose={onClose}
      onEdit={() => setEditing(true)}
    />
  );
}
