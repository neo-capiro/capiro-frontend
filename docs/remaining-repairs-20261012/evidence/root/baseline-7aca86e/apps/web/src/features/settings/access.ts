import type { CapiroMe } from "../../shared/capiro/operations/settings-schemas";
export type SettingsIdentity = CapiroMe;

export function canOpenSettings(section: string, identity: SettingsIdentity) {
  if (section.startsWith("hq")) return identity.role === "capiro_admin";
  if (
    [
      "team",
      "profiles",
      "branding",
      "intelligence-mappings",
      "ai-usage",
    ].includes(section)
  )
    return ["capiro_admin", "user_admin"].includes(identity.role);
  if (section === "billing")
    return (
      identity.role === "capiro_admin" ||
      (identity.role === "user_admin" && identity.billingAdmin)
    );
  return true;
}

export const settingsNavigation = [
  {
    label: "Account",
    entries: [
      ["personal", "Personal"],
      ["memory", "Memory"],
      ["integrations", "Integrations"],
    ],
  },
  {
    label: "Workspace",
    entries: [
      ["team", "Team"],
      ["profiles", "Profiles"],
      ["branding", "Branding"],
      ["contact-info", "Contact info"],
      ["billing", "Billing"],
      ["ai-usage", "AI usage"],
    ],
  },
  {
    label: "Intelligence",
    entries: [["intelligence-mappings", "Intelligence mappings"]],
  },
  {
    label: "Capiro HQ",
    entries: [
      ["hq-tenants", "Tenants"],
      ["hq-customers", "Customers"],
      ["hq-broadcasts", "Broadcasts"],
      ["hq-analyst", "Analyst console"],
      ["hq-reconciliation", "PE reconciliation"],
      ["hq-matches", "PE match queue"],
    ],
  },
] as const;
