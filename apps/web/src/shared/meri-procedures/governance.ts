/**
 * Firm procedure governance model — pure, transport-free rules for the existing admin-gated Core
 * owner (MeriFirmSkillsService via /clio/firm-skills). No store, no catalog, no authority of its own.
 *
 * Two honesty rules are enforced here rather than in presentation:
 *  1. A stored row that the turn path would refuse is never described as available, and no row is
 *     ever described as native SDK execution. The native selected-procedure bridge does not exist yet.
 *  2. A write whose outcome is unknown is never replayed; it must be reconciled by read-back.
 */
import type { FirmSkillGovernanceRow } from "../capiro/operations/meri-firm-skills";

export type ProcedureStatus = "disabled" | "invalid" | "available";

export type ProcedureView = {
  id: string;
  canonicalId: string;
  name: string;
  version: number;
  enabled: boolean;
  status: ProcedureStatus;
  statusLabel: string;
  digest: string | null;
  scopes: readonly string[];
  validationErrors: readonly string[];
  triggers: readonly string[];
  requiredTools: readonly string[];
  restorableVersions: readonly { version: number; savedAt: string }[];
  /** Always false today: stored governance is not native SDK execution. */
  runAsNativeSdk: false;
};

/** Fields read defensively from the loose stored payload; a tampered row must not throw here. */
function storedFields(payload: unknown): {
  triggers: string[];
  requiredTools: string[];
} {
  const record =
    payload !== null && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  const strings = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.filter((entry): entry is string => typeof entry === "string")
      : [];
  return {
    triggers: strings(record.triggers),
    requiredTools: strings(record.requiredTools),
  };
}

export function procedureStatus(row: FirmSkillGovernanceRow): ProcedureStatus {
  if (row.validationErrors.length > 0) return "invalid";
  if (!row.enabled) return "disabled";
  return "available";
}

/**
 * Honest label. "Available" means the turn path would serve the stored guidance, which is still not
 * evidence that a selected native procedure ran — the SDK bridge is not wired yet.
 */
export function procedureStatusLabel(row: FirmSkillGovernanceRow): string {
  switch (procedureStatus(row)) {
    case "invalid":
      return "Not available — the stored row fails the same rules the turn path applies.";
    case "disabled":
      return "Disabled — the turn path will not serve this row.";
    default:
      return "Available as governed procedure guidance. This is not native SDK execution.";
  }
}

/** Versions strictly older than the current one, newest first — the only restorable targets. */
export function restorableVersions(
  row: FirmSkillGovernanceRow,
): readonly { version: number; savedAt: string }[] {
  return row.versions
    .filter((entry) => entry.version < row.version && entry.version >= 1)
    .slice()
    .sort((a, b) => b.version - a.version);
}

export function procedureView(row: FirmSkillGovernanceRow): ProcedureView {
  const fields = storedFields(row.skill);
  return {
    id: row.id,
    canonicalId: row.skillId,
    name: row.name,
    version: row.version,
    enabled: row.enabled,
    status: procedureStatus(row),
    statusLabel: procedureStatusLabel(row),
    digest: row.procedureDigest,
    scopes: row.procedureScopes,
    validationErrors: row.validationErrors,
    triggers: fields.triggers,
    requiredTools: fields.requiredTools,
    restorableVersions: restorableVersions(row),
    runAsNativeSdk: false,
  };
}

// ── Structured form validation (mirrors the reviewed wire contract; Core stays authoritative) ──

export type ProcedureFormInput = {
  id: string;
  name: string;
  triggers: string;
  requiredTools: string;
  systemAddendum: string;
};

export type ProcedureFormErrors = Partial<
  Record<
    "id" | "name" | "triggers" | "requiredTools" | "systemAddendum",
    string
  >
>;

const splitList = (value: string): string[] =>
  value
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

export function emptyProcedureForm(): ProcedureFormInput {
  return {
    id: "",
    name: "",
    triggers: "",
    requiredTools: "",
    systemAddendum: "",
  };
}

/**
 * Safe structured field checks only. Core re-validates and its exact messages are what the surface
 * displays, so this never widens what the server accepts and never carries tool or effect authority.
 */
export function validateProcedureForm(
  input: ProcedureFormInput,
): ProcedureFormErrors {
  const errors: ProcedureFormErrors = {};
  const id = input.id.trim();
  if (!/^[a-z0-9_]{2,48}$/.test(id))
    errors.id = "Use 2-48 characters of a-z, 0-9 and _.";
  const name = input.name.trim();
  if (name.length === 0 || name.length > 80)
    errors.name = "Use 1-80 characters.";
  const triggers = splitList(input.triggers);
  if (triggers.length === 0 || triggers.length > 5)
    errors.triggers = "Use 1-5 triggers.";
  else if (triggers.some((trigger) => trigger.length > 64))
    errors.triggers = "Each trigger must be 64 characters or fewer.";
  const tools = splitList(input.requiredTools);
  if (tools.length > 12) errors.requiredTools = "Use 12 tools or fewer.";
  if (input.systemAddendum.length > 2000)
    errors.systemAddendum = "Use 2000 characters or fewer.";
  return errors;
}

export function procedureFormBody(input: ProcedureFormInput): {
  id: string;
  name: string;
  triggers: string[];
  requiredTools?: string[];
  systemAddendum?: string;
} {
  const tools = splitList(input.requiredTools);
  const addendum = input.systemAddendum.trim();
  return {
    id: input.id.trim(),
    name: input.name.trim(),
    triggers: splitList(input.triggers),
    ...(tools.length > 0 ? { requiredTools: tools } : {}),
    ...(addendum.length > 0 ? { systemAddendum: addendum } : {}),
  };
}

export function hasProcedureFormErrors(errors: ProcedureFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

// ── Current account / role authority (no admin identity is inferred from browser state) ──

export type ProcedureAccountIdentity = {
  userId: string;
  tenantId: string;
  role: string | null | undefined;
};

export const procedureRoleDenied =
  "Firm procedure governance requires the current Core user_admin or capiro_admin role.";

/** Same rule as the Core route guard: @Roles('user_admin') admits capiro_admin too. */
export function canGovernProcedures(
  identity: ProcedureAccountIdentity | null | undefined,
): boolean {
  return (
    !!identity &&
    typeof identity.userId === "string" &&
    identity.userId.length > 0 &&
    (identity.role === "user_admin" || identity.role === "capiro_admin")
  );
}

export function procedureAccountKey(
  identity: ProcedureAccountIdentity,
): string {
  return JSON.stringify([
    identity.tenantId,
    identity.userId,
    identity.role ?? null,
  ]);
}

export class ProcedureAccountChanged extends Error {
  constructor() {
    super(
      "The current account or role changed. Pending firm procedure results were retired; reload before acting again.",
    );
    this.name = "ProcedureAccountChanged";
  }
}

export class ProcedureRoleDenied extends Error {
  constructor() {
    super(procedureRoleDenied);
    this.name = "ProcedureRoleDenied";
  }
}

// ── Command journal: stale-account retirement, revision conflict, UNKNOWN never replayed ──

export type ProcedureCommand = {
  attemptId: string;
  accountKey: string;
  operation: string;
  state: "pending" | "unknown";
  expected: { id: string; version: number; digest: string | null } | null;
};

export function beginProcedureCommand(
  identity: ProcedureAccountIdentity,
  operation: string,
  row: FirmSkillGovernanceRow | null,
  attemptId: string,
): ProcedureCommand {
  if (!canGovernProcedures(identity)) throw new ProcedureRoleDenied();
  return {
    attemptId,
    accountKey: procedureAccountKey(identity),
    operation,
    state: "pending",
    expected: row
      ? { id: row.id, version: row.version, digest: row.procedureDigest }
      : null,
  };
}

export class ProcedureRevisionConflict extends Error {
  constructor() {
    super(
      "The procedure changed while you were editing it. Reload before trying again.",
    );
    this.name = "ProcedureRevisionConflict";
  }
}

export class ProcedureUncertainWrite extends Error {
  constructor() {
    super(
      "The result of the firm procedure change is unknown. Read the current state back before making another change; the request is not replayed.",
    );
    this.name = "ProcedureUncertainWrite";
  }
}

/** A command belongs to one account; a different current account retires it rather than replaying it. */
export function commandStillBelongsToAccount(
  command: ProcedureCommand,
  identity: ProcedureAccountIdentity,
): boolean {
  return command.accountKey === procedureAccountKey(identity);
}

/** Retire (drop) every retained command that does not belong to the current account. */
export function retireStaleAccountCommands(
  commands: readonly ProcedureCommand[],
  identity: ProcedureAccountIdentity,
): { retained: ProcedureCommand[]; retired: ProcedureCommand[] } {
  const retained: ProcedureCommand[] = [];
  const retired: ProcedureCommand[] = [];
  for (const command of commands)
    (commandStillBelongsToAccount(command, identity) ? retained : retired).push(
      command,
    );
  return { retained, retired };
}

/**
 * The fence value the client carries to Core. Core binds it into the atomic WHERE/version predicate,
 * so the fence is enforced by the database, not here.
 *
 * This deliberately replaces an earlier `assertExactProcedureTarget(expected, current)` guard that
 * compared a target derived from the current row against that same row: that comparison could never
 * fail, so it proved nothing and only looked like an authority fence.
 */
export function viewedVersionFence(row: { version: number }): number {
  if (!Number.isInteger(row.version) || row.version < 1)
    throw new ProcedureRevisionConflict();
  return row.version;
}

export type ProcedureFailureKind =
  | "rejected"
  | "conflict"
  | "denied"
  | "unknown";

/** HTTP classification. Only definite rejections may be retried; unknown must be read back. */
export function classifyProcedureFailure(
  status: number | null,
): ProcedureFailureKind {
  if (status === null) return "unknown";
  if (status === 409) return "conflict";
  if (status === 401 || status === 403) return "denied";
  if (status === 400 || status === 404 || status === 422) return "rejected";
  return "unknown";
}

export function procedureFailureError(status: number | null): Error {
  switch (classifyProcedureFailure(status)) {
    case "conflict":
      return new ProcedureRevisionConflict();
    case "denied":
      return new ProcedureRoleDenied();
    case "unknown":
      return new ProcedureUncertainWrite();
    default:
      return new Error("The firm procedure request was refused.");
  }
}

/** True only when a retry cannot duplicate an effect: a definite rejection that changed nothing. */
export function mayRetryProcedure(
  command: ProcedureCommand,
  status: number | null,
): boolean {
  return (
    command.state === "pending" &&
    classifyProcedureFailure(status) === "rejected"
  );
}
