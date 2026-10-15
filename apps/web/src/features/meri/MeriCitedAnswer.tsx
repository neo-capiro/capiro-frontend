"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import { MeriComposer } from "./MeriComposer";
import { StatusToast } from "./ui/StatusToast";
import { UserMessage } from "./screens/conversation/UserMessage";
import { CitedAnswerMessage } from "./screens/conversation/CitedAnswerMessage";
import {
  CitedAnswerActions,
  type CopyStatus,
} from "./screens/conversation/CitedAnswerActions";
import ui from "./ui/meri-ui.module.css";
import styles from "./cited-answer.module.css";

const followUps = {
  brief: "Create the brief and include a table of open commitments.",
  task: "Draft a task to confirm the owner of the restoration request.",
};
const answerCopy = [
  "Three items need attention before your meeting.",
  "1. Confirm the FY27 funding position",
  "The latest authorized funding update provides the current public baseline. Confirm the client’s priorities before turning this into an outreach recommendation. [1] Funding update",
  "2. Resolve the open commitment",
  "The client task record shows a restoration request awaiting follow-up. [2]",
  "Item | Status | Next step",
  "Restoration request | Open | Confirm owner",
  "Client brief | Due 10 Oct | Review latest version",
  "3. Take a short, sourced brief",
  "I can create a meeting brief from these sources, flag the missing attachment, and preserve links to the original records.",
].join("\n");

const sources = [
  {
    id: "funding",
    label: "[1] Funding update",
    detail:
      "Sample funding reference from the Figma design. No authorized record is connected.",
  },
  {
    id: "task",
    label: "[2] Client task record",
    detail:
      "Sample restoration request from the Figma design. No authorized task is connected.",
  },
] as const;

/** 01.02 Cited answer fixture: local draft, citation disclosure and clipboard copy with its toast. */
export function MeriCitedAnswer() {
  const [draft, setDraft] = useState(followUps.brief);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [toast, setToast] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);

  const showSource = (id: string) => {
    setSelectedSource(id);
    setSourcesOpen(true);
  };
  const chooseDraft = (value: string) => {
    setDraft(value);
    textarea.current?.focus();
  };
  const copyAnswer = async () => {
    try {
      await navigator.clipboard.writeText(answerCopy);
      setCopyStatus("copied");
      setToast(true);
    } catch {
      setCopyStatus("unavailable");
    }
  };

  return (
    <div className={styles.view}>
      <div className={styles.heading}>
        <div>
          <h1>Anduril meeting brief</h1>
          <p>Anduril · Sample conversation · Not saved</p>
        </div>
        <span className={styles.meriMark} role="img" aria-label="Meri" />
      </div>
      <div className={styles.conversation}>
        <UserMessage>
          What should I know before next week’s Anduril meeting?
        </UserMessage>
        <CitedAnswerMessage
          followUps={followUps}
          onShowSource={showSource}
          onChooseDraft={chooseDraft}
        >
          <CitedAnswerActions
            copyStatus={copyStatus}
            onCopy={copyAnswer}
            sources={sources}
            sourcesOpen={sourcesOpen}
            selectedSource={selectedSource}
            onToggleSources={() => {
              setSelectedSource(null);
              setSourcesOpen((open) => !open);
            }}
          />
        </CitedAnswerMessage>
      </div>
      <MeriComposer
        draft={draft}
        onDraft={setDraft}
        textareaRef={textarea}
        assetSet="cited-answer"
      />
      {toast ? (
        <StatusToast
          title="Copied"
          action={
            <button
              type="button"
              className={ui.ghost}
              onClick={() => setToast(false)}
            >
              <X aria-hidden /> Dismiss
            </button>
          }
        >
          Response copied to your clipboard.
        </StatusToast>
      ) : null}
    </div>
  );
}
