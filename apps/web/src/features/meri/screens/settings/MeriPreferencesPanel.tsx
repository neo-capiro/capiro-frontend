"use client";
import { useState, type ReactNode } from "react";
import { UserPreferencesHost } from "../../user-preferences/UserPreferencesHost";
import { TenantModelSettings } from "../../tenant-settings/TenantModelSettings";
import { ConnectorAccountsHost } from "./ConnectorAccountsHost";
import { HelpShortcutsScreen } from "./HelpShortcutsScreen";
import { NotificationsAccountScreen } from "./NotificationsAccountScreen";
import { PersonalPreferencesScreen } from "./PersonalPreferencesScreen";
import { PrivacyDeletionScreen } from "./PrivacyDeletionScreen";
import { SkillsTemplatesScreen } from "./SkillsTemplatesScreen";
import { UsageLimitsScreen } from "./UsageLimitsScreen";
import { UsageOverviewHost } from "../../usage-overview/UsageOverviewHost";
import {
  preferencePages as pages,
  unavailablePreferences as views,
  type PreferencePageId,
} from "./preferences-unavailable";
import type { SettingsChrome } from "./settings-view";
import { unavailableResources } from "../../../../shared/meri-resources/unavailable";

const unavailable =
  "Unavailable until a verified Meri settings contract is connected.";

/**
 * Meri preferences inside Capiro Settings: the same 09.01–09.07 pages as the fixtures,
 * with local tabs and disabled unavailable pages. Explicitly enabled settings
 * slots use their canonical native-authenticated owners.
 */
export function MeriPreferencesPanel({
  userPreferencesEnabled = false,
  tenantSettingsEnabled = false,
  usageEnabled = false,
  reportContent,
}: {
  userPreferencesEnabled?: boolean;
  tenantSettingsEnabled?: boolean;
  usageEnabled?: boolean;
  reportContent?: ReactNode;
}) {
  const [page, setPage] = useState<PreferencePageId>("personal");
  const chrome: SettingsChrome = {
    nav: pages.map((item) => ({ ...item, current: item.id === page })),
    select: (id) => setPage(pages.find((item) => item.id === id)?.id ?? page),
    embedded: true,
    notice: {
      title: "Meri preferences connection unavailable",
      detail: `${unavailableResources.preferences.summary} Missing: ${unavailableResources.preferences.missing}`,
    },
    unavailable,
    localDrafts: false,
    headerOverlays: false,
  };
  switch (page) {
    case "personal":
      if (userPreferencesEnabled)
        return <UserPreferencesHost chrome={chrome} />;
      return (
        <PersonalPreferencesScreen chrome={chrome} view={views.personal} />
      );
    case "connections":
      return (
        <ConnectorAccountsHost
          chrome={{
            ...chrome,
            notice: {
              title: "Connections",
              detail:
                "These are your own provider connections for the current account, read from Capiro Integrations. Connect, reconnect, sync and disconnect are performed there.",
            },
          }}
        />
      );
    case "usage":
      if (usageEnabled)
        return (
          <UsageOverviewHost
            chrome={chrome}
            configurationContent={
              tenantSettingsEnabled ? <TenantModelSettings /> : undefined
            }
          />
        );
      return (
        <UsageLimitsScreen
          chrome={
            tenantSettingsEnabled
              ? {
                  ...chrome,
                  notice: {
                    title: "Workspace model limits",
                    detail:
                      "Current administrators can manage model budgets. Usage totals and run history remain unavailable here.",
                  },
                }
              : chrome
          }
          view={views.usage}
          configurationContent={
            tenantSettingsEnabled ? <TenantModelSettings /> : undefined
          }
        />
      );
    case "skills":
      return <SkillsTemplatesScreen chrome={chrome} view={views.skills} />;
    case "updates":
      return (
        <NotificationsAccountScreen
          chrome={{
            ...chrome,
            notice: {
              title: "Updates and notification preferences",
              detail:
                "Review a recent permitted page of run notices and your memory-review notices. Optional notices use your saved preferences; required actions stay available.",
            },
          }}
          view={views.updates}
        />
      );
    case "privacy":
      return <PrivacyDeletionScreen chrome={chrome} view={views.privacy} />;
    case "help":
      return (
        <HelpShortcutsScreen
          chrome={{
            ...chrome,
            ...(reportContent
              ? {
                  notice: {
                    title: "Help and feedback",
                    detail:
                      "Review keyboard shortcuts or save a problem report for Capiro HQ.",
                  },
                }
              : {}),
          }}
          view={views.help}
          reportContent={reportContent}
        />
      );
  }
}
