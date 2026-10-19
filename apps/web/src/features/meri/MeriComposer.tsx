"use client";
import { useId } from "react";
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputButton,
} from "@capiro/ui/prompt-input";
import { Button } from "@capiro/ui/button";
import { X } from "lucide-react";
import { DesignIcon } from "../../shared/shell/DesignIcon";
import styles from "./home.module.css";

type AssetSet = "home" | "cited-answer";
/** Connected composer behaviour. Without it the composer is the disconnected fixture. */
export type LiveComposer = Readonly<{
  /** Sends the current draft. Called only when Send is enabled and the draft has text. */
  onSend: () => void;
  /** Requests durable cancellation of the running run. */
  onStop?: () => void;
  /** Why Send is unavailable right now; the draft stays editable either way. */
  sendBlocked?: string | undefined;
  /** Why Stop is unavailable right now. */
  stopBlocked?: string | undefined;
  /** Verified client scope shown on the scope chip. */
  scope: string;
  /** Why attachments are unavailable. */
  attachUnavailable: string;
}>;

export function MeriComposer({
  draft,
  onDraft,
  textareaRef,
  assetSet = "home",
  running = false,
  live,
}: {
  draft: string;
  onDraft: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  assetSet?: AssetSet;
  /** A run is in progress: the submit slot shows Stop instead of Send. */
  running?: boolean;
  live?: LiveComposer;
}) {
  const helpId = useId();
  const canSend = !!live && !running && !live.sendBlocked && !!draft.trim();
  return (
    <section
      className={styles.composerFrame}
      aria-label={live ? "Message composer" : "Local draft composer"}
    >
      <PromptInput
        className={styles.composer}
        maxFiles={0}
        globalDrop={false}
        onSubmit={(_message, event) => {
          event.preventDefault();
          if (canSend) live.onSend();
        }}
      >
        <PromptInputBody>
          <PromptInputTextarea
            ref={textareaRef}
            className={styles.textarea}
            value={draft}
            onChange={(event) => onDraft(event.currentTarget.value)}
            onKeyDown={(event) => {
              // A blocked send must not reach the form: its reset would clear the kept draft.
              if (
                live &&
                !canSend &&
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing &&
                event.nativeEvent.keyCode !== 229
              )
                event.preventDefault();
            }}
            aria-label={live ? "Meri message" : "Message draft"}
            aria-describedby={helpId}
            placeholder="Ask Meri to research, analyze, or create something…"
            {...(live ? { maxLength: 8000 } : {})}
          />
        </PromptInputBody>
        <PromptInputFooter className={styles.composerFooter}>
          <ComposerTools live={live} assetSet={assetSet} />
          <ComposerAction
            running={running}
            live={live}
            canSend={canSend}
            assetSet={assetSet}
            helpId={helpId}
          />
        </PromptInputFooter>
        <p className={styles.keyboardHint} id={helpId}>
          Enter to send · Shift + Enter for a new line
          <span className="sr-only">
            {!live
              ? ". Sending is currently unavailable in this disconnected synthetic fixture."
              : running
                ? `. A run is in progress. ${live.stopBlocked ?? "Use Stop to request cancellation; your draft stays editable."}`
                : live.sendBlocked
                  ? `. ${live.sendBlocked}`
                  : ""}
          </span>
        </p>
      </PromptInput>
    </section>
  );
}

/** Attach stays unavailable; the scope chip shows the verified client in live mode. */
function ComposerTools({
  live,
  assetSet,
}: {
  live: LiveComposer | undefined;
  assetSet: AssetSet;
}) {
  return (
    <PromptInputTools className={styles.tools}>
      <PromptInputButton
        className={styles.toolButton}
        disabled
        title={
          live
            ? live.attachUnavailable
            : "Attachments require the connected artifact contract"
        }
      >
        <DesignIcon
          name={assetSet === "home" ? "plus" : "plus-secondary"}
          assetSet={assetSet}
        />
        Attach
      </PromptInputButton>
      <PromptInputButton
        className={styles.toolButton}
        disabled
        title={
          live
            ? "Client scope comes from your Portfolio selection"
            : "Anduril is a synthetic sample, not an authorized scope"
        }
      >
        <DesignIcon name="chevron" assetSet={assetSet} />
        {live ? live.scope : "Anduril"}
      </PromptInputButton>
    </PromptInputTools>
  );
}

/** The submit slot: Send, or Stop while a run is in progress. Fixture controls stay disabled. */
function ComposerAction({
  running,
  live,
  canSend,
  assetSet,
  helpId,
}: {
  running: boolean;
  live: LiveComposer | undefined;
  canSend: boolean;
  assetSet: AssetSet;
  helpId: string;
}) {
  if (running)
    return (
      <Button
        type="button"
        className={styles.send}
        disabled={!live?.onStop || !!live.stopBlocked}
        aria-describedby={helpId}
        onClick={live?.onStop}
        aria-label={
          live ? "Stop run" : "Stop unavailable: disconnected fixture"
        }
        title={
          live
            ? (live.stopBlocked ?? "Ask Meri to stop this run")
            : "Stopping a run requires a connected, authorized run"
        }
      >
        <X aria-hidden className={styles.stopIcon} />
        Stop
      </Button>
    );
  return (
    <Button
      type="submit"
      className={styles.send}
      disabled={!canSend}
      aria-describedby={helpId}
      aria-label={
        live ? "Send message" : "Send unavailable: disconnected fixture"
      }
      title={
        live
          ? (live.sendBlocked ?? "Send to Meri")
          : "Sending is unavailable until trusted backend contracts are integrated"
      }
    >
      <DesignIcon name="send" assetSet={assetSet} />
      Send
    </Button>
  );
}
