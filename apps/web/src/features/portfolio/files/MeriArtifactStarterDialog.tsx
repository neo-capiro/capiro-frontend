"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Destinations } from "@/shared/portfolio/config/config";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { useIdentity } from "@/shared/portfolio/auth/identity";
import {
  artifactStarterProblem,
  continueArtifactStarter,
  emptyArtifactStarterDraft,
  type ArtifactStarterDraft,
} from "@/shared/meri-starters";
import { clientHandoff } from "@/shared/meri-conversations/client-handoff";
import { requireMeriTabStorage } from "@/shared/meri-conversations/tab-journal";

export interface MeriArtifactStarterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  destinations: Destinations;
}

export function MeriArtifactStarterDialog(
  props: MeriArtifactStarterDialogProps,
) {
  return props.open ? <ArtifactStarterSession {...props} /> : null;
}

function ArtifactStarterSession({
  onOpenChange,
  clientId,
  clientName,
  destinations,
}: MeriArtifactStarterDialogProps) {
  const router = useRouter();
  const identity = useIdentity();
  const [draft, setDraft] = useState<ArtifactStarterDraft>(
    emptyArtifactStarterDraft,
  );
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();

  const draftProblem = artifactStarterProblem(draft);
  const disabled = busy || !destinations.meri || Boolean(draftProblem);

  const continueInMeri = () => {
    if (disabled) return;
    setBusy(true);
    setProblem(undefined);
    try {
      const storage = requireMeriTabStorage();
      const tenantId = identity.data?.tenant?.id;
      const actorId = identity.data?.user?.id;
      if (!tenantId || !actorId) throw new Error("Your session is not ready.");
      continueArtifactStarter({
        draft,
        clientId,
        writeHandoff: (handoff) => {
          clientHandoff({ tenantId, actorId }, storage).write(handoff);
        },
      });
      onOpenChange(false);
      router.push(`/meri?${new URLSearchParams({ clientId }).toString()}`);
    } catch (error) {
      setProblem(
        error instanceof Error
          ? error.message
          : "The artifact draft could not be handed to Meri.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      title="Create with Meri"
      description={`Draft a document for ${clientName}. Nothing is saved or filed until you review and send it in the conversation.`}
    >
      <p className="status">
        This hands an unsent document draft to Meri. You still review and send
        it in the client conversation.
      </p>
      <label>
        Title
        <input
          type="text"
          value={draft.title}
          onChange={(event) =>
            setDraft({ ...draft, title: event.target.value })
          }
          placeholder="Document title"
          disabled={busy}
        />
      </label>
      <label>
        Format
        <select
          value={draft.format}
          onChange={(event) =>
            setDraft({
              ...draft,
              format: event.target.value as "docx" | "txt",
            })
          }
          disabled={busy}
        >
          <option value="docx">DOCX</option>
          <option value="txt">TXT</option>
        </select>
      </label>
      <label>
        Starting content
        <textarea
          value={draft.body}
          onChange={(event) => setDraft({ ...draft, body: event.target.value })}
          rows={8}
          placeholder="Optional starting content"
          disabled={busy}
        />
      </label>
      {(draftProblem || problem) && (
        <p role="alert">{problem ?? draftProblem}</p>
      )}
      <div className="row">
        <button
          type="button"
          className="button primary"
          disabled={disabled}
          onClick={continueInMeri}
        >
          {busy ? "Preparing conversation…" : "Continue in Meri"}
        </button>
        <button
          type="button"
          className="button"
          disabled={busy}
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </button>
      </div>
    </Dialog>
  );
}
