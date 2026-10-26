"use client";
import { useCallback } from "react";
import type { NativeHearingSourceEvent } from "@capiro/meri-contracts/conversation-sources";
import type { ConversationReads } from "../../../../shared/meri-conversations/current-reads";
import { useCurrentRead } from "./useCurrentRead";
import { SourceReadState } from "./SourceReadState";
import { HearingSourceDetail } from "./HearingSourceDetail";
import { HearingMediaView } from "./HearingMediaView";
export function HearingSourceView({
  event,
  reads,
}: {
  event: NativeHearingSourceEvent;
  reads: ConversationReads;
}) {
  const read = useCallback(
    (signal: AbortSignal) =>
      reads.hearing(event.binding.runId, event.eventId, signal),
    [reads, event.binding.runId, event.eventId],
  );
  const result = useCurrentRead(event.eventId, read);
  if (result.value)
    return (
      <HearingSourceDetail
        value={result.value}
        media={
          <HearingMediaView
            event={result.value.event}
            reads={reads}
            onSourceInvalidated={result.reload}
          />
        }
      />
    );
  return (
    <SourceReadState {...result} title="Hearing record" page="hearing record" />
  );
}
