"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIdentity } from "../../../shared/portfolio/auth/identity";
import { useSelectedClient } from "../../../shared/session/SelectedClient";
import { useMeriCapabilities } from "../../../shared/meri-resources/CapabilityContext";
import { createRunsClient } from "../../../shared/meri-runs/client";
import { RunsWorkspace } from "./RunsWorkspace";
import { MeriPageHeading } from "../ui/MeriPageHeading";
import ui from "../ui/meri-ui.module.css";
import phone from "../ui/phone-page.module.css";
import type { RunIndexSummary } from "@capiro/meri-contracts/conversation-history";
type Selection = Pick<RunIndexSummary, "conversationId" | "runId">;

export function MeriRunsHost({
  enabled,
  selection,
}: {
  enabled: boolean;
  selection?: Selection | undefined;
}) {
  const identity = useIdentity();
  const selected = useSelectedClient();
  const capabilities = useMeriCapabilities();
  const current = identity.data;
  let unavailable: string | undefined;
  if (!enabled || capabilities.runs.status !== "on")
    unavailable = "Runs are not enabled for this workspace.";
  else if (identity.error || selected.state === "unavailable")
    unavailable = "Current account or client access could not be verified.";
  else if (
    !current?.tenant?.id ||
    identity.isFetching ||
    selected.state === "loading"
  )
    unavailable = "Verifying current account and client access…";
  const clientId =
    selected.state === "authorized-client" ? selected.client.id : null;
  return (
    <div className={`${ui.page} ${phone.page}`}>
      <MeriPageHeading
        title="Runs"
        description="Review recorded work, its status and usage."
      />
      {unavailable || !current?.tenant?.id ? (
        <p role="status">{unavailable}</p>
      ) : (
        <Connected
          key={JSON.stringify([current.tenant.id, current.user.id, clientId])}
          clientId={clientId}
          clientName={
            selected.state === "authorized-client"
              ? selected.client.name
              : "General"
          }
          selection={selection}
        />
      )}
    </div>
  );
}

function Connected({
  clientId,
  clientName,
  selection,
}: {
  clientId: string | null;
  clientName: string;
  selection?: Selection | undefined;
}) {
  const [denied, setDenied] = useState(false);
  const current = useRef(true);
  const isCurrent = useCallback(() => current.current, []);
  const onAccessLost = useCallback(() => {
    current.current = false;
    setDenied(true);
  }, []);
  const client = useMemo(
    // The pure factory stores these callbacks; only asynchronous reads call them.
    // eslint-disable-next-line react-hooks/refs
    () => createRunsClient(isCurrent, onAccessLost),
    [isCurrent, onAccessLost],
  );
  useEffect(() => {
    current.current = true;
    // Each mounted useCurrentRead owns and aborts its request on cleanup.
    // The account fence also rejects a response whose transport ignores abort.
    return () => {
      current.current = false;
    };
  }, []);
  if (denied)
    return (
      <p role="alert">
        Run access was denied. Reload this page to check current access.
      </p>
    );
  return (
    <RunsWorkspace
      client={client}
      clientId={clientId}
      clientName={clientName}
      selection={selection}
    />
  );
}
