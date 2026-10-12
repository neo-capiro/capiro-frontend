import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputButton,
} from "@capiro/ui/prompt-input";
import { Button } from "@capiro/ui/button";
import { DesignIcon } from "../../shared/shell/DesignIcon";
import styles from "./home.module.css";

export function MeriComposer({
  draft,
  onDraft,
  textareaRef,
  assetSet = "home",
}: {
  draft: string;
  onDraft: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  assetSet?: "home" | "cited-answer";
}) {
  return (
    <section className={styles.composerFrame} aria-label="Local draft composer">
      <PromptInput
        className={styles.composer}
        maxFiles={0}
        globalDrop={false}
        onSubmit={(_message, event) => event.preventDefault()}
      >
        <PromptInputBody>
          <PromptInputTextarea
            ref={textareaRef}
            className={styles.textarea}
            value={draft}
            onChange={(event) => onDraft(event.currentTarget.value)}
            aria-label="Message draft"
            aria-describedby="send-help"
            placeholder="Ask Meri to research, analyze, or create something…"
          />
        </PromptInputBody>
        <PromptInputFooter className={styles.composerFooter}>
          <PromptInputTools className={styles.tools}>
            <PromptInputButton
              className={styles.toolButton}
              disabled
              title="Attachments require the connected artifact contract"
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
              title="Anduril is a synthetic sample, not an authorized scope"
            >
              <DesignIcon name="chevron" assetSet={assetSet} />
              Anduril
            </PromptInputButton>
          </PromptInputTools>
          <Button
            type="submit"
            className={styles.send}
            disabled
            aria-label="Send unavailable: disconnected fixture"
            title="Sending is unavailable until trusted backend contracts are integrated"
          >
            <DesignIcon name="send" assetSet={assetSet} />
            Send
          </Button>
        </PromptInputFooter>
        <p className={styles.keyboardHint} id="send-help">
          Enter to send · Shift + Enter for a new line
          <span className="sr-only">
            . Sending is currently unavailable in this disconnected synthetic
            fixture.
          </span>
        </p>
      </PromptInput>
    </section>
  );
}
