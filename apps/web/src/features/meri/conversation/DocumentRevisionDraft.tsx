"use client";
import { useEffect, useState } from "react";
import {
  revisionHandoff,
  type RevisionHandoff,
} from "../../../shared/meri-documents/revision-handoff";
import type { ConversationContext } from "../../../shared/meri-conversations/session";
import type { ConversationSkillSelection } from "../../../shared/meri-conversations/query-journal";

/** Choosing this source changes only the unsent draft; Send and UNKNOWN recovery retain their owners. */
export function DocumentRevisionDraft({
  context,
  selection,
  onChange,
  disabled,
}: {
  context: ConversationContext;
  selection: ConversationSkillSelection;
  onChange: (value: ConversationSkillSelection) => void;
  disabled: boolean;
}) {
  const [pending, setPending] = useState<RevisionHandoff>();
  const [problem, setProblem] = useState<string>();
  useEffect(() => {
    try {
      // Hydrate the identity-scoped external record only after fresh conversation admission.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPending(revisionHandoff(context).read());
    } catch {
      setProblem("The document selection could not be recovered in this tab.");
    }
  }, [context]);
  const adopt = () => {
    if (!pending || disabled) return;
    try {
      const owner = revisionHandoff(context);
      if (JSON.stringify(owner.read()) !== JSON.stringify(pending))
        throw Error("Selection changed");
      onChange(pending.selection);
      owner.clear(pending);
      setPending(undefined);
    } catch {
      setProblem("The selection changed. Select the version again from Files.");
    }
  };
  if (!pending && !selection.documentRevision && !problem) return null;
  return (
    <section aria-label="Document for revision">
      {pending && (
        <>
          <p>
            Revise {pending.filename} in this conversation. Your message has not
            been sent. Selecting this version replaces a selected skill.
          </p>
          <button type="button" disabled={disabled} onClick={adopt}>
            Use document for next message
          </button>
        </>
      )}
      {selection.documentRevision && (
        <>
          <p>
            Document revision selected. Describe your changes, then Send. The
            original is retained; current source access is checked again.
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange({})}
          >
            Remove document selection
          </button>
        </>
      )}
      {problem && <p role="alert">{problem}</p>}
    </section>
  );
}
