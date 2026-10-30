import {
  TenantSettingsFailure,
  type TenantDocument,
  type TenantSave,
} from "./client";

/** Private form state, not a browser policy contract or authorization decision.
 * All unedited policy fields round-trip opaquely to the existing settings owner. */
export type BrowserChoice = {
  role: string | null;
  enabled: boolean;
  canEnable: boolean;
  selected: string[];
  approved: string[];
};
const record = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");
export function browserChoices(
  document: TenantDocument,
): BrowserChoice[] | null {
  const platform = document.browserPlatform,
    policy = document.browserPolicy;
  if (!platform || !policy) return null;
  const maximum = record(platform.maximum),
    defaults = record(platform.defaults),
    ceilings = record(platform.roleCeilings);
  const roles = policy.roles === undefined ? {} : record(policy.roles);
  if (!maximum || !defaults || !ceilings || !roles) return null;
  const choice = (
    role: string | null,
    ceiling: Record<string, unknown>,
    fallback: Record<string, unknown>,
    raw: unknown,
  ): BrowserChoice | null => {
    const saved = raw === undefined ? {} : record(raw);
    if (
      !saved ||
      typeof ceiling.enabled !== "boolean" ||
      !strings(ceiling.allowedOrigins)
    )
      return null;
    const enabled = Object.hasOwn(saved, "enabled")
        ? saved.enabled
        : fallback.enabled,
      selected = Object.hasOwn(saved, "allowedOrigins")
        ? saved.allowedOrigins
        : fallback.allowedOrigins;
    if (typeof enabled !== "boolean" || !strings(selected)) return null;
    return {
      role,
      enabled,
      canEnable: ceiling.enabled,
      selected: [...selected],
      approved: [...ceiling.allowedOrigins],
    };
  };
  const workspace = choice(null, maximum, defaults, policy.browser);
  if (!workspace) return null;
  const result = [workspace];
  for (const [role, value] of Object.entries(ceilings)) {
    const ceiling = record(value),
      row = ceiling && choice(role, ceiling, ceiling, roles[role]);
    if (!row) return null;
    result.push(row);
  }
  return result;
}
export function browserSaveRequest(
  document: TenantDocument,
  choices: BrowserChoice[],
): TenantSave {
  const current = browserChoices(document);
  if (
    !current ||
    !document.capabilityPolicy ||
    choices.length !== current.length
  )
    throw new TenantSettingsFailure("access");
  const policy = structuredClone(document.browserPolicy!),
    roles = record(policy.roles) ?? {};
  for (const [index, row] of choices.entries()) {
    const source = current[index]!;
    if (
      row.role !== source.role ||
      (row.enabled && !source.canEnable) ||
      row.selected.some((origin) => !source.approved.includes(origin))
    )
      throw new TenantSettingsFailure("invalid");
    const prior =
      record(row.role === null ? policy.browser : roles[row.role]) ?? {};
    const changed = {
      ...prior,
      enabled: row.enabled,
      allowedOrigins: [...row.selected],
    };
    if (row.role === null) policy.browser = changed;
    else roles[row.role] = changed;
  }
  policy.roles = roles;
  return {
    expectedRevision: document.revision,
    settings: {
      defaultTimezone: document.defaultTimezone,
      capabilityPolicy: document.capabilityPolicy,
      browserPolicy: policy,
    },
  };
}
/** JSONB object key order is immaterial when confirming a saved document. */
export function sameSettingsValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b))
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((value, index) => sameSettingsValue(value, b[index]))
    );
  const left = record(a),
    right = record(b);
  return Boolean(
    left &&
    right &&
    Object.keys(left).length === Object.keys(right).length &&
    Object.keys(left).every(
      (key) =>
        Object.hasOwn(right, key) && sameSettingsValue(left[key], right[key]),
    ),
  );
}
