"use client";
import { useState } from "react";
import { Button } from "@capiro/ui/button";
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
} from "@capiro/ui/prompt-input";
import type { MeriConversationPort } from "../../../shared/meri-conversations/host-controller";
import { MeriConversationTranscript } from "./MeriConversationTranscript";
import { useConversationActions } from "./useConversationActions";
import styles from "../home.module.css";
export function MeriConversationView({ port }: { port: MeriConversationPort }) {
  const actions = useConversationActions(port),
    [draft, setDraft] = useState("");
  const { snapshot, intent, busy, error } = actions;
  const observed = snapshot.status === "ready" && !!snapshot.observation;
  return (
    <section aria-label="Current Meri conversation">
      <h2>Current conversation</h2>
      <p role="status">
        {snapshot.observation
          ? `Observed run: ${snapshot.observation.runState}`
          : "Connected session; transcript not loaded"}
      </p>
      {error && (
        <p role="alert">
          Conversation operation unavailable: {error}. No sample response was
          substituted.
        </p>
      )}
      <div className="row">
        <Button disabled={busy} onClick={() => void actions.history()}>
          Load current transcript
        </Button>
        <Button
          disabled={busy || !snapshot.observation?.hasMore}
          onClick={() => void actions.history(true)}
        >
          Load next history page
        </Button>
        <Button
          disabled={busy || !observed || snapshot.observation?.after !== 0}
          onClick={() => void actions.observe(false)}
        >
          Observe current run
        </Button>
        <Button
          disabled={busy || !observed}
          onClick={() => void actions.observe(true)}
        >
          Reconnect observed events
        </Button>
        <Button
          disabled={busy || !observed}
          onClick={() => void actions.cancel()}
        >
          {intent.cancel === "unknown"
            ? "Retry cancellation"
            : "Cancel current run"}
        </Button>
      </div>
      {snapshot.cancelReceipt && (
        <p>Cancellation response: {snapshot.cancelReceipt.state}</p>
      )}
      {intent.cancel === "unknown" && (
        <p role="status">
          Cancellation delivery is uncertain. Recheck or retry this current run
          explicitly.
        </p>
      )}
      <MeriConversationTranscript observation={snapshot.observation} />
      <PromptInput
        className={styles.composer}
        maxFiles={0}
        globalDrop={false}
        onSubmit={() => {
          if (!busy && !intent.submit && draft.trim())
            void actions.submit(draft);
        }}
      >
        <PromptInputBody>
          <PromptInputTextarea
            value={intent.submit?.prompt ?? draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
            aria-label="Meri message"
            placeholder="Ask Meri…"
            maxLength={8000}
            disabled={busy || !!intent.submit}
          />
        </PromptInputBody>
        <PromptInputFooter>
          <Button
            type="submit"
            disabled={busy || !!intent.submit || !draft.trim()}
          >
            Send message
          </Button>
        </PromptInputFooter>
      </PromptInput>
      {intent.submit && (
        <p>
          {intent.submit.state === "observed"
            ? "The submitted request was observed by the service."
            : "Request delivery is uncertain; its original input is retained."}
        </p>
      )}
      {intent.submit?.state === "unknown" && (
        <Button
          disabled={busy}
          onClick={() => void actions.submit(intent.submit!.prompt, true)}
        >
          Retry same request
        </Button>
      )}
      <p>
        Leaving this page stops observation and does not cancel the durable run.
        This connection observes one current run; recent-conversation listing
        and new-turn controls are unavailable.
      </p>
    </section>
  );
}
