"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useIdentity } from "../../../shared/portfolio/auth/identity";
import { useSelectedClient } from "../../../shared/session/SelectedClient";
import { scopedHref } from "../../../shared/session/client-route";
import { useMeriCapabilities } from "../../../shared/meri-resources/CapabilityContext";
import { createUsageOverviewClient } from "../../../shared/meri-usage/client";
import { useCurrentRead } from "../conversation/evidence/useCurrentRead";
import { SettingsLayout } from "../screens/settings/SettingsLayout";
import { UsageLimitsScreen } from "../screens/settings/UsageLimitsScreen";
import type { SettingsChrome } from "../screens/settings/settings-view";
import { StateMessage } from "../ui/StateMessage";
import { projectUsageOverview, usageSnapshotNotice } from "./projection";
import ui from "../ui/meri-ui.module.css";

type Props = { chrome: SettingsChrome; configurationContent?: ReactNode };
function PendingUsage({
  chrome,
  detail,
  action,
}: Props & { detail: string; action?: ReactNode }) {
  return (
    <SettingsLayout
      chrome={{ ...chrome, notice: { title: "Workspace usage", detail } }}
      heading={{
        title: "Usage and limits",
        description: "Current tenant accounting.",
      }}
      primary={
        <StateMessage
          title="Usage data unavailable"
          status="Not loaded"
          announce
          action={action}
        >
          {detail}
        </StateMessage>
      }
      supporting={
        <p>
          Missing accounting is not zero usage. Refreshing this view never
          starts model work or changes limits.
        </p>
      }
    />
  );
}

export function UsageOverviewHost(props: Props) {
  const identity = useIdentity(),
    selected = useSelectedClient(),
    capabilities = useMeriCapabilities();
  const account = identity.data;
  if (identity.error || selected.state === "unavailable")
    return (
      <PendingUsage
        {...props}
        detail="Current account or client access could not be verified."
      />
    );
  if (
    !account?.tenant?.id ||
    identity.isFetching ||
    selected.state === "loading"
  )
    return (
      <PendingUsage
        {...props}
        detail="Verifying current account and client access…"
      />
    );
  const clientId =
    selected.state === "authorized-client" ? selected.client.id : null;
  return (
    <ConnectedUsage
      {...props}
      key={JSON.stringify([account.tenant.id, account.user.id, clientId])}
      queueHref={
        capabilities.runs.status === "on"
          ? scopedHref("/meri/runs", clientId ?? undefined)
          : undefined
      }
    />
  );
}

function ConnectedUsage({
  chrome,
  configurationContent,
  queueHref,
}: Props & { queueHref?: string | undefined }) {
  const [denied, setDenied] = useState(false),
    [clock, setClock] = useState(() => Date.now());
  const current = useRef(true);
  const isCurrent = useCallback(() => current.current, []);
  const onAccessLost = useCallback(() => {
    current.current = false;
    setDenied(true);
  }, []);
  const client = useMemo(
    // The factory retains callbacks; only the asynchronous read accesses the ref.
    // eslint-disable-next-line react-hooks/refs
    () => createUsageOverviewClient(isCurrent, onAccessLost),
    [isCurrent, onAccessLost],
  );
  const read = useCallback(
    (signal: AbortSignal) => client.read(signal),
    [client],
  );
  useEffect(() => {
    current.current = true;
    // Local display age only: this timer never fetches, polls a run or calls a model.
    const timer = setInterval(() => setClock(Date.now()), 30_000);
    return () => {
      current.current = false;
      clearInterval(timer);
    };
  }, []);
  const snapshot = useCurrentRead("tenant-usage", read);
  if (denied)
    return (
      <PendingUsage
        chrome={chrome}
        detail="Usage access changed or was denied. Reload this page to verify current access."
      />
    );
  const refresh = (
    <button
      className={ui.outline}
      onClick={snapshot.reload}
      disabled={snapshot.loading}
    >
      Refresh usage
    </button>
  );
  if (!snapshot.value)
    return (
      <PendingUsage
        chrome={chrome}
        detail={
          snapshot.loading
            ? "Reading current tenant usage…"
            : "Usage could not be read. No totals or limits are inferred from this failure."
        }
        action={refresh}
      />
    );
  return (
    <>
      <div className={ui.row}>{refresh}</div>
      <UsageLimitsScreen
        chrome={{
          ...chrome,
          notice: usageSnapshotNotice(snapshot.value, clock),
        }}
        view={projectUsageOverview(snapshot.value, queueHref)}
        configurationContent={configurationContent}
      />
    </>
  );
}
