"use client";
import { useId } from "react";
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
              if (!live?.draftBlocked) onDraft(event.currentTarget.value);
            }}
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
          {live?.draftBlocked ?? "Enter to send · Shift + Enter for a new line"}
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
