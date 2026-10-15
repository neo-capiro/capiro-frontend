"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import ui from "../../ui/meri-ui.module.css";
import shared from "./artifacts.module.css";
import styles from "./web.module.css";

/** Code block without highlighting: numbered lines in a plain pre/code element. */
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
        <code>
          {lines.map((line, index) => (
            <span key={index}>
              <span className={styles.lineNumber} aria-hidden>
                {String(index + 1).padStart(2, "0")}
              </span>
              {line}
              {"\n"}
            </span>
          ))}
        </code>
      </pre>
      <p className={shared.liveStatus} role="status">
        {copied}
      </p>
    </section>
  );
}

/** Terminal-style verification activity recorded for the generated output. */
export function VerificationActivity({
  steps,
  note,
  unavailable,
}: {
  steps: readonly string[];
  note: string;
  unavailable: string;
}) {
  return (
    <section className={shared.panel} aria-label="Verification activity">
      <h2 className={shared.panelTitle}>Verification activity</h2>
      <ul className={styles.activity}>
        {steps.map((step) => (
          <li key={step}>✓ {step}</li>
        ))}
      </ul>
      <p className={shared.caption}>{note}</p>
      <button type="button" className={ui.outline} disabled title={unavailable}>
        <ChevronDown aria-hidden /> Download source bundle
      </button>
    </section>
  );
}
