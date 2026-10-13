"use client";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/shared/portfolio/api/provider";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { readRefresh } from "./api";
import { sectionLabels } from "./contracts";
import styles from "./brief.module.css";
import { BriefDate } from "./BriefDate";
export function BriefRefresh({
  prospectId,
  versionNumber,
}: {
  prospectId: string;
  versionNumber: number;
}) {
  const api = useApi();
  const proposal = useQuery({
    queryKey: ["prospect-brief-refresh", prospectId, versionNumber],
    queryFn: ({ signal }) =>
      readRefresh(api, prospectId, versionNumber, signal),
    staleTime: 0,
  });
  const current =
    proposal.isSuccess && !proposal.error ? proposal.data : undefined;
  return (
    <section className="stack" aria-label="Refresh comparison">
      <h3>Compare current dossier</h3>
      <QueryState
        pending={proposal.isPending}
        error={proposal.error}
        retry={() => void proposal.refetch()}
      />
      <p role="note">
        Preview only. Saving a refresh is unavailable until the reviewed text
        and citations can be preserved together.
      </p>
      {current && (
        <>
          <small>
            Compared against version {current.baseVersionNumber}. Snapshot
            generated <BriefDate value={current.sourceSnapshot.generatedAt} />.
          </small>
          {current.diff.map((item) => (
            <section className="stack" key={item.section}>
              <h3>
                {sectionLabels[item.section]} ·{" "}
                {item.changed ? "Source text changed" : "No source text change"}
              </h3>
              <div className={styles.comparison}>
                <div>
                  <strong>Saved text</strong>
                  <p>{item.baseText}</p>
                </div>
                <div>
                  <strong>Fresh source text</strong>
                  <p>{item.proposedText}</p>
                </div>
              </div>
              {current.proposed[item.section].provenance === "edited" && (
                <p role="note">
                  Your edited section remains preserved in the proposed result.
                </p>
              )}
            </section>
          ))}
        </>
      )}
    </section>
  );
}
