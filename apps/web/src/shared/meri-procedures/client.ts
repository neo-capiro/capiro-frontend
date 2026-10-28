"use client";
/**
 * Firm procedure governance client — the existing admin-gated Core owner, called through the existing
 * ordinary Capiro operation client. It adds no transport of its own, mints no authority and never
 * turns a browser-side hint into an admin identity: the gateway attaches the reviewed capiro-template
 * session token for ordinary operations
 * (apps/web/src/app/api/capiro/[operation]/route.ts:63-68) and Core verifies that canonical JWT and
 * runs the existing user_admin RolesGuard.
 *
 * Every mutation carries the version the operator actually viewed. That value is bound by Core into
 * the atomic WHERE/version predicate, so staleness is rejected by the database rather than by a
 * hopeful local comparison.
 *
 * Command custody: a command is retained only while its outcome is unknown. Success and definite
 * refusal both settle it exactly once, and an unknown outcome blocks the next mutation until an
 * authoritative read-back has happened — the request itself is never replayed.
 */
import type { CapiroApi } from "../capiro/http";
import {
  meriFirmSkillOperations,
  type FirmSkillGovernanceRow,
  type FirmSkillWriteBody,
} from "../capiro/operations/meri-firm-skills";
import {
  ProcedureRoleDenied,
  ProcedureUncertainWrite,
  ProcedureRevisionConflict,
  beginProcedureCommand,
  canGovernProcedures,
  classifyProcedureFailure,
  commandStillBelongsToAccount,
  procedureFailureError,
  retireStaleAccountCommands,
  viewedVersionFence,
  type ProcedureAccountIdentity,
  type ProcedureCommand,
  type ProcedureMutationTarget,
} from "./governance";

export type ProcedureRegistry = typeof meriFirmSkillOperations;
export type ProcedureApi = CapiroApi<ProcedureRegistry>;

export type ProcedureGovernanceClient = {
  /**
   * Authoritative read of the stored rows for the current account. A successful read is also the
   * read-back: it releases unknown custody recorded before the read started.
   */
  list(
    identity: ProcedureAccountIdentity,
    signal?: AbortSignal,
  ): Promise<FirmSkillGovernanceRow[]>;
  create(
    identity: ProcedureAccountIdentity,
    body: FirmSkillWriteBody,
    signal?: AbortSignal,
  ): Promise<unknown>;
  update(
    identity: ProcedureAccountIdentity,
    target: ProcedureMutationTarget,
    body: FirmSkillWriteBody,
    signal?: AbortSignal,
  ): Promise<unknown>;
  setEnabled(
    identity: ProcedureAccountIdentity,
    target: ProcedureMutationTarget,
    enabled: boolean,
    signal?: AbortSignal,
  ): Promise<unknown>;
  remove(
    identity: ProcedureAccountIdentity,
    target: ProcedureMutationTarget,
    signal?: AbortSignal,
  ): Promise<unknown>;
  /** Restores one exact stored version, fenced by the version the operator viewed. */
  restore(
    identity: ProcedureAccountIdentity,
    target: ProcedureMutationTarget,
    version: number,
    signal?: AbortSignal,
  ): Promise<unknown>;
  /** Dry run. Returns stored guidance only; it never claims native SDK execution. */
  dryRun(
    identity: ProcedureAccountIdentity,
    target: ProcedureMutationTarget,
    signal?: AbortSignal,
  ): Promise<unknown>;
  /** Retained commands whose outcome is unknown for this account. */
  unknownCustody(
    identity: ProcedureAccountIdentity,
  ): readonly ProcedureCommand[];
  /** True while an unknown outcome still needs an authoritative read-back before another change. */
  requiresReadback(identity: ProcedureAccountIdentity): boolean;
  /** Drops commands recorded under a different account and returns what was retired. */
  retireStaleCommands(
    identity: ProcedureAccountIdentity,
  ): readonly ProcedureCommand[];
  /** How many commands this client has retired for a superseded account. */
  retiredCount(): number;
  readonly commands: readonly ProcedureCommand[];
};

function httpStatus(error: unknown): number | null {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : null;
}

export function createProcedureGovernanceClient(
  api: ProcedureApi,
  options: { attemptId: () => string },
): ProcedureGovernanceClient {
  const commands: ProcedureCommand[] = [];
  let dispatched = 0;
  let retiredTotal = 0;

  const requireAuthority = (identity: ProcedureAccountIdentity) => {
    if (!canGovernProcedures(identity)) throw new ProcedureRoleDenied();
  };

  /** The commands still holding this account's unknown custody. */
  const custody = (identity: ProcedureAccountIdentity) =>
    commands.filter(
      (command) =>
        command.state === "unknown" &&
        commandStillBelongsToAccount(command, identity),
    );

  /** Settle (drop) one command: success and definite refusal both remove it exactly once. */
  const settle = (command: ProcedureCommand): void => {
    const index = commands.indexOf(command);
    if (index >= 0) commands.splice(index, 1);
  };

  /**
   * Runs one mutation under the journal rules: authority first, then the read-back barrier, then
   * dispatch carrying the viewed-version fence. An unknown outcome keeps custody and is surfaced as
   * uncertain; no further mutation is dispatched for that account until a read-back releases it, and
   * the request is never replayed.
   */
  const mutate = async (
    identity: ProcedureAccountIdentity,
    target: ProcedureMutationTarget | null,
    operation: string,
    dispatch: (signal?: AbortSignal) => Promise<unknown>,
    signal?: AbortSignal,
  ): Promise<unknown> => {
    requireAuthority(identity);
    if (custody(identity).length > 0) throw new ProcedureUncertainWrite();
    if (target) viewedVersionFence(target);
    const command = beginProcedureCommand(
      identity,
      operation,
      target,
      options.attemptId(),
      ++dispatched,
    );
    commands.push(command);
    try {
      signal?.throwIfAborted();
      const result = await dispatch(signal);
      settle(command);
      return result;
    } catch (error) {
      const status = httpStatus(error);
      const kind = classifyProcedureFailure(status);
      if (kind === "unknown") {
        // Custody stays with this command until an authoritative read-back releases it.
        command.state = "unknown";
        throw new ProcedureUncertainWrite();
      }
      command.state = "pending";
      settle(command);
      throw procedureFailureError(status);
    }
  };

  return {
    commands,
    async list(identity, signal) {
      // Recorded before the request: a read that began before an unknown write can never settle that
      // write, so only custody older than this read is released.
      const readFloor = dispatched;
      const rows = await api.request("meri.procedures.list", {}, { signal });
      for (const command of custody(identity))
        if (command.attempt <= readFloor) settle(command);
      return rows;
    },
    create(identity, body, signal) {
      return mutate(
        identity,
        null,
        "meri.procedures.create",
        (inner) =>
          api.request("meri.procedures.create", { body }, { signal: inner }),
        signal,
      );
    },
    update(identity, target, body, signal) {
      return mutate(
        identity,
        target,
        "meri.procedures.update",
        (inner) =>
          api.request(
            "meri.procedures.update",
            {
              params: { id: target.id },
              body: { ...body, expectedVersion: viewedVersionFence(target) },
            },
            { signal: inner },
          ),
        signal,
      );
    },
    setEnabled(identity, target, enabled, signal) {
      return mutate(
        identity,
        target,
        "meri.procedures.setEnabled",
        (inner) =>
          api.request(
            "meri.procedures.setEnabled",
            {
              params: { id: target.id },
              body: { enabled, expectedVersion: viewedVersionFence(target) },
            },
            { signal: inner },
          ),
        signal,
      );
    },
    remove(identity, target, signal) {
      return mutate(
        identity,
        target,
        "meri.procedures.remove",
        (inner) =>
          api.request(
            "meri.procedures.remove",
            {
              params: { id: target.id },
              query: { expectedVersion: viewedVersionFence(target) },
            },
            { signal: inner },
          ),
        signal,
      );
    },
    restore(identity, target, version, signal) {
      if (
        !Number.isInteger(version) ||
        version < 1 ||
        version >= target.version
      )
        throw new ProcedureRevisionConflict();
      return mutate(
        identity,
        target,
        "meri.procedures.restore",
        (inner) =>
          api.request(
            "meri.procedures.restore",
            {
              params: { id: target.id },
              body: { version, expectedVersion: viewedVersionFence(target) },
            },
            { signal: inner },
          ),
        signal,
      );
    },
    dryRun(identity, target, signal) {
      requireAuthority(identity);
      return api.request(
        "meri.procedures.test",
        { params: { id: target.id } },
        { signal },
      );
    },
    unknownCustody: (identity) => custody(identity),
    requiresReadback: (identity) => custody(identity).length > 0,
    retiredCount: () => retiredTotal,
    retireStaleCommands(identity) {
      const { retained, retired } = retireStaleAccountCommands(
        commands,
        identity,
      );
      commands.splice(0, commands.length, ...retained);
      retiredTotal += retired.length;
      return retired;
    },
  };
}
