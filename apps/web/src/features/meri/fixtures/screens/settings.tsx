import { ConnectorAccountsScreen } from "../../screens/settings/ConnectorAccountsScreen";
import { HelpShortcutsScreen } from "../../screens/settings/HelpShortcutsScreen";
import { NotificationsAccountScreen } from "../../screens/settings/NotificationsAccountScreen";
import { PersonalPreferencesScreen } from "../../screens/settings/PersonalPreferencesScreen";
import { PrivacyDeletionScreen } from "../../screens/settings/PrivacyDeletionScreen";
import { SkillsTemplatesScreen } from "../../screens/settings/SkillsTemplatesScreen";
import { UsageLimitsScreen } from "../../screens/settings/UsageLimitsScreen";
import {
  preferencePages,
  unavailablePreferences,
  type PreferencePageId,
} from "../../screens/settings/preferences-unavailable";
import type { SettingsChrome } from "../../screens/settings/settings-view";
import { fixtureHref, fixtureUnavailable } from "./href";
import {
  helpShortcuts,
  notificationsAccount,
  privacyDeletion,
  settingsOutcomes,
} from "./settings-account";
import {
  connectorAccounts,
  personalPreferences,
  usageLimits,
} from "./settings-pages";
import { sameScreen } from "./same-screen";
import type { FixtureScreen } from "./types";

/** Figma 3.4 09 Settings navigation: one fixture route per page. */
const pageHrefs: Record<PreferencePageId, string | undefined> = {
  personal: fixtureHref("personal-preferences"),
  connections: fixtureHref("connector-accounts"),
  // No Figma 3.4 frame exists for this page yet, so the fixture gallery has no route for it.
  "connected-services": undefined,
  "data-access": fixtureHref("data-coverage"),
  usage: fixtureHref("usage-limits"),
  skills: fixtureHref("skills-templates"),
  updates: fixtureHref("notifications-account"),
  privacy: fixtureHref("privacy-deletion"),
  help: fixtureHref("help-shortcuts"),
};

const chrome = (current: PreferencePageId): SettingsChrome => ({
  nav: preferencePages.map((page) => ({
    ...page,
    href: pageHrefs[page.id],
    current: page.id === current,
  })),
  notice: {
    title: "Meri settings are not connected",
    detail:
      "Design preview. Saving, live account data and policy actions await a verified Meri settings contract.",
  },
  unavailable: fixtureUnavailable,
  localDrafts: true,
  headerOverlays: true,
});

/** 09.01–09.07 Settings pages and the overlays and outcome states they trigger. */
const pageScreens: readonly FixtureScreen[] = [
  {
    slug: "personal-preferences",
    figmaId: "09.01",
    figmaNode: "3022:29587",
    title: "Personal preferences",
    Screen: () => (
      <PersonalPreferencesScreen
        chrome={chrome("personal")}
        view={personalPreferences}
      />
    ),
  },
  {
    slug: "clear-personal-defaults",
    figmaId: "Overlay · Clear personal defaults?",
    figmaNode: "3022:32491",
    title: "Clear personal defaults?",
    Screen: () => (
      <PersonalPreferencesScreen
        chrome={chrome("personal")}
        view={personalPreferences}
        clearOpen
      />
    ),
  },
  {
    slug: "preferences-saved",
    figmaId: "Overlay · Preferences saved",
    figmaNode: "3022:32395",
    title: "Preferences saved",
    Screen: () => (
      <PersonalPreferencesScreen
        chrome={chrome("personal")}
        view={personalPreferences}
        outcome={settingsOutcomes.preferencesSaved}
      />
    ),
  },
  {
    slug: "connector-accounts",
    figmaId: "09.02",
    figmaNode: "3022:30009",
    title: "Connector accounts and permissions",
    Screen: () => (
      <ConnectorAccountsScreen
        chrome={chrome("connections")}
        view={connectorAccounts}
      />
    ),
  },
  {
    slug: "disconnect-research-portal",
    figmaId: "Overlay · Disconnect the research portal?",
    figmaNode: "3022:32509",
    title: "Disconnect the research portal?",
    Screen: () => (
      <ConnectorAccountsScreen
        chrome={chrome("connections")}
        view={connectorAccounts}
        disconnectOpen
      />
    ),
  },
  {
    slug: "connection-disconnected",
    figmaId: "Overlay · Connection disconnected",
    figmaNode: "3022:32411",
    title: "Connection disconnected",
    Screen: () => (
      <ConnectorAccountsScreen
        chrome={chrome("connections")}
        view={connectorAccounts}
        outcome={settingsOutcomes.connectionDisconnected}
      />
    ),
  },
  {
    slug: "usage-limits",
    figmaId: "09.03",
    figmaNode: "3022:30398",
    title: "Usage and workspace limits",
    Screen: () => (
      <UsageLimitsScreen chrome={chrome("usage")} view={usageLimits} />
    ),
  },
  {
    slug: "skills-templates",
    figmaId: "09.04",
    figmaNode: "3022:30883",
    title: "Skills and artifact templates",
    Screen: () => (
      <SkillsTemplatesScreen
        chrome={chrome("skills")}
        view={unavailablePreferences.skills}
      />
    ),
  },
  {
    slug: "notifications-account",
    figmaId: "09.05",
    figmaNode: "3022:31261",
    title: "Notifications and account menu",
    Screen: () => (
      <NotificationsAccountScreen
        chrome={chrome("updates")}
        view={notificationsAccount}
      />
    ),
  },
  {
    slug: "updates-panel",
    figmaId: "Overlay · Updates panel",
    figmaNode: "3022:32579",
    title: "Updates panel",
    Screen: () => (
      <NotificationsAccountScreen
        chrome={chrome("updates")}
        view={notificationsAccount}
        overlayOnLoad="updates"
      />
    ),
  },
  {
    slug: "account-menu",
    figmaId: "Overlay · Account menu",
    figmaNode: "3022:32545",
    title: "Account menu",
    Screen: () => (
      <NotificationsAccountScreen
        chrome={chrome("updates")}
        view={notificationsAccount}
        overlayOnLoad="account"
      />
    ),
  },
  {
    slug: "signed-out",
    figmaId: "Overlay · Signed out",
    figmaNode: "3022:32475",
    title: "Signed out",
    Screen: () => (
      <NotificationsAccountScreen
        chrome={chrome("updates")}
        view={notificationsAccount}
        outcome={settingsOutcomes.signedOut}
      />
    ),
  },
  {
    slug: "privacy-deletion",
    figmaId: "09.06",
    figmaNode: "3022:31622",
    title: "Privacy and deletion",
    Screen: () => (
      <PrivacyDeletionScreen
        chrome={chrome("privacy")}
        view={privacyDeletion}
      />
    ),
  },
  {
    slug: "export-ready",
    figmaId: "Overlay · Export ready",
    figmaNode: "3022:32443",
    title: "Export ready",
    Screen: () => (
      <PrivacyDeletionScreen
        chrome={chrome("privacy")}
        view={privacyDeletion}
        outcome={settingsOutcomes.exportReady}
      />
    ),
  },
  {
    slug: "deletion-requested",
    figmaId: "Overlay · Deletion requested",
    figmaNode: "3022:32459",
    title: "Deletion requested",
    Screen: () => (
      <PrivacyDeletionScreen
        chrome={chrome("privacy")}
        view={privacyDeletion}
        outcome={settingsOutcomes.deletionRequested}
      />
    ),
  },
  {
    slug: "help-shortcuts",
    figmaId: "09.07",
    figmaNode: "3022:31991",
    title: "Help, shortcuts and feedback",
    Screen: () => (
      <HelpShortcutsScreen chrome={chrome("help")} view={helpShortcuts} />
    ),
  },
  {
    slug: "problem-report-sent",
    figmaId: "Overlay · Problem report sent",
    figmaNode: "3022:32427",
    title: "Problem report sent",
    Screen: () => (
      <HelpShortcutsScreen
        chrome={chrome("help")}
        view={helpShortcuts}
        outcome={settingsOutcomes.problemReportSent}
      />
    ),
  },
];

/** Figma 10.33 and 10.34: the 09.01 screen and data at phone and tablet widths (its CSS adapts). */
const responsivePreferences: readonly FixtureScreen[] = [
  {
    slug: "phone-personal-preferences",
    figmaId: "10.33",
    figmaNode: "3033:32256",
    title: "Phone personal preferences",
    Screen: sameScreen(pageScreens, "personal-preferences"),
  },
  {
    slug: "tablet-personal-preferences",
    figmaId: "10.34",
    figmaNode: "3033:32515",
    title: "Tablet personal preferences",
    Screen: sameScreen(pageScreens, "personal-preferences"),
  },
];

export const settingsScreens: readonly FixtureScreen[] = [
  ...pageScreens,
  ...responsivePreferences,
];
