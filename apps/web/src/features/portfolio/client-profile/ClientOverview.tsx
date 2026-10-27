"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowUpRight, NotebookPen, Plus, Users } from "lucide-react";
import {
  useClient,
  clientLocation,
  clientSectorLabel,
  safeWebsite,
  memberName,
} from "@/features/portfolio/index/public";
import { ObjectiveSummary } from "@/features/portfolio/objectives/public";
import { QueryState } from "@/shared/portfolio/ui/QueryState";
import { ActivityTimeline } from "./ActivityTimeline";
import { FacilitiesCard } from "./FacilitiesCard";
import { ClientDetails, GovernmentSummary } from "./ClientDetails";
import { ClientMonogram } from "./ClientMonogram";
import {
  DeadlineAndRequests,
  EngagementHealth,
  EngagementPulse,
} from "./OverviewSignals";
import { TeamDialog } from "./TeamDialog";
import { NotesDialog } from "./NotesDialog";
import { QuickLog } from "./QuickLog";
import { FocusTags } from "./tags/public";
import { useTeam, useActivity } from "./queries";
import styles from "./overview.module.css";
export function ClientOverview({ clientId }: { clientId: string }) {
  const client = useClient(clientId);
  const team = useTeam(clientId);
  const activity = useActivity(clientId);
  const currentActivity =
    activity.isSuccess && !activity.error ? activity.data : undefined;
  const params = useSearchParams();
  const router = useRouter();
  const [showTeam, setShowTeam] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  if (!client.isSuccess || client.error || !client.data)
    return (
      <QueryState
        pending={client.isPending}
        error={client.error}
        retry={() => void client.refetch()}
      />
    );
  const value = client.data;
  const website = safeWebsite(value.website);
  const websiteLabel = website
    ? new URL(website).hostname.replace(/^www\./, "")
    : undefined;
  const location = clientLocation(value);
  const owner = team.data?.find((m) => m.isOwner);
  return (
    <div className={`page ${styles.overviewPage}`}>
      <div className={styles.layout}>
        <div className={styles.column}>
          <section
            className={`card stack ${styles.profileCard}`}
            aria-label="Client identity"
          >
            <div className={styles.profileActions}>
              <button
                className="button ghost iconButton"
                aria-label="Notes"
                onClick={() => setShowNotes(true)}
              >
                <NotebookPen size={16} />
              </button>
              <Link
                className="button ghost iconButton"
                href={`/portfolio/${clientId}/objectives?new=1`}
                aria-label="New objective"
              >
                <Plus size={16} />
              </Link>
            </div>
            <div className={styles.identity}>
              <span className="monogram">
                <ClientMonogram
                  name={value.name}
                  logoUrl={value.logoUrl}
                  size={52}
                />
              </span>
              <div>
                <div className="row">
                  <h1>{value.name}</h1>
                  <span className="chip">
                    {value.profileStatus.toLowerCase().replaceAll("_", " ")}{" "}
                    client
                  </span>
                </div>
                <small>
                  {clientSectorLabel(value) ?? "Sector not specified"}
                  {location && ` · ${location}`}
                  {website && (
                    <>
                      {" "}
                      ·{" "}
                      <a href={website} target="_blank" rel="noreferrer">
                        {websiteLabel}
                      </a>
                    </>
                  )}
                </small>
              </div>
            </div>
            <p className="muted">
              {value.description ?? "No organization description yet."}
            </p>
            <FocusTags clientId={clientId} />
            <div className={styles.profileMeta}>
              <span>
                <span className="eyebrow">Owner </span>
                {owner
                  ? memberName({ ...owner, id: owner.userId })
                  : team.isSuccess
                    ? "Unassigned"
                    : "—"}
              </span>
              <button
                className="button ghost"
                onClick={() => setShowTeam(true)}
              >
                <Users size={14} />
                Account team{team.data && ` · ${team.data.length}`}
              </button>
            </div>
          </section>
          <EngagementPulse records={currentActivity} />
          <ObjectiveSummary clientId={clientId} />
        </div>
        <div className={styles.column}>
          <div className={styles.rightTop}>
            <GovernmentSummary key={value.id} client={value} />
            <EngagementHealth />
          </div>
          <FacilitiesCard clientId={clientId} clientName={value.name} />
          <DeadlineAndRequests />
        </div>
      </div>
      <ActivityTimeline clientId={clientId} />
      <div className={styles.supplemental}>
        <ClientDetails key={value.id} client={value} />
        <section className="card stack">
          <div className="row between">
            <h2>Client calendar</h2>
            <Link
              className="button ghost iconButton"
              href={`/portfolio/${clientId}/calendar`}
              aria-label="Open client calendar"
            >
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <p className="muted">
            Meetings, preparation, notes and debriefs for this client.
          </p>
          <Link className="button" href={`/portfolio/${clientId}/calendar`}>
            Open calendar
          </Link>
        </section>
      </div>
      <TeamDialog
        clientId={clientId}
        clientName={value.name}
        open={showTeam}
        onOpenChange={setShowTeam}
      />
      <NotesDialog
        key={showNotes ? "open" : "closed"}
        clientId={clientId}
        clientName={value.name}
        open={showNotes || params.has("notes")}
        onOpenChange={(open) => {
          setShowNotes(open);
          if (!open && params.has("notes")) {
            const next = new URLSearchParams(params);
            next.delete("notes");
            router.replace(`/portfolio/${clientId}?${next}`, { scroll: false });
          }
        }}
      />
      <QuickLog
        clientId={clientId}
        clientName={value.name}
        open={params.has("log")}
        onOpenChange={(open) => {
          if (!open) {
            const next = new URLSearchParams(params);
            next.delete("log");
            router.replace(`/portfolio/${clientId}?${next}`, { scroll: false });
          }
        }}
      />
    </div>
  );
}
