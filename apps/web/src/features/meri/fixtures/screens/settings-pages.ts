import type { ConnectorAccountsView } from "../../screens/settings/ConnectorAccountsScreen";
import type { PersonalPreferencesView } from "../../screens/settings/PersonalPreferencesScreen";
import type { UsageLimitsView } from "../../screens/settings/UsageLimitsScreen";
import { unavailablePreferences as base } from "../../screens/settings/preferences-unavailable";
import type { SettingsField } from "../../screens/settings/settings-view";
import { fixtureHref } from "./href";

/** Figma 3.4 example values fill each placeholder-only preference field as a local draft. */
const withExampleValues = (fields: readonly SettingsField[]) =>
  fields.map((field) => ({
    ...field,
    value: field.placeholder ?? field.value,
  }));

/** Figma 3.4 09.01: personal defaults are local drafts; nothing is saved. */
export const personalPreferences: PersonalPreferencesView = {
  ...base.personal,
  defaults: {
    ...base.personal.defaults,
    fields: withExampleValues(base.personal.defaults.fields),
  },
  accessibility: {
    ...base.personal.accessibility,
    fields: withExampleValues(base.personal.accessibility.fields),
    links: [
      { label: "Keyboard shortcuts", href: fixtureHref("help-shortcuts") },
      { label: "Templates and skills", href: fixtureHref("skills-templates") },
    ],
  },
};

/** Figma 3.4 09.02: synthetic designed health states for the sample identity. */
export const connectorAccounts: ConnectorAccountsView = {
  ...base.connections,
  connections: {
    ...base.connections.connections,
    description:
      "Illustrative account states. Current connection data is unavailable.",
    initialSelectedId: "research",
    rows: [
      {
        id: "research",
        connection: "Research portal",
        account: "Jordan Clayton · research",
        scope: "Public research",
        refresh: "10 Oct · 09:30",
        health: "Connected",
      },
      {
        id: "mailbox",
        connection: "Mailbox",
        account: "Jordan Clayton · private",
        scope: "Private mail",
        refresh: "10 Oct · 08:20",
        health: "Expired",
      },
      {
        id: "client-files",
        connection: "Client files",
        account: "Anduril",
        scope: "Permitted files",
        refresh: "Access removed",
        health: "Revoked",
      },
      {
        id: "general-research",
        connection: "Research portal",
        account: "General",
        scope: "Public sources",
        refresh: "Unavailable",
        health: "Needs reconnect",
      },
    ],
  },
  coverageHref: fixtureHref("data-coverage"),
  unavailable: {
    ...base.connections.unavailable,
    detail: `${base.connections.unavailable.detail} The table shows designed health states.`,
  },
};

/** Figma 3.4 09.03: the run queue opens the background runs fixture. */
export const usageLimits: UsageLimitsView = {
  ...base.usage,
  limitStates: {
    ...base.usage.limitStates,
    queue: { label: "View run queue", href: fixtureHref("background-runs") },
  },
};
