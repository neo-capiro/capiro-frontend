"use client";
import { useEffect, useState } from "react";
import type { ImpersonationSession } from "../capiro/operations/settings-admin/impersonation";
import { useCapiroQuery } from "../capiro/queries";
import { ActionButton, DataTable, Panel, StatusPanel } from "../module-ui";

export function SupportWorkspace({
  session,
  exit,
  busy,
  unavailable,
}: {
  session: ImpersonationSession;
  exit: () => void;
  busy: boolean;
  unavailable?: boolean;
}) {
  const [after, setAfter] = useState<string>();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const active =
    !unavailable &&
    session.status === "active" &&
    Date.parse(session.expiresAt) > now;
  const query = useCapiroQuery(
    "settings.hq.impersonation.workspace",
    { params: { sessionId: session.sessionId }, query: { after } },
    { enabled: active && !busy },
  );
  const valid =
    query.data?.session.sessionId === session.sessionId &&
    query.data.session.tenantId === session.tenantId &&
    query.data.session.status === "active" &&
    Date.parse(query.data.session.expiresAt) > now;
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <ActingAsBanner session={session} exit={exit} busy={busy} />
      <Panel title="Client roster">
        <p>
          This support workspace shows saved client names, statuses and
          websites. Ethical walls still apply. Editing, personal settings,
          approvals, Meri and other modules are unavailable while acting as this
          tenant.
        </p>
        {!active ? (
          <p role="alert">
            This support session has expired or is unavailable. Exit to return
            to your account.
          </p>
        ) : (
          <StatusPanel
            loading={query.loading}
            error={query.error}
            onRetry={query.reload}
          >
            {query.data && !valid ? (
              <p role="alert">
                The support response does not match this active session. Reload
                to verify access.
              </p>
            ) : (
              valid && (
                <>
                  <ClientRoster clients={query.data!.clients} />
                  <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                    <ActionButton
                      onClick={() => {
                        setAfter(undefined);
                        query.reload();
                      }}
                    >
                      Refresh from first page
                    </ActionButton>
                    {query.data!.nextCursor && (
                      <ActionButton
                        onClick={() => setAfter(query.data!.nextCursor!)}
                      >
                        Next page
                      </ActionButton>
                    )}
                  </div>
                </>
              )
            )}
          </StatusPanel>
        )}
      </Panel>
    </main>
  );
}

function ActingAsBanner({
  session,
  exit,
  busy,
}: {
  session: ImpersonationSession;
  exit: () => void;
  busy: boolean;
}) {
  return (
    <section
      role="status"
      aria-label="Acting as tenant"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        padding: 20,
        background: "var(--color-surface, white)",
        border: "2px solid currentColor",
      }}
    >
      <h1>Acting as {session.tenantName}</h1>
      <p>
        Read-only support · {session.tenantSlug} · Expires{" "}
        {new Date(session.expiresAt).toLocaleString()}
      </p>
      <p>Reason: {session.reason}</p>
      <ActionButton onClick={exit} disabled={busy}>
        {busy ? "Exiting…" : "Exit impersonation"}
      </ActionButton>
    </section>
  );
}

function ClientRoster({
  clients,
}: {
  clients: Array<{
    id: string;
    name: string;
    status: string;
    website: string | null;
  }>;
}) {
  return (
    <DataTable
      caption="Current tenant clients"
      rows={clients}
      rowKey={(row) => row.id}
      columns={[
        {
          key: "name",
          label: "Client",
          render: (row) => row.name,
        },
        {
          key: "status",
          label: "Status",
          render: (row) => row.status,
        },
        {
          key: "website",
          label: "Website",
          render: (row) => row.website ?? "Not recorded",
        },
      ]}
    />
  );
}
