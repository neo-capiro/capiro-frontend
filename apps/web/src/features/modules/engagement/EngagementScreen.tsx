"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { plannerId } from "../../../shared/capiro/operations/planner-schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { CreateMeeting } from "../../../shared/meetings/CreateMeeting";
import { ActionButton, PageHeader, Tabs } from "../../../shared/module-ui";
import { CommitmentView } from "./CommitmentView";
import { EngagementOverview } from "./EngagementOverview";
import { MeetingLibrary } from "./MeetingLibrary";
import { OutreachView } from "./OutreachView";
import { NewsletterDestination } from "./NewsletterDestination";
import { newsletterDestination } from "./newsletter-route";
import { ObjectiveOutreachDestination } from "./ObjectiveOutreachDestination";
import { PlanView } from "./PlanView";
import { ReportView } from "./ReportView";
import { TeamView } from "./TeamView";
import styles from "./engagement.module.css";
const tabs = [
  "Overview",
  "Plan",
  "Meetings",
  "Outreach",
  "Reports",
  "Team",
  "Library",
  "Commitments",
].map((label) => ({
  id: label.toLowerCase(),
  label,
}));
export function EngagementScreen() {
  const params = useSearchParams();
  const destination = newsletterDestination(new URLSearchParams(params));
  return destination.kind === "none" ? (
    <OrdinaryEngagementScreen />
  ) : (
    <NewsletterDestination
      key={JSON.stringify(destination)}
      destination={destination}
    />
  );
}

function OrdinaryEngagementScreen() {
  const params = useSearchParams();
  const requestedView = params.get("view");
  const requestedClient = params.get("clientId");
  const draft = params.get("draft");
  const session = params.get("session");
  const initialCreate = params.get("create") === "draft";
  const directoryContactId = params.get("directoryContactId");
  const objectiveDestination =
    params.has("objectiveId") || params.has("objectiveVersion");
  const [view, setView] = useState(() =>
      session || draft || initialCreate
        ? "outreach"
        : tabs.some((tab) => tab.id === requestedView)
          ? requestedView!
          : "overview",
    ),
    [create, setCreate] = useState(false);
  const [routeKey, setRouteKey] = useState(() =>
    JSON.stringify([requestedView, session, draft, initialCreate]),
  );
  if (
    routeKey !== JSON.stringify([requestedView, session, draft, initialCreate])
  ) {
    setRouteKey(JSON.stringify([requestedView, session, draft, initialCreate]));
    if (session || draft || initialCreate) setView("outreach");
    else if (tabs.some((tab) => tab.id === requestedView))
      setView(requestedView!);
  }
  const router = useRouter();
  const clientId = plannerId.safeParse(requestedClient).success
    ? requestedClient!
    : "";
  const setClientId = (id: string, targetView = view) => {
    const next = new URLSearchParams(params);
    if (id) next.set("clientId", id);
    else next.delete("clientId");
    for (const key of ["draft", "session", "create", "directoryContactId"])
      next.delete(key);
    next.set("view", targetView);
    router.push(`/modules/engagement?${next}`);
  };
  const clientQuery = useCapiroQuery(
    "clients.list",
    {},
    { enabled: !objectiveDestination },
  );
  const meetings = useCapiroQuery(
    "engagement.meetings",
    {
      query: { clientId: clientId || undefined },
    },
    { enabled: !objectiveDestination },
  );
  const clients = clientQuery.data ?? [];
  if (objectiveDestination) return <ObjectiveOutreachDestination />;
  return (
    <div className={styles.screen}>
      <PageHeader
        title="Engagement Manager"
        description="Meetings, outreach and commitments across your permitted clients."
        actions={
          <>
            <select
              className={styles.select}
              value={clientId}
              aria-label="Engagement client scope"
              onChange={(event) => setClientId(event.target.value)}
            >
              <option value="">All permitted clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            <ActionButton onClick={() => setCreate(true)}>
              + New meeting
            </ActionButton>
          </>
        }
      />
      <Tabs
        items={tabs}
        value={view}
        onChange={setView}
        label="Engagement sections"
      />
      {view === "overview" && (
        <EngagementOverview
          clientId={clientId}
          meetings={meetings}
          onView={setView}
          onClientOutreach={(id) => setClientId(id, "outreach")}
        />
      )}{" "}
      {view === "plan" && <PlanView />}
      {view === "meetings" && (
        <MeetingLibrary clientId={clientId} mode="meetings" />
      )}
      {view === "library" && (
        <MeetingLibrary clientId={clientId} mode="library" />
      )}
      {view === "outreach" && (
        <OutreachView
          key={JSON.stringify([clientId, draft, session, initialCreate])}
          clientId={clientId}
          initialCreate={initialCreate}
          directoryContext={
            !!directoryContactId &&
            directoryContactId.length <= 300 &&
            !/[\x00-\x1f\x7f]/.test(directoryContactId)
          }
          initialDraft={plannerId.safeParse(draft).success ? draft! : undefined}
          initialSession={
            plannerId.safeParse(session).success ? session! : undefined
          }
        />
      )}{" "}
      {view === "commitments" && <CommitmentView clientId={clientId} />}{" "}
      {view === "reports" && <ReportView clientId={clientId} />}{" "}
      {view === "team" && <TeamView clientId={clientId} />}
      <CreateMeeting
        open={create}
        onClose={() => setCreate(false)}
        onCreated={meetings.reload}
        clientId={clientId || undefined}
      />
    </div>
  );
}
