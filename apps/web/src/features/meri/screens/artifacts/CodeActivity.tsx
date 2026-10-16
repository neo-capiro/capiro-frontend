"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import ui from "../../ui/meri-ui.module.css";
import shared from "./artifacts.module.css";
import styles from "./web.module.css";

/** Code block without highlighting: the generated source in a plain pre/code element. */
export function CodeView({
  label,
  lines,
}: {
  label: string;
  lines: readonly string[];
}) {
  const [copied, setCopied] = useState("");
  const copy = () => {
    navigator.clipboard
      ?.writeText(lines.join("\n"))
      .then(() => setCopied("Code copied to the clipboard."))
      .catch(() => setCopied("Copy is not available in this browser."));
  };
  return (
    <section className={shared.panel} aria-label="Source code">
      <div className={styles.codeHeader}>
        <p className={`${shared.caption} ${shared.mono}`}>{label}</p>
        <button type="button" className={ui.ghost} onClick={copy}>
          Copy code
        </button>
      </div>
      <pre className={styles.code}>
        <code>{lines.join("\n")}</code>
      </pre>
      <p className={shared.liveStatus} role="status">
        {copied}
      </p>
    </section>
  );
}

/** A recorded verification log: checked steps (03.07) or a version receipt with its statement (03.07A). */
export type VerificationLog = {
  title: string;
  lines: readonly string[];
  checked: boolean;
  statement?: string;
};

/** Terminal-style verification activity recorded for the generated output. */
export function VerificationActivity({
  log,
  note,
  unavailable,
}: {
  log: VerificationLog;
  note: string;
  unavailable: string;
}) {
  return (
    <section className={shared.panel} aria-label={log.title}>
      <h2 className={shared.panelTitle}>{log.title}</h2>
      <div className={styles.activity}>
        <ul>
          {log.lines.map((line) => (
            <li key={line}>{log.checked ? `✓ ${line}` : line}</li>
          ))}
        </ul>
        {log.statement ? <p>{log.statement}</p> : null}
      </div>
      <p className={shared.caption}>{note}</p>
      <button type="button" className={ui.outline} disabled title={unavailable}>
        <ChevronDown aria-hidden /> Download source bundle
      </button>
    </section>
  );
}
