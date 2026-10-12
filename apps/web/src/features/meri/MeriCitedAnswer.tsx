"use client";

import { useRef, useState } from "react";
import { Button } from "@capiro/ui/button";
import { DesignIcon } from "../../shared/shell/DesignIcon";
import { MeriComposer } from "./MeriComposer";
import styles from "./cited-answer.module.css";

const initialDraft =
  "Create the brief and include a table of open commitments.";
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

export function MeriCitedAnswer() {
  const [draft, setDraft] = useState(initialDraft);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<
    "idle" | "copied" | "unavailable"
  >("idle");
  const textarea = useRef<HTMLTextAreaElement>(null);

  const showSource = (id?: string) => {
    setSelectedSource(id ?? null);
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
        <div className={styles.question}>
          What should I know before next week’s Anduril meeting?
        </div>
        <article className={styles.answer} aria-label="Synthetic Meri answer">
          <div className={styles.identity}>
            <DesignIcon name="assistant-sparkle" assetSet="cited-answer" />
            <span>Meri</span>
          </div>
          <p>Three items need attention before your meeting.</p>
          <h2>1. Confirm the FY27 funding position</h2>
          <p>
            The latest authorized funding update provides the current public
            baseline. Confirm the client’s priorities before turning this into
            an outreach recommendation.
          </p>
          <Button
            type="button"
            variant="ghost"
            className={styles.citation}
            onClick={() => showSource("funding")}
            aria-label="Show sample source 1, Funding update"
          >
            <DesignIcon name="external" assetSet="cited-answer" />
            [1] Funding update
          </Button>
          <h2>2. Resolve the open commitment</h2>
          <p>
            The client task record shows a restoration request awaiting
            follow-up.{" "}
            <button
              type="button"
              className={styles.inlineCitation}
              onClick={() => showSource("task")}
              aria-label="Show sample source 2, Client task record"
            >
              [2]
            </button>
          </p>
          <div className={styles.tableScroll}>
            <table
              className={styles.table}
              aria-label="Sample open commitments"
            >
              <colgroup>
                <col className={styles.itemColumn} />
                <col className={styles.statusColumn} />
                <col className={styles.nextColumn} />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col">Status</th>
                  <th scope="col">Next step</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Restoration request</td>
                  <td>Open</td>
                  <td>Confirm owner</td>
                </tr>
                <tr>
                  <td>Client brief</td>
                  <td>Due 10 Oct</td>
                  <td>Review latest version</td>
                </tr>
              </tbody>
            </table>
          </div>
          <h2>3. Take a short, sourced brief</h2>
          <p>
            I can create a meeting brief from these sources, flag the missing
            attachment, and preserve links to the original records.
          </p>
          <div
            className={styles.followups}
            aria-label="Local draft suggestions"
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => chooseDraft(initialDraft)}
            >
              <DesignIcon name="files" assetSet="cited-answer" />
              Create meeting brief
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                chooseDraft(
                  "Draft a task to confirm the owner of the restoration request.",
                )
              }
            >
              <DesignIcon name="plus-secondary" assetSet="cited-answer" />
              Draft a task
            </Button>
          </div>
          <div className={styles.messageActions} aria-label="Answer actions">
            <Button type="button" variant="ghost" onClick={copyAnswer}>
              {copyStatus === "copied" ? "Copied" : "Copy"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSelectedSource(null);
                setSourcesOpen((open) => !open);
              }}
              aria-expanded={sourcesOpen}
              aria-controls="sample-sources"
            >
              Sources
            </Button>
            {["Retry", "Fork", "Helpful"].map((label) => (
              <Button
                key={label}
                type="button"
                variant="ghost"
                disabled
                title={`${label} requires a connected, authorized conversation`}
                className={styles.unavailable}
              >
                {label}
              </Button>
            ))}
            <span className="sr-only" role="status">
              {copyStatus === "unavailable"
                ? "Copy unavailable in this browser"
                : copyStatus === "copied"
                  ? "Answer copied"
                  : ""}
            </span>
          </div>
          {sourcesOpen && (
            <section
              id="sample-sources"
              className={styles.sourcePanel}
              aria-label="Sample source references"
            >
              <h3>Sample sources</h3>
              <p>
                These references are design fixtures. No linked source record or
                current authorization is available.
              </p>
              <ul>
                {sources.map((source) => (
                  <li
                    key={source.id}
                    className={
                      selectedSource === source.id
                        ? styles.selectedSource
                        : undefined
                    }
                  >
                    <strong>{source.label}</strong>
                    <span>{source.detail}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>
      </div>

      <MeriComposer
        draft={draft}
        onDraft={setDraft}
        textareaRef={textarea}
        assetSet="cited-answer"
      />
    </div>
  );
}
