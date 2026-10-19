"use client";
import { useId, useState, type Ref } from "react";
import { X } from "lucide-react";
import { StatusPill } from "../../ui/StatusPill";
import ui from "../../ui/meri-ui.module.css";
import shared from "./artifacts.module.css";
import styles from "./versions.module.css";

export type RevisionRequestDefaults = {
  request: string;
  versions: readonly { id: string; label: string }[];
  keep: string;
  formats: readonly string[];
  nextVersion: number;
};

/** Dialog · What should change?: editable local request; Create version is not executed. */
export function RevisionRequestForm({
  view,
  hidden,
  onClose,
  requestRef,
  unavailable,
}: {
  view: RevisionRequestDefaults;
  hidden: boolean;
  onClose: () => void;
  requestRef: Ref<HTMLInputElement>;
  unavailable: string;
}) {
  const id = useId();
  const [request, setRequest] = useState(view.request);
  const [version, setVersion] = useState(view.versions[0]?.id ?? "");
  const [keep, setKeep] = useState(view.keep);
  return (
    <section
      className={styles.dialog}
      hidden={hidden}
      aria-labelledby={`${id}-title`}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div className={styles.dialogHeading}>
        <h2 id={`${id}-title`}>What should change?</h2>
        <button
          type="button"
          className={ui.ghost}
          aria-label="Close revision request"
          onClick={onClose}
        >
          <X aria-hidden />
        </button>
      </div>
      <p className={styles.lede}>
        Meri creates a new version and verifies the result before publishing.
      </p>
      <label className={shared.field}>
        Revision request
        <input
          ref={requestRef}
          className={shared.input}
          value={request}
          onChange={(event) => setRequest(event.target.value)}
        />
      </label>
      <label className={shared.field}>
        Use this version
        <select
          className={shared.input}
          value={version}
          onChange={(event) => setVersion(event.target.value)}
        >
          {view.versions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className={shared.field}>
        Keep
        <input
          className={shared.input}
          value={keep}
          onChange={(event) => setKeep(event.target.value)}
        />
      </label>
      <div className={ui.row} role="group" aria-label="Output formats">
        {view.formats.map((format) => (
          <StatusPill key={format}>{format}</StatusPill>
        ))}
      </div>
      <div className={ui.row}>
        <button type="button" className={ui.outline} onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className={ui.primary}
          disabled
          title={unavailable}
        >
          Create version {view.nextVersion}
        </button>
      </div>
    </section>
  );
}
