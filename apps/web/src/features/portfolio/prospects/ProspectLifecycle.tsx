import Link from "next/link";
import type { Prospect } from "./contracts";
import styles from "./prospects.module.css";

export function ProspectLifecycle({
  record,
  onRestore,
}: {
  record: Prospect;
  onRestore: () => void;
}) {
  if (record.status !== "dismissed" && !record.convertedAt) return null;
  const archived = record.status === "dismissed";
  return (
    <section
      className={`card stack ${styles.lifecycle}`}
      aria-label="Prospect lifecycle"
    >
      <header className="row between">
        <span className={styles.prospectBadge}>
          <img
            src="/design/411-64863-prospect-dot.svg"
            alt=""
            width={5}
            height={5}
          />
          {archived ? "Archived" : "Converted"}
        </span>
        {archived && (
          <button
            className={`button ${styles.compactButton}`}
            onClick={onRestore}
          >
            Restore prospect
          </button>
        )}
        {record.convertedAt && record.linkedClientId && (
          <Link
            className={`button ${styles.compactButton}`}
            href={`/portfolio/${record.linkedClientId}`}
          >
            Go to linked client
          </Link>
        )}
      </header>
      <p>
        {archived
          ? "This prospect is archived. Restore it to resume contact changes."
          : "This prospect has been converted. Continue work in the linked client."}
      </p>
      <small>Pipeline history and saved records remain available.</small>
    </section>
  );
}
