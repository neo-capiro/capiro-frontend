"use client";
import { useRef, useState } from "react";
import { ArrowUpRight, Sparkle } from "lucide-react";
import { MeriComposer } from "../../MeriComposer";
import ui from "../../ui/meri-ui.module.css";
import { ArtifactCard } from "./ArtifactCard";
import type { ConversationView } from "./types";
import styles from "./document.module.css";

/** Conversation beside an open artifact: request, Meri's reply, the artifact and a local draft. */
export function ConversationPane({
  view,
  unavailable,
}: {
  view: ConversationView;
  unavailable: string;
}) {
  const [draft, setDraft] = useState(view.draft);
  const textarea = useRef<HTMLTextAreaElement>(null);
  return (
    <section className={styles.conversation} aria-label="Conversation">
      <p className={styles.userMessage}>{view.request}</p>
      <div className={styles.meriMessage}>
        <p className={styles.identity}>
          <Sparkle aria-hidden /> Meri
        </p>
        <p className={styles.reply}>{view.reply}</p>
      </div>
      <ArtifactCard file={view.artifact} unavailable={unavailable} />
      <button type="button" className={ui.ghost} disabled title={unavailable}>
        <ArrowUpRight aria-hidden /> {view.sourcesLabel}
      </button>
      <MeriComposer
        draft={draft}
        onDraft={setDraft}
        textareaRef={textarea}
        assetSet="cited-answer"
      />
    </section>
  );
}
