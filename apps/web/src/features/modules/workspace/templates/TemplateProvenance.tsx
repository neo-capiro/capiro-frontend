"use client";
import Link from "next/link";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import { StatusPanel } from "../../../../shared/module-ui";
import styles from "../workspace.module.css";

/** Always read the canonical current-access endpoint; a retained receipt is not access. */
export function TemplateProvenance({
  sessionId,
  expectedApplicationId,
}: {
  sessionId: string;
  expectedApplicationId?: string;
}) {
  const query = useCapiroQuery("workspace.template.provenance", {
    params: { sessionId },
  });
  const data = query.data;
  const mismatch =
    data &&
    (data.sessionId !== sessionId ||
      (expectedApplicationId && data.applicationId !== expectedApplicationId) ||
      data.receiptJsonb.templateVersionId !== data.templateVersionId ||
      data.receiptJsonb.templateId !== data.templateId ||
      data.receiptJsonb.templateVersionNumber !== data.versionNumber ||
      data.receiptJsonb.templateContentHash !== data.contentHash);
  return (
    <StatusPanel
      loading={query.loading}
      error={
        mismatch
          ? "The campaign provenance does not match this selection."
          : query.error
      }
      onRetry={query.reload}
    >
      {data && !mismatch && (
        <section
          className={styles.form}
          aria-label="Campaign template provenance"
        >
          <h3>
            From template · {data.receiptJsonb.templateName} · v
            {data.versionNumber}
          </h3>
          {(
            ["inherited", "refreshed", "unresolved", "unavailable"] as const
          ).map((section) => (
            <section key={section}>
              <h4>{section[0]!.toUpperCase() + section.slice(1)}</h4>
              {data.receiptJsonb[section].map((item, index) => (
                <p key={`${item.field}:${index}`}>
                  <strong>{item.label}</strong> {item.detail}
                </p>
              ))}
              {!data.receiptJsonb[section].length && <p>None</p>}
            </section>
          ))}
          <p>
            {data.receiptJsonb.nextRequiredStep ??
              "Review recipients and live evidence in Outreach."}
          </p>
          <Link
            href={`/modules/engagement?session=${encodeURIComponent(sessionId)}`}
          >
            Open Outreach draft →
          </Link>
        </section>
      )}
    </StatusPanel>
  );
}
