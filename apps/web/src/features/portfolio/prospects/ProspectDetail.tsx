"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell } from "@/shared/portfolio/shell/Shell";
import type { Destinations } from "@/shared/portfolio/config/config";
import { Dialog } from "@/shared/portfolio/ui/Dialog";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import {
  initials,
  safeWebsite,
  memberName,
  useMemberOptions,
} from "@/features/portfolio/index/public";
import { useProspect, useStageCatalog } from "./queries";
import { stageLabel } from "./contracts";
import { ProspectEditor } from "./ProspectEditor";
import { NextStepEditor } from "./NextStepEditor";
import { ProspectHistory } from "./ProspectHistory";
import { ProspectNotes } from "./ProspectNotes";
import { ProspectStageProgress } from "./ProspectStageProgress";
import { StageEditor } from "./StageEditor";
import { useProspectVisibility } from "./mutations";
import { ProspectContacts } from "./contacts/public";
import { ProspectClientLink } from "./conversion/public";
import { ProspectBrief } from "./brief/public";
import { ProspectProposals } from "./proposals/public";
import { ProspectFiles } from "@/features/portfolio/files/public";
import styles from "./prospects.module.css";
export function ProspectDetail({
  id,
  destinations,
}: {
  id: string;
  destinations: Destinations;
}) {
  const query = useProspect(id);
  const catalog = useStageCatalog();
  const owners = useMemberOptions();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [next, setNext] = useState(false);
  const [archive, setArchive] = useState(false);
  const [stage, setStage] = useState(false);
  const visibility = useProspectVisibility(id, () => {
    setArchive(false);
    router.push("/portfolio/prospects");
  });
  const record = query.isSuccess && !query.error ? query.data : undefined;
  const owner =
    owners.isSuccess && !owners.error
      ? owners.data.find((owner) => owner.id === record?.ownerUserId)
      : undefined;
  const ownerLabel = !record?.ownerUserId
    ? "Unassigned"
    : owner
      ? memberName(owner)
      : "Owner unavailable";
  return (
    <Shell destinations={destinations}>
      <div className={`page stack ${styles.overview}`}>
        <nav className="row" aria-label="Breadcrumb">
          <Link href="/portfolio/prospects">← Prospects</Link>
          <span>/</span>
          <span>{record?.displayName ?? "Company details"}</span>
        </nav>
        <QueryState
          pending={query.isPending}
          error={query.error}
          retry={() => void query.refetch()}
        />
        {record && (
          <>
            <header className={`pageHeader ${styles.prospectHeader}`}>
              <div className="row">
                <span className={styles.monogram}>
                  {initials(record.displayName)}
                </span>
                <h1>{record.displayName}</h1>
                <span className={styles.prospectBadge}>
                  <img
                    src="/design/411-64863-prospect-dot.svg"
                    alt=""
                    width={5}
                    height={5}
                  />
                  Prospect
                </span>
              </div>
              <div className="row">
                <button
                  className="button"
                  onClick={() => setStage(true)}
                  aria-label={`Stage: ${stageLabel(record.stage)}`}
                >
                  <span className="eyebrow">Stage</span>
                  {stageLabel(record.stage)}
                  <span aria-hidden="true">⌄</span>
                </button>
                <ProspectClientLink record={record} />
                <button
                  className="button primary"
                  onClick={() => setEditing(true)}
                >
                  Edit details
                </button>
              </div>
            </header>
            <div className={styles.columns}>
              <div className="stack">
                <section className={`card stack ${styles.companyCard}`}>
                  <p>{record.description ?? "No company description yet."}</p>
                  {safeWebsite(record.website) && (
                    <a
                      href={safeWebsite(record.website)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {record.website} ↗
                    </a>
                  )}
                  {record.serviceHypothesis && (
                    <p>
                      <span className="eyebrow">Focus </span>
                      {record.serviceHypothesis}
                    </p>
                  )}
                  <hr className="divider" />
                  <div className="row">
                    <small>Owner</small>
                    <span>{ownerLabel}</span>
                    <small>
                      Added {new Date(record.createdAt).toLocaleDateString()}
                    </small>
                    {record.geography && <span>{record.geography}</span>}
                  </div>
                </section>
                <section className="card stack">
                  <header className="row between">
                    <h2>Pipeline stage</h2>
                    <button
                      className={`button ${styles.compactButton}`}
                      onClick={() => setStage(true)}
                    >
                      Change stage
                    </button>
                  </header>
                  <p className="muted">
                    {catalog.data
                      ? "Stage changes are recorded in activity. Conversion and billing require separate actions."
                      : "Stage updates are currently unavailable. Your existing stage is preserved."}
                  </p>
                  <ProspectStageProgress
                    stage={record.stage}
                    catalog={catalog.data}
                  />
                </section>
                <ProspectHistory id={id} />
                <ProspectBrief prospectId={id} />
                <ProspectFiles
                  prospectId={id}
                  available={
                    query.isSuccess && !query.error && !query.isFetching
                  }
                  active={record.status === "active"}
                  clientId={record.convertedAt ? record.linkedClientId : null}
                />
                <section className="card stack" aria-label="Prospect Workspace">
                  <h2>Workspace documents</h2>
                  <p>
                    Open this prospect’s manual drafts, saved versions and
                    exports. Documents retain their prospect origin after
                    conversion.
                  </p>
                  <Link
                    className="button"
                    href={`/modules/workspace?prospectId=${encodeURIComponent(id)}`}
                  >
                    Open prospect Workspace
                  </Link>
                  <small>
                    Sharing, sending and generation are unavailable for prospect
                    documents.
                  </small>
                </section>
                <ProspectProposals
                  prospectId={id}
                  workspaceUrl={destinations.workspace}
                />
              </div>
              <div className="stack">
                <section className="card stack">
                  <header className="row between">
                    <h2>Next step</h2>
                    <button
                      className={`button ${styles.compactButton}`}
                      onClick={() => setNext(true)}
                    >
                      Edit
                    </button>
                  </header>
                  <p>{record.nextAction ?? "No next step assigned."}</p>
                  {record.nextActionDueAt && (
                    <time dateTime={record.nextActionDueAt}>
                      <small>
                        Due {new Date(record.nextActionDueAt).toLocaleString()}
                      </small>
                    </time>
                  )}
                  <small>Owner {ownerLabel}</small>
                </section>
                <ProspectContacts prospectId={id} />
                <ProspectNotes id={id} />
                <button className="button" onClick={() => setArchive(true)}>
                  {record.status === "dismissed"
                    ? "Restore prospect"
                    : "Archive prospect"}
                </button>
              </div>
            </div>
            {editing && (
              <ProspectEditor
                record={record}
                onClose={() => setEditing(false)}
                onSaved={() => setEditing(false)}
              />
            )}
            {next && (
              <NextStepEditor record={record} onClose={() => setNext(false)} />
            )}
            {stage && (
              <StageEditor
                record={record}
                catalog={catalog.data}
                onClose={() => setStage(false)}
              />
            )}
            <Dialog
              open={archive}
              title={
                record.status === "dismissed"
                  ? "Restore prospect"
                  : "Archive prospect"
              }
              description="History is preserved. No client conversion, email or billing action is performed."
              onOpenChange={(open) => {
                if (!visibility.isPending) setArchive(open);
              }}
            >
              <QueryState error={visibility.error} />
              <button
                className="button primary"
                disabled={visibility.isPending}
                onClick={() =>
                  visibility.mutate(
                    record.status === "dismissed" ? "restore" : "dismiss",
                  )
                }
              >
                Confirm {record.status === "dismissed" ? "restore" : "archive"}
              </button>
            </Dialog>
          </>
        )}
      </div>
    </Shell>
  );
}
