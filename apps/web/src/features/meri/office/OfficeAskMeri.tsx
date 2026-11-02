"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@capiro/ui/button";
import {
  revisionHandoff,
  type HandoffContext,
} from "../../../shared/meri-documents/revision-handoff";
import { conversationHref } from "../../../shared/meri-conversations/conversation-navigation";

export type OfficeAskTarget = Readonly<{
  artifactId: string;
  versionId: string;
  objectSha256: string;
  filename: string;
}>;

/** Carries the exact version (id and hash) into the original conversation as the selected document,
 * through the same handoff the composer already adopts for revisions. The service re-reads the
 * version under current access; nothing here grants anything. */
export function OfficeAskMeri({
  context,
  inspect,
  blocked,
  disabled,
}: {
  context: HandoffContext;
  /** Re-reads the exact version on the action; a prior row is never the selection. */
  inspect: (signal: AbortSignal) => Promise<OfficeAskTarget>;
  /** Why asking is withheld now (an unsaved or unpublished private edit); shown instead of the control. */
  blocked?: string | null;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false),
    [problem, setProblem] = useState<string>();
  const pending = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      pending.current?.abort();
    },
    [],
  );
  const ask = async () => {
    if (busy) return;
    const current = new AbortController();
    pending.current = current;
    setBusy(true);
    setProblem(undefined);
    setReady(false);
    try {
      const target = await inspect(current.signal);
      if (current.signal.aborted) return;
      revisionHandoff(context).write(target);
      setReady(true);
    } catch {
      if (!current.signal.aborted)
        setProblem(
          "This version could not be selected for Meri under current access.",
        );
    } finally {
      if (!current.signal.aborted) setBusy(false);
    }
  };
  if (blocked) return <p role="status">{blocked}</p>;
  return (
    <div>
      <Button
        variant="outline"
        disabled={busy || disabled}
        onClick={() => void ask()}
      >
        Ask Meri about this document
      </Button>
      <p>
        Meri reads exactly this saved version and proposes changes you apply
        yourself; Save keeps a private draft, Publish makes the file version
        Meri can read.
      </p>
      {ready && (
        <p>
          <Link
            prefetch={false}
            href={conversationHref(
              context.selectedClientId,
              context.conversationId,
            )}
          >
            Continue with Meri in the original conversation
          </Link>
        </p>
      )}
      {problem && <p role="alert">{problem}</p>}
    </div>
  );
}
