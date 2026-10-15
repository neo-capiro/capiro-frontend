"use client";
import { useState } from "react";
import { ConnectorAccountsScreen } from "./ConnectorAccountsScreen";
import { HelpShortcutsScreen } from "./HelpShortcutsScreen";
import { NotificationsAccountScreen } from "./NotificationsAccountScreen";
import { PersonalPreferencesScreen } from "./PersonalPreferencesScreen";
import { PrivacyDeletionScreen } from "./PrivacyDeletionScreen";
import { SkillsTemplatesScreen } from "./SkillsTemplatesScreen";
import { UsageLimitsScreen } from "./UsageLimitsScreen";
import {
  preferencePages as pages,
  unavailablePreferences as views,
  type PreferencePageId,
} from "./preferences-unavailable";
import type { SettingsChrome } from "./settings-view";

const unavailable =
  "Unavailable until a verified Meri settings contract is connected.";

/**
 * Meri preferences inside Capiro Settings: the same 09.01–09.07 pages as the fixtures,
 * with no account data, every preference control disabled and local page tabs.
 */
export function MeriPreferencesPanel() {
  const [page, setPage] = useState<PreferencePageId>("personal");
  const chrome: SettingsChrome = {
    nav: pages.map((item) => ({ ...item, current: item.id === page })),
    select: (id) => setPage(pages.find((item) => item.id === id)?.id ?? page),
    embedded: true,
    notice: {
      title: "Meri preferences connection unavailable",
      detail:
        "The new Meri backend owns writing preferences, connectors, limits, skills, notifications and privacy. A verified greenfield settings contract is required before these controls can be saved.",
    },
    unavailable,
    localDrafts: false,
    headerOverlays: false,
  };
  switch (page) {
    case "personal":
      return (
        <PersonalPreferencesScreen chrome={chrome} view={views.personal} />
      );
    case "connections":
      return (
        <ConnectorAccountsScreen chrome={chrome} view={views.connections} />
      );
    case "usage":
      return <UsageLimitsScreen chrome={chrome} view={views.usage} />;
    case "skills":
      return <SkillsTemplatesScreen chrome={chrome} view={views.skills} />;
    case "updates":
      return (
        <NotificationsAccountScreen chrome={chrome} view={views.updates} />
      );
    case "privacy":
      return <PrivacyDeletionScreen chrome={chrome} view={views.privacy} />;
    case "help":
      return <HelpShortcutsScreen chrome={chrome} view={views.help} />;
  }
}
