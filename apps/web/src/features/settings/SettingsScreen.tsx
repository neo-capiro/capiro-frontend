"use client";

import type { ReactNode } from "react";
import type { CapiroMe } from "../../shared/capiro/operations/settings-schemas";
import { useCapiroQuery } from "../../shared/capiro/queries";
import { StatusPanel } from "../../shared/module-ui";
import { canOpenSettings, settingsNavigation } from "./access";
import { AnalystSettings } from "./analyst/AnalystSettings";
import { PersonnelMergeQueue } from "./analyst/PersonReviewQueues";
import { ProgramMatchQueue } from "./analyst/ProgramMatchQueue";
import { ReconciliationQueue } from "./analyst/ReconciliationQueue";
import { BillingSettings } from "./BillingSettings";
import { BrandingSettings } from "./BrandingSettings";
import { SettingsNotice } from "./components";
import { ContactSettings } from "./ContactSettings";
import { AiKeysSettings } from "./hq/AiKeysSettings";
import { BroadcastSettings } from "./hq/BroadcastSettings";
import { CustomerSettings } from "./hq/CustomerSettings";
import { TenantSettings } from "./hq/TenantSettings";
import { TenantTabs } from "./hq/TenantTabs";
import { IntegrationSettings } from "./IntegrationSettings";
import { MappingSettings } from "./mappings/MappingSettings";
import { MemorySettings } from "./MemorySettings";
import { PersonalSettings } from "./PersonalSettings";
import { ProfileSettings } from "./ProfileSettings";
import { SettingsNavigation } from "./SettingsNavigation";
import styles from "./styles";
import { TeamSettings } from "./TeamSettings";
import { UsageSettings } from "./UsageSettings";

type ScreenContext = {
  identity: CapiroMe;
  refresh: () => void;
  meriPreferences: ReactNode;
  memoryReviewEnabled: boolean;
};
const screens: Record<string, (context: ScreenContext) => ReactNode> = {
  personal: (context) => <PersonalSettings {...context} />,
  "contact-info": (context) => <ContactSettings identity={context.identity} />,
  branding: () => <BrandingSettings />,
  team: (context) => (
    <TeamSettings
      identity={context.identity}
      refreshIdentity={context.refresh}
    />
  ),
  integrations: () => <IntegrationSettings />,
  memory: (context) => (
    <MemorySettings reviewEnabled={context.memoryReviewEnabled} />
  ),
  "meri-preferences": (context) => context.meriPreferences,
  billing: () => <BillingSettings />,
  "ai-usage": () => <UsageSettings />,
  profiles: () => <ProfileSettings />,
  "hq-tenants": (context) => <TenantSettings identity={context.identity} />,
  "hq-customers": () => <CustomerSettings />,
  "hq-ai-keys": () => <AiKeysSettings />,
  "hq-broadcasts": () => <BroadcastSettings />,
  "intelligence-mappings": () => <MappingSettings />,
  "hq-personnel": () => <PersonnelMergeQueue />,
  "hq-reconciliation": () => <ReconciliationQueue />,
  "hq-matches": () => <ProgramMatchQueue />,
  "hq-analyst": () => <AnalystSettings />,
};
const titles: Record<string, string> = {
  ...Object.fromEntries(
    settingsNavigation.flatMap((group) =>
      group.entries.map(([id, label]) => [id, label]),
    ),
  ),
  "hq-ai-keys": "Tenants",
  "hq-personnel": "Tenants",
  "hq-analyst": "Analyst Console",
  "ai-usage": "AI usage and spend",
  "meri-preferences": "Preferences",
};
const descriptions: Record<string, string> = {
  personal: "The only Settings page everyone sees.",
  "contact-info": "Your organization’s contact details.",
  billing: "Your plan, payment method and invoices.",
  "meri-preferences": "Personal defaults for your Meri workspace.",
};

/**
 * Capiro Settings. Meri preferences are composed by the app route from the Meri feature,
 * which owns the 09.01–09.07 pages; features never import each other.
 */
export function SettingsScreen({
  section = "personal",
  meriPreferences,
  memoryReviewEnabled = false,
}: {
  section?: string;
  meriPreferences: ReactNode;
  memoryReviewEnabled?: boolean;
}) {
  const query = useCapiroQuery("me.read", {});
  const identity = query.data;
  const render = screens[section];
  return (
    <StatusPanel
      loading={query.loading}
      error={query.error}
      onRetry={query.reload}
    >
      {identity && (
        <div className={styles.layout}>
          <SettingsNavigation section={section} identity={identity} />
          <div className={styles.main}>
            <header className={styles.header}>
              <p className={styles.eyebrow}>Settings</p>
              <h1>{titles[section] ?? "Settings"}</h1>
              {descriptions[section] && (
                <p className={styles.description}>{descriptions[section]}</p>
              )}
              {section.startsWith("hq-") && (
                <p className={styles.description}>
                  Capiro HQ · visible only to Capiro admins
                </p>
              )}
            </header>
            {!canOpenSettings(section, identity) ? (
              <SettingsNotice
                title={
                  section === "billing"
                    ? "Billing isn’t available for your account"
                    : "Administrator access required"
                }
              >
                Only authorized administrators can open this Settings section.
                Ask a workspace administrator to update your permissions in
                Team.
              </SettingsNotice>
            ) : render ? (
              <>
                {["hq-tenants", "hq-ai-keys", "hq-personnel"].includes(
                  section,
                ) && <TenantTabs section={section} />}
                {render({
                  identity,
                  refresh: query.reload,
                  meriPreferences,
                  memoryReviewEnabled,
                })}
              </>
            ) : (
              <SettingsNotice title="Settings section unavailable">
                The requested Settings section is unavailable.
              </SettingsNotice>
            )}
          </div>
        </div>
      )}
    </StatusPanel>
  );
}
