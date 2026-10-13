import { useQueryClient } from "@tanstack/react-query";
import { useSetupApi, refreshSetupState } from "../../lib/setup";
import { useNavigate } from "../../navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { Btn, Spinner } from "../../ui/primitives";
import { errorMessage } from "../funnel/shared";
import { useSetupState } from "../../lib/setup";
import { useMe } from "../../lib/capiro-api";
import { ExtShell } from "./ExtShell";
import { CenteredNotice, WorkspaceMembership } from "./WorkspaceMembership";
import { SetupWorkspace } from "./SetupWorkspace";
export function SetupDashboardPage() {
  const navigate = useNavigate();
  const cache = useQueryClient();
  const api = useSetupApi();
  const { isLoaded, isSignedIn, orgId } = useAuth();
  const { user } = useUser();
  const state = useSetupState({ enabled: !!orgId });
  const me = useMe({ enabled: !!orgId });
  if (!isLoaded) return null;
  if (!isSignedIn) {
    return (
      <ExtShell>
        <CenteredNotice>
          <p
            style={{
              margin: "0 0 20px",
              fontSize: 13.5,
              color: "var(--ink-2)",
              lineHeight: 1.6,
            }}
          >
            Sign in via your invite email to access the setup dashboard.
          </p>
          <Btn variant="primary" onClick={() => navigate("/sign-in")}>
            Sign in
          </Btn>
        </CenteredNotice>
      </ExtShell>
    );
  }
  if (!orgId) return <WorkspaceMembership />;
  if (state.isLoading) {
    return (
      <ExtShell>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "60px 0",
          }}
        >
          <Spinner size={18} />
        </div>
      </ExtShell>
    );
  }
  if (state.error || !state.data) {
    return (
      <ExtShell>
        <CenteredNotice>
          <p
            style={{
              margin: "0 0 20px",
              fontSize: 13.5,
              color: "var(--ink-2)",
              lineHeight: 1.6,
            }}
          >
            {state.error
              ? errorMessage(state.error)
              : "Could not load your setup state."}
          </p>
          <Btn variant="primary" onClick={() => void state.refetch()}>
            Retry
          </Btn>
        </CenteredNotice>
      </ExtShell>
    );
  }
  if (state.data.legacyTenant)
    return <WorkspaceMembership legacyState={state.data} />;
  return (
    <SetupWorkspace
      state={state.data}
      firstName={user?.firstName ?? null}
      billingAdmin={
        me.isSuccess && !me.error && (me.data?.billingAdmin ?? false)
      }
      refresh={async () => {
        await refreshSetupState(cache, api.getState);
      }}
    />
  );
}
