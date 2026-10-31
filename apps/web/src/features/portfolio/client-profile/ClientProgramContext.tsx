"use client";
import { useState } from "react";
import { ApiError } from "@/shared/portfolio/api/http";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { ProgramCandidateCoverage } from "../opportunities/public";
import {
  profileActorKey,
  useProfileActor,
  type ProfileActor,
} from "./profile-access";
import {
  PROGRAM_CONTEXT_CANDIDATE_CAP,
  programPathLabels,
  programReasonText,
  useClientProgramContext,
  type ClientProgramPage,
  type ProgramAssociation,
} from "./client-program-context";
import styles from "./federal-profile.module.css";

function ProgramReasons({ paths }: { paths: ProgramAssociation["paths"] }) {
  return (
    <details>
      <summary>Association reasons</summary>
      <ul className="stack">
        {paths.map((reason, index) => (
          <li key={`${reason.path}:${index}`}>
            <strong>{programPathLabels[reason.path]}</strong>
            <p className="muted">
              Path relevance score: {reason.score.toFixed(2)}
            </p>
            {reason.path === "prior_award" ? (
              <p>
                This heuristic can match a UEI or a similar contractor name. It
                does not verify an award to this client or site. Historical
                amount text is not displayed here.
              </p>
            ) : (
              <>
                <ul>
                  {reason.evidence.slice(0, 3).map((text, item) => (
                    <li key={item}>{programReasonText(text)}</li>
                  ))}
                </ul>
                {reason.evidence.length > 3 && (
                  <p className="muted">
                    Additional reason text is not displayed.
                  </p>
                )}
              </>
            )}
            {reason.path === "facility_district" && (
              <p className="muted">
                District overlap does not allocate program funding to a site.
              </p>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}

function ProgramRows({ value }: { value: ClientProgramPage }) {
  return (
    <>
      <ProgramCandidateCoverage data={value} />
      <p className="muted">
        Page {value.page}: {value.data.length} returned associations of{" "}
        {value.total} matching candidates in this bounded search.
      </p>
      {value.total === 0 ? (
        <p>
          No program associations were returned at the current score threshold.
        </p>
      ) : value.data.length === 0 ? (
        <p>
          No associations were returned on this page. Try the previous page.
        </p>
      ) : (
        <ul className="stack">
          {value.data.map((row) => (
            <li className={styles.card} key={row.peCode}>
              <strong>{row.peCode}</strong>
              <p>{row.title ?? "Title unavailable"}</p>
              <p className="muted">Relevance score: {row.score.toFixed(2)}</p>
              <ProgramReasons paths={row.paths} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ProgramContextPage({
  clientId,
  enabled,
  actor,
}: {
  clientId: string;
  enabled: boolean;
  actor?: ProfileActor;
}) {
  const [page, setPage] = useState(1);
  const query = useClientProgramContext(clientId, enabled, page, actor);
  const error =
    query.error instanceof ApiError && query.error.status === 404
      ? new ApiError(404, "Program association context is unavailable.")
      : query.error;
  const value = query.enabled && !query.error ? query.data : undefined;
  const hasNext = Boolean(value && value.page * value.limit < value.total);
  return (
    <section className={styles.card} aria-label="Client program associations">
      <h3>Client program associations</h3>
      <p className="muted">
        FY-agnostic relevance signals, not funding totals or verified awards.
        The service considers at most {PROGRAM_CONTEXT_CANDIDATE_CAP} candidate
        program elements at a score threshold of 0.5. This is not an exhaustive
        count of this client&apos;s programs or funding to any location.
      </p>
      {!query.enabled && (
        <p className="muted">
          A current session is required to load program context.
        </p>
      )}
      <QueryState
        pending={query.enabled && query.isPending}
        error={query.enabled ? error : null}
        retry={() => void query.refetch()}
      />
      {value && <ProgramRows value={value} />}
      <nav aria-label="Program association pages" className="row">
        <button
          className="button"
          disabled={!query.enabled || query.isFetching || page <= 1}
          onClick={() => setPage((current) => current - 1)}
        >
          Previous page
        </button>
        <button
          className="button"
          disabled={!query.enabled || query.isFetching || !hasNext}
          onClick={() => setPage((current) => current + 1)}
        >
          Next page
        </button>
      </nav>
    </section>
  );
}

export function ClientProgramContext({
  clientId,
  enabled,
}: {
  clientId: string;
  enabled: boolean;
}) {
  const actor = useProfileActor();
  return (
    <ProgramContextPage
      key={JSON.stringify([clientId, profileActorKey(actor), enabled])}
      clientId={clientId}
      enabled={enabled}
      actor={actor}
    />
  );
}
