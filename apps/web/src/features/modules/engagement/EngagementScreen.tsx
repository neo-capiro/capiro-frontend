"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { plannerId } from "../../../shared/capiro/operations/planner-schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { CreateMeeting } from "../../../shared/meetings/CreateMeeting";
import { ActionButton, PageHeader, Tabs } from "../../../shared/module-ui";
import { CommitmentView } from "./CommitmentView";
import { EngagementOverview } from "./EngagementOverview";
import { MeetingLibrary } from "./MeetingLibrary";
import { OutreachView } from "./OutreachView";
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
  const requestedView = params.get("view");
  const requestedClient = params.get("clientId");
  const draft = params.get("draft");
  const session = params.get("session");
  const initialCreate = params.get("create") === "draft";
  const directoryContactId = params.get("directoryContactId");
  const [view, setView] = useState(() =>
      session || draft || initialCreate
        ? "outreach"
        : tabs.some((tab) => tab.id === requestedView)
          ? requestedView!
          : "overview",
    ),
    [clientId, setClientId] = useState(() =>
      plannerId.safeParse(requestedClient).success ? requestedClient! : "",
    ),
    [create, setCreate] = useState(false);
  useEffect(() => {
    if (session || draft || initialCreate) setView("outreach");
    else if (tabs.some((tab) => tab.id === requestedView))
      setView(requestedView!);
  }, [requestedView, session, draft, initialCreate]);
  useEffect(
    () =>
      setClientId(
        plannerId.safeParse(requestedClient).success ? requestedClient! : "",
      ),
    [requestedClient],
  );
  const clientQuery = useCapiroQuery("clients.list", {});
  const meetings = useCapiroQuery("engagement.meetings", {
    query: { clientId: clientId || undefined },
  });
  const clients = clientQuery.data ?? [];
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
