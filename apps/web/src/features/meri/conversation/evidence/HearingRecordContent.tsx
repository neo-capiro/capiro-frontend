import type { HearingSourceReadResponse } from "@capiro/meri-contracts/conversation-sources";
import { FieldTable } from "../../ui/FieldTable";
import { savedTime } from "./SourceReadState";
import surfaces from "../../ui/surfaces.module.css";
import phone from "../../ui/phone-fields.module.css";
import styles from "./evidence.module.css";

type Payload =
  HearingSourceReadResponse["current"]["result"]["records"][number]["payload"];
type Brief = Extract<Payload, { kind: "capiro_published_record_brief" }>;
type Reconciliation = Extract<
  Payload,
  { kind: "capiro_record_reconciliation" }
>;
type Claim = Brief["payload"]["claims"][number];
type Assessment = Reconciliation["assessments"][number];

function References({ references }: { references: Claim["references"] }) {
  return (
    <ul
      className={styles.recordReferences}
      aria-label="Owner source references"
    >
      {references.map((reference, index) => (
        <li key={index}>
          {reference.id} · {reference.hash} · {reference.locator}
        </li>
      ))}
    </ul>
  );
}

function OwnerClaims({ claims }: { claims: readonly Claim[] }) {
  return (
    <section className={styles.usageSection} aria-label="Owner claims">
      <h3 className={surfaces.sectionTitle}>Owner claims</h3>
      <p className={surfaces.caption}>
        These claims belong to this source record. They are not a mapping to
        statements in Meri’s answer.
      </p>
      {claims.length === 0 && <p>No claims are included in this record.</p>}
      {claims.map((claim, index) => (
        <article className={styles.model} key={`${claim.id}:${index}`}>
          <h4>
            {claim.id} · {claim.kind}
          </h4>
          <p className={styles.text}>{claim.text}</p>
          <p className={surfaces.caption}>
            {claim.scope === "hearing_event"
              ? "Hearing claim"
              : "Bill record claim"}
            {claim.billId ? ` · ${claim.billId}` : ""}
          </p>
          <References references={claim.references} />
        </article>
      ))}
    </section>
  );
}

function OwnerAssessments({
  assessments,
}: {
  assessments: readonly Assessment[];
}) {
  return (
    <section
      className={styles.usageSection}
      aria-label="Owner assessments and reviews"
    >
      <h3 className={surfaces.sectionTitle}>Owner assessments and reviews</h3>
      {assessments.length === 0 && (
        <p>No assessments are included in this record.</p>
      )}
      {assessments.map((assessment, index) => (
        <article className={styles.model} key={`${assessment.id}:${index}`}>
          <h4>Assessment · {assessment.id}</h4>
          <div className={phone.stackOnPhone}>
            <FieldTable
              caption={`Assessment ${assessment.id}`}
              fieldLabel="Assessment field"
              shares={[220, 414]}
              rows={[
                { label: "Claim reference", value: assessment.claimId },
                { label: "Claim version", value: assessment.claimHash },
                {
                  label: "Owner outcome",
                  value: assessment.outcome.replaceAll("_", " "),
                },
                {
                  label: "Review required",
                  value: assessment.requiresReview ? "Yes" : "No",
                },
                { label: "Rationale", value: assessment.rationale },
                {
                  label: "Supported",
                  value: assessment.supported.join("; ") || "None recorded",
                },
                {
                  label: "Unresolved",
                  value: assessment.unresolved.join("; ") || "None recorded",
                },
              ]}
            />
          </div>
          <References references={assessment.references} />
          {assessment.reviews.map((review, reviewIndex) => (
            <section
              className={styles.model}
              key={`${review.id}:${reviewIndex}`}
              aria-label={`Owner review ${review.id}`}
            >
              <h4>Review · {review.outcome.replaceAll("_", " ")}</h4>
              <p className={styles.text}>{review.rationale}</p>
              <p className={surfaces.caption}>
                {review.reviewer} · {savedTime(review.createdAt)}
              </p>
              <References references={review.references} />
            </section>
          ))}
        </article>
      ))}
    </section>
  );
}

/** Render only already-admitted owner data; fragments never become claims collections. */
export function HearingRecordContent({ payload }: { payload: Payload }) {
  if ("contentFormat" in payload && payload.contentFormat === "json_fragment") {
    return (
      <>
        <h3 className={surfaces.sectionTitle}>Saved record fragment</h3>
        <p className={surfaces.caption}>
          This is part of the original record. It is not a complete record or
          claims collection.
        </p>
        <pre className={styles.recordText}>{payload.text}</pre>
      </>
    );
  }
  const owner =
    "payload" in payload &&
    (payload.kind === "capiro_published_record_brief" ||
      payload.kind === "capiro_record_reconciliation")
      ? payload
      : undefined;
  return (
    <>
      {"authority" in payload && (
        <p className={surfaces.caption}>{payload.authority}</p>
      )}
      {owner && <OwnerClaims claims={owner.payload.claims} />}
      {owner && "assessments" in owner && (
        <OwnerAssessments assessments={owner.assessments} />
      )}
      <details className={styles.recordData}>
        <summary>View saved record data</summary>
        <pre className={styles.recordText}>
          {JSON.stringify(payload, null, 2)}
        </pre>
      </details>
    </>
  );
}
