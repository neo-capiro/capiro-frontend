"use client";
import type {
  PublicationClaim,
  PublicationEvidence,
} from "../../../../../shared/capiro/operations/legiwatch-publication-schemas";
import { ActionButton, Field, TextArea } from "../../../../../shared/module-ui";
import { SelectField, timecode } from "../components";
import styles from "../legiwatch.module.css";

export function PublicationClaimsEditor({
  claims,
  onChange,
  evidence,
}: {
  claims: PublicationClaim[];
  onChange: (claims: PublicationClaim[]) => void;
  evidence: PublicationEvidence[];
}) {
  function patch(id: string, values: Partial<PublicationClaim>) {
    onChange(
      claims.map((claim) =>
        claim.id === id ? { ...claim, ...values } : claim,
      ),
    );
  }
  return (
    <div className={styles.list}>
      {claims.map((claim, index) => (
        <section className={styles.card} key={claim.id}>
          <div className={styles.row}>
            <h2>Claim {index + 1}</h2>
            <ActionButton
              onClick={() =>
                onChange(claims.filter((item) => item.id !== claim.id))
              }
            >
              Remove claim
            </ActionButton>
          </div>
          <SelectField
            id={`claim-kind-${claim.id}`}
            label="Claim type"
            value={claim.kind}
            onChange={(value) =>
              patch(claim.id, { kind: value as PublicationClaim["kind"] })
            }
          >
            <option value="quote">Quote · Exact testimony</option>
            <option value="observation">
              Observation · Supported factual description
            </option>
            <option value="analysis">Analysis · Explicit inference</option>
          </SelectField>
          <Field label="Claim text" htmlFor={`claim-text-${claim.id}`}>
            <TextArea
              id={`claim-text-${claim.id}`}
              value={claim.text}
              maxLength={2500}
              rows={5}
              onChange={(event) =>
                patch(claim.id, { text: event.target.value })
              }
            />
          </Field>
          <strong>Supporting exact evidence</strong>
          {evidence.map((item) => (
            <label className={styles.check} key={item.segmentId}>
              <input
                type="checkbox"
                checked={claim.evidenceIds.includes(item.segmentId)}
                onChange={(event) =>
                  patch(claim.id, {
                    evidenceIds: event.target.checked
                      ? [...claim.evidenceIds, item.segmentId]
                      : claim.evidenceIds.filter((id) => id !== item.segmentId),
                  })
                }
              />
              {timecode(item.startMs)} ·{" "}
              {item.speakerLabel ?? "Speaker not identified"} ·{" "}
              {item.text.slice(0, 140)}
              {item.text.length > 140 ? "…" : ""}
            </label>
          ))}
        </section>
      ))}
      <ActionButton
        disabled={claims.length >= 100}
        onClick={() =>
          onChange([
            ...claims,
            {
              id: crypto.randomUUID(),
              kind: "observation",
              text: "",
              evidenceIds: [],
            },
          ])
        }
      >
        Add supported claim
      </ActionButton>
    </div>
  );
}
