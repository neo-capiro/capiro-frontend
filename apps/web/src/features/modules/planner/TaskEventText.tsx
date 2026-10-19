"use client";

import { useState } from "react";
import { MarkdownContent } from "../../../shared/markdown/MarkdownContent";
import { ActionButton } from "../../../shared/module-ui";

/** Events have no format marker: literal text remains the default, including old comments. */
export function TaskEventText({ kind, text }: { kind: string; text: string }) {
  const [preview, setPreview] = useState(false);
  if (kind !== "comment") return <p>{text}</p>;
  return (
    <div>
      {preview ? (
        <div role="region" aria-label="Comment formatting preview">
          <MarkdownContent source={text} />
        </div>
      ) : (
        <p>{text}</p>
      )}
      <ActionButton
        type="button"
        aria-pressed={preview}
        onClick={() => setPreview(!preview)}
      >
        {preview ? "Show comment text" : "Preview formatting"}
      </ActionButton>
    </div>
  );
}
