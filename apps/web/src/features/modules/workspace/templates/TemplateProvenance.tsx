"use client";
import Link from "next/link";
import { useState } from "react";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import { ActionButton, Modal, StatusPanel } from "../../../../shared/module-ui";
import styles from "./template-provenance.module.css";

const categories = [
  ["inherited", "Inherited"],
  ["refreshed", "Refreshed for this campaign"],
  ["unresolved", "Needs your decision"],
  ["unavailable", "Unavailable"],
] as const;

/** Always read the canonical current-access endpoint; a retained receipt is not access. */
export function TemplateProvenance({
  sessionId,
  expectedApplicationId,
}: {
  sessionId: string;
  expectedApplicationId?: string;
}) {
  const [open, setOpen] = useState(true);
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
    <>
      {!open && (
        <ActionButton
          onClick={() => {
            query.reload();
            setOpen(true);
          }}
        >
          View campaign receipt
        </ActionButton>
      )}
      <Modal
        open={open}
        onOpenChange={setOpen}
        className={styles.dialog}
        title={
          data && !mismatch
            ? `${data.receiptJsonb.templateName} · v${data.versionNumber}`
            : "Template application"
        }
        footer={
          data &&
          !mismatch &&
          !query.error && (
            <ActionButton primary asChild>
              <Link
                href={`/modules/engagement?session=${encodeURIComponent(sessionId)}`}
              >
                Continue to campaign
              </Link>
            </ActionButton>
          )
        }
      >
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
              className={styles.body}
              aria-label="Campaign template provenance"
            >
              {categories.map(([section, label]) => (
                <section
                  key={section}
                  className={styles.category}
                  data-category={section}
                >
                  <h3>{label}</h3>
                  <dl className={styles.rows}>
                    {data.receiptJsonb[section].map((item, index) => (
                      <div
                        key={`${item.field}:${index}`}
                        className={styles.row}
                      >
                        <dt>{item.label}</dt>
                        <dd>{item.detail ?? "Not provided"}</dd>
                      </div>
                    ))}
                  </dl>
                  {!data.receiptJsonb[section].length && (
                    <p className={styles.empty}>None</p>
                  )}
                </section>
              ))}
              <p className={styles.note}>
                {data.receiptJsonb.nextRequiredStep ??
                  "Review recipients and live evidence in Outreach."}
              </p>
            </section>
          )}
        </StatusPanel>
      </Modal>
    </>
  );
}
