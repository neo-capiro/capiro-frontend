"use client";
import { useEffect, useState } from "react";
import {
  clientHandoff,
  type ClientMeriHandoff,
} from "../../../shared/meri-conversations/client-handoff";
import type { ConversationContext } from "../../../shared/meri-conversations/session";

/** A fresh admitted conversation selects the draft; adopting it still does not dispatch input. */
export function ClientHandoffDraft({
  context,
  draft,
  onDraft,
  disabled,
}: {
  context: ConversationContext;
  draft: string;
  onDraft: (text: string) => void;
  disabled: boolean;
}) {
  const [pending, setPending] = useState<ClientMeriHandoff>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    try {
      // Hydrate the external, identity-scoped tab record only after the admitted context mounts.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPending(clientHandoff(context).receive(context.selectedClientId));
    } catch {
      setError("The client draft could not be recovered in this tab.");
    }
  }, [context]);
  const consume = (adopt: boolean) => {
    if (!pending || disabled) return;
    try {
      const owner = clientHandoff(context);
      const current = owner.receive(context.selectedClientId);
      if (!current || current.draft !== pending.draft)
        throw Error("Draft changed");
      if (adopt) onDraft(pending.draft);
      owner.clear(pending);
      setPending(undefined);
    } catch {
      setError(
        "The client draft changed. Reopen it from the current client profile.",
      );
    }
  };
  if (error) return <p role="alert">{error}</p>;
  if (!pending) return null;
  return (
    <section aria-label="Client profile draft">
      <p>
        A reviewed draft from this client&apos;s profile is ready. It has not
        been sent.
      </p>
      <blockquote>{pending.draft}</blockquote>
      <button
        type="button"
        disabled={disabled || !!draft.trim()}
        onClick={() => consume(true)}
      >
        Use reviewed draft
      </button>
      {!!draft.trim() && (
        <p>Keep or clear your current draft before using this message.</p>
      )}
      <button type="button" disabled={disabled} onClick={() => consume(false)}>
        Dismiss client draft
      </button>
    </section>
  );
}
