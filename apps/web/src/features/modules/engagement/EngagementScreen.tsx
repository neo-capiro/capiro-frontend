"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { plannerId } from "../../../shared/capiro/operations/planner-schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { ActionButton, PageHeader } from "../../../shared/module-ui";
import { NewsletterDestination } from "./NewsletterDestination";
import { newsletterDestination } from "./newsletter-route";
import { ObjectiveOutreachDestination } from "./ObjectiveOutreachDestination";
import { OutreachView } from "./OutreachView";
import styles from "./engagement.module.css";

export function EngagementScreen() {
  const params = useSearchParams();
  const destination = newsletterDestination(new URLSearchParams(params));
  if (destination.kind !== "none")
    return (
      <NewsletterDestination
        key={JSON.stringify(destination)}
        destination={destination}
      />
    );
  const hasOutreachIntent =
    params.has("draft") ||
    params.has("session") ||
    params.get("create") === "draft";
  if (
    !params.has("objectiveId") &&
    !params.has("objectiveVersion") &&
    !hasOutreachIntent
  ) {
    const view = params.get("view");
    if (view === "meetings" || view === "library")
      return <LegacyMeetingDestination />;
  }
  return <OrdinaryEngagementScreen />;
}

function LegacyMeetingDestination() {
  const params = useSearchParams();
  const library = params.get("view") === "library";
  const clientId = params.get("clientId");
  const meetingId = params.get("meeting");
  const validClient =
    params.getAll("view").length === 1 &&
    params.getAll("clientId").length === 1 &&
    plannerId.safeParse(clientId).success;
  const validMeeting =
    params.getAll("meeting").length <= 1 &&
    (meetingId === null || plannerId.safeParse(meetingId).success);
  const clients = useCapiroQuery("clients.list", {}, { enabled: validClient });
  const authorized =
    validClient && clients.data?.some((client) => client.id === clientId);
  const destinationParams = new URLSearchParams();
  if (library) destinationParams.set("library", "1");
  if (meetingId) {
    destinationParams.set("meeting", meetingId);
    destinationParams.set("objectiveMeeting", "1");
  }
  const href =
    authorized && validMeeting
      ? `/portfolio/${encodeURIComponent(clientId!)}/calendar${
          destinationParams.size ? `?${destinationParams}` : ""
        }`
      : null;
  return (
    <div className={styles.screen}>
      <PageHeader
        title="Meetings moved to Portfolio"
        description="Open a client's Portfolio calendar for meetings and meeting library."
      />
      {clients.loading && <p role="status">Checking client access.</p>}
      {clients.error && <p role="alert">Unable to check client access.</p>}
      {href ? (
        <Link href={href}>
          {library
            ? "Open Portfolio meeting library"
            : "Open Portfolio meetings"}
        </Link>
      ) : !clients.loading && !clients.error ? (
        <p role="alert">
          This meeting link is unavailable for your selected client.
        </p>
      ) : null}
      <Link href="/modules/engagement">Open outreach</Link>
    </div>
  );
}

function OrdinaryEngagementScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const requestedClient = params.get("clientId");
  const draft = params.get("draft");
  const session = params.get("session");
  const initialCreate = params.get("create") === "draft";
  const directoryContactId = params.get("directoryContactId");
  const objectiveDestination =
    params.has("objectiveId") || params.has("objectiveVersion");
  const clientId = plannerId.safeParse(requestedClient).success
    ? requestedClient!
    : "";
  const clientQuery = useCapiroQuery(
    "clients.list",
    {},
    { enabled: !objectiveDestination },
  );
  const clients = clientQuery.data ?? [];

  if (objectiveDestination) return <ObjectiveOutreachDestination />;

  const setClientId = (id: string) => {
    router.push(
      id
        ? `/modules/engagement?clientId=${encodeURIComponent(id)}`
        : "/modules/engagement",
    );
  };

  return (
    <div className={styles.screen}>
      <PageHeader
        title="Engagement"
        description="Your draft and sent campaigns. Open one to continue, or start a new campaign."
        actions={
          <select
            className={styles.select}
            value={clientId}
            aria-label="Engagement client scope"
            disabled={clientQuery.loading || Boolean(clientQuery.error)}
            onChange={(event) => setClientId(event.target.value)}
          >
            <option value="">All permitted clients</option>
            {clientId && !clients.some((client) => client.id === clientId) && (
              <option value={clientId}>
                Selected client (name unavailable)
              </option>
            )}
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        }
      />
      {clientQuery.loading && <p role="status">Loading client scopes.</p>}
      {clientQuery.error && (
        <div>
          <p role="alert">
            Client scopes unavailable: {clientQuery.error.message}
          </p>
          <ActionButton onClick={clientQuery.reload}>
            Retry client scopes
          </ActionButton>
        </div>
      )}
      {params.has("view") && params.get("view") !== "outreach" && (
        <p role="status">
          That Engagement section is no longer available here. Outreach is
          below.
        </p>
      )}
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
    </div>
  );
}
