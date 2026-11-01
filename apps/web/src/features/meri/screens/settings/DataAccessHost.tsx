"use client";
import { useCallback, useRef } from "react";
import { useIdentity } from "../../../../shared/portfolio/auth/identity";
import { useSelectedClient } from "../../../../shared/session/SelectedClient";
import { useCapiroQuery } from "../../../../shared/capiro/queries";
import { readDataAccess } from "../../../../shared/meri-data-access/read";
import { useCurrentRead } from "../../conversation/evidence/useCurrentRead";
import { SettingsCallout } from "./SettingsCallout";
import { SettingsLayout } from "./SettingsLayout";
import { DataAccessScreen, dataAccessHeading } from "./DataAccessScreen";
import type { ConnectionsRead } from "./data-access-view";
import type { SettingsChrome, SettingsNotice } from "./settings-view";

const notice: SettingsNotice = {
  title: "Data access",
  detail:
    "Read-only. This shows what Meri can read for the selected client right now and why a source is not readable; nothing here changes a setting or connects a provider.",
};

/** Owns the read lifetime and the account/client key; Meri owns scope, policy and every later read's authority. */
export function DataAccessHost({ chrome }: { chrome: SettingsChrome }) {
  const identity = useIdentity();
  const selected = useSelectedClient();
  const current = identity.data;
  const framed = { ...chrome, notice };
  const status = (detail: string, tone?: SettingsNotice["tone"]) => (
    <SettingsLayout
      chrome={framed}
      heading={dataAccessHeading}
      primary={
        <SettingsCallout notice={{ title: "Data access", detail, tone }} />
      }
      supporting={null}
    />
  );
  if (!current?.tenant?.id || identity.isFetching)
    return status(
      identity.error
        ? "Your account could not be verified, so data access is unavailable right now."
        : "Verifying your account…",
      identity.error ? "warning" : undefined,
    );
  if (selected.state === "loading")
    return status("Verifying access to the selected client…");
  if (selected.state === "unavailable")
    return status(
      "The selected client could not be verified; choose General or a permitted client.",
      "warning",
    );
  const clientId =
    selected.state === "authorized-client" ? selected.client.id : null;
  return (
    <Connected
      key={`${current.tenant.id}:${current.user.id}:${clientId ?? "general"}`}
      chrome={framed}
      clientId={clientId}
      clientName={
        selected.state === "authorized-client"
          ? selected.client.name
          : "General"
      }
    />
  );
}

function Connected({
  chrome,
  clientId,
  clientName,
}: {
  chrome: SettingsChrome;
  clientId: string | null;
  clientName: string;
}) {
  const alive = useRef(true);
  const read = useCallback(
    (signal: AbortSignal) =>
      readDataAccess(
        clientId,
        signal,
        () => alive.current,
        () => {
          alive.current = false;
        },
      ),
    [clientId],
  );
  const page = useCurrentRead(`data-access:${clientId ?? "general"}`, read);
  const query = useCapiroQuery("settings.integrations.list", {});
  const connections: ConnectionsRead = query.error
    ? { status: "unavailable" }
    : query.data
      ? { status: "ready", connections: query.data }
      : { status: "loading" };
  const callout = (detail: string, tone?: SettingsNotice["tone"]) => (
    <SettingsLayout
      chrome={chrome}
      heading={dataAccessHeading}
      primary={
        <SettingsCallout notice={{ title: "Data access", detail, tone }} />
      }
      supporting={null}
    />
  );
  if (page.loading) return callout("Reading what Meri can access…");
  if (page.error || !page.value)
    return callout(
      page.error === "ACCESS_DENIED" || page.error === "MEMBERSHIP_CHANGED"
        ? "Your current access could not be confirmed. Reload settings to check again."
        : page.error === "DATA_ACCESS_UNAVAILABLE"
          ? "Data access is not available in this workspace yet."
          : "Data access could not be read right now. Reload settings to try again.",
      "warning",
    );
  return (
    <DataAccessScreen
      chrome={chrome}
      page={page.value}
      clientName={clientName}
      connections={connections}
    />
  );
}
