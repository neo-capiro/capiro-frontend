"use client";
import { useState, type ReactNode } from "react";
import { SegmentedTabs } from "../../ui/SegmentedTabs";
import shared from "./artifacts.module.css";
import styles from "./document.module.css";

type Pane = "conversation" | "artifact";

/**
 * Conversation beside the artifact on desktop; on tablet and phone (Figma 10.03, 10.06 and
 * the drafting variants) one pane at a time with a Chat/Document switch, artifact first.
 */
export function WorkspacePanes({
  conversation,
  artifact,
  artifactLabel,
}: {
  conversation: ReactNode;
  artifact: ReactNode;
  artifactLabel: string;
}) {
  const [pane, setPane] = useState<Pane>("artifact");
  return (
    <>
      <div className={styles.paneSwitch}>
        <SegmentedTabs
          label="Workspace pane"
          options={[
            { id: "conversation", label: "Chat" },
            { id: "artifact", label: artifactLabel },
          ]}
          value={pane}
          onChange={setPane}
        />
      </div>
      <div className={`${shared.columns} ${styles.panes}`} data-pane={pane}>
        {conversation}
        {artifact}
      </div>
    </>
  );
}
