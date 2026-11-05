import Link from "next/link";
import { profileHref } from "./subject";
import { safeEvidenceUrl } from "./contracts";
import {
  identityCandidates,
  identitySelectionKey,
  candidateSelection,
  type IdentityPreview,
  type IdentitySelection,
  type IdentityClaim,
} from "./identity";
import styles from "./profile-build.module.css";
const sourceLabels = {
  sam: "SAM.gov",
  lda: "LDA filings",
  sec: "SEC filings",
  website: "Company website",
  document: "Uploaded document",
};
const claimKey = (claim: IdentityClaim) =>
  JSON.stringify([
    claim.kind,
    claim.name,
    claim.sourceUrl,
    claim.attachmentId,
    claim.quote,
  ]);
export function IdentityMatch({
  preview,
  selected,
  onSelect,
  disabled,
  allowSeparate = true,
}: {
  preview: IdentityPreview;
  disabled?: boolean;
  allowSeparate?: boolean;
  selected?: IdentitySelection;
  onSelect: (selection: IdentitySelection) => void;
}) {
  if (preview.duplicate)
    return (
      <div className={styles.evidence}>
        <strong>This company already has a profile</strong>
        <p>{preview.duplicate.name}</p>
        <Link className="button primary" href={profileHref(preview.duplicate)}>
          Open existing profile
        </Link>
      </div>
    );
  const matches = identityCandidates(preview);
  const selectedKey = identitySelectionKey(selected);
  return (
    <fieldset className={styles.codeSelector} disabled={disabled}>
      <legend>
        {preview.status === "exact"
          ? "Confirm company match"
          : preview.status === "ambiguous"
            ? "Choose the right company"
            : "No confirmed company match"}
      </legend>
      <p className="muted">
        Research will use the company you confirm. Select any sourced names or
        relationships you also want to save.
      </p>
      {matches.slice(0, 4).map((match) => {
        const choice = candidateSelection(match);
        const key = identitySelectionKey(choice)!;
        const chosen = selectedKey === key;
        return (
          <div key={key} className="stack">
            <label className={styles.identityChoice}>
              <input
                type="radio"
                name="identity-match"
                checked={chosen}
                onChange={() => onSelect(choice)}
              />
              <span className={styles.identityText}>
                <strong>{match.entity.canonicalName}</strong>
                <small>
                  {match.confidence == null
                    ? "Confirm this company"
                    : `${Math.round(match.confidence * 100)}% match`}
                </small>
                {match.sourceCandidate && (
                  <small>
                    {sourceLabels[match.sourceCandidate.source]}
                    {match.sourceCandidate.source !== "document" &&
                      ` · ${match.sourceCandidate.externalId}`}
                  </small>
                )}
                {match.reasons
                  ?.filter(
                    (reason) =>
                      !match.evidence.some(
                        (source) => source.excerpt === reason,
                      ),
                  )
                  .map((reason) => (
                    <small key={reason}>{reason}</small>
                  ))}
                {match.resolutionMethod && (
                  <small>{match.resolutionMethod.replaceAll("_", " ")}</small>
                )}
              </span>
            </label>
            {match.evidence.length > 0 && (
              <details className={styles.evidence}>
                <summary>
                  Company identity sources · {match.evidence.length}
                </summary>
                {match.evidence.map((source, index) => {
                  const url = safeEvidenceUrl(source.url);
                  return (
                    <div className="stack" key={index}>
                      <strong>{source.label}</strong>
                      <blockquote>{source.excerpt}</blockquote>
                      {source.attachmentId && (
                        <small>Uploaded identity document</small>
                      )}
                      <small>Observed {source.observedAt}</small>
                      {url && (
                        <a href={url} target="_blank" rel="noreferrer">
                          View original source ↗
                        </a>
                      )}
                    </div>
                  );
                })}
              </details>
            )}
            {chosen &&
              "sourceCandidate" in choice &&
              match.claims.length > 0 && (
                <div className={styles.evidence}>
                  <strong>Sourced names and relationships</strong>
                  {match.claims.map((claim) => {
                    const confirmed =
                      selected && "sourceCandidate" in selected
                        ? selected.claims
                        : [];
                    const url = safeEvidenceUrl(claim.sourceUrl);
                    return (
                      <div className="stack" key={claimKey(claim)}>
                        <label>
                          <input
                            type="checkbox"
                            checked={confirmed.some(
                              (value) => claimKey(value) === claimKey(claim),
                            )}
                            onChange={(event) =>
                              onSelect({
                                ...choice,
                                claims: event.target.checked
                                  ? [...confirmed, claim]
                                  : confirmed.filter(
                                      (value) =>
                                        claimKey(value) !== claimKey(claim),
                                    ),
                              })
                            }
                          />
                          Confirm {claim.kind.replaceAll("_", " ")}:{" "}
                          {claim.name}
                        </label>
                        <blockquote>{claim.quote}</blockquote>
                        {claim.attachmentId && (
                          <small>
                            Quoted from the uploaded identity document
                          </small>
                        )}
                        {url && (
                          <a href={url} target="_blank" rel="noreferrer">
                            View original source ↗
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        );
      })}
      {allowSeparate ? (
        <label className="row">
          <input
            type="radio"
            name="identity-match"
            checked={selected === null}
            onChange={() => onSelect(null)}
          />
          {matches.length
            ? "None of these — create a separate profile"
            : "Create a profile with the company details I entered"}
        </label>
      ) : (
        <small className="muted">
          Choose a sourced company, or edit the details to enter its legal name.
        </small>
      )}
      {preview.sourceGaps.map((gap, index) => (
        <small className="muted" key={index}>
          {gap}
        </small>
      ))}
    </fieldset>
  );
}
