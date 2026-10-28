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
  procedureFailureError,
  viewedVersionFence,
  type ProcedureAccountIdentity,
  type ProcedureCommand,
} from "./governance";

export type ProcedureRegistry = typeof meriFirmSkillOperations;
export type ProcedureApi = CapiroApi<ProcedureRegistry>;

export type ProcedureGovernanceClient = {
  list(signal?: AbortSignal): Promise<FirmSkillGovernanceRow[]>;
  create(
    identity: ProcedureAccountIdentity,
    body: FirmSkillWriteBody,
    signal?: AbortSignal,
  ): Promise<unknown>;
  update(
    identity: ProcedureAccountIdentity,
    current: FirmSkillGovernanceRow,
    body: FirmSkillWriteBody,
    signal?: AbortSignal,
  ): Promise<unknown>;
  setEnabled(
    identity: ProcedureAccountIdentity,
    current: FirmSkillGovernanceRow,
    enabled: boolean,
    signal?: AbortSignal,
  ): Promise<unknown>;
  remove(
    identity: ProcedureAccountIdentity,
    current: FirmSkillGovernanceRow,
    signal?: AbortSignal,
  ): Promise<unknown>;
  /** Restores one exact stored version, fenced by the version the operator viewed. */
  restore(
    identity: ProcedureAccountIdentity,
    current: FirmSkillGovernanceRow,
    version: number,
    signal?: AbortSignal,
  ): Promise<unknown>;
  /** Dry run. Returns stored guidance only; it never claims native SDK execution. */
  dryRun(
    identity: ProcedureAccountIdentity,
    current: FirmSkillGovernanceRow,
    signal?: AbortSignal,
  ): Promise<unknown>;
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

  const requireAuthority = (identity: ProcedureAccountIdentity) => {
    if (!canGovernProcedures(identity)) throw new ProcedureRoleDenied();
  };

  /**
   * Runs one mutation under the journal rules: authority first, then dispatch carrying the
   * viewed-version fence. An unknown outcome is recorded and surfaced as uncertain — never replayed.
   */
  const mutate = async (
    identity: ProcedureAccountIdentity,
    current: FirmSkillGovernanceRow,
    operation: string,
    dispatch: (signal?: AbortSignal) => Promise<unknown>,
    signal?: AbortSignal,
  ): Promise<unknown> => {
    requireAuthority(identity);
    viewedVersionFence(current);
    const command = beginProcedureCommand(
      identity,
      operation,
      current,
      options.attemptId(),
    );
    commands.push(command);
    try {
      signal?.throwIfAborted();
      const result = await dispatch(signal);
      const index = commands.indexOf(command);
      if (index >= 0) commands.splice(index, 1);
      return result;
    } catch (error) {
      const status = httpStatus(error);
      const kind = classifyProcedureFailure(status);
      command.state = kind === "unknown" ? "unknown" : "pending";
      if (kind !== "unknown") {
        const index = commands.indexOf(command);
        if (index >= 0) commands.splice(index, 1);
      }
      if (kind === "unknown") throw new ProcedureUncertainWrite();
      throw procedureFailureError(status);
    }
  };

  return {
    commands,
    async list(signal) {
      return api.request("meri.procedures.list", {}, { signal });
    },
    async create(identity, body, signal) {
      requireAuthority(identity);
      const command = beginProcedureCommand(
        identity,
        "meri.procedures.create",
        null,
        options.attemptId(),
      );
      commands.push(command);
      try {
        return await api.request(
          "meri.procedures.create",
          { body },
          { signal },
        );
      } catch (error) {
        const kind = classifyProcedureFailure(httpStatus(error));
        command.state = kind === "unknown" ? "unknown" : "pending";
        if (kind === "unknown") throw new ProcedureUncertainWrite();
        const index = commands.indexOf(command);
        if (index >= 0) commands.splice(index, 1);
        throw procedureFailureError(httpStatus(error));
      }
    },
    update(identity, current, body, signal) {
      return mutate(
        identity,
        current,
        "meri.procedures.update",
        (inner) =>
          api.request(
            "meri.procedures.update",
            {
              params: { id: current.id },
              body: { ...body, expectedVersion: viewedVersionFence(current) },
            },
            { signal: inner },
          ),
        signal,
      );
    },
    setEnabled(identity, current, enabled, signal) {
      return mutate(
        identity,
        current,
        "meri.procedures.setEnabled",
        (inner) =>
          api.request(
            "meri.procedures.setEnabled",
            {
              params: { id: current.id },
              body: { enabled, expectedVersion: viewedVersionFence(current) },
            },
            { signal: inner },
          ),
        signal,
      );
    },
    remove(identity, current, signal) {
      return mutate(
        identity,
        current,
        "meri.procedures.remove",
        (inner) =>
          api.request(
            "meri.procedures.remove",
            {
              params: { id: current.id },
              query: { expectedVersion: viewedVersionFence(current) },
            },
            { signal: inner },
          ),
        signal,
      );
    },
    restore(identity, current, version, signal) {
      if (
        !Number.isInteger(version) ||
        version < 1 ||
        version >= current.version
      )
        throw new ProcedureRevisionConflict();
      return mutate(
        identity,
        current,
        "meri.procedures.restore",
        (inner) =>
          api.request(
            "meri.procedures.restore",
            {
              params: { id: current.id },
              body: { version, expectedVersion: viewedVersionFence(current) },
            },
            { signal: inner },
          ),
        signal,
      );
    },
    dryRun(identity, current, signal) {
      requireAuthority(identity);
      return api.request(
        "meri.procedures.test",
        { params: { id: current.id } },
        { signal },
      );
    },
  };
}
