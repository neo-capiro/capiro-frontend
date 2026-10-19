import Link from "next/link";
import { Bold, Italic, Underline } from "lucide-react";
import type { DocumentMode, DocumentOverlay } from "./useDocumentDraft";
import styles from "./document.module.css";

const formatting = [
  { label: "Undo", text: "↶" },
  { label: "Redo", text: "↷" },
  { divider: true },
  { label: "Text style", text: "Text ⌄" },
  { label: "Bold", icon: Bold },
  { label: "Italic", icon: Italic },
  { label: "Underline", icon: Underline },
  { label: "Link", text: "Link" },
  { label: "Lists", text: "Lists" },
  { label: "Table", text: "Table" },
  { divider: true },
] as const;

/** v2/Document editor toolbar: Viewing (read-only artifact) or Editing (working draft). */
export function DocumentToolbar({
  editable,
  mode,
  overlay,
  onToggle,
  editHref,
  unavailable,
}: {
  editable: boolean;
  mode: DocumentMode;
  overlay: DocumentOverlay | null;
  onToggle: (id: DocumentOverlay) => void;
  editHref?: string | undefined;
  unavailable: string;
}) {
  const trigger = (id: DocumentOverlay) => ({
    type: "button" as const,
    "aria-expanded": overlay === id,
    "aria-haspopup": "dialog" as const,
    onClick: () => onToggle(id),
  });
  return (
    <div className={styles.toolbar} role="group" aria-label="Document toolbar">
      {formatting.map((tool, index) =>
        "divider" in tool ? (
          <span key={index} className={styles.toolDivider} aria-hidden />
        ) : (
          <button
            key={tool.label}
            type="button"
            className={styles.tool}
            disabled
            title={unavailable}
            aria-label={tool.label}
          >
            {"icon" in tool ? <tool.icon aria-hidden /> : tool.text}
          </button>
        ),
      )}
      {editable ? (
        <button className={styles.tool} {...trigger("blocks")}>
          + Insert
        </button>
      ) : (
        <button
          type="button"
          className={styles.tool}
          disabled
          title={unavailable}
        >
          + Insert
        </button>
      )}
      <span className={styles.toolSpacer} />
      <button className={styles.tool} {...trigger("comments")}>
        Comments
      </button>
      {editable ? (
        <button className={styles.tool} {...trigger("mode")}>
          {mode} ⌄
        </button>
      ) : editHref ? (
        <Link className={styles.tool} href={editHref}>
          Edit document
        </Link>
      ) : null}
      <button className={styles.toolOutline} {...trigger("revision")}>
        ✦ Meri
      </button>
    </div>
  );
}
