"use client";
/**
 * Firm procedure governance host — the composition owner for the 09.04 surface.
 *
 * It reads the current authenticated Core account itself (`useIdentity`), reads the stored rows for
 * that account only, and owns the lifetime of every mutation result. A result that settles after the
 * account changed or after this scope unmounted is retired: it is not rendered and it does not reload
 * the new account's list. The account-scoped remount and the generation fence mirror the existing
 * runs host (features/meri/runs/MeriRunsHost.tsx) and the current-read hook
 * (features/meri/conversation/evidence/useCurrentRead.ts).
 *
 * The shared registry spread and the Settings slot stay with the central composition; until the leaf
 * operations join `capiroOperations`, the scoped client below is the only way to call them.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useIdentity } from "../../../shared/portfolio/auth/identity";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import {
  createProcedureGovernanceClient,
  type ProcedureApi,
} from "../../../shared/meri-procedures/client";
import {
  applyProcedureRun,
  canGovernProcedures,
  createProcedureLifetime,
  procedureAccountKey,
} from "../../../shared/meri-procedures/governance";
import { useCurrentRead } from "../conversation/evidence/useCurrentRead";
import {
  ProcedureGovernance,
  type ProcedureRunner,
} from "./ProcedureGovernance";

export function ProcedureGovernanceHost() {
  const identity = useIdentity();
  const current = identity.data;
  const userId = current?.user?.id ?? "";
  const tenantId = current?.tenant?.id ?? "";
  const role = current?.role ?? "";
  if (identity.error)
    return (
      <p role="alert">
        The current Core account could not be verified, so firm procedure
        governance is unavailable.
      </p>
    );
  if (!tenantId || identity.isFetching)
    return <p role="status">Verifying the current Core account…</p>;
  // Keyed by the authenticated account: a different account (whatever the browser cached) mounts a
  // fresh scope, so no row, message or pending result of the previous account can render under it.
  return (
    <Connected
      key={`${tenantId}/${userId}/${role}`}
      userId={userId}
      tenantId={tenantId}
      role={role}
    />
  );
}

function Connected({
  userId,
  tenantId,
  role,
}: {
  userId: string;
  tenantId: string;
  role: string;
}) {
  const api = useCapiro();
  const account = useMemo(
    () => ({ userId, tenantId, role }),
    [userId, tenantId, role],
  );
  const accountKey = procedureAccountKey(account);
  const permitted = canGovernProcedures(account);
  // One lifetime for this mounted account scope. `retire()` aborts what is in flight under it and
  // makes any late result inapplicable, so a transport that ignores the abort is still refused.
  const lifetime = useMemo(() => createProcedureLifetime(), []);
  const client = useMemo(
    () =>
      createProcedureGovernanceClient(api as unknown as ProcedureApi, {
        attemptId: () => `${accountKey}:${crypto.randomUUID()}`,
      }),
    [api, accountKey],
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // A superseded account's retained results are dropped here, never replayed. Nothing is stored in
    // state: the count below is derived from the client's own journal during render.
    client.retireStaleCommands(account);
  }, [client, account]);

  useEffect(() => {
    // Revoking the role ends this scope as well.
    if (!permitted) lifetime.retire();
  }, [permitted, lifetime]);

  useEffect(
    () => () => {
      lifetime.retire();
    },
    [lifetime],
  );

  const read = useCallback(
    async (signal: AbortSignal) =>
      // Without the current admin role no read is issued at all: the surface must not imply it read
      // rows it is not allowed to read.
      permitted ? client.list(account, signal) : [],
    [client, account, permitted],
  );
  const stored = useCurrentRead(accountKey, read);
  const blocked = client.requiresReadback(account);
  const retired = client.retiredCount();

  const run: ProcedureRunner = useCallback(
    (work, describe) =>
      // The controller below is the tested sequence: role check before dispatch, dispatch with the
      // scope signal, and apply the result only while this scope is still the current account.
      applyProcedureRun({
        lifetime,
        identity: account,
        dispatchedUnder: accountKey,
        work,
        describe,
        setMessage,
        readback: stored.reload,
        setBusy,
      }),
    [lifetime, account, accountKey, stored],
  );

  return (
    <ProcedureGovernance
      identity={account}
      client={client}
      rows={stored.value ?? []}
      loading={permitted && stored.loading}
      error={stored.error ?? null}
      busy={busy}
      message={message}
      notice={
        retired > 0
          ? `The current Core account changed, so ${retired} unresolved firm procedure result(s) from another account were retired instead of replayed.`
          : null
      }
      blocked={blocked}
      onReadback={stored.reload}
      run={run}
    />
  );
}
