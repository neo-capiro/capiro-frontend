"use client";
import { useId, useState } from "react";
import type { ConversationSubmitRequest } from "@capiro/meri-contracts/conversation-application";
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputButton,
  PromptInputHeader,
} from "@capiro/ui/prompt-input";
import { Button } from "@capiro/ui/button";
import { SlidersHorizontal, X } from "lucide-react";
import { DesignIcon } from "../../shared/shell/DesignIcon";
import { MeriAttachmentPicker } from "./uploads/MeriAttachmentPicker";
import { SelectedTabSharing } from "./selected-tab/SelectedTabSharing";
import type { ComposerAttachments } from "./uploads/attachment-slot";
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
  /**
   * Present only while Meri is busy with the last message and nothing else blocks: Enter or Send keeps
   * the draft as the one queued message, which is sent when the run finishes.
   */
  onQueue?: (() => void) | undefined;
  /** The draft is queued; Cancel keeps it in the box as an ordinary draft. */
  queued?: Readonly<{ onCancel: () => void }> | undefined;
  /** A block the person must act on (a retained request to retry); shown in place of the key hint. */
  notice?: string | undefined;
  /** Exact conversation selection is required before a durable draft can be entered. */
  draftBlocked?: string | undefined;
  /**
   * Why the selection controls are locked right now. This is the genuine lock set only
   * (run/storage/access/lifecycle/pending-or-unknown request), NOT the QuickActions rollout
   * refusal: a user must always be able to clear or change an unsent selection.
   */
  selectionLocked?: string | undefined;
  /** Why Stop is unavailable right now. */
  stopBlocked?: string | undefined;
  /** Verified client scope shown on the scope chip. */
  scope: string;
  /** Why attachments are unavailable. */
  attachUnavailable: string;
  modelSelection?: ConversationSubmitRequest["modelSelection"];
}>;

/** One selected context the next message carries; removal restores the unselected state. */
export type ComposerChip = Readonly<{
  key: string;
  label: string;
  onRemove?: (() => void) | undefined;
}>;

/** Why Enter cannot send right now, in the words the person should see; undefined when it can. */
export function sendBlockedReason(
  live: LiveComposer | undefined,
  running: boolean,
  draft: string,
) {
  if (!live) return "Sending is unavailable in this disconnected fixture.";
  if (running)
    return live.stopBlocked
      ? `Meri is still answering. ${live.stopBlocked}`
      : "Meri is still answering.";
  return (
    live.draftBlocked ??
    live.notice ??
    live.sendBlocked ??
    (draft.trim() ? undefined : "Type a message to send.")
  );
}

export function MeriComposer({
  draft,
  onDraft,
  textareaRef,
  assetSet = "home",
  running = false,
  live,
  tools,
  scopeControl,
  chips = [],
  attachments,
}: {
  draft: string;
  onDraft: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  assetSet?: AssetSet;
  /** A run is in progress: the submit slot shows Stop instead of Send. */
  running?: boolean;
  live?: LiveComposer;
  /** Optional per-message settings toggle; absent when the surface offers none. */
  tools?: {
    open: boolean;
    onToggle: () => void;
  };
  /** The one authorized client/scope control for this surface. */
  scopeControl?: React.ReactNode;
  /** Selected skill, window, work or model choices carried by the next message. */
  chips?: readonly ComposerChip[];
  /** The current conversation's attachment slot; absent until a session binds upload access. */
  attachments?: ComposerAttachments;
}) {
  const helpId = useId();
  const canSend =
    !!live &&
    !running &&
    !live.sendBlocked &&
    !live.draftBlocked &&
    !!draft.trim();
  const blockedReason = sendBlockedReason(live, running, draft);
  // Only a refused Enter shows the block reason; the next input change, a send, or a change of the
  // block reason clears it, so it never reappears without another refused Enter. During a run the
  // reason stays screen-reader-only as before.
  const [refused, setRefused] = useState<string | null>(null);
  const [seenReason, setSeenReason] = useState(blockedReason);
  if (seenReason !== blockedReason) {
    setSeenReason(blockedReason);
    setRefused(null);
  }
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
          // PromptInput resets its form before it calls here, and this textarea is controlled: React does not
          // restore a value it did not change, so a send that did not go out left an empty box over kept text
          // (2 Nov preview: "the second Enter cleared the composer with nothing sent"). Put the text back; a
          // send that goes out clears it through the draft.
          const area = textareaRef.current;
          if (area && area.value !== draft) area.value = draft;
          setRefused(null);
          if (canSend) live.onSend();
          else if (live?.onQueue && draft.trim()) live.onQueue();
        }}
      >
        {chips.length > 0 && (
          <PromptInputHeader className={styles.chips}>
            {chips.map((chip) => (
              <span key={chip.key} className={styles.chip}>
                <span className={styles.chipLabel}>{chip.label}</span>
                {chip.onRemove && (
                  <button
                    type="button"
                    className={styles.chipRemove}
                    aria-label={`Remove ${chip.label}`}
                    disabled={!!live?.selectionLocked}
                    title={
                      live?.selectionLocked ??
                      `Remove ${chip.label} from your next message`
                    }
                    onClick={chip.onRemove}
                  >
                    <X aria-hidden />
                  </button>
                )}
              </span>
            ))}
          </PromptInputHeader>
        )}
        <PromptInputBody>
          <PromptInputTextarea
            ref={textareaRef}
            className={styles.textarea}
            value={draft}
            readOnly={!!live?.draftBlocked}
            onChange={(event) => {
              setRefused(null);
              if (!live?.draftBlocked) onDraft(event.currentTarget.value);
            }}
            onKeyDown={(event) => {
              // A blocked send must not reach the form: its reset would clear the kept draft.
              // The person sees why instead of a key press that silently does nothing.
              if (
                live &&
                !canSend &&
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing &&
                event.nativeEvent.keyCode !== 229
              ) {
                event.preventDefault();
                if (live.onQueue && draft.trim()) live.onQueue();
                else if (!running) setRefused(blockedReason ?? null);
              }
            }}
            aria-label={live ? "Meri message" : "Message draft"}
            aria-describedby={helpId}
            placeholder="Ask Meri anything…"
            {...(live ? { maxLength: 8000 } : {})}
          />
        </PromptInputBody>
        <PromptInputFooter
          className={styles.composerFooter}
          style={{ flexWrap: "wrap" }}
        >
          <ComposerTools
            live={live}
            assetSet={assetSet}
            tools={tools}
            scopeControl={scopeControl}
            attachments={attachments}
          />
          <ComposerAction
            running={running}
            live={live}
            canSend={canSend}
            assetSet={assetSet}
            helpId={helpId}
          />
        </PromptInputFooter>
        <p className={styles.keyboardHint} id={helpId}>
          {/* Mounted once so a queued notice or a refused Enter is announced when it appears. */}
          <span role="status">
            {live?.queued ? (
              <>
                Queued: sends when Meri finishes.{" "}
                <button
                  type="button"
                  className={styles.queuedCancel}
                  onClick={() => {
                    live.queued?.onCancel();
                    textareaRef.current?.focus();
                  }}
                >
                  Cancel
                </button>
              </>
            ) : (
              refused
            )}
          </span>
          {!live?.queued && !refused && (
            <>
              {live?.draftBlocked ??
                live?.notice ??
                "Enter to send · Shift + Enter for a new line"}
              {blockedReason &&
                blockedReason !== live?.draftBlocked &&
                blockedReason !== live?.notice && (
                  <span className="sr-only">. {blockedReason}</span>
                )}
            </>
          )}
        </p>
      </PromptInput>
    </section>
  );
}

/** Attach, optional settings and the single scope control; nothing here sends. */
function ComposerTools({
  live,
  assetSet,
  tools,
  scopeControl,
  attachments,
}: {
  live: LiveComposer | undefined;
  assetSet: AssetSet;
  tools:
    | {
        open: boolean;
        onToggle: () => void;
      }
    | undefined;
  scopeControl?: React.ReactNode;
  attachments?: ComposerAttachments;
}) {
  return (
    <PromptInputTools
      className={styles.tools}
      style={{ flexWrap: "wrap", minWidth: 0 }}
    >
      {attachments?.available ? (
        <MeriAttachmentPicker slot={attachments} assetSet={assetSet} />
      ) : (
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
      )}
      {tools && (
        <button
          id="meri-tools-button"
          type="button"
          className={styles.toolButton}
          aria-expanded={tools.open}
          aria-controls="meri-tools-panel"
          aria-label="Tools"
          title="Skills, website, work, procedure and model settings"
          onClick={tools.onToggle}
        >
          <SlidersHorizontal aria-hidden className={styles.toolIcon} />
          Tools
        </button>
      )}
      {scopeControl ??
        (live && (
          <PromptInputButton
            className={styles.toolButton}
            disabled
            title="Client scope comes from your Portfolio selection"
          >
            <DesignIcon name="chevron" assetSet={assetSet} />
            {live.scope}
          </PromptInputButton>
        ))}
      {attachments?.selectedTab && live && (
        <SelectedTabSharing {...attachments.selectedTab} scope={live.scope} />
      )}
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
            ? (live.stopBlocked ?? "Stop asks Meri to end this answer")
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
      disabled={!canSend && !live?.onQueue}
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
