"use client";
import { useState } from "react";
import type { PreviewLink } from "./content/preview-links";
import styles from "./content/content.module.css";

export function PreviewLinks({ links }: { links: PreviewLink[] }) {
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const count = links.filter((link) => reviewed.has(link.key)).length;
  return (
    <details className={styles.panel}>
      <summary>Check email links</summary>
      <p>
        {count} of {links.length} links reviewed. These checks inspect
        destination format and in-email anchors. They do not contact websites or
        confirm that a page is available.
      </p>
      <p>
        Edit destinations in block settings, then check the updated preview.
      </p>
      {!links.length && <p>No links in this preview.</p>}
      <ul className={styles.stack} aria-label="Email link checks">
        {links.map((link) => (
          <li key={link.key}>
            <strong>{link.label}</strong>
            <p style={{ overflowWrap: "anywhere" }}>
              {link.url || "Missing destination"}
            </p>
            <p>{link.status}</p>
            <label>
              <input
                type="checkbox"
                checked={reviewed.has(link.key)}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setReviewed((current) => {
                    const next = new Set(current);
                    if (checked) next.add(link.key);
                    else next.delete(link.key);
                    return next;
                  });
                }}
              />{" "}
              Reviewed {link.label}
            </label>
          </li>
        ))}
      </ul>
    </details>
  );
}
